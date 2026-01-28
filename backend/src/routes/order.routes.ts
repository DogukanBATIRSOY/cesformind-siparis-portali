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

// ==========================================
// GUEST ORDER - Üye olmadan sipariş (Public)
// ==========================================
router.post('/guest', async (req, res, next) => {
  try {
    const { prisma } = await import('../lib/prisma.js');
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      address, 
      city, 
      district, 
      notes, 
      paymentMethod,
      items, 
      totalAmount 
    } = req.body;

    // Validasyon
    if (!firstName || !lastName || !email || !phone || !address || !city || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Gerekli alanlar eksik',
      });
    }

    // Sipariş numarası oluştur
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: `GST-${datePrefix}` } },
      orderBy: { orderNumber: 'desc' },
    });

    let orderSequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]) || 0;
      orderSequence = lastSequence + 1;
    }
    const orderNumber = `GST-${datePrefix}-${String(orderSequence).padStart(4, '0')}`;

    // Guest müşteri oluştur veya bul
    let guestCustomer = await prisma.customer.findFirst({
      where: { 
        contactEmail: email,
        type: 'OTHER', // Guest müşteriler OTHER tipinde
        code: { startsWith: 'GUEST-' }
      },
    });

    if (!guestCustomer) {
      // Yeni guest müşteri kodu oluştur
      const lastGuest = await prisma.customer.findFirst({
        where: { code: { startsWith: 'GUEST-' } },
        orderBy: { code: 'desc' },
      });
      
      let guestNumber = 1;
      if (lastGuest) {
        const parts = lastGuest.code.split('-');
        if (parts.length === 2) {
          guestNumber = parseInt(parts[1], 10) + 1;
        }
      }
      const guestCode = `GUEST-${String(guestNumber).padStart(5, '0')}`;

      guestCustomer = await prisma.customer.create({
        data: {
          code: guestCode,
          companyName: `${firstName} ${lastName}`,
          type: 'OTHER',
          status: 'ACTIVE',
          contactName: `${firstName} ${lastName}`,
          contactPhone: phone,
          contactEmail: email,
          addresses: {
            create: {
              title: 'Teslimat Adresi',
              address: address,
              district: district || '',
              city: city,
              isDefault: true,
              isDelivery: true,
              isBilling: true,
            },
          },
        },
      });
    }

    // Ürünleri kontrol et ve sipariş kalemlerini hazırla
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Ürün bulunamadı: ${item.productId}`,
        });
      }

      const unitPrice = item.unitPrice || product.basePrice;
      const lineTotal = unitPrice * item.quantity;
      calculatedTotal += lineTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: lineTotal,
        discount: 0,
      });
    }

    // Sipariş oluştur
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: guestCustomer.id,
        status: 'PENDING', // Açık sipariş olarak oluştur
        totalAmount: calculatedTotal,
        taxAmount: 0,
        discountAmount: 0,
        notes: notes ? `[GUEST] ${notes}\nTel: ${phone}\nAdres: ${address}, ${district}, ${city}\nÖdeme: ${paymentMethod === 'CASH_ON_DELIVERY' ? 'Kapıda Ödeme' : 'Online Ödeme'}` : `[GUEST] Tel: ${phone}\nAdres: ${address}, ${district}, ${city}\nÖdeme: ${paymentMethod === 'CASH_ON_DELIVERY' ? 'Kapıda Ödeme' : 'Online Ödeme'}`,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    // Console'a bilgi yaz
    console.log(`\n🛒 YENİ GUEST SİPARİŞ`);
    console.log(`   Sipariş No: ${orderNumber}`);
    console.log(`   Müşteri: ${firstName} ${lastName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Telefon: ${phone}`);
    console.log(`   Tutar: ${calculatedTotal} TL`);
    console.log(`   Ödeme: ${paymentMethod === 'CASH_ON_DELIVERY' ? 'Kapıda Ödeme' : 'Online Ödeme'}\n`);

    res.status(201).json({
      success: true,
      message: 'Siparişiniz başarıyla oluşturuldu',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerName: `${firstName} ${lastName}`,
        email,
        phone,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Authenticated Routes
// ==========================================
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
