import { Router } from 'express';
import { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  updateCustomerStatus,
  approveCustomer,
  rejectCustomer,
  getCustomerOrders,
  getCustomerPayments,
  getCustomerBalance,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  addCustomerVisit
} from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Müşteri listesi ve CRUD
router.get('/', authorize('ADMIN', 'SALES_REP'), getCustomers);
router.post('/', authorize('ADMIN', 'SALES_REP'), createCustomer);
router.get('/:id', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), getCustomerById);
router.put('/:id', authorize('ADMIN', 'SALES_REP'), updateCustomer);
router.delete('/:id', authorize('ADMIN'), deleteCustomer);

// Müşteri durumu yönetimi
router.patch('/:id/status', authorize('ADMIN'), updateCustomerStatus);
router.post('/:id/approve', authorize('ADMIN'), approveCustomer);
router.post('/:id/reject', authorize('ADMIN'), rejectCustomer);

// Müşteri şifre sıfırlama (Admin)
router.post('/:id/reset-password', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const { prisma } = await import('../lib/prisma.js');
    const bcrypt = await import('bcryptjs');

    // Müşteriyi ve bağlı kullanıcıyı bul
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı',
      });
    }

    if (!customer.user) {
      return res.status(400).json({
        success: false,
        message: 'Bu müşteriye bağlı kullanıcı bulunamadı',
      });
    }

    // Yeni şifreyi oluştur veya rastgele şifre üret
    const password = newPassword || generateRandomPassword();
    const hashedPassword = await bcrypt.default.hash(password, 10);

    // Kullanıcının şifresini güncelle
    await prisma.user.update({
      where: { id: customer.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true, // İlk girişte şifre değiştirmesi zorunlu
        passwordChangedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Şifre başarıyla sıfırlandı',
      data: {
        customerId: customer.id,
        customerName: customer.companyName,
        userEmail: customer.user.email,
        temporaryPassword: password, // Admin'e göster
      },
    });
  } catch (error) {
    next(error);
  }
});

// Rastgele şifre üretici
function generateRandomPassword(): string {
  const length = 10;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  // En az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter garantisi
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%'[Math.floor(Math.random() * 5)];
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  // Şifreyi karıştır
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Müşteri siparişleri ve ödemeleri
router.get('/:id/orders', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), getCustomerOrders);
router.get('/:id/payments', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), getCustomerPayments);
router.get('/:id/balance', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), getCustomerBalance);

// Müşteri adresleri
router.post('/:id/addresses', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), addCustomerAddress);
router.put('/:id/addresses/:addressId', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), updateCustomerAddress);
router.delete('/:id/addresses/:addressId', authorize('ADMIN', 'SALES_REP'), deleteCustomerAddress);

// Müşteri ziyaretleri
router.post('/:id/visits', authorize('ADMIN', 'SALES_REP'), addCustomerVisit);

export default router;
