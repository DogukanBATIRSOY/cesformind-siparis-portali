import { Router } from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  updateUserStatus,
  updateUserPermissions,
  resetUserPassword,
  getRolesAndPermissions,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Rol ve izin bilgilerini getir (SUPER_ADMIN ve DEALER_ADMIN)
router.get('/roles-permissions', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), getRolesAndPermissions);

// Kullanıcı listesi (SUPER_ADMIN ve DEALER_ADMIN)
router.get('/', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), getUsers);

// Yeni kullanıcı oluştur (SUPER_ADMIN ve DEALER_ADMIN)
router.post('/', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), createUser);

// Kullanıcı detayı (SUPER_ADMIN ve DEALER_ADMIN)
router.get('/:id', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), getUserById);

// Kullanıcı güncelle (SUPER_ADMIN ve DEALER_ADMIN)
router.put('/:id', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), updateUser);

// Kullanıcı sil (SUPER_ADMIN ve DEALER_ADMIN)
router.delete('/:id', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), deleteUser);

// Kullanıcı durumu güncelle (SUPER_ADMIN ve DEALER_ADMIN)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), updateUserStatus);

// Kullanıcı izinlerini güncelle (SUPER_ADMIN ve DEALER_ADMIN)
router.patch('/:id/permissions', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), updateUserPermissions);

// Kullanıcı şifresini sıfırla (SUPER_ADMIN ve DEALER_ADMIN)
router.post('/:id/reset-password', authorize('SUPER_ADMIN', 'DEALER_ADMIN'), resetUserPassword);

export default router;
