import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { DeliveryStatus } from '@prisma/client';

// Teslimat listesi
export const getDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      driverId,
      date,
      sortBy = 'plannedDate',
      sortOrder = 'asc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (date) {
      const targetDate = new Date(date as string);
      where.plannedDate = {
        gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        lt: new Date(targetDate.setHours(23, 59, 59, 999)),
      };
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  companyName: true,
                  contactPhone: true,
                },
              },
              address: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          route: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({
      success: true,
      data: deliveries,
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

// Teslimat detayı
export const getDeliveryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            address: true,
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
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        route: true,
        locationHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!delivery) {
      throw new AppError('Teslimat bulunamadı', 404);
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

// Teslimatçı ata
export const assignDriver = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { driverId, plannedDate, plannedTimeStart, plannedTimeEnd } = req.body;

    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        driverId,
        plannedDate: plannedDate ? new Date(plannedDate) : undefined,
        plannedTimeStart,
        plannedTimeEnd,
        status: 'ASSIGNED',
      },
      include: {
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Bildirim oluştur
    if (driverId) {
      await prisma.notification.create({
        data: {
          userId: driverId,
          type: 'DELIVERY_ASSIGNED',
          title: 'Yeni Teslimat Atandı',
          message: `Size yeni bir teslimat atandı.`,
          data: { deliveryId: id },
        },
      });
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

// Teslimat durumu güncelle
export const updateDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: DeliveryStatus[] = [
      'PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'
    ];

    if (!validStatuses.includes(status)) {
      throw new AppError('Geçersiz durum', 400);
    }

    const delivery = await prisma.delivery.update({
      where: { id },
      data: { status },
    });

    // Sipariş durumunu güncelle
    if (status === 'IN_TRANSIT') {
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: 'OUT_FOR_DELIVERY' },
      });
    }

    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
};

// Konum güncelle
export const updateDeliveryLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, speed } = req.body;

    // Teslimatı güncelle
    await prisma.delivery.update({
      where: { id },
      data: {
        currentLat: latitude,
        currentLng: longitude,
        lastLocationAt: new Date(),
      },
    });

    // Konum geçmişine ekle
    await prisma.deliveryLocation.create({
      data: {
        deliveryId: id,
        latitude,
        longitude,
        accuracy,
        speed,
      },
    });

    res.json({
      success: true,
      message: 'Konum güncellendi',
    });
  } catch (error) {
    next(error);
  }
};

// Teslimatı tamamla
export const completeDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { receiverName, receiverPhone, signature, deliveryPhoto, driverNote } = req.body;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!delivery) {
      throw new AppError('Teslimat bulunamadı', 404);
    }

    await prisma.$transaction(async (tx) => {
      // Teslimatı tamamla
      await tx.delivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          actualDate: new Date(),
          receiverName,
          receiverPhone,
          signature,
          deliveryPhoto,
          driverNote,
        },
      });

      // Sipariş durumunu güncelle
      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'DELIVERED',
          deliveredDate: new Date(),
        },
      });

      // Stok düşümü yap
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: delivery.orderId },
      });

      for (const item of orderItems) {
        // Rezervasyonu kaldır ve stok düş
        await tx.warehouseStock.update({
          where: {
            warehouseId_productId: {
              warehouseId: delivery.order.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
            reserved: { decrement: item.quantity },
          },
        });

        // Stok hareketi kaydet
        const currentStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: delivery.order.warehouseId,
              productId: item.productId,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            warehouseId: delivery.order.warehouseId,
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            previousStock: currentStock!.quantity.add(item.quantity),
            newStock: currentStock!.quantity,
            referenceType: 'ORDER',
            referenceId: delivery.orderId,
            createdBy: req.user!.id,
          },
        });
      }

      // Rota istatistiklerini güncelle
      if (delivery.routeId) {
        await tx.deliveryRoute.update({
          where: { id: delivery.routeId },
          data: {
            completedStops: { increment: 1 },
          },
        });
      }
    });

    res.json({
      success: true,
      message: 'Teslimat tamamlandı',
    });
  } catch (error) {
    next(error);
  }
};

// Teslimat başarısız
export const failDelivery = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { failureReason, driverNote } = req.body;

    await prisma.delivery.update({
      where: { id },
      data: {
        status: 'FAILED',
        failureReason,
        driverNote,
      },
    });

    res.json({
      success: true,
      message: 'Teslimat başarısız olarak işaretlendi',
    });
  } catch (error) {
    next(error);
  }
};

