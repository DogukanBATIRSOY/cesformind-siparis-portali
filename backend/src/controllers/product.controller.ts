import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ProductStatus } from '@prisma/client';

// Ürün listesi
export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      categoryId,
      brandId,
      status,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'DISCONTINUED' };
    }

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice as string);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice as string);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            where: { isMain: true },
            take: 1,
          },
          warehouseStocks: {
            select: {
              quantity: true,
              reserved: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Toplam stok hesapla
    const productsWithStock = products.map((product) => {
      const totalStock = product.warehouseStocks.reduce(
        (sum, stock) => sum + Number(stock.quantity) - Number(stock.reserved),
        0
      );
      return {
        ...product,
        totalStock,
      };
    });

    res.json({
      success: true,
      data: productsWithStock,
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

// Ürün detayı
export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        warehouseStocks: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        priceGroupItems: {
          include: {
            priceGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Barkod ile ürün arama
export const getProductByBarcode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: {
          select: { name: true },
        },
        brand: {
          select: { name: true },
        },
        images: {
          where: { isMain: true },
          take: 1,
        },
        warehouseStocks: {
          include: {
            warehouse: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Ürün arama (autocomplete)
export const searchProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, data: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: q as string, mode: 'insensitive' } },
          { sku: { contains: q as string, mode: 'insensitive' } },
          { barcode: { contains: q as string } },
        ],
      },
      take: parseInt(limit as string),
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        basePrice: true,
        unit: true,
        images: {
          where: { isMain: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Ürün oluştur
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      sku,
      barcode,
      name,
      description,
      categoryId,
      brandId,
      unit,
      unitWeight,
      packSize,
      basePrice,
      costPrice,
      taxRate,
      minStock,
      maxStock,
      images,
    } = req.body;

    // SKU kontrolü
    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingSku) {
      throw new AppError('Bu stok kodu zaten kullanılıyor', 400);
    }

    // Barkod kontrolü
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode },
      });

      if (existingBarcode) {
        throw new AppError('Bu barkod zaten kullanılıyor', 400);
      }
    }

    const product = await prisma.product.create({
      data: {
        sku,
        barcode,
        name,
        description,
        categoryId,
        brandId,
        unit,
        unitWeight,
        packSize: packSize || 1,
        basePrice,
        costPrice,
        taxRate: taxRate || 18,
        minStock: minStock || 0,
        maxStock,
        images: images
          ? {
              create: images.map((img: any, index: number) => ({
                url: img.url,
                alt: img.alt || name,
                sortOrder: index,
                isMain: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Ürün güncelle
export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    // SKU kontrolü
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: updateData.sku },
      });

      if (existingSku) {
        throw new AppError('Bu stok kodu zaten kullanılıyor', 400);
      }
    }

    // Barkod kontrolü
    if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: updateData.barcode },
      });

      if (existingBarcode) {
        throw new AppError('Bu barkod zaten kullanılıyor', 400);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: updateData.sku,
        barcode: updateData.barcode,
        name: updateData.name,
        description: updateData.description,
        categoryId: updateData.categoryId,
        brandId: updateData.brandId,
        unit: updateData.unit,
        unitWeight: updateData.unitWeight,
        packSize: updateData.packSize,
        basePrice: updateData.basePrice,
        costPrice: updateData.costPrice,
        taxRate: updateData.taxRate,
        minStock: updateData.minStock,
        maxStock: updateData.maxStock,
        status: updateData.status,
        isFeatured: updateData.isFeatured,
      },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Ürün sil
export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    if (product._count.orderItems > 0) {
      // Siparişte kullanılmışsa sadece durumu güncelle
      await prisma.product.update({
        where: { id },
        data: { status: 'DISCONTINUED' },
      });

      return res.json({
        success: true,
        message: 'Ürün pasife alındı (siparişlerde kullanıldığı için silinemedi)',
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Ürün başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Ürün durumu güncelle
export const updateProductStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'].includes(status)) {
      throw new AppError('Geçerli bir durum belirtilmeli', 400);
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status: status as ProductStatus },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Ürün stok bilgisi
export const getProductStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stocks = await prisma.warehouseStock.findMany({
      where: { productId: id },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const totalStock = stocks.reduce(
      (sum, stock) => sum + Number(stock.quantity) - Number(stock.reserved),
      0
    );

    res.json({
      success: true,
      data: {
        stocks,
        totalStock,
        totalReserved: stocks.reduce((sum, stock) => sum + Number(stock.reserved), 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
