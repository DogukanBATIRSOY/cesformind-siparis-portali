import { Router } from 'express';
import { 
  getOrders, 
  getOrderById, 
  createOrder, 
  updateOrder, 
  deleteOrder,
  updateOrderStatus,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  confirmOrder,
  cancelOrder,
  getOrderStats
} from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// İstatistikler
router.get('/stats', authorize('ADMIN', 'SALES_REP'), getOrderStats);

// Sipariş listesi ve CRUD
router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.delete('/:id', authorize('ADMIN'), deleteOrder);

// Sipariş durumu
router.patch('/:id/status', authorize('ADMIN', 'SALES_REP', 'WAREHOUSE'), updateOrderStatus);
router.post('/:id/confirm', authorize('ADMIN', 'SALES_REP'), confirmOrder);
router.post('/:id/cancel', cancelOrder);

// Sipariş kalemleri
router.get('/:id/items', getOrderItems);
router.post('/:id/items', addOrderItem);
router.put('/:id/items/:itemId', updateOrderItem);
router.delete('/:id/items/:itemId', removeOrderItem);

export default router;
