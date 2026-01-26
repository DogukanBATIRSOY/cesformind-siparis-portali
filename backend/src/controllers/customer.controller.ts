import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { CustomerStatus, CustomerType } from '@prisma/client';

// Müşteri listesi
export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      type,
      status,
      salesRepId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    // Satış temsilcisi sadece kendi müşterilerini görsün
    if (req.user?.role === 'SALES_REP') {
      where.salesRepId = req.user.id;
    } else if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
        { taxNumber: { contains: search } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
          salesRep: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          priceGroup: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
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

// Müşteri detayı
export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        salesRep: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        priceGroup: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            payments: true,
          },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    // Yetki kontrolü
    if (req.user?.role === 'SALES_REP' && customer.salesRepId !== req.user.id) {
      throw new AppError('Bu müşteriye erişim yetkiniz yok', 403);
    }

    if (req.user?.role === 'CUSTOMER' && req.user.customerId !== id) {
      throw new AppError('Bu müşteriye erişim yetkiniz yok', 403);
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri oluştur
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      companyName,
      taxNumber,
      taxOffice,
      type,
      contactName,
      contactPhone,
      contactEmail,
      creditLimit,
      paymentTermDays,
      priceGroupId,
      address,
      district,
      city,
      notes,
    } = req.body;

    // Vergi no kontrolü
    if (taxNumber) {
      const existingTax = await prisma.customer.findUnique({
        where: { taxNumber },
      });

      if (existingTax) {
        throw new AppError('Bu vergi numarası zaten kayıtlı', 400);
      }
    }

    // Müşteri kodu oluştur
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    const nextNumber = lastCustomer
      ? parseInt(lastCustomer.code.split('-')[1]) + 1
      : 1;
    const customerCode = `MUS-${String(nextNumber).padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        code: customerCode,
        companyName,
        taxNumber,
        taxOffice,
        type: type as CustomerType,
        status: 'ACTIVE',
        contactName,
        contactPhone,
        contactEmail,
        creditLimit: creditLimit || 0,
        paymentTermDays: paymentTermDays || 0,
        priceGroupId,
        salesRepId: req.user?.role === 'SALES_REP' ? req.user.id : undefined,
        notes,
        addresses: address
          ? {
              create: {
                title: 'Merkez',
                address,
                district,
                city,
                isDefault: true,
                isDelivery: true,
                isBilling: true,
              },
            }
          : undefined,
      },
      include: {
        addresses: true,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri güncelle
export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      taxNumber,
      taxOffice,
      type,
      status,
      contactName,
      contactPhone,
      contactEmail,
      creditLimit,
      paymentTermDays,
      priceGroupId,
      salesRepId,
      notes,
    } = req.body;

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    // Vergi no kontrolü
    if (taxNumber && taxNumber !== existingCustomer.taxNumber) {
      const existingTax = await prisma.customer.findUnique({
        where: { taxNumber },
      });

      if (existingTax) {
        throw new AppError('Bu vergi numarası zaten kayıtlı', 400);
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        companyName,
        taxNumber,
        taxOffice,
        type: type as CustomerType,
        status: status as CustomerStatus,
        contactName,
        contactPhone,
        contactEmail,
        creditLimit,
        paymentTermDays,
        priceGroupId,
        salesRepId,
        notes,
      },
      include: {
        addresses: true,
      },
    });

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri sil
export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    if (customer._count.orders > 0) {
      throw new AppError('Siparişi olan müşteri silinemez', 400);
    }

    await prisma.customer.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Müşteri başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri siparişleri
export const getCustomerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: id },
        skip,
        take,
        orderBy: { orderDate: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where: { customerId: id } }),
    ]);

    res.json({
      success: true,
      data: orders,
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

// Müşteri ödemeleri
export const getCustomerPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId: id },
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.payment.count({ where: { customerId: id } }),
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

// Müşteri bakiyesi
export const getCustomerBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        currentBalance: true,
        creditLimit: true,
      },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    // Toplam sipariş tutarı
    const totalOrders = await prisma.order.aggregate({
      where: {
        customerId: id,
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      _sum: { totalAmount: true },
    });

    // Toplam ödeme
    const totalPayments = await prisma.payment.aggregate({
      where: {
        customerId: id,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        currentBalance: customer.currentBalance,
        creditLimit: customer.creditLimit,
        totalOrders: totalOrders._sum.totalAmount || 0,
        totalPayments: totalPayments._sum.amount || 0,
        availableCredit: Number(customer.creditLimit) - Number(customer.currentBalance),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri adresi ekle
export const addCustomerAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      title,
      address,
      district,
      city,
      postalCode,
      latitude,
      longitude,
      isDefault,
      isDelivery,
      isBilling,
      deliveryNotes,
    } = req.body;

    // Varsayılan adres ise diğerlerini güncelle
    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: id },
        data: { isDefault: false },
      });
    }

    const customerAddress = await prisma.customerAddress.create({
      data: {
        customerId: id,
        title,
        address,
        district,
        city,
        postalCode,
        latitude,
        longitude,
        isDefault: isDefault || false,
        isDelivery: isDelivery ?? true,
        isBilling: isBilling ?? true,
        deliveryNotes,
      },
    });

    res.status(201).json({
      success: true,
      data: customerAddress,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri adresi güncelle
export const updateCustomerAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, addressId } = req.params;
    const updateData = req.body;

    // Varsayılan adres ise diğerlerini güncelle
    if (updateData.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId: id, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const customerAddress = await prisma.customerAddress.update({
      where: { id: addressId },
      data: updateData,
    });

    res.json({
      success: true,
      data: customerAddress,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri adresi sil
export const deleteCustomerAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.params;

    await prisma.customerAddress.delete({
      where: { id: addressId },
    });

    res.json({
      success: true,
      message: 'Adres başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri ziyareti ekle
export const addCustomerVisit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { visitType, notes, latitude, longitude } = req.body;

    const visit = await prisma.customerVisit.create({
      data: {
        customerId: id,
        userId: req.user!.id,
        visitDate: new Date(),
        visitType,
        notes,
        latitude,
        longitude,
      },
    });

    res.status(201).json({
      success: true,
      data: visit,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri durumunu güncelle
export const updateCustomerStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        status: status as CustomerStatus,
        notes: notes ? `${customer.notes || ''}\n[${new Date().toLocaleDateString('tr-TR')}] Durum değişikliği: ${notes}` : customer.notes,
      },
    });

    res.json({
      success: true,
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri onayı
export const approveCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { creditLimit, paymentTermDays, salesRepId, priceGroupId } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    if (customer.status !== 'PENDING_APPROVAL') {
      throw new AppError('Bu müşteri zaten onaylanmış veya reddedilmiş', 400);
    }

    // Bireysel müşterilerde kredi limiti 0 olmalı
    const isIndividual = customer.type === 'INDIVIDUAL';
    const finalCreditLimit = isIndividual ? 0 : (creditLimit || 0);
    const finalPaymentTermDays = isIndividual ? 0 : (paymentTermDays || 0);

    // Müşteriyi güncelle
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        creditLimit: finalCreditLimit,
        paymentTermDays: finalPaymentTermDays,
        salesRepId: salesRepId || undefined,
        priceGroupId: priceGroupId || undefined,
      },
    });

    // Kullanıcı varsa aktif yap
    if (customer.user) {
      await prisma.user.update({
        where: { id: customer.user.id },
        data: { status: 'ACTIVE' },
      });
    }

    // TODO: Müşteriye onay emaili gönder

    res.json({
      success: true,
      message: 'Müşteri başarıyla onaylandı',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// Müşteri reddi
export const rejectCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('Red sebebi gerekli', 400);
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    if (customer.status !== 'PENDING_APPROVAL') {
      throw new AppError('Bu müşteri zaten onaylanmış veya reddedilmiş', 400);
    }

    // Müşteriyi güncelle
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        notes: `[RED] ${new Date().toLocaleDateString('tr-TR')}: ${reason}`,
      },
    });

    // Kullanıcı varsa askıya al
    if (customer.user) {
      await prisma.user.update({
        where: { id: customer.user.id },
        data: { status: 'SUSPENDED' },
      });
    }

    // TODO: Müşteriye red emaili gönder

    res.json({
      success: true,
      message: 'Müşteri başvurusu reddedildi',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};
