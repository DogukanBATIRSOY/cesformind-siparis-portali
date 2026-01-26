import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// Son senkronizasyon zamanı
export const getLastSyncTime = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Kullanıcının son sync zamanını bir ayar tablosundan alabilirsiniz
    // Şimdilik basit bir yaklaşım

    res.json({
      success: true,
      data: {
        lastSync: new Date().toISOString(),
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Offline için veri getir (el terminalleri için)
export const getOfflineData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lastSync, entities } = req.query;

    const lastSyncDate = lastSync ? new Date(lastSync as string) : new Date(0);
    const requestedEntities = entities ? (entities as string).split(',') : ['all'];

    const data: any = {};

    // Müşteri rolü için sadece kendi verilerini getir
    const isCustomer = req.user?.role === 'CUSTOMER';
    const isSalesRep = req.user?.role === 'SALES_REP';
    const isDelivery = req.user?.role === 'DELIVERY';

    // Ürünler
    if (requestedEntities.includes('all') || requestedEntities.includes('products')) {
      data.products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          updatedAt: { gte: lastSyncDate },
        },
        include: {
          category: { select: { id: true, name: true } },
          images: { where: { isMain: true }, take: 1 },
        },
      });
    }

    // Kategoriler
    if (requestedEntities.includes('all') || requestedEntities.includes('categories')) {
      data.categories = await prisma.category.findMany({
        where: {
          isActive: true,
          updatedAt: { gte: lastSyncDate },
        },
      });
    }

    // Müşteriler (satış temsilcisi için)
    if (
      (requestedEntities.includes('all') || requestedEntities.includes('customers')) &&
      (isSalesRep || req.user?.role === 'ADMIN')
    ) {
      const customerWhere: any = { updatedAt: { gte: lastSyncDate } };
      if (isSalesRep) {
        customerWhere.salesRepId = req.user!.id;
      }

      data.customers = await prisma.customer.findMany({
        where: customerWhere,
        include: {
          addresses: true,
        },
      });
    }

    // Siparişler
    if (requestedEntities.includes('all') || requestedEntities.includes('orders')) {
      const orderWhere: any = { updatedAt: { gte: lastSyncDate } };

      if (isCustomer) {
        orderWhere.customerId = req.user!.customerId;
      } else if (isSalesRep) {
        orderWhere.customer = { salesRepId: req.user!.id };
      } else if (isDelivery) {
        orderWhere.delivery = { driverId: req.user!.id };
      }

      data.orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, sku: true, unit: true },
              },
            },
          },
          customer: {
            select: { companyName: true, contactPhone: true },
          },
          address: true,
        },
      });
    }

    // Teslimatlar (teslimatçı için)
    if (
      (requestedEntities.includes('all') || requestedEntities.includes('deliveries')) &&
      isDelivery
    ) {
      data.deliveries = await prisma.delivery.findMany({
        where: {
          driverId: req.user!.id,
          updatedAt: { gte: lastSyncDate },
        },
        include: {
          order: {
            include: {
              customer: { select: { companyName: true, contactPhone: true } },
              address: true,
              items: {
                include: {
                  product: { select: { name: true, unit: true } },
                },
              },
            },
          },
        },
      });
    }

    res.json({
      success: true,
      data,
      meta: {
        syncTime: new Date().toISOString(),
        counts: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, (value as any[]).length])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Offline değişiklikleri gönder
export const pushOfflineChanges = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { changes } = req.body;

    if (!changes || !Array.isArray(changes)) {
      throw new AppError('Geçerli değişiklik verisi gerekli', 400);
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const change of changes) {
      try {
        const { entity, action, data, localId } = change;

        let result: any;

        switch (entity) {
          case 'order':
            result = await handleOrderChange(action, data, req.user!.id);
            break;
          case 'customerVisit':
            result = await handleVisitChange(action, data, req.user!.id);
            break;
          case 'delivery':
            result = await handleDeliveryChange(action, data, req.user!.id);
            break;
          case 'payment':
            result = await handlePaymentChange(action, data, req.user!.id);
            break;
          default:
            throw new Error(`Bilinmeyen entity: ${entity}`);
        }

        results.push({
          localId,
          serverId: result.id,
          status: 'success',
        });
      } catch (error: any) {
        errors.push({
          localId: change.localId,
          error: error.message,
          status: 'error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Sipariş değişikliği işle
async function handleOrderChange(action: string, data: any, userId: string) {
  if (action === 'create') {
    // Sipariş numarası oluştur
    const year = new Date().getFullYear();
    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: `SIP-${year}` } },
      orderBy: { orderNumber: 'desc' },
    });
    const nextNumber = lastOrder
      ? parseInt(lastOrder.orderNumber.split('-')[2]) + 1
      : 1;
    const orderNumber = `SIP-${year}-${String(nextNumber).padStart(5, '0')}`;

    return await prisma.order.create({
      data: {
        ...data,
        orderNumber,
        createdById: userId,
        source: 'FIELD',
      },
    });
  }

  if (action === 'update') {
    return await prisma.order.update({
      where: { id: data.id },
      data,
    });
  }

  throw new Error(`Bilinmeyen action: ${action}`);
}

// Ziyaret değişikliği işle
async function handleVisitChange(action: string, data: any, userId: string) {
  if (action === 'create') {
    return await prisma.customerVisit.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  throw new Error(`Bilinmeyen action: ${action}`);
}

// Teslimat değişikliği işle
async function handleDeliveryChange(action: string, data: any, userId: string) {
  if (action === 'update') {
    return await prisma.delivery.update({
      where: { id: data.id },
      data,
    });
  }

  if (action === 'complete') {
    return await prisma.delivery.update({
      where: { id: data.id },
      data: {
        status: 'DELIVERED',
        actualDate: new Date(),
        receiverName: data.receiverName,
        signature: data.signature,
        deliveryPhoto: data.deliveryPhoto,
      },
    });
  }

  throw new Error(`Bilinmeyen action: ${action}`);
}

// Ödeme değişikliği işle
async function handlePaymentChange(action: string, data: any, userId: string) {
  if (action === 'create') {
    // Ödeme numarası oluştur
    const year = new Date().getFullYear();
    const lastPayment = await prisma.payment.findFirst({
      where: { paymentNumber: { startsWith: `TAH-${year}` } },
      orderBy: { paymentNumber: 'desc' },
    });
    const nextNumber = lastPayment
      ? parseInt(lastPayment.paymentNumber.split('-')[2]) + 1
      : 1;
    const paymentNumber = `TAH-${year}-${String(nextNumber).padStart(5, '0')}`;

    const payment = await prisma.payment.create({
      data: {
        ...data,
        paymentNumber,
        collectedBy: userId,
        collectedAt: new Date(),
      },
    });

    // Müşteri bakiyesini güncelle
    await prisma.customer.update({
      where: { id: data.customerId },
      data: {
        currentBalance: { decrement: data.amount },
      },
    });

    return payment;
  }

  throw new Error(`Bilinmeyen action: ${action}`);
}

// Ana senkronizasyon
export const syncData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lastSync, changes } = req.body;

    // Önce offline değişiklikleri işle
    let pushResults = null;
    if (changes && changes.length > 0) {
      const pushResponse = await pushOfflineChanges(
        { ...req, body: { changes } } as AuthRequest,
        res,
        next
      );
      pushResults = pushResponse;
    }

    // Sonra güncel verileri getir
    const offlineData = await getOfflineDataInternal(req.user!, lastSync);

    res.json({
      success: true,
      data: {
        pushed: pushResults,
        pulled: offlineData,
        syncTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Internal offline data helper
async function getOfflineDataInternal(user: any, lastSync?: string) {
  const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
  const data: any = {};

  // Temel veriler
  data.products = await prisma.product.findMany({
    where: { status: 'ACTIVE', updatedAt: { gte: lastSyncDate } },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      basePrice: true,
      unit: true,
      categoryId: true,
    },
  });

  data.categories = await prisma.category.findMany({
    where: { isActive: true, updatedAt: { gte: lastSyncDate } },
    select: { id: true, name: true, parentId: true },
  });

  return data;
}

// Çakışma çözümü
export const resolveConflicts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { conflicts, resolutions } = req.body;

    // Her çakışma için çözümü uygula
    const results = [];

    for (const resolution of resolutions) {
      const { conflictId, resolveWith } = resolution;
      const conflict = conflicts.find((c: any) => c.id === conflictId);

      if (!conflict) continue;

      if (resolveWith === 'local') {
        // Yerel veriyi uygula
        await applyLocalData(conflict.entity, conflict.localData);
      }
      // 'server' seçilmişse zaten sunucu verisi güncel

      results.push({
        conflictId,
        resolved: true,
        resolvedWith: resolveWith,
      });
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

async function applyLocalData(entity: string, data: any) {
  switch (entity) {
    case 'order':
      await prisma.order.update({
        where: { id: data.id },
        data,
      });
      break;
    case 'customer':
      await prisma.customer.update({
        where: { id: data.id },
        data,
      });
      break;
    // Diğer entity'ler...
  }
}
