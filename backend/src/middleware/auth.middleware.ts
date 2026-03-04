import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

// Roller
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DEALER_ADMIN: 'DEALER_ADMIN',
  SALES_REP: 'SALES_REP',
  WAREHOUSE_USER: 'WAREHOUSE_USER',
  DELIVERY: 'DELIVERY',
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN', // Geriye uyumluluk için
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    customerId?: string;
    warehouseId?: string;
    permissions?: any[];
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
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
          permissions: true,
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
        permissions: user.permissions,
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

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli',
      });
    }

    // Geriye uyumluluk: ADMIN rolü SUPER_ADMIN ve DEALER_ADMIN'i kapsar
    const userRole = req.user.role;
    let hasAccess = roles.includes(userRole);

    // ADMIN -> SUPER_ADMIN veya DEALER_ADMIN
    if (!hasAccess && roles.includes('ADMIN')) {
      hasAccess = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.DEALER_ADMIN;
    }

    // SUPER_ADMIN her şeye erişebilir
    if (!hasAccess && userRole === ROLES.SUPER_ADMIN) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok',
      });
    }

    next();
  };
};

// Modül bazlı izin kontrolü
export const authorizeModule = (module: string, action: 'view' | 'create' | 'edit' | 'delete') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli',
      });
    }

    // SUPER_ADMIN her şeye erişebilir
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // İzinleri kontrol et
    const permissions = req.user.permissions || [];
    const modulePermission = permissions.find((p: any) => p.module === module);

    if (!modulePermission) {
      return res.status(403).json({
        success: false,
        message: `${module} modülüne erişim yetkiniz yok`,
      });
    }

    const actionMap: Record<string, string> = {
      view: 'canView',
      create: 'canCreate',
      edit: 'canEdit',
      delete: 'canDelete',
    };

    const permissionKey = actionMap[action];
    if (!modulePermission[permissionKey]) {
      return res.status(403).json({
        success: false,
        message: `Bu işlem için yetkiniz yok`,
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

  // SUPER_ADMIN ve DEALER_ADMIN her şeye erişebilir
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.DEALER_ADMIN) {
    return next();
  }

  // Müşteri sadece kendi verilerine erişebilir
  if (req.user.role === ROLES.CUSTOMER) {
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
