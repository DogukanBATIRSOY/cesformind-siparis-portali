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
