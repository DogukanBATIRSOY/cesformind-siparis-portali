# Cesformind Sipariş Portali - B2B Gıda Sipariş ve Teslimat Sistemi

Cesformind için geliştirilmiş kapsamlı B2B sipariş yönetimi, teslimat takibi ve saha operasyonları platformu.

## 🚀 Özellikler

### Müşteri Yönetimi (Cari Hesaplar)
- Müşteri kaydı ve onay süreci
- Müşteri tipleri (Restoran, Market, Otel, Kafe, vb.)
- Kredi limiti ve vade takibi
- Özel fiyat grupları
- Çoklu adres desteği

### Ürün ve Stok Yönetimi
- Kategori ve marka yönetimi
- Barkod desteği
- Çoklu depo stok takibi
- Minimum stok uyarıları
- Stok transferi

### Sipariş Yönetimi
- Web, mobil ve saha üzerinden sipariş alma
- Sipariş durumu takibi
- Stok rezervasyonu
- İndirim ve fiyat grubu desteği

### Teslimat Yönetimi
- Teslimatçı ataması
- Rota planlama
- GPS ile konum takibi
- Teslimat onayı ve imza
- Fotoğraflı teslimat kanıtı

### Ödeme ve Tahsilat
- Çoklu ödeme tipi (Nakit, Kart, Havale, Çek, Senet)
- Cari bakiye takibi
- Tahsilat raporları

### Raporlama
- Satış raporları
- Müşteri performansı
- Ürün analizleri
- Teslimat istatistikleri
- Stok raporları

### Offline Çalışma (El Terminali)
- Offline sipariş alma
- Offline tahsilat
- Otomatik senkronizasyon
- Çakışma çözümü

## 🛠 Teknoloji Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT

### Web Panel
- **Framework:** Next.js 14
- **UI:** Tailwind CSS, shadcn/ui
- **State:** React Query
- **Forms:** React Hook Form + Zod

### Mobile (El Terminali)
- **Framework:** React Native / Expo
- **Offline Storage:** SQLite / WatermelonDB
- **Maps:** React Native Maps

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# Veritabanı URL'ini düzenle
# DATABASE_URL="postgresql://user:password@localhost:5432/mysdepo"

# Veritabanı migration
npm run db:migrate

# Prisma client oluştur
npm run db:generate

# Örnek verileri yükle
npm run db:seed

# Geliştirme sunucusunu başlat
npm run dev
```

### Web Panel Kurulumu

```bash
cd web

# Bağımlılıkları yükle
npm install

# .env.local dosyasını oluştur
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local

# Geliştirme sunucusunu başlat
npm run dev
```

## 🔐 Test Kullanıcıları

| Rol | Email | Şifre |
|-----|-------|-------|
| Admin | admin@cesformind.com | Admin123! |
| Depo | depo@cesformind.com | Depo123! |
| Satış | satis@cesformind.com | Satis123! |
| Teslimat | teslimat@cesformind.com | Teslimat123! |

## 📁 Proje Yapısı

```
mysdepo/
├── backend/                 # Node.js API
│   ├── prisma/              # Veritabanı şeması
│   ├── src/
│   │   ├── controllers/     # API kontrolcüleri
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API rotaları
│   │   └── index.ts         # Ana uygulama
│   └── package.json
├── web/                     # Next.js Web Panel
│   ├── app/                 # Next.js App Router
│   ├── components/          # React bileşenleri
│   ├── lib/                 # Yardımcı fonksiyonlar
│   └── package.json
├── mobile/                  # React Native Mobil
│   └── ...
└── README.md
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login` - Giriş
- `POST /api/auth/register` - Kayıt (B2B başvuru)
- `GET /api/auth/profile` - Profil bilgileri

### Customers
- `GET /api/customers` - Müşteri listesi
- `POST /api/customers` - Yeni müşteri
- `GET /api/customers/:id` - Müşteri detayı
- `GET /api/customers/:id/balance` - Bakiye bilgisi

### Products
- `GET /api/products` - Ürün listesi
- `GET /api/products/search?q=...` - Ürün arama
- `GET /api/products/barcode/:barcode` - Barkod ile arama

### Orders
- `GET /api/orders` - Sipariş listesi
- `POST /api/orders` - Yeni sipariş
- `POST /api/orders/:id/confirm` - Sipariş onayla
- `POST /api/orders/:id/cancel` - Sipariş iptal

### Deliveries
- `GET /api/deliveries/my-deliveries` - Teslimatçı teslimatları
- `PATCH /api/deliveries/:id/location` - Konum güncelle
- `POST /api/deliveries/:id/complete` - Teslimat tamamla

### Sync (Offline)
- `GET /api/sync/offline-data` - Offline veri indir
- `POST /api/sync/push` - Offline değişiklikleri gönder

## 📊 Veritabanı Şeması

Ana tablolar:
- **User** - Kullanıcılar
- **Customer** - Müşteriler (Cari)
- **Product** - Ürünler
- **Category** - Kategoriler
- **Order** - Siparişler
- **OrderItem** - Sipariş kalemleri
- **Delivery** - Teslimatlar
- **Payment** - Ödemeler
- **Warehouse** - Depolar
- **WarehouseStock** - Stoklar

## 🔒 Güvenlik

- JWT tabanlı kimlik doğrulama
- Rol bazlı yetkilendirme (RBAC)
- API rate limiting
- Helmet.js güvenlik başlıkları
- Şifre hashleme (bcrypt)

## 📱 Mobil Uygulama Özellikleri

- Offline sipariş girişi
- Barkod okuyucu
- GPS takibi
- Dijital imza
- Fotoğraf çekme
- Otomatik senkronizasyon

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License
