import { Router } from 'express';
import { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoryTree,
  getCategoryProducts
} from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Kategori listesi
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategoryById);
router.get('/:id/products', getCategoryProducts);

// Admin only
router.post('/', authorize('ADMIN'), createCategory);
router.put('/:id', authorize('ADMIN'), updateCategory);
router.delete('/:id', authorize('ADMIN'), deleteCategory);

export default router;
