import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { OrderStatus, OrderSource, Prisma } from '@prisma/client';

// Sipariş numarası oluştur
const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: { startsWith: `SIP-${year}` },
    },
    orderBy: { orderNumber: 'desc' },
  });

  const nextNumber = lastOrder
    ? parseInt(lastOrder.orderNumber.split('-')[2]) + 1
    : 1;

  return `SIP-${year}-${String(nextNumber).padStart(5, '0')}`;
};

// Sipariş listesi
export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      status,
      customerId,
      warehouseId,
      startDate,
      endDate,
      source,
      sortBy = 'orderDate',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    // Rol bazlı filtreleme
    if (req.user?.role === 'CUSTOMER') {
      where.customerId = req.user.customerId;
    } else if (req.user?.role === 'SALES_REP') {
      where.customer = { salesRepId: req.user.id };
    } else if (req.user?.role === 'WAREHOUSE') {
      where.warehouseId = req.user.warehouseId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate as string);
      if (endDate) where.orderDate.lte = new Date(endDate as string);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
              contactPhone: true,
            },
          },
          address: {
            select: {
              title: true,
              address: true,
              city: true,
              district: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { items: true },
          },
          delivery: {
            select: {
              status: true,
              driver: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
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

// Sipariş detayı
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            companyName: true,
            contactName: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
        address: true,
        warehouse: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
          },
        },
        delivery: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        payments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    // Yetki kontrolü
    if (req.user?.role === 'CUSTOMER' && order.customerId !== req.user.customerId) {
      throw new AppError('Bu siparişe erişim yetkiniz yok', 403);
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş oluştur
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      customerId,
      addressId,
      warehouseId,
      items,
      requestedDate,
      customerNote,
      internalNote,
      source = 'WEB',
      discountPercent = 0,
    } = req.body;

    if (!items || items.length === 0) {
      throw new AppError('Sipariş kalemleri gerekli', 400);
    }

    // Müşteri kontrolü
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { priceGroup: { include: { items: true } } },
    });

    if (!customer) {
      throw new AppError('Müşteri bulunamadı', 404);
    }

    if (customer.status !== 'ACTIVE') {
      throw new AppError('Müşteri hesabı aktif değil', 400);
    }

    // Ürünleri getir
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Sipariş kalemlerini hazırla
    let subtotal = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);

    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new AppError(`Ürün bulunamadı: ${item.productId}`, 404);
      }

      // Müşteriye özel fiyat kontrolü
      let unitPrice = product.basePrice;
      if (customer.priceGroup) {
        const priceGroupItem = customer.priceGroup.items.find(
          (pgi) => pgi.productId === product.id
        );
        if (priceGroupItem?.price) {
          unitPrice = priceGroupItem.price;
        } else if (priceGroupItem?.discount) {
          unitPrice = product.basePrice.mul(1 - Number(priceGroupItem.discount) / 100);
        } else if (customer.priceGroup.discount) {
          unitPrice = product.basePrice.mul(1 - Number(customer.priceGroup.discount) / 100);
        }
      }

      const quantity = new Prisma.Decimal(item.quantity);
      const discount = new Prisma.Decimal(item.discount || 0);
      const taxRate = product.taxRate;

      const lineSubtotal = unitPrice.mul(quantity).mul(1 - Number(discount) / 100);
      const lineTax = lineSubtotal.mul(Number(taxRate) / 100);
      const lineTotal = lineSubtotal.add(lineTax);

      subtotal = subtotal.add(lineSubtotal);
      totalTax = totalTax.add(lineTax);

      return {
        productId: product.id,
        quantity,
        unit: product.unit,
        unitPrice,
        discount,
        taxRate,
        subtotal: lineSubtotal,
        taxAmount: lineTax,
        total: lineTotal,
        notes: item.notes,
      };
    });

    // İndirim uygula
    const discountAmount = subtotal.mul(Number(discountPercent) / 100);
    const finalSubtotal = subtotal.sub(discountAmount);
    const finalTotalAmount = finalSubtotal.add(totalTax);

    // Kredi limiti kontrolü
    const newBalance = Number(customer.currentBalance) + Number(finalTotalAmount);
    if (newBalance > Number(customer.creditLimit) && Number(customer.creditLimit) > 0) {
      throw new AppError('Kredi limiti aşılıyor', 400);
    }

    // Sipariş numarası oluştur
    const orderNumber = await generateOrderNumber();

    // Transaction ile sipariş oluştur
    const order = await prisma.$transaction(async (tx) => {
      // Siparişi oluştur
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          addressId,
          warehouseId,
          status: 'PENDING',
          source: source as OrderSource,
          requestedDate: requestedDate ? new Date(requestedDate) : undefined,
          subtotal: finalSubtotal,
          discountAmount,
          discountPercent,
          taxAmount: totalTax,
          totalAmount: finalTotalAmount,
          customerNote,
          internalNote,
          createdById: req.user!.id,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      // Müşteri bakiyesini güncelle
      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: { increment: finalTotalAmount },
        },
      });

      // Teslimat kaydı oluştur
      await tx.delivery.create({
        data: {
          orderId: newOrder.id,
          status: 'PENDING',
          plannedDate: requestedDate ? new Date(requestedDate) : undefined,
        },
      });

      return newOrder;
    });

    // Aktivite logu
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE',
        entityType: 'Order',
        entityId: order.id,
        newData: { orderNumber: order.orderNumber, totalAmount: order.totalAmount },
      },
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş güncelle
export const updateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { addressId, requestedDate, customerNote, internalNote, discountPercent } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new AppError('Bu sipariş artık düzenlenemez', 400);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        addressId,
        requestedDate: requestedDate ? new Date(requestedDate) : undefined,
        customerNote,
        internalNote,
        discountPercent,
      },
      include: {
        items: true,
        customer: true,
      },
    });

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş sil
export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new AppError('Bu sipariş silinemez', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Müşteri bakiyesini düzelt
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          currentBalance: { decrement: order.totalAmount },
        },
      });

      // Teslimat kaydını sil
      await tx.delivery.deleteMany({
        where: { orderId: id },
      });

      // Siparişi sil
      await tx.order.delete({
        where: { id },
      });
    });

    res.json({
      success: true,
      message: 'Sipariş başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş durumu güncelle
export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: OrderStatus[] = [
      'DRAFT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 
      'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new AppError('Geçerli bir durum belirtilmeli', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    const updateData: any = { status };

    if (status === 'CONFIRMED') {
      updateData.confirmedDate = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveredDate = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Aktivite logu
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_STATUS',
        entityType: 'Order',
        entityId: id,
        oldData: { status: order.status },
        newData: { status },
      },
    });

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş onayla
export const confirmOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (order.status !== 'PENDING') {
      throw new AppError('Sadece bekleyen siparişler onaylanabilir', 400);
    }

    // Stok kontrolü ve rezervasyonu
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const stock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: order.warehouseId,
              productId: item.productId,
            },
          },
        });

        const availableStock = stock
          ? Number(stock.quantity) - Number(stock.reserved)
          : 0;

        if (availableStock < Number(item.quantity)) {
          throw new AppError(`Yetersiz stok: ${item.productId}`, 400);
        }

        // Stok rezerve et
        await tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: order.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            reserved: { increment: item.quantity },
          },
        });
      }

      // Sipariş durumunu güncelle
      await tx.order.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedDate: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: 'Sipariş onaylandı',
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş iptal
export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status)) {
      throw new AppError('Bu sipariş iptal edilemez', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Rezervasyonları kaldır
      if (['CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
        for (const item of order.items) {
          await tx.warehouseStock.update({
            where: {
              warehouseId_productId: {
                warehouseId: order.warehouseId,
                productId: item.productId,
              },
            },
            data: {
              reserved: { decrement: item.quantity },
            },
          });
        }
      }

      // Müşteri bakiyesini düzelt
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          currentBalance: { decrement: order.totalAmount },
        },
      });

      // Sipariş durumunu güncelle
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          internalNote: reason
            ? `${order.internalNote || ''}\nİptal nedeni: ${reason}`
            : order.internalNote,
        },
      });

      // Teslimat durumunu güncelle
      await tx.delivery.updateMany({
        where: { orderId: id },
        data: { status: 'FAILED', failureReason: reason || 'Sipariş iptal edildi' },
      });
    });

    res.json({
      success: true,
      message: 'Sipariş iptal edildi',
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş kalemleri
export const getOrderItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const items = await prisma.orderItem.findMany({
      where: { orderId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş kalemi ekle
export const addOrderItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { productId, quantity, discount, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new AppError('Bu siparişe kalem eklenemez', 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    const qty = new Prisma.Decimal(quantity);
    const disc = new Prisma.Decimal(discount || 0);
    const subtotal = product.basePrice.mul(qty).mul(1 - Number(disc) / 100);
    const taxAmount = subtotal.mul(Number(product.taxRate) / 100);
    const total = subtotal.add(taxAmount);

    const item = await prisma.orderItem.create({
      data: {
        orderId: id,
        productId,
        quantity: qty,
        unit: product.unit,
        unitPrice: product.basePrice,
        discount: disc,
        taxRate: product.taxRate,
        subtotal,
        taxAmount,
        total,
        notes,
      },
    });

    // Sipariş toplamlarını güncelle
    await recalculateOrderTotals(id);

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş kalemi güncelle
export const updateOrderItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, discount, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new AppError('Bu sipariş kalemi güncellenemez', 400);
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });

    if (!item) {
      throw new AppError('Sipariş kalemi bulunamadı', 404);
    }

    const qty = new Prisma.Decimal(quantity || item.quantity);
    const disc = new Prisma.Decimal(discount ?? item.discount);
    const subtotal = item.unitPrice.mul(qty).mul(1 - Number(disc) / 100);
    const taxAmount = subtotal.mul(Number(item.taxRate) / 100);
    const total = subtotal.add(taxAmount);

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: qty,
        discount: disc,
        subtotal,
        taxAmount,
        total,
        notes,
      },
    });

    // Sipariş toplamlarını güncelle
    await recalculateOrderTotals(id);

    res.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş kalemi sil
export const removeOrderItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, itemId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('Sipariş bulunamadı', 404);
    }

    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new AppError('Bu sipariş kaleminden silinemez', 400);
    }

    await prisma.orderItem.delete({
      where: { id: itemId },
    });

    // Sipariş toplamlarını güncelle
    await recalculateOrderTotals(id);

    res.json({
      success: true,
      message: 'Sipariş kalemi silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş toplamlarını yeniden hesapla
async function recalculateOrderTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
  });

  const subtotal = items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));
  const taxAmount = items.reduce((sum, item) => sum.add(item.taxAmount), new Prisma.Decimal(0));

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { discountPercent: true },
  });

  const discountAmount = subtotal.mul(Number(order?.discountPercent || 0) / 100);
  const totalAmount = subtotal.sub(discountAmount).add(taxAmount);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
    },
  });
}

// Sipariş istatistikleri
export const getOrderStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate as string);
      if (endDate) where.orderDate.lte = new Date(endDate as string);
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      totalAmount,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      prisma.order.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.order.aggregate({
        where: { ...where, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        deliveredOrders,
        totalAmount: totalAmount._sum.totalAmount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
