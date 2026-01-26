import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    customerId?: string;
    warehouseId?: string;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  customerId?: string;
  warehouseId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme token\'ı bulunamadı',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as JwtPayload;

      // Kullanıcıyı veritabanından kontrol et
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          customerId: true,
          warehouseId: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı bulunamadı',
        });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(401).json({
          success: false,
          message: 'Hesabınız aktif değil',
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        customerId: user.customerId || undefined,
        warehouseId: user.warehouseId || undefined,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş token',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    next();
  };
};

// Sadece kendi verilerine erişim kontrolü
export const authorizeOwn = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Yetkilendirme gerekli',
    });
  }

  // Admin her şeye erişebilir
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Müşteri sadece kendi verilerine erişebilir
  if (req.user.role === 'CUSTOMER') {
    const customerId = req.params.customerId || req.body.customerId;
    if (customerId && customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: 'Bu veriye erişim yetkiniz yok',
      });
    }
  }

  next();
};
