import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';

// Roller
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DEALER_ADMIN: 'DEALER_ADMIN',
  SALES_REP: 'SALES_REP',
  WAREHOUSE_USER: 'WAREHOUSE_USER',
  DELIVERY: 'DELIVERY',
  CUSTOMER: 'CUSTOMER',
};

// Modüller
export const MODULES = [
  'customers',
  'products',
  'orders',
  'deliveries',
  'payments',
  'warehouses',
  'reports',
  'users',
  'settings',
];

// Rol açıklamaları
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Süper Admin',
  DEALER_ADMIN: 'Bayi Admin',
  SALES_REP: 'Plasiyer',
  WAREHOUSE_USER: 'Depo Kullanıcısı',
  DELIVERY: 'Teslimat',
  CUSTOMER: 'Müşteri',
};

// Modül açıklamaları
export const MODULE_LABELS: Record<string, string> = {
  customers: 'Müşteriler',
  products: 'Ürünler',
  orders: 'Siparişler',
  deliveries: 'Teslimatlar',
  payments: 'Ödemeler',
  warehouses: 'Depolar',
  reports: 'Raporlar',
  users: 'Kullanıcılar',
  settings: 'Ayarlar',
};

// Varsayılan izinler (rol bazlı)
export const DEFAULT_PERMISSIONS: Record<string, Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>> = {
  SUPER_ADMIN: {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    products: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    payments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    warehouses: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    settings: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  DEALER_ADMIN: {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    settings: { canView: true, canCreate: false, canEdit: true, canDelete: false },
  },
  SALES_REP: {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    warehouses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  WAREHOUSE_USER: {
    customers: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    payments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  DELIVERY: {
    customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    products: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    payments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    warehouses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  CUSTOMER: {
    customers: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    payments: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    warehouses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: any[];
  };
}

// Kullanıcı listesi
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    // Eğer DEALER_ADMIN ise sadece kendi oluşturduğu kullanıcıları görebilir
    if (req.user?.role === ROLES.DEALER_ADMIN) {
      where.createdById = req.user.id;
    }

    // SUPER_ADMIN değilse SUPER_ADMIN kullanıcıları göremez
    if (req.user?.role !== ROLES.SUPER_ADMIN) {
      where.role = { not: ROLES.SUPER_ADMIN };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
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
          createdById: true,
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
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
          permissions: true,
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
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        createdById: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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
        permissions: true,
      },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Yetkli kontrol: DEALER_ADMIN sadece kendi oluşturduğu kullanıcıları görebilir
    if (req.user?.role === ROLES.DEALER_ADMIN && user.createdById !== req.user.id && user.id !== req.user.id) {
      throw new AppError('Bu kullanıcıyı görüntüleme yetkiniz yok', 403);
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
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      permissions,
    } = req.body;

    // Validasyon
    if (!email || !phone || !password || !firstName || !lastName || !role) {
      throw new AppError('Tüm alanlar zorunludur', 400);
    }

    // Rol kontrolü
    if (!Object.values(ROLES).includes(role)) {
      throw new AppError('Geçersiz rol', 400);
    }

    // SUPER_ADMIN sadece SUPER_ADMIN tarafından oluşturulabilir
    if (role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin sadece Süper Admin tarafından oluşturulabilir', 403);
    }

    // DEALER_ADMIN sadece SUPER_ADMIN veya DEALER_ADMIN tarafından oluşturulabilir
    if (role === ROLES.DEALER_ADMIN && ![ROLES.SUPER_ADMIN, ROLES.DEALER_ADMIN].includes(req.user?.role || '')) {
      throw new AppError('Bayi Admin sadece Süper Admin veya Bayi Admin tarafından oluşturulabilir', 403);
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

    // Kullanıcı ve izinleri transaction ile oluştur
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          warehouseId,
          customerId,
          createdById: req.user?.id,
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

      // İzinleri oluştur
      const userPermissions = permissions || DEFAULT_PERMISSIONS[role] || {};
      const permissionData = Object.entries(userPermissions).map(([module, perms]: [string, any]) => ({
        userId: newUser.id,
        module,
        canView: perms.canView || false,
        canCreate: perms.canCreate || false,
        canEdit: perms.canEdit || false,
        canDelete: perms.canDelete || false,
      }));

      if (permissionData.length > 0) {
        await tx.userPermission.createMany({
          data: permissionData,
        });
      }

      return newUser;
    });

    // İzinleri tekrar çek
    const userWithPermissions = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        permissions: true,
      },
    });

    res.status(201).json({
      success: true,
      data: userWithPermissions,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı güncelle
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email, phone, firstName, lastName, role, warehouseId, customerId, status, permissions } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Yetkli kontrol: DEALER_ADMIN sadece kendi oluşturduğu kullanıcıları güncelleyebilir
    if (req.user?.role === ROLES.DEALER_ADMIN && existingUser.createdById !== req.user.id) {
      throw new AppError('Bu kullanıcıyı güncelleme yetkiniz yok', 403);
    }

    // SUPER_ADMIN rolü sadece SUPER_ADMIN tarafından değiştirilebilir
    if (existingUser.role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin kullanıcısını güncelleme yetkiniz yok', 403);
    }

    // Rol değişikliği kontrolü
    if (role && role !== existingUser.role) {
      if (role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
        throw new AppError('Süper Admin rolü sadece Süper Admin tarafından atanabilir', 403);
      }
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

    // Transaction ile güncelle
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          email,
          phone,
          firstName,
          lastName,
          role,
          status,
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

      // İzinleri güncelle
      if (permissions) {
        // Mevcut izinleri sil
        await tx.userPermission.deleteMany({
          where: { userId: id },
        });

        // Yeni izinleri oluştur
        const permissionData = Object.entries(permissions).map(([module, perms]: [string, any]) => ({
          userId: id,
          module,
          canView: perms.canView || false,
          canCreate: perms.canCreate || false,
          canEdit: perms.canEdit || false,
          canDelete: perms.canDelete || false,
        }));

        if (permissionData.length > 0) {
          await tx.userPermission.createMany({
            data: permissionData,
          });
        }
      }

      return updatedUser;
    });

    // İzinleri tekrar çek
    const userWithPermissions = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
        permissions: true,
      },
    });

    res.json({
      success: true,
      data: userWithPermissions,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı sil
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdOrders: true,
            deliveries: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Kendini silemez
    if (user.id === req.user?.id) {
      throw new AppError('Kendinizi silemezsiniz', 400);
    }

    // Yetkli kontrol: DEALER_ADMIN sadece kendi oluşturduğu kullanıcıları silebilir
    if (req.user?.role === ROLES.DEALER_ADMIN && user.createdById !== req.user.id) {
      throw new AppError('Bu kullanıcıyı silme yetkiniz yok', 403);
    }

    // SUPER_ADMIN sadece SUPER_ADMIN tarafından silinebilir
    if (user.role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin kullanıcısını silme yetkiniz yok', 403);
    }

    // İşlem görmüş kullanıcılar silinemez
    if (user._count.createdOrders > 0 || user._count.deliveries > 0) {
      throw new AppError('İşlem geçmişi olan kullanıcılar silinemez. Kullanıcıyı pasife alabilirsiniz.', 400);
    }

    // Transaction ile sil
    await prisma.$transaction(async (tx) => {
      // İzinleri sil
      await tx.userPermission.deleteMany({
        where: { userId: id },
      });

      // Activity logları sil
      await tx.activityLog.deleteMany({
        where: { userId: id },
      });

      // Kullanıcıyı sil
      await tx.user.delete({
        where: { id },
      });
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
export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Geçerli bir durum belirtilmeli', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Kendini pasife alamaz
    if (id === req.user?.id && status !== 'ACTIVE') {
      throw new AppError('Kendinizi pasife alamazsınız', 400);
    }

    // Yetkli kontrol
    if (req.user?.role === ROLES.DEALER_ADMIN && existingUser.createdById !== req.user.id) {
      throw new AppError('Bu kullanıcının durumunu değiştirme yetkiniz yok', 403);
    }

    // SUPER_ADMIN sadece SUPER_ADMIN tarafından değiştirilebilir
    if (existingUser.role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin durumunu değiştirme yetkiniz yok', 403);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
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

// Kullanıcı izinlerini güncelle
export const updateUserPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      throw new AppError('Geçerli izin verisi belirtilmeli', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Yetkli kontrol
    if (req.user?.role === ROLES.DEALER_ADMIN && existingUser.createdById !== req.user.id) {
      throw new AppError('Bu kullanıcının izinlerini değiştirme yetkiniz yok', 403);
    }

    // SUPER_ADMIN izinleri sadece SUPER_ADMIN tarafından değiştirilebilir
    if (existingUser.role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin izinlerini değiştirme yetkiniz yok', 403);
    }

    // Transaction ile güncelle
    await prisma.$transaction(async (tx) => {
      // Mevcut izinleri sil
      await tx.userPermission.deleteMany({
        where: { userId: id },
      });

      // Yeni izinleri oluştur
      const permissionData = Object.entries(permissions).map(([module, perms]: [string, any]) => ({
        userId: id,
        module,
        canView: perms.canView || false,
        canCreate: perms.canCreate || false,
        canEdit: perms.canEdit || false,
        canDelete: perms.canDelete || false,
      }));

      if (permissionData.length > 0) {
        await tx.userPermission.createMany({
          data: permissionData,
        });
      }
    });

    // Güncellenmiş izinleri getir
    const updatedPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
    });

    res.json({
      success: true,
      data: updatedPermissions,
    });
  } catch (error) {
    next(error);
  }
};

// Kullanıcı şifresini sıfırla
export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw new AppError('Şifre en az 8 karakter olmalıdır', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // Yetkli kontrol
    if (req.user?.role === ROLES.DEALER_ADMIN && existingUser.createdById !== req.user.id) {
      throw new AppError('Bu kullanıcının şifresini sıfırlama yetkiniz yok', 403);
    }

    // SUPER_ADMIN şifresi sadece SUPER_ADMIN tarafından sıfırlanabilir
    if (existingUser.role === ROLES.SUPER_ADMIN && req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new AppError('Süper Admin şifresini sıfırlama yetkiniz yok', 403);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla sıfırlandı',
    });
  } catch (error) {
    next(error);
  }
};

// Rol ve izin bilgilerini getir
export const getRolesAndPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        roles: ROLES,
        roleLabels: ROLE_LABELS,
        modules: MODULES,
        moduleLabels: MODULE_LABELS,
        defaultPermissions: DEFAULT_PERMISSIONS,
      },
    });
  } catch (error) {
    next(error);
  }
};
