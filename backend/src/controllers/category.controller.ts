import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// Kategori listesi
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { parentId, isActive } = req.query;

    const where: any = {};

    if (parentId === 'null') {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Kategori ağacı
export const getCategoryTree = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            children: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Kategori detayı
export const getCategoryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Kategori bulunamadı', 404);
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// Kategori ürünleri
export const getCategoryProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { categoryId: id, status: 'ACTIVE' },
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          images: {
            where: { isMain: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where: { categoryId: id, status: 'ACTIVE' } }),
    ]);

    res.json({
      success: true,
      data: products,
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

// Slug oluştur
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Kategori oluştur
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, image, parentId, sortOrder } = req.body;

    let slug = createSlug(name);

    // Slug benzersizlik kontrolü
    const existingSlug = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // parentId boş string veya geçersizse null yap
    const validParentId = parentId && parentId.trim() !== '' ? parentId : null;

    // Eğer parentId varsa, var olup olmadığını kontrol et
    if (validParentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: validParentId },
      });
      if (!parentExists) {
        throw new AppError('Üst kategori bulunamadı', 400);
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        parentId: validParentId,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// Kategori güncelle
export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, image, parentId, sortOrder, isActive } = req.body;

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Kategori bulunamadı', 404);
    }

    let slug = existing.slug;
    if (name && name !== existing.name) {
      slug = createSlug(name);
      const existingSlug = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // parentId boş string veya geçersizse null yap
    const validParentId = parentId && parentId.trim() !== '' ? parentId : null;

    // Kendisini parent olarak seçemez
    if (validParentId === id) {
      throw new AppError('Kategori kendisinin üst kategorisi olamaz', 400);
    }

    // Eğer parentId varsa, var olup olmadığını kontrol et
    if (validParentId) {
      const parentExists = await prisma.category.findUnique({
        where: { id: validParentId },
      });
      if (!parentExists) {
        throw new AppError('Üst kategori bulunamadı', 400);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        image,
        parentId: validParentId,
        sortOrder,
        isActive,
      },
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// Kategori sil
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Kategori bulunamadı', 404);
    }

    if (category._count.products > 0) {
      throw new AppError('Ürünü olan kategori silinemez', 400);
    }

    if (category._count.children > 0) {
      throw new AppError('Alt kategorisi olan kategori silinemez', 400);
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Kategori başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};
