import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin kullanıcı - Şifre: Admin123!
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cesformind.com' },
    update: {
      password: adminPassword,
      mustChangePassword: false,
    },
    create: {
      email: 'admin@cesformind.com',
      phone: '5001234567',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false, // Test için false
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Varsayılan depo
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MERKEZ' },
    update: {},
    create: {
      code: 'MERKEZ',
      name: 'Merkez Depo',
      address: 'Organize Sanayi Bölgesi No:1',
      city: 'İstanbul',
      isDefault: true,
      isActive: true,
    },
  });
  console.log('✅ Default warehouse created:', warehouse.name);

  // Depo görevlisi - Şifre: Depo123!
  const warehouseUserPassword = await bcrypt.hash('Depo123!', 12);
  const warehouseUser = await prisma.user.upsert({
    where: { email: 'depo@cesformind.com' },
    update: {
      password: warehouseUserPassword,
      mustChangePassword: false,
    },
    create: {
      email: 'depo@cesformind.com',
      phone: '5001234568',
      password: warehouseUserPassword,
      firstName: 'Ahmet',
      lastName: 'Depo',
      role: 'WAREHOUSE',
      status: 'ACTIVE',
      warehouseId: warehouse.id,
      mustChangePassword: false,
    },
  });
  console.log('✅ Warehouse user created:', warehouseUser.email);

  // Satış temsilcisi - Şifre: Satis123!
  const salesRepPassword = await bcrypt.hash('Satis123!', 12);
  const salesRep = await prisma.user.upsert({
    where: { email: 'satis@cesformind.com' },
    update: {
      password: salesRepPassword,
      mustChangePassword: false,
    },
    create: {
      email: 'satis@cesformind.com',
      phone: '5001234569',
      password: salesRepPassword,
      firstName: 'Mehmet',
      lastName: 'Satış',
      role: 'SALES_REP',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('✅ Sales rep created:', salesRep.email);

  // Teslimatçı - Şifre: Teslimat123!
  const deliveryPassword = await bcrypt.hash('Teslimat123!', 12);
  const deliveryUser = await prisma.user.upsert({
    where: { email: 'teslimat@cesformind.com' },
    update: {
      password: deliveryPassword,
      mustChangePassword: false,
    },
    create: {
      email: 'teslimat@cesformind.com',
      phone: '5001234570',
      password: deliveryPassword,
      firstName: 'Ali',
      lastName: 'Teslimat',
      role: 'DELIVERY',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('✅ Delivery user created:', deliveryUser.email);

  // Kategoriler
  const categories = [
    { name: 'Süt Ürünleri', slug: 'sut-urunleri' },
    { name: 'Et ve Tavuk', slug: 'et-tavuk' },
    { name: 'Meyve ve Sebze', slug: 'meyve-sebze' },
    { name: 'İçecekler', slug: 'icecekler' },
    { name: 'Bakliyat', slug: 'bakliyat' },
    { name: 'Temizlik', slug: 'temizlik' },
    { name: 'Atıştırmalık', slug: 'atistirmalik' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        isActive: true,
      },
    });
  }
  console.log('✅ Categories created');

  // Markalar
  const brands = ['Sütaş', 'Pınar', 'Ülker', 'Eti', 'Coca-Cola', 'Nestle', 'Dardanel'];
  for (const brandName of brands) {
    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: {
        name: brandName,
        slug,
        isActive: true,
      },
    });
  }
  console.log('✅ Brands created');

  // Ürünler
  const sutCategory = await prisma.category.findUnique({ where: { slug: 'sut-urunleri' } });
  const icecekCategory = await prisma.category.findUnique({ where: { slug: 'icecekler' } });
  const sutasBrand = await prisma.brand.findUnique({ where: { slug: 'sut-' } });
  const cocaBrand = await prisma.brand.findUnique({ where: { slug: 'coca-cola' } });

  const products = [
    {
      sku: 'SUT001',
      barcode: '8690000000001',
      name: 'Günlük Süt 1L',
      categoryId: sutCategory!.id,
      brandId: sutasBrand?.id,
      unit: 'ADET',
      packSize: 12,
      basePrice: 35.00,
      costPrice: 28.00,
      taxRate: 8,
      minStock: 50,
    },
    {
      sku: 'SUT002',
      barcode: '8690000000002',
      name: 'Beyaz Peynir 500g',
      categoryId: sutCategory!.id,
      brandId: sutasBrand?.id,
      unit: 'ADET',
      packSize: 6,
      basePrice: 120.00,
      costPrice: 95.00,
      taxRate: 8,
      minStock: 30,
    },
    {
      sku: 'ICE001',
      barcode: '8690000000003',
      name: 'Coca-Cola 1L',
      categoryId: icecekCategory!.id,
      brandId: cocaBrand?.id,
      unit: 'ADET',
      packSize: 6,
      basePrice: 40.00,
      costPrice: 32.00,
      taxRate: 18,
      minStock: 100,
    },
    {
      sku: 'ICE002',
      barcode: '8690000000004',
      name: 'Fanta 1L',
      categoryId: icecekCategory!.id,
      brandId: cocaBrand?.id,
      unit: 'ADET',
      packSize: 6,
      basePrice: 38.00,
      costPrice: 30.00,
      taxRate: 18,
      minStock: 100,
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });

    // Başlangıç stoğu
    await prisma.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: warehouse.id,
          productId: created.id,
        },
      },
      update: {},
      create: {
        warehouseId: warehouse.id,
        productId: created.id,
        quantity: 100,
        reserved: 0,
      },
    });
  }
  console.log('✅ Products and stock created');

  // Fiyat grupları
  const priceGroups = [
    { name: 'Standart', discount: 0 },
    { name: 'VIP Müşteri', discount: 10 },
    { name: 'Toptan', discount: 15 },
  ];

  for (const pg of priceGroups) {
    await prisma.priceGroup.create({
      data: {
        name: pg.name,
        discount: pg.discount,
        isActive: true,
      },
    });
  }
  console.log('✅ Price groups created');

  // Örnek müşteriler
  const customers = [
    {
      code: 'MUS-0001',
      companyName: 'Lezzet Restoran',
      taxNumber: '1234567890',
      type: 'RESTAURANT',
      contactName: 'Ayşe Yılmaz',
      contactPhone: '5321234567',
      contactEmail: 'ayse@lezzetrestoran.com',
      city: 'İstanbul',
      district: 'Kadıköy',
    },
    {
      code: 'MUS-0002',
      companyName: 'Güneş Market',
      taxNumber: '1234567891',
      type: 'MARKET',
      contactName: 'Veli Demir',
      contactPhone: '5321234568',
      contactEmail: 'veli@gunesmarket.com',
      city: 'İstanbul',
      district: 'Üsküdar',
    },
    {
      code: 'MUS-0003',
      companyName: 'Mavi Otel',
      taxNumber: '1234567892',
      type: 'HOTEL',
      contactName: 'Fatma Kaya',
      contactPhone: '5321234569',
      contactEmail: 'fatma@maviotel.com',
      city: 'İstanbul',
      district: 'Beşiktaş',
    },
  ];

  for (const cust of customers) {
    const customer = await prisma.customer.upsert({
      where: { code: cust.code },
      update: {},
      create: {
        code: cust.code,
        companyName: cust.companyName,
        taxNumber: cust.taxNumber,
        type: cust.type,
        status: 'ACTIVE',
        contactName: cust.contactName,
        contactPhone: cust.contactPhone,
        contactEmail: cust.contactEmail,
        creditLimit: 50000,
        paymentTermDays: 30,
        salesRepId: salesRep.id,
        addresses: {
          create: {
            title: 'Merkez',
            address: 'Örnek Adres Sokak No:1',
            district: cust.district,
            city: cust.city,
            isDefault: true,
            isDelivery: true,
            isBilling: true,
          },
        },
      },
    });
    console.log(`✅ Customer created: ${customer.companyName}`);
  }

  // Sistem ayarları
  const settings = [
    { key: 'company_name', value: 'Cesformind Sipariş Portali', type: 'string', group: 'general' },
    { key: 'company_phone', value: '0212 123 45 67', type: 'string', group: 'general' },
    { key: 'company_email', value: 'info@cesformind.com', type: 'string', group: 'general' },
    { key: 'default_tax_rate', value: '18', type: 'number', group: 'finance' },
    { key: 'currency', value: 'TRY', type: 'string', group: 'finance' },
    { key: 'order_prefix', value: 'SIP', type: 'string', group: 'orders' },
    { key: 'payment_prefix', value: 'TAH', type: 'string', group: 'payments' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Settings created');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Test Credentials:');
  console.log('   Admin: admin@cesformind.com / Admin123!');
  console.log('   Depo: depo@cesformind.com / Depo123!');
  console.log('   Satış: satis@cesformind.com / Satis123!');
  console.log('   Teslimat: teslimat@cesformind.com / Teslimat123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
