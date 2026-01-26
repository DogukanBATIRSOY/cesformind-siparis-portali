import { Router } from 'express';
import { 
  getWarehouses, 
  getWarehouseById, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse,
  getWarehouseStock,
  updateStock,
  transferStock,
  getStockMovements,
  getLowStockProducts
} from '../controllers/warehouse.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Düşük stok uyarıları
router.get('/low-stock', authorize('ADMIN', 'WAREHOUSE'), getLowStockProducts);

// Depo listesi ve CRUD
router.get('/', authorize('ADMIN', 'WAREHOUSE'), getWarehouses);
router.post('/', authorize('ADMIN'), createWarehouse);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE'), getWarehouseById);
router.put('/:id', authorize('ADMIN'), updateWarehouse);
router.delete('/:id', authorize('ADMIN'), deleteWarehouse);

// Stok yönetimi
router.get('/:id/stock', authorize('ADMIN', 'WAREHOUSE'), getWarehouseStock);
router.post('/:id/stock', authorize('ADMIN', 'WAREHOUSE'), updateStock);
router.post('/transfer', authorize('ADMIN', 'WAREHOUSE'), transferStock);
router.get('/:id/movements', authorize('ADMIN', 'WAREHOUSE'), getStockMovements);

export default router;
