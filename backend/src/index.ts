import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import customerRoutes from './routes/customer.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import orderRoutes from './routes/order.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import warehouseRoutes from './routes/warehouse.routes.js';
import reportRoutes from './routes/report.routes.js';
import syncRoutes from './routes/sync.routes.js';
import publicRoutes from './routes/public.routes.js';
import uploadRoutes from './routes/upload.routes.js';

// Middleware
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public API Routes (no auth required)
app.use('/api/public', publicRoutes);

// API Routes (auth required)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize default settings
async function initializeSettings() {
  try {
    // Email doğrulama ayarı yoksa oluştur (varsayılan: kapalı)
    await prisma.setting.upsert({
      where: { key: 'require_email_verification' },
      update: {},
      create: {
        key: 'require_email_verification',
        value: 'false',
        type: 'boolean',
        group: 'security',
      },
    });
    console.log('✅ Default settings initialized');
  } catch (error) {
    console.error('⚠️ Could not initialize settings:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Cesorder Sipariş Sistemi API Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  await initializeSettings();
});

export { prisma };
export default app;