// Teslimatçının teslimatları
export const getDriverDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, status } = req.query;

    const where: any = {
      driverId: req.user!.id,
    };

    if (date) {
      const targetDate = new Date(date as string);
      where.plannedDate = {
        gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        lt: new Date(new Date(date as string).setHours(23, 59, 59, 999)),
      };
    }

    if (status) {
      where.status = status;
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: [{ sequenceOrder: 'asc' }, { plannedDate: 'asc' }],
      include: {
        order: {
          include: {
            customer: {
              select: {
                companyName: true,
                contactPhone: true,
              },
            },
            address: true,
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
};

// Rota listesi
export const getDeliveryRoutes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, driverId, status } = req.query;

    const where: any = {};

    if (date) {
      const targetDate = new Date(date as string);
      where.date = {
        gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        lt: new Date(new Date(date as string).setHours(23, 59, 59, 999)),
      };
    }

    if (driverId) {
      where.driverId = driverId;
    }

    if (status) {
      where.status = status;
    }

    const routes = await prisma.deliveryRoute.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        deliveries: {
          include: {
            order: {
              include: {
                customer: {
                  select: { companyName: true },
                },
                address: {
                  select: { city: true, district: true },
                },
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    next(error);
  }
};

// Rota oluştur
export const createDeliveryRoute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, date, driverId, deliveryIds } = req.body;

    const route = await prisma.deliveryRoute.create({
      data: {
        name,
        date: new Date(date),
        driverId,
        totalStops: deliveryIds?.length || 0,
      },
    });

    // Teslimatları rotaya ata
    if (deliveryIds && deliveryIds.length > 0) {
      await prisma.delivery.updateMany({
        where: { id: { in: deliveryIds } },
        data: {
          routeId: route.id,
          driverId,
          status: 'ASSIGNED',
        },
      });

      // Sıralama güncelle
      for (let i = 0; i < deliveryIds.length; i++) {
        await prisma.delivery.update({
          where: { id: deliveryIds[i] },
          data: { sequenceOrder: i + 1 },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// Rota güncelle
export const updateDeliveryRoute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, status, deliveryIds } = req.body;

    const route = await prisma.deliveryRoute.update({
      where: { id },
      data: {
        name,
        status,
        totalStops: deliveryIds?.length,
      },
    });

    // Teslimat sıralamasını güncelle
    if (deliveryIds) {
      for (let i = 0; i < deliveryIds.length; i++) {
        await prisma.delivery.update({
          where: { id: deliveryIds[i] },
          data: {
            routeId: id,
            sequenceOrder: i + 1,
          },
        });
      }
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// Rota optimize et (basit implementasyon)
export const optimizeRoute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // TODO: Gerçek rota optimizasyonu için Google Maps API veya benzeri kullanılabilir
    // Bu basit bir implementasyon - koordinatlara göre sıralama

    const route = await prisma.deliveryRoute.findUnique({
      where: { id },
      include: {
        deliveries: {
          include: {
            order: {
              include: {
                address: true,
              },
            },
          },
        },
      },
    });

    if (!route) {
      throw new AppError('Rota bulunamadı', 404);
    }

    // Basit sıralama (latitude'e göre)
    const sortedDeliveries = route.deliveries.sort((a, b) => {
      const latA = Number(a.order.address.latitude) || 0;
      const latB = Number(b.order.address.latitude) || 0;
      return latA - latB;
    });

    for (let i = 0; i < sortedDeliveries.length; i++) {
      await prisma.delivery.update({
        where: { id: sortedDeliveries[i].id },
        data: { sequenceOrder: i + 1 },
      });
    }

    res.json({
      success: true,
      message: 'Rota optimize edildi',
    });
  } catch (error) {
    next(error);
  }
};

// Teslimat istatistikleri
export const getDeliveryStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.plannedDate = {};
      if (startDate) where.plannedDate.gte = new Date(startDate as string);
      if (endDate) where.plannedDate.lte = new Date(endDate as string);
    }

    const [total, pending, inTransit, delivered, failed] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.delivery.count({ where: { ...where, status: 'PENDING' } }),
      prisma.delivery.count({ where: { ...where, status: 'IN_TRANSIT' } }),
      prisma.delivery.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.delivery.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        inTransit,
        delivered,
        failed,
        successRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
