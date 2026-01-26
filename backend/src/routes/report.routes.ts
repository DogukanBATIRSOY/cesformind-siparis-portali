import { Router } from 'express';
import { 
  getDashboardStats,
  getSalesReport,
  getProductReport,
  getCustomerReport,
  getDeliveryReport,
  getPaymentReport,
  getStockReport,
  getSalesRepPerformance,
  exportReport
} from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES_REP'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Satış raporları
router.get('/sales', getSalesReport);
router.get('/sales/by-product', getProductReport);
router.get('/sales/by-customer', getCustomerReport);

// Teslimat raporları
router.get('/deliveries', getDeliveryReport);

// Ödeme raporları
router.get('/payments', getPaymentReport);

// Stok raporları
router.get('/stock', authorize('ADMIN', 'WAREHOUSE'), getStockReport);

// Performans raporları
router.get('/performance/sales-rep', authorize('ADMIN'), getSalesRepPerformance);

// Export
router.post('/export', exportReport);

export default router;
