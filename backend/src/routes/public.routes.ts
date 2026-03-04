import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Public ürün listesi - Auth gerektirmez
router.get('/products', async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      categoryId,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      status: 'ACTIVE', // Sadece aktif ürünler
      basePrice: { gt: 0 }, // Fiyatı girilmiş ürünler
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          basePrice: true,
          taxRate: true,
          unit: true,
          packSize: true,
          isFeatured: true,
          image: true,
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
            select: {
              url: true,
              alt: true,
            },
          },
          warehouseStocks: {
            select: {
              quantity: true,
              reserved: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Stok hesapla
    const productsWithStock = products.map((product) => {
      const totalStock = product.warehouseStocks.reduce(
        (sum, stock) => sum + Number(stock.quantity) - Number(stock.reserved),
        0
      );
      const { warehouseStocks, images, ...rest } = product;
      return {
        ...rest,
        inStock: totalStock > 0,
        stock: totalStock,
        image: product.image || images[0]?.url || null,
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
});

// Öne çıkan ürünler
router.get('/products/featured', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        basePrice: { gt: 0 },
        isFeatured: true,
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        basePrice: true,
        taxRate: true,
        unit: true,
        isFeatured: true,
        image: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          where: { isMain: true },
          take: 1,
          select: {
            url: true,
            alt: true,
          },
        },
        warehouseStocks: {
          select: {
            quantity: true,
            reserved: true,
          },
        },
      },
    });

    const productsWithStock = products.map((product) => {
      const totalStock = product.warehouseStocks.reduce(
        (sum, stock) => sum + Number(stock.quantity) - Number(stock.reserved),
        0
      );
      const { warehouseStocks, images, ...rest } = product;
      return {
        ...rest,
        inStock: totalStock > 0,
        stock: totalStock,
        image: product.image || images[0]?.url || null,
      };
    });

    res.json({
      success: true,
      data: productsWithStock,
    });
  } catch (error) {
    next(error);
  }
});

// Kategoriler
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // Ana kategoriler
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// Tek ürün detayı
router.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        basePrice: true,
        taxRate: true,
        unit: true,
        packSize: true,
        isFeatured: true,
        image: true,
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
          orderBy: { sortOrder: 'asc' },
          select: {
            url: true,
            alt: true,
            isMain: true,
          },
        },
        warehouseStocks: {
          select: {
            quantity: true,
            reserved: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı',
      });
    }

    const totalStock = product.warehouseStocks.reduce(
      (sum, stock) => sum + Number(stock.quantity) - Number(stock.reserved),
      0
    );
    const { warehouseStocks, ...rest } = product;

    res.json({
      success: true,
      data: {
        ...rest,
        inStock: totalStock > 0,
        stock: totalStock,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
