import { Router } from 'express';
import { 
  getPayments, 
  getPaymentById, 
  createPayment, 
  updatePayment, 
  deletePayment,
  getPaymentStats,
  getCustomerPaymentHistory
} from '../controllers/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// İstatistikler
router.get('/stats', authorize('ADMIN', 'SALES_REP'), getPaymentStats);

// Tahsilat listesi ve CRUD
router.get('/', authorize('ADMIN', 'SALES_REP'), getPayments);
router.post('/', authorize('ADMIN', 'SALES_REP', 'DELIVERY'), createPayment);
router.get('/:id', authorize('ADMIN', 'SALES_REP'), getPaymentById);
router.put('/:id', authorize('ADMIN'), updatePayment);
router.delete('/:id', authorize('ADMIN'), deletePayment);

// Müşteri ödeme geçmişi
router.get('/customer/:customerId', authorize('ADMIN', 'SALES_REP', 'CUSTOMER'), getCustomerPaymentHistory);

export default router;
