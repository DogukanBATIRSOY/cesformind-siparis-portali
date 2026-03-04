import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { MovementType, Prisma } from '@prisma/client';

// Depo listesi
export const getWarehouses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            stocks: true,
            users: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
};

// Depo detayı
export const getWarehouseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: {
            stocks: true,
            orders: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new AppError('Depo bulunamadı', 404);
    }

    res.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// Depo oluştur
export const createWarehouse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, name, address, city, isDefault } = req.body;

    // Kod kontrolü
    const existingCode = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existingCode) {
      throw new AppError('Bu depo kodu zaten kullanılıyor', 400);
    }

    // Varsayılan depo ise diğerlerini güncelle
    if (isDefault) {
      await prisma.warehouse.updateMany({
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code,
        name,
        address,
        city,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// Depo güncelle
export const updateWarehouse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, address, city, isActive, isDefault } = req.body;

    const existing = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Depo bulunamadı', 404);
    }

    // Kod kontrolü
    if (code && code !== existing.code) {
      const existingCode = await prisma.warehouse.findUnique({
        where: { code },
      });

      if (existingCode) {
        throw new AppError('Bu depo kodu zaten kullanılıyor', 400);
      }
    }

    // Varsayılan depo ise diğerlerini güncelle
    if (isDefault) {
      await prisma.warehouse.updateMany({
        where: { NOT: { id } },
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        code,
        name,
        address,
        city,
        isActive,
        isDefault,
      },
    });

    res.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// Depo sil
export const deleteWarehouse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!warehouse) {
      throw new AppError('Depo bulunamadı', 404);
    }

    if (warehouse._count.orders > 0) {
      throw new AppError('Siparişi olan depo silinemez', 400);
    }

    // Gerçek stoku olan kayıtları kontrol et (quantity > 0)
    const stocksWithQuantity = await prisma.warehouseStock.findMany({
      where: {
        warehouseId: id,
        quantity: { gt: 0 },
      },
    });

    if (stocksWithQuantity.length > 0) {
      throw new AppError(`Bu depoda ${stocksWithQuantity.length} ürün için stok bulunmaktadır. Önce stokları transfer edin.`, 400);
    }

    // Transaction ile sil
    await prisma.$transaction(async (tx) => {
      // Önce sıfır stoklu kayıtları temizle
      await tx.warehouseStock.deleteMany({
        where: { warehouseId: id },
      });

      // Stok hareketlerini sil
      await tx.stockMovement.deleteMany({
        where: { warehouseId: id },
      });

      // Depoyu sil
      await tx.warehouse.delete({
        where: { id },
      });
    });

    res.json({
      success: true,
      message: 'Depo başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Depo stokları
export const getWarehouseStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50', search, categoryId, lowStock } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      warehouseId: id,
    };

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
        ],
      };
    }

    if (categoryId) {
      where.product = {
        ...where.product,
        categoryId,
      };
    }

    const [stocks, total] = await Promise.all([
      prisma.warehouseStock.findMany({
        where,
        skip,
        take,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
              minStock: true,
              category: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.warehouseStock.count({ where }),
    ]);

    // Düşük stok filtresi
    let filteredStocks = stocks;
    if (lowStock === 'true') {
      filteredStocks = stocks.filter(
        (stock) => Number(stock.quantity) - Number(stock.reserved) <= stock.product.minStock
      );
    }

    res.json({
      success: true,
      data: filteredStocks,
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: lowStock === 'true' ? filteredStocks.length : total,
        totalPages: Math.ceil((lowStock === 'true' ? filteredStocks.length : total) / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Stok güncelle
export const updateStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { productId, quantity, type, notes } = req.body;

    const currentStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: id,
          productId,
        },
      },
    });

    const previousQuantity = currentStock?.quantity || new Prisma.Decimal(0);
    const newQuantity = new Prisma.Decimal(quantity);

    // Stok kaydını güncelle veya oluştur
    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: id,
          productId,
        },
      },
      create: {
        warehouseId: id,
        productId,
        quantity: newQuantity,
      },
      update: {
        quantity: newQuantity,
      },
    });

    // Stok hareketi kaydet
    const movementType: MovementType = newQuantity.greaterThan(previousQuantity) ? 'IN' : 'OUT';
    const movementQuantity = newQuantity.sub(previousQuantity).abs();

    await prisma.stockMovement.create({
      data: {
        warehouseId: id,
        productId,
        type: type || movementType,
        quantity: movementQuantity,
        previousStock: previousQuantity,
        newStock: newQuantity,
        referenceType: 'MANUAL',
        notes,
        createdBy: req.user!.id,
      },
    });

    res.json({
      success: true,
      message: 'Stok güncellendi',
    });
  } catch (error) {
    next(error);
  }
};

