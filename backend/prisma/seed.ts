import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin kullanıcı - Şifre: Admin123!
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cesorder.com' },
    update: {
      password: adminPassword,
      phone: '5551000001',
      mustChangePassword: false,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@cesorder.com',
      phone: '5551000001',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('✅ Super Admin user created:', admin.email);

  // Super Admin için tüm izinleri oluştur
  const modules = ['customers', 'products', 'orders', 'deliveries', 'payments', 'warehouses', 'reports', 'users', 'settings'];
  for (const module of modules) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: admin.id, module } },
      update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      create: {
        userId: admin.id,
        module,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
    });
  }
  console.log('✅ Super Admin permissions created');

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
    where: { email: 'depo@cesorder.com' },
    update: {
      password: warehouseUserPassword,
      phone: '5551000002',
      mustChangePassword: false,
      role: 'WAREHOUSE_USER',
    },
    create: {
      email: 'depo@cesorder.com',
      phone: '5551000002',
      password: warehouseUserPassword,
      firstName: 'Ahmet',
      lastName: 'Depo',
      role: 'WAREHOUSE_USER',
      status: 'ACTIVE',
      warehouseId: warehouse.id,
      mustChangePassword: false,
      createdById: admin.id,
    },
  });
  console.log('✅ Warehouse user created:', warehouseUser.email);

  // Depo kullanıcısı için izinleri oluştur
  const warehousePermissions = {
    products: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  };
  for (const [module, perms] of Object.entries(warehousePermissions)) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: warehouseUser.id, module } },
      update: perms,
      create: { userId: warehouseUser.id, module, ...perms },
    });
  }
  console.log('✅ Warehouse user permissions created');

  // Satış temsilcisi (Plasiyer) - Şifre: Satis123!
  const salesRepPassword = await bcrypt.hash('Satis123!', 12);
  const salesRep = await prisma.user.upsert({
    where: { email: 'satis@cesorder.com' },
    update: {
      password: salesRepPassword,
      phone: '5551000003',
      mustChangePassword: false,
      role: 'SALES_REP',
    },
    create: {
      email: 'satis@cesorder.com',
      phone: '5551000003',
      password: salesRepPassword,
      firstName: 'Mehmet',
      lastName: 'Plasiyer',
      role: 'SALES_REP',
      status: 'ACTIVE',
      mustChangePassword: false,
      createdById: admin.id,
    },
  });
  console.log('✅ Sales rep created:', salesRep.email);

  // Plasiyer için izinleri oluştur
  const salesRepPermissions = {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  };
  for (const [module, perms] of Object.entries(salesRepPermissions)) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: salesRep.id, module } },
      update: perms,
      create: { userId: salesRep.id, module, ...perms },
    });
  }
  console.log('✅ Sales rep permissions created');

  // Teslimatçı - Şifre: Teslimat123!
  const deliveryPassword = await bcrypt.hash('Teslimat123!', 12);
  const deliveryUser = await prisma.user.upsert({
    where: { email: 'teslimat@cesorder.com' },
    update: {
      password: deliveryPassword,
      phone: '5551000004',
      mustChangePassword: false,
      role: 'DELIVERY',
    },
    create: {
      email: 'teslimat@cesorder.com',
      phone: '5551000004',
      password: deliveryPassword,
      firstName: 'Ali',
      lastName: 'Teslimat',
      role: 'DELIVERY',
      status: 'ACTIVE',
      mustChangePassword: false,
      createdById: admin.id,
    },
  });
  console.log('✅ Delivery user created:', deliveryUser.email);

  // Teslimatçı için izinleri oluştur
  const deliveryPermissions = {
    customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: true, canDelete: false },
  };
  for (const [module, perms] of Object.entries(deliveryPermissions)) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: deliveryUser.id, module } },
      update: perms,
      create: { userId: deliveryUser.id, module, ...perms },
    });
  }
  console.log('✅ Delivery user permissions created');

  // Bayi Admin - Şifre: Bayi123!
  const dealerAdminPassword = await bcrypt.hash('Bayi123!', 12);
  const dealerAdmin = await prisma.user.upsert({
    where: { email: 'bayi@cesorder.com' },
    update: {
      password: dealerAdminPassword,
      phone: '5551000005',
      mustChangePassword: false,
      role: 'DEALER_ADMIN',
    },
    create: {
      email: 'bayi@cesorder.com',
      phone: '5551000005',
      password: dealerAdminPassword,
      firstName: 'Bayi',
      lastName: 'Admin',
      role: 'DEALER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
      createdById: admin.id,
    },
  });
  console.log('✅ Dealer Admin created:', dealerAdmin.email);

  // Bayi Admin için izinleri oluştur
  const dealerAdminPermissions = {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    settings: { canView: true, canCreate: false, canEdit: true, canDelete: false },
  };
  for (const [module, perms] of Object.entries(dealerAdminPermissions)) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: dealerAdmin.id, module } },
      update: perms,
      create: { userId: dealerAdmin.id, module, ...perms },
    });
  }
  console.log('✅ Dealer Admin permissions created');

  // Kategoriler - Restoran Menüsü (Picsum placeholder görselleri)
  const categories = [
    { name: 'Çorbalar', slug: 'corbalar', image: 'https://picsum.photos/seed/soup/400/400' },
    { name: 'Makarnalar', slug: 'makarnalar', image: 'https://picsum.photos/seed/pasta/400/400' },
    { name: 'Et Çeşitleri', slug: 'et-cesitleri', image: 'https://picsum.photos/seed/meat/400/400' },
    { name: 'Tavuk Çeşitleri', slug: 'tavuk-cesitleri', image: 'https://picsum.photos/seed/chicken/400/400' },
    { name: 'Salatalar', slug: 'salatalar', image: 'https://picsum.photos/seed/salad/400/400' },
    { name: 'İçecekler', slug: 'icecekler', image: 'https://picsum.photos/seed/drinks/400/400' },
    { name: 'Tatlılar', slug: 'tatlilar', image: 'https://picsum.photos/seed/dessert/400/400' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { image: cat.image },
      create: {
        name: cat.name,
        slug: cat.slug,
        image: cat.image,
        isActive: true,
      },
    });
  }
  console.log('✅ Categories created');

  // Restoran için marka gerekmiyor, boş bırakıyoruz
  console.log('✅ Brands skipped (restaurant mode)');

  // Kategorileri al
  const corbaCategory = await prisma.category.findUnique({ where: { slug: 'corbalar' } });
  const makarnaCategory = await prisma.category.findUnique({ where: { slug: 'makarnalar' } });
  const etCategory = await prisma.category.findUnique({ where: { slug: 'et-cesitleri' } });
  const tavukCategory = await prisma.category.findUnique({ where: { slug: 'tavuk-cesitleri' } });
  const salataCategory = await prisma.category.findUnique({ where: { slug: 'salatalar' } });
  const icecekCategory = await prisma.category.findUnique({ where: { slug: 'icecekler' } });
  const tatliCategory = await prisma.category.findUnique({ where: { slug: 'tatlilar' } });

  const products = [
    // ==================== ÇORBALAR ====================
    {
      sku: 'CRB001',
      barcode: '1000000001',
      name: 'Mercimek Çorbası',
      description: 'Geleneksel Türk mutfağının vazgeçilmezi. Baharatlarla zenginleştirilmiş.',
      categoryId: corbaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 65.00,
      costPrice: 25.00,
      taxRate: 8,
      minStock: 50,
      image: 'https://picsum.photos/seed/mercimek/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'CRB002',
      barcode: '1000000002',
      name: 'Ezogelin Çorbası',
      description: 'Bulgur ve mercimekle hazırlanan lezzetli ve doyurucu çorba.',
      categoryId: corbaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 70.00,
      costPrice: 28.00,
      taxRate: 8,
      minStock: 40,
      image: 'https://picsum.photos/seed/ezogelin/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'CRB003',
      barcode: '1000000003',
      name: 'Tavuk Suyu Çorba',
      description: 'Şifa kaynağı tavuk suyu çorbası, şehriye ile servis edilir.',
      categoryId: corbaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 75.00,
      costPrice: 30.00,
      taxRate: 8,
      minStock: 35,
      image: 'https://picsum.photos/seed/tavuksuyu/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'CRB004',
      barcode: '1000000004',
      name: 'Domates Çorbası',
      description: 'Taze domateslerden hazırlanan kremsi çorba.',
      categoryId: corbaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 65.00,
      costPrice: 22.00,
      taxRate: 8,
      minStock: 45,
      image: 'https://picsum.photos/seed/domates/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },

    // ==================== MAKARNALAR ====================
    {
      sku: 'MKR001',
      barcode: '1000000005',
      name: 'Spagetti Bolonez',
      description: 'İtalyan usulü kıymalı domates soslu spagetti.',
      categoryId: makarnaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 145.00,
      costPrice: 55.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/spagetti/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'MKR002',
      barcode: '1000000006',
      name: 'Fettuccine Alfredo',
      description: 'Kremalı parmesan soslu fettuccine makarna.',
      categoryId: makarnaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 155.00,
      costPrice: 60.00,
      taxRate: 8,
      minStock: 25,
      image: 'https://picsum.photos/seed/fettuccine/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'MKR003',
      barcode: '1000000007',
      name: 'Penne Arrabiata',
      description: 'Acılı domates soslu penne makarna.',
      categoryId: makarnaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 135.00,
      costPrice: 50.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/penne/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'MKR004',
      barcode: '1000000008',
      name: 'Lazanya',
      description: 'Katmanlı, fırında pişirilmiş beşamel ve kıymalı lazanya.',
      categoryId: makarnaCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 175.00,
      costPrice: 70.00,
      taxRate: 8,
      minStock: 20,
      image: 'https://picsum.photos/seed/lazanya/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },

    // ==================== ET ÇEŞİTLERİ ====================
    {
      sku: 'ET001',
      barcode: '1000000009',
      name: 'Izgara Köfte',
      description: 'El yapımı, baharatlı dana köfte. Pilav ve salata ile servis edilir.',
      categoryId: etCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 195.00,
      costPrice: 85.00,
      taxRate: 8,
      minStock: 25,
      image: 'https://picsum.photos/seed/kofte/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'ET002',
      barcode: '1000000010',
      name: 'Biftek',
      description: 'Premium dana biftek, istediğiniz pişirme derecesinde.',
      categoryId: etCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 350.00,
      costPrice: 180.00,
      taxRate: 8,
      minStock: 15,
      image: 'https://picsum.photos/seed/biftek/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'ET003',
      barcode: '1000000011',
      name: 'Kuzu Pirzola',
      description: 'Izgara kuzu pirzola, özel baharatlarla marine edilmiş.',
      categoryId: etCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 385.00,
      costPrice: 200.00,
      taxRate: 8,
      minStock: 12,
      image: 'https://picsum.photos/seed/pirzola/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'ET004',
      barcode: '1000000012',
      name: 'Adana Kebap',
      description: 'Acılı, el yapımı Adana kebap. Lavaş ve közlenmiş sebzelerle.',
      categoryId: etCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 225.00,
      costPrice: 95.00,
      taxRate: 8,
      minStock: 20,
      image: 'https://picsum.photos/seed/adana/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'ET005',
      barcode: '1000000013',
      name: 'Urfa Kebap',
      description: 'Acısız, lezzetli Urfa kebap. Geleneksel tarifle.',
      categoryId: etCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 215.00,
      costPrice: 90.00,
      taxRate: 8,
      minStock: 20,
      image: 'https://picsum.photos/seed/urfa/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },

    // ==================== TAVUK ÇEŞİTLERİ ====================
    {
      sku: 'TVK001',
      barcode: '1000000014',
      name: 'Izgara Tavuk Göğsü',
      description: 'Marine edilmiş tavuk göğsü, sebzelerle servis edilir.',
      categoryId: tavukCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 155.00,
      costPrice: 60.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/tavukgogsu/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'TVK002',
      barcode: '1000000015',
      name: 'Tavuk Şiş',
      description: 'Baharatlı tavuk şiş, pilav ve salata ile.',
      categoryId: tavukCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 145.00,
      costPrice: 55.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/tavuksis/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'TVK003',
      barcode: '1000000016',
      name: 'Tavuk Sote',
      description: 'Sebzeli tavuk sote, pilav ile servis edilir.',
      categoryId: tavukCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 165.00,
      costPrice: 65.00,
      taxRate: 8,
      minStock: 25,
      image: 'https://picsum.photos/seed/tavuksote/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'TVK004',
      barcode: '1000000017',
      name: 'Çıtır Tavuk',
      description: 'Özel soslarla servis edilen çıtır kaplamalı tavuk parçaları.',
      categoryId: tavukCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 135.00,
      costPrice: 50.00,
      taxRate: 8,
      minStock: 35,
      image: 'https://picsum.photos/seed/citirtavuk/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },

    // ==================== SALATALAR ====================
    {
      sku: 'SLT001',
      barcode: '1000000018',
      name: 'Sezar Salata',
      description: 'Izgara tavuk, marul, kruton, parmesan ve sezar sosu.',
      categoryId: salataCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 125.00,
      costPrice: 45.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/sezar/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'SLT002',
      barcode: '1000000019',
      name: 'Akdeniz Salatası',
      description: 'Taze sebzeler, zeytin, beyaz peynir ve zeytinyağı.',
      categoryId: salataCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 95.00,
      costPrice: 35.00,
      taxRate: 8,
      minStock: 35,
      image: 'https://picsum.photos/seed/akdeniz/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'SLT003',
      barcode: '1000000020',
      name: 'Ton Balıklı Salata',
      description: 'Ton balığı, yeşillik, domates ve özel sos.',
      categoryId: salataCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 135.00,
      costPrice: 55.00,
      taxRate: 8,
      minStock: 25,
      image: 'https://picsum.photos/seed/tonbalik/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'SLT004',
      barcode: '1000000021',
      name: 'Mevsim Salatası',
      description: 'Mevsimin taze sebzeleriyle hazırlanan hafif salata.',
      categoryId: salataCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 75.00,
      costPrice: 25.00,
      taxRate: 8,
      minStock: 40,
      image: 'https://picsum.photos/seed/mevsim/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },

    // ==================== İÇECEKLER ====================
    {
      sku: 'ICE001',
      barcode: '1000000022',
      name: 'Ayran',
      description: 'Geleneksel ev yapımı ayran.',
      categoryId: icecekCategory!.id,
      brandId: null,
      unit: 'BARDAK',
      packSize: 1,
      basePrice: 25.00,
      costPrice: 8.00,
      taxRate: 8,
      minStock: 100,
      image: 'https://picsum.photos/seed/ayran/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'ICE002',
      barcode: '1000000023',
      name: 'Taze Limonata',
      description: 'Taze sıkılmış limonata, nane ile.',
      categoryId: icecekCategory!.id,
      brandId: null,
      unit: 'BARDAK',
      packSize: 1,
      basePrice: 45.00,
      costPrice: 12.00,
      taxRate: 8,
      minStock: 80,
      image: 'https://picsum.photos/seed/limonata/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'ICE003',
      barcode: '1000000024',
      name: 'Türk Kahvesi',
      description: 'Geleneksel Türk kahvesi, lokum ile servis edilir.',
      categoryId: icecekCategory!.id,
      brandId: null,
      unit: 'FİNCAN',
      packSize: 1,
      basePrice: 40.00,
      costPrice: 10.00,
      taxRate: 8,
      minStock: 100,
      image: 'https://picsum.photos/seed/turkkahvesi/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'ICE004',
      barcode: '1000000025',
      name: 'Çay',
      description: 'Demli Türk çayı.',
      categoryId: icecekCategory!.id,
      brandId: null,
      unit: 'BARDAK',
      packSize: 1,
      basePrice: 15.00,
      costPrice: 3.00,
      taxRate: 8,
      minStock: 200,
      image: 'https://picsum.photos/seed/cay/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },

    // ==================== TATLILAR ====================
    {
      sku: 'TTL001',
      barcode: '1000000026',
      name: 'Künefe',
      description: 'Antep fıstıklı, sıcak servis edilen geleneksel künefe.',
      categoryId: tatliCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 135.00,
      costPrice: 50.00,
      taxRate: 8,
      minStock: 20,
      image: 'https://picsum.photos/seed/kunefe/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'TTL002',
      barcode: '1000000027',
      name: 'Sütlaç',
      description: 'Fırında pişirilmiş geleneksel sütlaç.',
      categoryId: tatliCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 75.00,
      costPrice: 25.00,
      taxRate: 8,
      minStock: 30,
      image: 'https://picsum.photos/seed/sutlac/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
    {
      sku: 'TTL003',
      barcode: '1000000028',
      name: 'Baklava',
      description: 'El açması, Antep fıstıklı baklava.',
      categoryId: tatliCategory!.id,
      brandId: null,
      unit: 'PORSIYON',
      packSize: 1,
      basePrice: 145.00,
      costPrice: 60.00,
      taxRate: 8,
      minStock: 25,
      image: 'https://picsum.photos/seed/baklava/400/400',
      isFeatured: true,
      status: 'ACTIVE',
    },
    {
      sku: 'TTL004',
      barcode: '1000000029',
      name: 'Cheesecake',
      description: 'New York usulü cheesecake, meyveli sos ile.',
      categoryId: tatliCategory!.id,
      brandId: null,
      unit: 'DİLİM',
      packSize: 1,
      basePrice: 95.00,
      costPrice: 35.00,
      taxRate: 8,
      minStock: 20,
      image: 'https://picsum.photos/seed/cheesecake/400/400',
      isFeatured: false,
      status: 'ACTIVE',
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        image: product.image,
        description: product.description,
        isFeatured: product.isFeatured,
        status: product.status,
      },
      create: {
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        brandId: product.brandId,
        unit: product.unit,
        packSize: product.packSize,
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        taxRate: product.taxRate,
        minStock: product.minStock,
        image: product.image,
        isFeatured: product.isFeatured,
        status: product.status,
      },
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
  console.log('✅ Products and stock created (24 products)');

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
    { key: 'company_name', value: 'Cesorder Sipariş Sistemi', type: 'string', group: 'general' },
    { key: 'company_phone', value: '0212 123 45 67', type: 'string', group: 'general' },
    { key: 'company_email', value: 'info@cesorder.com', type: 'string', group: 'general' },
    { key: 'default_tax_rate', value: '18', type: 'number', group: 'finance' },
    { key: 'currency', value: 'TRY', type: 'string', group: 'finance' },
    { key: 'order_prefix', value: 'SIP', type: 'string', group: 'orders' },
    { key: 'payment_prefix', value: 'TAH', type: 'string', group: 'payments' },
    // Email doğrulama ayarı
    { key: 'require_email_verification', value: 'false', type: 'boolean', group: 'security' },
    // SMTP Ayarları
    { key: 'smtp_enabled', value: 'false', type: 'boolean', group: 'email' },
    { key: 'smtp_host', value: '', type: 'string', group: 'email' },
    { key: 'smtp_port', value: '587', type: 'string', group: 'email' },
    { key: 'smtp_user', value: '', type: 'string', group: 'email' },
    { key: 'smtp_password', value: '', type: 'string', group: 'email' },
    { key: 'smtp_from_name', value: 'Cesorder', type: 'string', group: 'email' },
    { key: 'smtp_from_email', value: '', type: 'string', group: 'email' },
    // SMS Ayarları
    { key: 'sms_enabled', value: 'false', type: 'boolean', group: 'sms' },
    { key: 'sms_provider', value: 'netgsm', type: 'string', group: 'sms' },
    { key: 'sms_api_key', value: '', type: 'string', group: 'sms' },
    { key: 'sms_api_secret', value: '', type: 'string', group: 'sms' },
    { key: 'sms_sender', value: '', type: 'string', group: 'sms' },
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
  console.log('   Admin: admin@cesorder.com / Admin123!');
  console.log('   Depo: depo@cesorder.com / Depo123!');
  console.log('   Satış: satis@cesorder.com / Satis123!');
  console.log('   Teslimat: teslimat@cesorder.com / Teslimat123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
