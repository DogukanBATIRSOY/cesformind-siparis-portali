import { Router } from 'express';
import { 
  login, 
  register, 
  logout, 
  refreshToken, 
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  facebookCallback
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Debug - Kullanıcıları listele (SADECE DEV İÇİN)
router.get('/debug/users', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/facebook/callback', facebookCallback);

// Email doğrulama
router.post('/verify-email', async (req, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email ve doğrulama kodu gerekli',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email zaten doğrulanmış',
      });
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.',
      });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.',
      });
    }

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz doğrulama kodu',
      });
    }

    // Doğrulama başarılı - kullanıcı ve müşteriyi aktif et
    await prisma.$transaction(async (tx) => {
      // Kullanıcıyı güncelle
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpires: null,
          status: 'ACTIVE',
        },
      });

      // Müşteriyi aktif et (sadece bireysel müşteriler için)
      if (user.customer && user.customer.type === 'INDIVIDUAL') {
        await tx.customer.update({
          where: { id: user.customer.id },
          data: { status: 'ACTIVE' },
        });
      }
    });

    res.json({
      success: true,
      message: 'Email doğrulandı! Artık giriş yapabilirsiniz.',
    });
  } catch (error) {
    next(error);
  }
});

// Doğrulama kodu yeniden gönder
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email gerekli',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email zaten doğrulanmış',
      });
    }

    // Yeni kod oluştur
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationExpires: verificationExpires,
      },
    });

    // TODO: Gerçek email gönderimi
    console.log(`\n📧 YENİ DOĞRULAMA KODU`);
    console.log(`   Email: ${email}`);
    console.log(`   Kod: ${verificationCode}`);
    console.log(`   Geçerlilik: 30 dakika\n`);

    res.json({
      success: true,
      message: 'Yeni doğrulama kodu gönderildi.',
    });
  } catch (error) {
    next(error);
  }
});

// Email/Telefon kontrolü (kayıt sırasında kullanılır)
router.post('/check-exists', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const { email, phone } = req.body;
    
    const result: any = { exists: false, details: {} };
    
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, customerId: true, createdAt: true },
      });
      if (user) {
        result.exists = true;
        result.details.email = {
          found: true,
          hasCustomer: !!user.customerId,
          createdAt: user.createdAt,
        };
      }
    }
    
    if (phone) {
      const user = await prisma.user.findUnique({
        where: { phone },
        select: { id: true, phone: true, customerId: true, createdAt: true },
      });
      if (user) {
        result.exists = true;
        result.details.phone = {
          found: true,
          hasCustomer: !!user.customerId,
          createdAt: user.createdAt,
        };
      }
    }
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Yarım kalmış kayıt temizleme (admin olmadan kullanılabilir - dikkatli kullan)
router.delete('/cleanup-registration', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email veya telefon numarası gerekli' });
    }
    
    // Email veya telefon ile kullanıcıyı bul
    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
      include: { customer: true },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    // Sadece müşterisi olmayan veya PENDING_APPROVAL/INACTIVE durumundaki müşterileri temizle
    if (user.customer && !['PENDING_APPROVAL', 'INACTIVE'].includes(user.customer.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kullanıcının aktif müşteri kaydı var, silinemez' 
      });
    }
    
    // Transaction ile sil
    await prisma.$transaction(async (tx) => {
      if (user.customer) {
        // Önce adresleri sil
        await tx.customerAddress.deleteMany({
          where: { customerId: user.customer.id },
        });
        // Müşteriyi sil
        await tx.customer.delete({
          where: { id: user.customer.id },
        });
      }
      // Kullanıcıyı sil
      await tx.user.delete({
        where: { id: user.id },
      });
    });
    
    res.json({ 
      success: true, 
      message: 'Kayıt temizlendi. Tekrar kayıt olabilirsiniz.' 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

export default router;
