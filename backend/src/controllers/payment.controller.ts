import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { PaymentType, PaymentStatus } from '@prisma/client';

// Ödeme numarası oluştur
const generatePaymentNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const lastPayment = await prisma.payment.findFirst({
    where: {
      paymentNumber: { startsWith: `TAH-${year}` },
    },
    orderBy: { paymentNumber: 'desc' },
  });

  const nextNumber = lastPayment
    ? parseInt(lastPayment.paymentNumber.split('-')[2]) + 1
    : 1;

  return `TAH-${year}-${String(nextNumber).padStart(5, '0')}`;
};

// Ödeme listesi
export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      customerId,
      type,
      status,
      startDate,
      endDate,
      sortBy = 'paymentDate',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              companyName: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme detayı
export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            companyName: true,
            contactName: true,
            contactPhone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Ödeme bulunamadı', 404);
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme oluştur
export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      customerId,
      orderId,
      type,
      amount,
      dueDate,
      referenceNumber,
      bankName,
      notes,
    } = req.body;

    // Müşteri kontrolü
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    const paymentNumber = await generatePaymentNumber();

    const payment = await prisma.$transaction(async (tx) => {
      // Ödeme oluştur
      const newPayment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId,
          orderId,
          type: type as PaymentType,
          status: 'COMPLETED',
          amount,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          referenceNumber,
          bankName,
          notes,
          collectedBy: req.user!.id,
          collectedAt: new Date(),
        },
      });

      // Müşteri bakiyesini güncelle
      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: { decrement: amount },
        },
      });

      return newPayment;
    });

    // Aktivite logu
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'Payment',
        entityId: payment.id,
        newData: { paymentNumber, amount, type },
      },
    });

    // Bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        type: 'PAYMENT_RECEIVED',
        title: 'Ödeme Alındı',
        message: `${customer.companyName} için ${amount} TL ödeme kaydedildi.`,
        data: { paymentId: payment.id },
      },
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme güncelle
export const updatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { type, amount, dueDate, referenceNumber, bankName, notes, status } = req.body;

    const existingPayment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new AppError('Ödeme bulunamadı', 404);
    }

    // Tutar değişikliği varsa bakiyeyi düzelt
    if (amount && amount !== Number(existingPayment.amount)) {
      const difference = Number(existingPayment.amount) - amount;
      await prisma.customer.update({
        where: { id: existingPayment.customerId },
        data: {
          currentBalance: { increment: difference },
        },
      });
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        type: type as PaymentType,
        amount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        referenceNumber,
        bankName,
        notes,
        status: status as PaymentStatus,
      },
    });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme sil
export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new AppError('Ödeme bulunamadı', 404);
    }

    await prisma.$transaction(async (tx) => {
      // Müşteri bakiyesini geri al
      if (payment.status === 'COMPLETED') {
        await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            currentBalance: { increment: payment.amount },
          },
        });
      }

      // Ödemeyi sil
      await tx.payment.delete({
        where: { id },
      });
    });

    res.json({
      success: true,
      message: 'Ödeme başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Ödeme istatistikleri
export const getPaymentStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(endDate as string);
    }

    const [
      totalPayments,
      cashPayments,
      cardPayments,
      transferPayments,
      totalAmount,
    ] = await Promise.all([
      prisma.payment.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { ...where, type: 'CASH', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, type: 'CREDIT_CARD', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, type: 'BANK_TRANSFER', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPayments,
        totalAmount: totalAmount._sum.amount || 0,
        byType: {
          cash: cashPayments._sum.amount || 0,
          creditCard: cardPayments._sum.amount || 0,
          bankTransfer: transferPayments._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri ödeme geçmişi
export const getCustomerPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [payments, total, totalAmount] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId },
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      }),
      prisma.payment.count({ where: { customerId } }),
      prisma.payment.aggregate({
        where: { customerId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: payments,
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / take),
        totalAmount: totalAmount._sum.amount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
