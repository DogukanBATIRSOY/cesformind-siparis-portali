'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  ShoppingCart, 
  Package,
  Star,
  Grid3X3,
  List,
  Plus,
  Minus,
  X,
  User,
  LogIn,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  basePrice: number
  taxRate: number
  unit: string
  packSize: number
  isFeatured: boolean
  inStock: boolean
  stock: number
  image: string | null
  category: {
    id: string
    name: string
  } | null
  brand: {
    id: string
    name: string
  } | null
}

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  children: { id: string; name: string; slug: string }[]
  _count: { products: number }
}

interface CartItem {
  product: Product
  quantity: number
}

export default function LandingPage() {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [mounted, setMounted] = useState(false)
  
  // Adet seçim modalı state'leri
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  
  // Filtreleme state'leri
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [sortBy, setSortBy] = useState<string>('default')
  const [showFilters, setShowFilters] = useState(false) // Mobil için
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [onlyFeatured, setOnlyFeatured] = useState(false)
  
  // CMS'den gelen filtre ayarları
  const [filterSettings, setFilterSettings] = useState<{
    filters: Array<{ id: string; name: string; type: string; enabled: boolean; order: number }>;
    sortOptions: Array<{ id: string; label: string; enabled: boolean }>;
    priceConfig: { min: number; max: number; step: number };
  } | null>(null)

  // Client-side mount check
  useEffect(() => {
    setMounted(true)
    
    // CMS filtre ayarlarını yükle
    const savedFilterSettings = localStorage.getItem('cms_filter_settings')
    if (savedFilterSettings) {
      try {
        const parsed = JSON.parse(savedFilterSettings)
        setFilterSettings(parsed)
        // Fiyat aralığını CMS ayarlarından al
        if (parsed.priceConfig) {
          setPriceRange([parsed.priceConfig.min, parsed.priceConfig.max])
        }
      } catch (e) {
        console.error('Filter settings parse error:', e)
      }
    }
    
    // Token geçerliliğini kontrol et
    const token = localStorage.getItem('token')
    const authStorage = localStorage.getItem('auth-storage')
    
    if (token || authStorage) {
      // API'ye istek yaparak token'ı doğrula
      const actualToken = token || (authStorage ? JSON.parse(authStorage)?.state?.token : null)
      if (actualToken) {
        axios.get(`${API_URL.replace('/public', '')}/auth/profile`, {
          headers: { Authorization: `Bearer ${actualToken}` }
        }).catch(() => {
          // Token geçersiz, logout yap
          console.log('Invalid token, logging out...')
          logout()
          localStorage.removeItem('token')
          localStorage.removeItem('auth-storage')
        })
      }
    }
  }, [])

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Error parsing cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/public/categories`)
        setCategories(res.data.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch featured products
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API_URL}/public/products/featured`)
        setFeaturedProducts(res.data.data || [])
      } catch (error) {
        console.error('Error fetching featured products:', error)
      }
    }
    fetchFeatured()
  }, [])

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params: any = { page, limit: 12 }
        if (search) params.search = search
        if (selectedCategory) params.categoryId = selectedCategory

        const res = await axios.get(`${API_URL}/public/products`, { params })
        setProducts(res.data.data || [])
        setTotalPages(res.data.meta?.totalPages || 1)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [page, search, selectedCategory])

  // Adet seçim modalını aç
  const openQuantityModal = (product: Product) => {
    setSelectedProduct(product)
    // Sepette varsa mevcut adeti göster
    const existingItem = cart.find((item) => item.product.id === product.id)
    setSelectedQuantity(existingItem ? existingItem.quantity : 1)
    setShowQuantityModal(true)
  }

  // Adet ile sepete ekle
  const addToCartWithQuantity = () => {
    if (!selectedProduct) return
    
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === selectedProduct.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === selectedProduct.id
            ? { ...item, quantity: selectedQuantity }
            : item
        )
      }
      return [...prev, { product: selectedProduct, quantity: selectedQuantity }]
    })
    
    setShowQuantityModal(false)
    setSelectedProduct(null)
    setSelectedQuantity(1)
  }

  // Eski addToCart fonksiyonu (direkt 1 adet ekler - banner için kullanılabilir)
  const addToCart = (product: Product) => {
    openQuantityModal(product)
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId))
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  )

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Mobilde görünür, büyük ekranlarda sol panelde */}
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="p-2">
                <Image
                  src="/t-order.png"
                  alt="T-ORDER"
                  width={180}
                  height={50}
                  className="h-6 w-auto"
                />
              </div>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ürün ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10 pr-4"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Cart */}
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setShowCart(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Button>

              {/* Auth */}
              {mounted ? (
                isAuthenticated && user ? (
                  <div className="flex items-center gap-2">
                    {/* Bireysel kullanıcı için */}
                    {user.customer?.type === 'INDIVIDUAL' ? (
                      <>
                        <Link href="/my-orders">
                          <Button variant="ghost" size="sm">
                            Siparişlerim
                          </Button>
                        </Link>
                        <span className="text-sm font-medium text-muted-foreground">
                          Merhaba, {user.firstName}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            logout()
                            router.push('/')
                          }}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Çıkış Yap
                        </Button>
                      </>
                    ) : (
                      /* Kurumsal kullanıcı veya admin */
                      <>
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm">
                            <User className="h-4 w-4 mr-2" />
                            {user.firstName || 'Yönetim Paneli'}
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            logout()
                            router.push('/')
                          }}
                        >
                          Çıkış
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/register">
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Üye Ol
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="sm">
                        <LogIn className="h-4 w-4 mr-2" />
                        Giriş Yap
                      </Button>
                    </Link>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/register">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Üye Ol
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Giriş Yap
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Ana İçerik - Yemeksepeti Tarzı Layout */}
      <div className="flex">
        {/* Sol Filtre Paneli - Sabit, en üstten başlıyor */}
        <aside className="hidden lg:block w-72 flex-shrink-0 fixed top-0 left-0 h-screen overflow-y-auto border-r bg-white z-50">
          {/* Logo - En üstte */}
          <div className="h-16 flex items-center px-4 border-b bg-white sticky top-0 z-10">
            <Link href="/" className="flex items-center">
              <div className="p-2">
                <Image
                  src="/t-order.png"
                  alt="T-ORDER"
                  width={160}
                  height={45}
                  className="h-8 w-auto"
                />
              </div>
            </Link>
          </div>
          
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Filtreler</h3>
            </div>
            
            {/* Dinamik Filtreler - CMS'den Gelen Sıraya Göre */}
            {(filterSettings?.filters || [
              { id: 'categories', name: 'Kategoriler', type: 'category', enabled: true, order: 1 },
              { id: 'price_range', name: 'Fiyat Aralığı', type: 'price', enabled: true, order: 2 },
              { id: 'sort', name: 'Sıralama', type: 'sort', enabled: true, order: 3 },
              { id: 'in_stock', name: 'Stokta Olanlar', type: 'checkbox', enabled: true, order: 4 },
              { id: 'featured', name: 'Öne Çıkanlar', type: 'checkbox', enabled: true, order: 5 },
            ]).filter(f => f.enabled).sort((a, b) => a.order - b.order).map((filter) => (
              <div key={filter.id} className="mb-6">
                {/* Kategoriler */}
                {filter.type === 'category' && (
                  <>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          !selectedCategory 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        Tüm Kategoriler
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                            selectedCategory === cat.id 
                              ? 'bg-primary text-white' 
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/70' : 'text-gray-400'}`}>
                            ({cat._count?.products || 0})
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                
                {/* Fiyat Aralığı */}
                {filter.type === 'price' && (
                  <>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange[0] || ''}
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                        className="h-9 text-sm"
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange[1] || ''}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || (filterSettings?.priceConfig?.max || 1000)])}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}
                
                {/* Sıralama */}
                {filter.type === 'sort' && (
                  <>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-9 px-3 border rounded-lg bg-white text-sm"
                    >
                      {(filterSettings?.sortOptions || [
                        { id: 'default', label: 'Varsayılan', enabled: true },
                        { id: 'price_asc', label: 'Fiyat (Düşükten Yükseğe)', enabled: true },
                        { id: 'price_desc', label: 'Fiyat (Yüksekten Düşüğe)', enabled: true },
                        { id: 'name_asc', label: 'İsim (A-Z)', enabled: true },
                        { id: 'name_desc', label: 'İsim (Z-A)', enabled: true },
                      ]).filter(o => o.enabled).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </>
                )}
                
                {/* Checkbox Filtreler */}
                {filter.type === 'checkbox' && filter.id === 'in_stock' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyInStock}
                      onChange={(e) => setOnlyInStock(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{filter.name}</span>
                  </label>
                )}
                {filter.type === 'checkbox' && filter.id === 'featured' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyFeatured}
                      onChange={(e) => setOnlyFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{filter.name}</span>
                  </label>
                )}
              </div>
            ))}
            
            {/* Filtreleri Temizle */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-6"
              onClick={() => {
                setSelectedCategory(null)
                setPriceRange([filterSettings?.priceConfig?.min || 0, filterSettings?.priceConfig?.max || 1000])
                setSortBy('default')
                setOnlyInStock(false)
                setOnlyFeatured(false)
              }}
            >
              Filtreleri Temizle
            </Button>
          </div>
        </aside>

        {/* Sağ Ana İçerik - Sol panel fixed olduğu için margin-left */}
        <main className="flex-1 min-w-0 lg:ml-72">
          {/* Banner Slider Section */}
          {!search && !selectedCategory && (
            <section className="py-6 bg-background">
              <div className="px-4 lg:px-6">
                <BannerSlider products={featuredProducts} formatPrice={formatPrice} onAddToCart={addToCart} />
              </div>
            </section>
          )}

          {/* Categories */}
          {categories.length > 0 && !search && (
            <section className="py-4 border-b bg-muted/30">
              <div className="px-4 lg:px-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button
                    variant={selectedCategory === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(null)
                      setPage(1)
                    }}
                    className="flex-shrink-0"
                  >
                    Tümü
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setPage(1)
                      }}
                      className="flex-shrink-0 whitespace-nowrap"
                    >
                      {category.name}
                      {category._count.products > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {category._count.products}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Featured Products */}
          {featuredProducts.length > 0 && !search && !selectedCategory && (
            <section className="py-8">
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    Öne Çıkan Ürünler
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                  {featuredProducts.slice(0, 5).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All Products */}
          <section id="products" className="py-8">
            <div className="px-4 lg:px-6">
              {/* Başlık ve Kontroller */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {/* Mobil Filtre Butonu */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setShowFilters(true)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtreler
                  </Button>
                  <h2 className="text-xl md:text-2xl font-bold">
                    {search
                      ? `"${search}" için sonuçlar`
                      : selectedCategory
                      ? categories.find((c) => c.id === selectedCategory)?.name || 'Ürünler'
                      : 'Tüm Ürünler'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Aktif Filtreler */}
              {(selectedCategory || onlyInStock || onlyFeatured || sortBy !== 'default') && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategory && (
                    <Badge variant="secondary" className="gap-1">
                      {categories.find(c => c.id === selectedCategory)?.name}
                      <button onClick={() => setSelectedCategory(null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {onlyInStock && (
                    <Badge variant="secondary" className="gap-1">
                      Stokta
                      <button onClick={() => setOnlyInStock(false)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {onlyFeatured && (
                    <Badge variant="secondary" className="gap-1">
                      Öne Çıkan
                      <button onClick={() => setOnlyFeatured(false)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {sortBy !== 'default' && (
                    <Badge variant="secondary" className="gap-1">
                      {sortBy === 'price_asc' ? 'Fiyat ↑' : sortBy === 'price_desc' ? 'Fiyat ↓' : sortBy === 'name_asc' ? 'A-Z' : 'Z-A'}
                      <button onClick={() => setSortBy('default')}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Ürün bulunamadı</h3>
                  <p className="text-muted-foreground">
                    {search ? 'Farklı bir arama terimi deneyin' : 'Henüz satışa açık ürün yok'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                  {products
                    .filter(p => !onlyInStock || p.inStock)
                    .filter(p => !onlyFeatured || p.isFeatured)
                    .filter(p => p.basePrice >= priceRange[0] && p.basePrice <= priceRange[1])
                    .sort((a, b) => {
                      if (sortBy === 'price_asc') return a.basePrice - b.basePrice
                      if (sortBy === 'price_desc') return b.basePrice - a.basePrice
                      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
                      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
                      return 0
                    })
                    .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      formatPrice={formatPrice}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {products
                    .filter(p => !onlyInStock || p.inStock)
                    .filter(p => !onlyFeatured || p.isFeatured)
                    .filter(p => p.basePrice >= priceRange[0] && p.basePrice <= priceRange[1])
                    .sort((a, b) => {
                      if (sortBy === 'price_asc') return a.basePrice - b.basePrice
                      if (sortBy === 'price_desc') return b.basePrice - a.basePrice
                      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
                      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
                      return 0
                    })
                    .map((product) => (
                      <ProductListItem
                        key={product.id}
                        product={product}
                        onAddToCart={addToCart}
                        formatPrice={formatPrice}
                      />
                    ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Önceki
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              )}
            </div>
          </section>

      {/* Mobile Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Filtreler</h3>
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Dinamik Filtreler - CMS'den Gelen Sıraya Göre */}
              {(filterSettings?.filters || [
                { id: 'categories', name: 'Kategoriler', type: 'category', enabled: true, order: 1 },
                { id: 'price_range', name: 'Fiyat Aralığı', type: 'price', enabled: true, order: 2 },
                { id: 'sort', name: 'Sıralama', type: 'sort', enabled: true, order: 3 },
                { id: 'in_stock', name: 'Stokta Olanlar', type: 'checkbox', enabled: true, order: 4 },
                { id: 'featured', name: 'Öne Çıkanlar', type: 'checkbox', enabled: true, order: 5 },
              ]).filter(f => f.enabled).sort((a, b) => a.order - b.order).map((filter) => (
                <div key={filter.id} className="mb-6">
                  {/* Kategoriler */}
                  {filter.type === 'category' && (
                    <>
                      <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => { setSelectedCategory(null); setShowFilters(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            !selectedCategory ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          Tüm Kategoriler
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat.id); setShowFilters(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                              selectedCategory === cat.id ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span>{cat.name}</span>
                            <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/70' : 'text-gray-400'}`}>
                              ({cat._count?.products || 0})
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {/* Fiyat Aralığı */}
                  {filter.type === 'price' && (
                    <>
                      <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0] || ''}
                          onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                          className="h-9 text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1] || ''}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || (filterSettings?.priceConfig?.max || 1000)])}
                          className="h-9 text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Sıralama */}
                  {filter.type === 'sort' && (
                    <>
                      <h4 className="font-medium text-sm text-gray-700 mb-3">{filter.name}</h4>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full h-9 px-3 border rounded-lg bg-white text-sm"
                      >
                        {(filterSettings?.sortOptions || [
                          { id: 'default', label: 'Varsayılan', enabled: true },
                          { id: 'price_asc', label: 'Fiyat (Düşükten Yükseğe)', enabled: true },
                          { id: 'price_desc', label: 'Fiyat (Yüksekten Düşüğe)', enabled: true },
                          { id: 'name_asc', label: 'İsim (A-Z)', enabled: true },
                          { id: 'name_desc', label: 'İsim (Z-A)', enabled: true },
                        ]).filter(o => o.enabled).map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </>
                  )}
                  
                  {/* Checkbox Filtreler */}
                  {filter.type === 'checkbox' && filter.id === 'in_stock' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyInStock}
                        onChange={(e) => setOnlyInStock(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{filter.name}</span>
                    </label>
                  )}
                  {filter.type === 'checkbox' && filter.id === 'featured' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyFeatured}
                        onChange={(e) => setOnlyFeatured(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{filter.name}</span>
                    </label>
                  )}
                </div>
              ))}
              
              {/* Butonlar */}
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setShowFilters(false)}>
                  Filtreleri Uygula
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedCategory(null)
                    setPriceRange([filterSettings?.priceConfig?.min || 0, filterSettings?.priceConfig?.max || 1000])
                    setSortBy('default')
                    setOnlyInStock(false)
                    setOnlyFeatured(false)
                  }}
                >
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Footer */}
          <footer className="bg-muted py-8 md:py-12 mt-8">
            <div className="px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2">
                      <Image
                        src="/t-order.png"
                        alt="T-ORDER"
                        width={120}
                        height={32}
                        className="h-6 w-auto"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    B2C ve B2B Gıda Sipariş ve Teslimat Sistemi. Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat ile hizmetinizdeyiz.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold mb-4">Hızlı Linkler</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                        Ana Sayfa
                      </Link>
                    </li>
                    <li>
                      <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                        Üye Ol
                      </Link>
                    </li>
                    <li>
                      <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                        Giriş Yap
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold mb-4">İletişim</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      info@cesorder.com
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      0212 123 45 67
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      İstanbul, Türkiye
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} Cesorder. Tüm hakları saklıdır.
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Quantity Selection Modal */}
      {showQuantityModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowQuantityModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sepete Ekle</h3>
                <button
                  onClick={() => setShowQuantityModal(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Product Info */}
            <div className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">{selectedProduct.description}</p>
                  <p className="text-primary font-bold text-xl mt-2">
                    {formatPrice(selectedProduct.basePrice)}
                  </p>
                </div>
              </div>
              
              {/* Quantity Selector */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Adet Seçin</label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <div className="w-20 text-center">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                      className="w-full text-center text-2xl font-bold border-0 focus:ring-0"
                    />
                  </div>
                  <button
                    onClick={() => setSelectedQuantity(Math.min(99, selectedQuantity + 1))}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Quick Select Buttons */}
                <div className="flex justify-center gap-2 mt-4">
                  {[1, 2, 3, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setSelectedQuantity(qty)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedQuantity === qty
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Total */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Tutar</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(selectedProduct.basePrice * selectedQuantity)}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQuantityModal(false)}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1"
                  onClick={addToCartWithQuantity}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sepete Ekle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Sepetim ({cartItemCount})</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <div>
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Sepetiniz boş</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.product.basePrice)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-auto text-destructive"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t space-y-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Toplam</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    {isAuthenticated ? (
                      <Button className="w-full" size="lg" onClick={() => router.push('/orders/new')}>
                        Sipariş Ver
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Link href="/login" className="block">
                          <Button className="w-full" size="lg">
                            Giriş Yap ve Sipariş Ver
                          </Button>
                        </Link>
                        <Button 
                          className="w-full" 
                          size="lg" 
                          variant="outline"
                          onClick={() => router.push('/checkout/guest')}
                        >
                          Üye Olmadan Devam Et
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Product Card Component
function ProductCard({
  product,
  onAddToCart,
  formatPrice,
}: {
  product: Product
  onAddToCart: (product: Product) => void
  formatPrice: (price: number) => string
}) {
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {product.isFeatured && (
          <Badge className="absolute top-1 left-1 bg-yellow-500 text-yellow-950 text-[10px] px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 mr-0.5" />
            Öne Çıkan
          </Badge>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs">Stokta Yok</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-2 md:p-3">
        <p className="text-[10px] text-muted-foreground mb-0.5 truncate">{product.category?.name}</p>
        <h3 className="font-medium text-xs md:text-sm line-clamp-2 min-h-[2rem]">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-sm md:text-base font-bold text-primary">
            {formatPrice(product.basePrice)}
          </span>
          <span className="text-[10px] text-muted-foreground">/ {product.unit}</span>
        </div>
        <Button
          className="w-full mt-2 h-7 text-xs"
          size="sm"
          disabled={!product.inStock}
          onClick={() => onAddToCart(product)}
        >
          <ShoppingCart className="h-3 w-3 mr-1" />
          Sepete Ekle
        </Button>
      </CardContent>
    </Card>
  )
}

// Product List Item Component
function ProductListItem({
  product,
  onAddToCart,
  formatPrice,
}: {
  product: Product
  onAddToCart: (product: Product) => void
  formatPrice: (price: number) => string
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{product.category?.name}</p>
              <h3 className="font-medium truncate">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {product.description}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-bold text-primary">
                {formatPrice(product.basePrice)}
              </span>
              <p className="text-xs text-muted-foreground">/ {product.unit}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {product.isFeatured && (
                <Badge className="bg-yellow-500 text-yellow-950">
                  <Star className="h-3 w-3 mr-1" />
                  Öne Çıkan
                </Badge>
              )}
              {!product.inStock && <Badge variant="destructive">Stokta Yok</Badge>}
            </div>
            <Button size="sm" disabled={!product.inStock} onClick={() => onAddToCart(product)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sepete Ekle
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Statik Banner Verileri (Restoran Menüsü)
const staticBanners = [
  {
    id: '1',
    title: 'Lezzetli Çorbalar',
    subtitle: 'Günün Çorbası',
    description: 'Geleneksel tariflerle hazırlanan sıcacık çorbalarımızla güne başlayın.',
    image: 'https://picsum.photos/seed/banner-soup/800/800',
    price: '₺65',
    buttonText: 'Sipariş Ver',
  },
  {
    id: '2',
    title: 'Izgara Et Çeşitleri',
    subtitle: 'Şefin Önerisi',
    description: 'Özenle seçilmiş etler, ustalıkla pişirilmiş lezzetler. Adana, Urfa ve daha fazlası.',
    image: 'https://picsum.photos/seed/banner-meat/800/800',
    price: '₺195',
    buttonText: 'Menüyü Gör',
  },
  {
    id: '3',
    title: 'İtalyan Makarnalar',
    subtitle: 'Pasta Çeşitleri',
    description: 'Spagetti, Fettuccine, Lazanya... İtalyan mutfağının en sevilen lezzetleri.',
    image: 'https://picsum.photos/seed/banner-pasta/800/800',
    price: '₺145',
    buttonText: 'Keşfet',
  },
  {
    id: '4',
    title: 'Taze Salatalar',
    subtitle: 'Sağlıklı Seçenekler',
    description: 'Sezar, Akdeniz, Ton Balıklı... Taze ve doyurucu salata çeşitlerimiz.',
    image: 'https://picsum.photos/seed/banner-salad/800/800',
    price: '₺95',
    buttonText: 'Sipariş Ver',
  },
]

// Banner Slider Component
function BannerSlider({
  products,
  formatPrice,
  onAddToCart,
}: {
  products: Product[]
  formatPrice: (price: number) => string
  onAddToCart: (product: Product) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({})
  
  // Ürün varsa ürünleri, yoksa statik banner'ları kullan
  const hasProducts = products.length > 0
  const slideCount = hasProducts ? products.length : staticBanners.length

  useEffect(() => {
    if (slideCount <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount)
    }, 4000) // 4 saniyede bir geçiş
    return () => clearInterval(timer)
  }, [slideCount])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slideCount)
  }

  // Renk paleti her slide için
  const gradients = [
    'from-[#852EC5] via-[#4F79DD] to-[#11D1F8]',
    'from-[#FF6B6B] via-[#FF8E53] to-[#FFC371]',
    'from-[#11998e] via-[#38ef7d] to-[#56ab2f]',
    'from-[#4776E6] via-[#8E54E9] to-[#c471ed]',
  ]
  const gradient = gradients[currentIndex % gradients.length]

  // Statik banner render
  if (!hasProducts) {
    const banner = staticBanners[currentIndex]
    
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${gradient} transition-all duration-700 ease-in-out`}>
        <div className="px-6 py-8 md:px-8 md:py-10 relative">
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
            {/* Banner Image - Sol tarafa dayalı */}
            <div className="w-full md:w-auto flex justify-start">
              <div className="relative group">
                <div 
                  key={currentIndex}
                  className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
                >
                  {!imageError[banner.id] ? (
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={() => setImageError(prev => ({...prev, [banner.id]: true}))}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <Package className="h-12 w-12 text-white/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Banner Content - Sola dayalı */}
            <div className="flex-1 text-white text-left">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium mb-3">
                {banner.subtitle}
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                {banner.title}
              </h2>
              
              <p className="text-white/80 text-sm md:text-base mb-4 max-w-md">
                {banner.description}
              </p>
              
              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-xs text-white/60">Başlayan fiyatlarla</span>
                <span className="text-2xl md:text-3xl font-bold">{banner.price}</span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg hover:shadow-xl transition-all"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {banner.buttonText}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent text-white border-white/50 hover:bg-white/20 hover:text-white"
                  onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Tüm Ürünler
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          {slideCount > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots Navigation */}
        {slideCount > 1 && (
          <div className="flex justify-center gap-2 pb-4">
            {staticBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/30 hover:bg-white/50 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Ürün bazlı banner
  const product = products[currentIndex]

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${gradient} transition-all duration-700 ease-in-out`}>
      <div className="px-6 py-8 md:px-8 md:py-10 relative">
        <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
          {/* Product Image - Sol tarafa dayalı */}
          <div className="w-full md:w-auto flex justify-start">
            <div className="relative group">
              <div 
                key={currentIndex}
                className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Package className="h-12 w-12 text-white/50" />
                  </div>
                )}
                
                {product.isFeatured && (
                  <div className="absolute top-3 left-3 bg-yellow-500 text-yellow-950 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                    <Star className="h-4 w-4 fill-current" />
                    Öne Çıkan
                  </div>
                )}

                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-5 py-2.5 rounded-full text-base font-bold">Stokta Yok</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Info - Sola dayalı */}
          <div className="flex-1 text-white text-left">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium mb-3">
              {product.category?.name || 'Ürün'}
            </div>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
              {product.name}
            </h2>
            
            {product.description && (
              <p className="text-white/80 text-sm md:text-base mb-4 line-clamp-2 max-w-md">
                {product.description}
              </p>
            )}
            
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-2xl md:text-3xl font-bold">
                {formatPrice(product.basePrice)}
              </span>
              <span className="text-white/60 text-sm">/ {product.unit}</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={!product.inStock}
                onClick={() => onAddToCart(product)}
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Sepete Ekle
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent text-white border-white/50 hover:bg-white/20 hover:text-white"
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Tüm Ürünler
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {slideCount > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Navigation */}
      {slideCount > 1 && (
        <div className="flex justify-center gap-2 pb-4">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/30 hover:bg-white/50 w-2'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
