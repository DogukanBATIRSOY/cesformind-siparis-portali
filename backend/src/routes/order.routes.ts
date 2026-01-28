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

// Bireysel kullanıcının kendi siparişleri
router.get('/my-orders', async (req: any, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true },
    });

    if (!user?.customer) {
      return res.json({ success: true, data: [] });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: user.customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    }));

    res.json({ success: true, data: formattedOrders });
  } catch (error) {
    next(error);
  }
});

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
