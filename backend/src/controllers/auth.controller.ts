import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { AppError } from '../middleware/error.middleware.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Şifre politikası: min 8 karakter, 1 büyük harf, 1 küçük harf, 1 özel karakter
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 küçük harf içermelidir' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 büyük harf içermelidir' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 özel karakter içermelidir (!@#$%^&*()_+-=[]{};\':"|,.<>/?)' };
  }
  return { valid: true };
};

// Token oluştur
const generateToken = (user: { id: string; email: string; role: string; customerId?: string | null; warehouseId?: string | null }) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      warehouseId: user.warehouseId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Giriş
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email ve şifre gerekli', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
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
    });

    if (!user) {
      throw new AppError('Geçersiz email veya şifre', 401);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Hesabınız aktif değil', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Geçersiz email veya şifre', 401);
    }

    // Son giriş zamanını güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Aktivite logu
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          customer: user.customer,
          warehouse: user.warehouse,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Kayıt (B2B müşteri başvurusu)
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      companyName,
      taxNumber,
      taxOffice,
      customerType,
      address,
      district,
      city,
    } = req.body;

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
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

    // Müşteri kodu oluştur
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    const nextNumber = lastCustomer
      ? parseInt(lastCustomer.code.split('-')[1]) + 1
      : 1;
    const customerCode = `MUS-${String(nextNumber).padStart(4, '0')}`;

    // Transaction ile kullanıcı ve müşteri oluştur
    const result = await prisma.$transaction(async (tx) => {
      // Müşteri oluştur
      const customer = await tx.customer.create({
        data: {
          code: customerCode,
          companyName,
          taxNumber,
          taxOffice,
          type: customerType || 'OTHER',
          status: 'PENDING_APPROVAL',
          contactName: `${firstName} ${lastName}`,
          contactPhone: phone,
          contactEmail: email,
          addresses: {
            create: {
              title: 'Merkez',
              address,
              district,
              city,
              isDefault: true,
              isDelivery: true,
              isBilling: true,
            },
          },
        },
      });

      // Kullanıcı oluştur
      const user = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          customerId: customer.id,
        },
      });

      return { user, customer };
    });

    res.status(201).json({
      success: true,
      message: 'Başvurunuz alındı. Onay sonrası bilgilendirileceksiniz.',
      data: {
        customerId: result.customer.id,
        customerCode: result.customer.code,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Çıkış
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: req.user.id,
        },
      });
    }

    res.json({
      success: true,
      message: 'Başarıyla çıkış yapıldı',
    });
  } catch (error) {
    next(error);
  }
};

// Token yenileme
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token gerekli', 400);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Geçersiz token', 401);
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    next(error);
  }
};

// Şifremi unuttum
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Güvenlik için kullanıcı bulunamasa bile aynı mesajı döndür
      return res.json({
        success: true,
        message: 'Eğer email adresiniz kayıtlıysa, şifre sıfırlama linki gönderilecektir.',
      });
    }

    // TODO: Email gönderme işlemi
    // const resetToken = crypto.randomBytes(32).toString('hex');
    // await sendResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: 'Şifre sıfırlama linki email adresinize gönderildi.',
    });
  } catch (error) {
    next(error);
  }
};

// Şifre sıfırlama
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Token ve yeni şifre gerekli', 400);
    }

    // TODO: Token doğrulama
    // const userId = await verifyResetToken(token);

    // const hashedPassword = await bcrypt.hash(newPassword, 12);
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: { password: hashedPassword },
    // });

    res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi.',
    });
  } catch (error) {
    next(error);
  }
};

// Şifre değiştirme
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Mevcut şifre ve yeni şifre gerekli', 400);
    }

    // Şifre politikası kontrolü
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message!, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Mevcut şifre yanlış', 400);
    }

    // Yeni şifre eski şifre ile aynı olamaz
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError('Yeni şifre mevcut şifre ile aynı olamaz', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi.',
    });
  } catch (error) {
    next(error);
  }
};

// Profil bilgileri
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        customer: {
          include: {
            addresses: true,
          },
        },
        warehouse: true,
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

// Profil güncelleme
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;

    // Telefon kontrolü
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: req.user!.id },
        },
      });

      if (existingPhone) {
        throw new AppError('Bu telefon numarası zaten kullanılıyor', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName,
        lastName,
        phone,
        avatar,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
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

// Facebook OAuth Callback
export const facebookCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      throw new AppError('Yetkilendirme kodu gerekli', 400);
    }

    const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
    const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      throw new AppError('Facebook yapılandırması eksik', 500);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new AppError(tokenData.error.message || 'Facebook token alınamadı', 400);
    }

    const accessToken = tokenData.access_token;

    // Get user info from Facebook
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${accessToken}`
    );

    const fbUser = await userResponse.json();

    if (fbUser.error) {
      throw new AppError(fbUser.error.message || 'Facebook kullanıcı bilgileri alınamadı', 400);
    }

    if (!fbUser.email) {
      throw new AppError('Facebook hesabınızda email adresi bulunamadı. Lütfen email adresinizi Facebook hesabınıza ekleyin.', 400);
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: fbUser.email },
      include: {
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
    });

    if (!user) {
      // Create new user from Facebook data
      user = await prisma.user.create({
        data: {
          email: fbUser.email,
          phone: `fb_${fbUser.id}`, // Placeholder phone
          password: await bcrypt.hash(Math.random().toString(36).slice(-12), 12), // Random password
          firstName: fbUser.first_name || fbUser.name?.split(' ')[0] || 'Facebook',
          lastName: fbUser.last_name || fbUser.name?.split(' ').slice(1).join(' ') || 'User',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          avatar: fbUser.picture?.data?.url || null,
          mustChangePassword: false,
        },
        include: {
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
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('Hesabınız aktif değil', 401);
    }

    // Update last login and avatar
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        avatar: fbUser.picture?.data?.url || user.avatar,
      },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_FACEBOOK',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          customer: user.customer,
          warehouse: user.warehouse,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
