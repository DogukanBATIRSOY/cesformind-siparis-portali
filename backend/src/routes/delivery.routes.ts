import { Router } from 'express';
import { 
  getDeliveries, 
  getDeliveryById, 
  assignDriver,
  updateDeliveryStatus,
  updateDeliveryLocation,
  completeDelivery,
  failDelivery,
  getDriverDeliveries,
  getDeliveryRoutes,
  createDeliveryRoute,
  updateDeliveryRoute,
  optimizeRoute,
  getDeliveryStats
} from '../controllers/delivery.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// İstatistikler
router.get('/stats', authorize('ADMIN', 'SALES_REP'), getDeliveryStats);

// Teslimatçı kendi teslimatları
router.get('/my-deliveries', authorize('DELIVERY'), getDriverDeliveries);

// Teslimat listesi ve yönetim
router.get('/', authorize('ADMIN', 'SALES_REP', 'WAREHOUSE'), getDeliveries);
router.get('/:id', getDeliveryById);

// Teslimat atama ve durum güncelleme
router.patch('/:id/assign', authorize('ADMIN', 'WAREHOUSE'), assignDriver);
router.patch('/:id/status', authorize('ADMIN', 'WAREHOUSE', 'DELIVERY'), updateDeliveryStatus);
router.patch('/:id/location', authorize('DELIVERY'), updateDeliveryLocation);
router.post('/:id/complete', authorize('DELIVERY'), completeDelivery);
router.post('/:id/fail', authorize('DELIVERY'), failDelivery);

// Rota yönetimi
router.get('/routes', authorize('ADMIN', 'WAREHOUSE'), getDeliveryRoutes);
router.post('/routes', authorize('ADMIN', 'WAREHOUSE'), createDeliveryRoute);
router.put('/routes/:id', authorize('ADMIN', 'WAREHOUSE'), updateDeliveryRoute);
router.post('/routes/:id/optimize', authorize('ADMIN', 'WAREHOUSE'), optimizeRoute);

export default router;
