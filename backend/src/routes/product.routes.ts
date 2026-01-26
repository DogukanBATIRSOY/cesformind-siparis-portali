import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  getProductByBarcode,
  createProduct, 
  updateProduct, 
  deleteProduct,
  updateProductStatus,
  getProductStock,
  searchProducts
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Ürün arama (tüm roller)
router.get('/search', searchProducts);
router.get('/barcode/:barcode', getProductByBarcode);

// Ürün listesi ve CRUD
router.get('/', getProducts);
router.post('/', authorize('ADMIN', 'WAREHOUSE'), createProduct);
router.get('/:id', getProductById);
router.put('/:id', authorize('ADMIN', 'WAREHOUSE'), updateProduct);
router.delete('/:id', authorize('ADMIN'), deleteProduct);
router.patch('/:id/status', authorize('ADMIN', 'WAREHOUSE'), updateProductStatus);

// Stok bilgisi
router.get('/:id/stock', getProductStock);

export default router;
