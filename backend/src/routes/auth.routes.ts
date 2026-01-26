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

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/facebook/callback', facebookCallback);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

export default router;