// Stok transfer
export const transferStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = req.body;

    if (fromWarehouseId === toWarehouseId) {
      throw new AppError('Kaynak ve hedef depo aynı olamaz', 400);
    }

    const qty = new Prisma.Decimal(quantity);

    // Kaynak depo stok kontrolü
    const sourceStock = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: fromWarehouseId,
          productId,
        },
      },
    });

    if (!sourceStock) {
      throw new AppError('Kaynak depoda bu ürün için stok kaydı bulunamadı', 404);
    }

    const sourceQuantity = new Prisma.Decimal(sourceStock.quantity.toString());
    const sourceReserved = new Prisma.Decimal(sourceStock.reserved?.toString() || '0');
    const availableStock = sourceQuantity.sub(sourceReserved);

    if (availableStock.lessThan(qty)) {
      throw new AppError(`Yetersiz stok. Mevcut: ${availableStock.toString()}`, 400);
    }

    await prisma.$transaction(async (tx) => {
      // Kaynak depodan düş
      const newSourceQuantity = sourceQuantity.sub(qty);
      await tx.warehouseStock.update({
        where: {
          warehouseId_productId: {
            warehouseId: fromWarehouseId,
            productId,
          },
        },
        data: { quantity: newSourceQuantity },
      });

      // Kaynak depo stok hareketi
      await tx.stockMovement.create({
        data: {
          warehouseId: fromWarehouseId,
          productId,
          type: 'TRANSFER',
          quantity: qty,
          previousStock: sourceQuantity,
          newStock: newSourceQuantity,
          referenceType: 'TRANSFER',
          referenceId: toWarehouseId,
          notes: notes || `Hedef depoya transfer`,
          createdBy: req.user!.id,
        },
      });

      // Hedef depo stok kontrolü
      const targetStock = await tx.warehouseStock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: toWarehouseId,
            productId,
          },
        },
      });

      const previousTargetQuantity = targetStock 
        ? new Prisma.Decimal(targetStock.quantity.toString()) 
        : new Prisma.Decimal(0);
      const newTargetQuantity = previousTargetQuantity.add(qty);

      // Hedef depoya ekle
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: toWarehouseId,
            productId,
          },
        },
        create: {
          warehouseId: toWarehouseId,
          productId,
          quantity: qty,
        },
        update: {
          quantity: newTargetQuantity,
        },
      });

      // Hedef depo stok hareketi
      await tx.stockMovement.create({
        data: {
          warehouseId: toWarehouseId,
          productId,
          type: 'TRANSFER',
          quantity: qty,
          previousStock: previousTargetQuantity,
          newStock: newTargetQuantity,
          referenceType: 'TRANSFER',
          referenceId: fromWarehouseId,
          notes: notes || `Kaynak depodan transfer`,
          createdBy: req.user!.id,
        },
      });
    });

    res.json({
      success: true,
      message: 'Stok transferi tamamlandı',
    });
  } catch (error) {
    next(error);
  }
};

// Stok hareketleri
export const getStockMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      page = '1',
      limit = '50',
      productId,
      type,
      startDate,
      endDate,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      warehouseId: id,
    };

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              unit: true,
            },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      success: true,
      data: movements,
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

// Düşük stok ürünleri
export const getLowStockProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { warehouseId } = req.query;

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    const stocks = await prisma.warehouseStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            minStock: true,
            category: {
              select: { name: true },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Düşük stokları filtrele
    const lowStockProducts = stocks.filter(
      (stock) => Number(stock.quantity) - Number(stock.reserved) <= stock.product.minStock
    );

    res.json({
      success: true,
      data: lowStockProducts,
      meta: {
        total: lowStockProducts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
