'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, customersApi, productsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  MapPin,
  Package,
  ShoppingCart,
  Calculator,
  FileText,
  Truck,
} from 'lucide-react'

interface Customer {
  id: string
  code: string
  companyName: string
  contactName: string
  contactPhone: string
  type: string
  addresses: Array<{
    id: string
    title: string
    address: string
    city: string
    district: string
    isDelivery: boolean
    isDefault: boolean
  }>
}

interface Product {
  id: string
  sku: string
  name: string
  basePrice: number
  taxRate: number
  unit: string
  image?: string
  category?: { name: string }
  totalStock?: number
}

interface OrderItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
  total: number
}

export default function NewOrderPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Refs for click outside detection
  const customerSearchRef = useRef<HTMLDivElement>(null)
  const productSearchRef = useRef<HTMLDivElement>(null)

  // States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerSearch(false)
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductSearch(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch customers - search with minimum 1 character or show all when focused
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => customersApi.getAll({ 
      search: customerSearch || undefined, 
      limit: 20, 
      status: 'ACTIVE' 
    }),
    enabled: showCustomerSearch,
  })

  // Fetch products - search with minimum 1 character or show all when focused
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.getAll({ 
      search: productSearch || undefined, 
      limit: 20, 
      status: 'ACTIVE' 
    }),
    enabled: showProductSearch,
  })

  // Handle different response formats
  const customers = Array.isArray(customersData?.data?.data) 
    ? customersData.data.data 
    : Array.isArray(customersData?.data) 
      ? customersData.data 
      : []
  const products = Array.isArray(productsData?.data?.data) 
    ? productsData.data.data 
    : Array.isArray(productsData?.data) 
      ? productsData.data 
      : []

  // Select customer - fetch full details
  const handleSelectCustomer = async (customer: Customer) => {
    setCustomerSearch('')
    setShowCustomerSearch(false)
    
    try {
      // Fetch full customer details including all addresses
      const response = await customersApi.getById(customer.id)
      const fullCustomer = response.data.data || response.data
      setSelectedCustomer(fullCustomer)
      
      // Set default delivery address
      const defaultAddress = fullCustomer.addresses?.find((a: any) => a.isDelivery && a.isDefault) 
        || fullCustomer.addresses?.find((a: any) => a.isDelivery)
        || fullCustomer.addresses?.[0]
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
      }
    } catch (error) {
      toast.error('Müşteri bilgileri alınamadı')
      console.error('Customer fetch error:', error)
    }
  }

  // Add product to order
  const handleAddProduct = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.productId === product.id
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * item.unitPrice * (1 - item.discount / 100)
            }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: product.basePrice,
        taxRate: product.taxRate,
        discount: 0,
        total: product.basePrice,
      }
      setOrderItems([...orderItems, newItem])
    }
    
    setProductSearch('')
    setShowProductSearch(false)
  }

  // Update item quantity
  const updateItemQuantity = (productId: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.productId === productId) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.unitPrice * (1 - item.discount / 100)
        }
      }
      return item
    }))
  }

  // Update item discount
  const updateItemDiscount = (productId: string, discount: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.productId === productId) {
        const validDiscount = Math.min(100, Math.max(0, discount))
        return {
          ...item,
          discount: validDiscount,
          total: item.quantity * item.unitPrice * (1 - validDiscount / 100)
        }
      }
      return item
    }))
  }

  // Remove item
  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.productId !== productId))
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const totalDiscount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discount / 100), 0)
  const totalTax = orderItems.reduce((sum, item) => sum + (item.total * item.taxRate / 100), 0)
  const grandTotal = subtotal - totalDiscount + totalTax

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: (response) => {
      toast.success('Sipariş başarıyla oluşturuldu')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      router.push(`/orders`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Sipariş oluşturulamadı')
    },
  })

  // Submit order
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      toast.error('Lütfen bir müşteri seçin')
      return
    }

    if (!selectedAddressId) {
      toast.error('Lütfen bir teslimat adresi seçin')
      return
    }

    if (orderItems.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin')
      return
    }

    const orderData = {
      customerId: selectedCustomer.id,
      addressId: selectedAddressId,
      paymentMethod,
      customerNote: notes || undefined,
      items: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
    }

    createMutation.mutate(orderData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Sipariş</h1>
          <p className="text-muted-foreground">Manuel sipariş oluşturun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon */}
          <div className="lg:col-span-2 space-y-6">
            {/* Müşteri Seçimi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Müşteri Bilgileri
                </CardTitle>
                <CardDescription>Sipariş verecek müşteriyi seçin</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCustomer ? (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{selectedCustomer.companyName}</h3>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.code}</p>
                        <p className="text-sm mt-1">{selectedCustomer.contactName} - {selectedCustomer.contactPhone}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null)
                          setSelectedAddressId('')
                        }}
                      >
                        Değiştir
                      </Button>
                    </div>

                    {/* Teslimat Adresi Seçimi */}
                    {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4" />
                          Teslimat Adresi
                        </label>
                        <div className="space-y-2">
                          {selectedCustomer.addresses.filter(a => a.isDelivery).map(address => (
                            <label
                              key={address.id}
                              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAddressId === address.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="deliveryAddress"
                                value={address.id}
                                checked={selectedAddressId === address.id}
                                onChange={(e) => setSelectedAddressId(e.target.value)}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium text-sm">{address.title}</p>
                                <p className="text-xs text-muted-foreground">{address.address}</p>
                                <p className="text-xs text-muted-foreground">{address.district} / {address.city}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative" ref={customerSearchRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Müşteri adı veya kodu ile arayın (veya tıklayın)..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerSearch(true)
                      }}
                      onFocus={() => setShowCustomerSearch(true)}
                      className="pl-10"
                    />
                    
                    {/* Customer Search Results */}
                    {showCustomerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                        {customersLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : customers.length > 0 ? (
                          customers.map((customer: Customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              <p className="font-medium">{customer.companyName}</p>
                              <p className="text-xs text-muted-foreground">{customer.code} - {customer.contactName}</p>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Müşteri bulunamadı
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ürün Ekleme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Ürünler
                </CardTitle>
                <CardDescription>Siparişe ürün ekleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Search */}
                <div className="relative" ref={productSearchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün adı veya SKU ile arayın (veya tıklayın)..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductSearch(true)
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    className="pl-10"
                  />
                  
                  {/* Product Search Results */}
                  {showProductSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                      {productsLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : products.length > 0 ? (
                        products.map((product: Product) => {
                          const imageUrl = product.image 
                            ? (product.image.startsWith('http') ? product.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${product.image}`)
                            : null
                          return (
                            <button
                              key={product.id}
                              type="button"
                              className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-3"
                              onClick={() => handleAddProduct(product)}
                            >
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.sku} - {formatCurrency(product.basePrice)}</p>
                              </div>
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )
                        })
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Ürün bulunamadı
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Items List */}
                {orderItems.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {orderItems.map((item, index) => {
                      const itemImageUrl = item.product.image 
                        ? (item.product.image.startsWith('http') ? item.product.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${item.product.image}`)
                        : null
                      return (
                      <div key={item.productId} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {itemImageUrl ? (
                              <img src={itemImageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(item.productId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              {/* Quantity */}
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(item.productId, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-10 text-center font-medium">{item.quantity}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(item.productId, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {/* Unit Price */}
                              <div className="text-sm">
                                <span className="text-muted-foreground">Birim:</span>{' '}
                                <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                              </div>
                              
                              {/* Discount */}
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">İsk:</span>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={item.discount}
                                  onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                                  className="w-16 h-7 text-sm"
                                />
                                <span className="text-sm">%</span>
                              </div>
                              
                              {/* Total */}
                              <div className="ml-auto text-right">
                                <span className="font-semibold">{formatCurrency(item.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Henüz ürün eklenmedi</p>
                    <p className="text-sm">Yukarıdan ürün arayarak ekleyebilirsiniz</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notlar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sipariş Notları
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sipariş hakkında notlar..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sağ Kolon */}
          <div className="space-y-6">
            {/* Ödeme Yöntemi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Ödeme Yöntemi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Nakit</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="BANK_TRANSFER">Banka Transferi</option>
                  <option value="ON_DELIVERY">Kapıda Ödeme</option>
                  <option value="CREDIT">Açık Hesap</option>
                  <option value="DBS">DBS (Doğrudan Borçlandırma)</option>
                </select>
              </CardContent>
            </Card>

            {/* Sipariş Özeti */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sipariş Özeti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ürün Sayısı:</span>
                  <span className="font-medium">{orderItems.length} kalem</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Adet:</span>
                  <span className="font-medium">{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ara Toplam:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>İndirim:</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">KDV:</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Genel Toplam:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kaydet Butonu */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createMutation.isPending || !selectedCustomer || orderItems.length === 0}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sipariş Oluştur
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
