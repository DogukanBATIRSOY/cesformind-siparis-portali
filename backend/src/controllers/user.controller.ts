import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { UserRole, UserStatus } from '@prisma/client';

// Kullanıcı listesi
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              companyName: true,
              code: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
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

// Kullanıcı detayı
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          include: {
            addresses: true,
          },
        },
        warehouse: true,
        assignedCustomers: {
          select: {
            id: true,
            companyName: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı oluştur
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      role,
      warehouseId,
      customerId,
    } = req.body;

    // Validasyon
    if (!email || !phone || !password || !firstName || !lastName || !role) {
      throw new AppError('Tüm alanlar zorunludur', 400);
    }

    // Email kontrolü
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new AppError('Bu email adresi zaten kullanılıyor', 400);
    }

    // Telefon kontrolü
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      throw new AppError('Bu telefon numarası zaten kullanılıyor', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as UserRole,
        warehouseId,
        customerId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı güncelle
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email, phone, firstName, lastName, role, warehouseId, customerId } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Email kontrolü
    if (email && email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new AppError('Bu email adresi zaten kullanılıyor', 400);
      }
    }

    // Telefon kontrolü
    if (phone && phone !== existingUser.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new AppError('Bu telefon numarası zaten kullanılıyor', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        email,
        phone,
        firstName,
        lastName,
        role: role as UserRole,
        warehouseId,
        customerId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı sil
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı durumu güncelle
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Geçerli bir durum belirtilmeli', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: status as UserStatus },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
