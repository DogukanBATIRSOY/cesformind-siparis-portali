'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehousesApi, productsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowRight,
  Package,
  Warehouse,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle,
  History,
  ArrowLeftRight,
} from 'lucide-react'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  image?: string
  category?: { name: string }
}

interface WarehouseType {
  id: string
  code: string
  name: string
  city?: string
  isDefault: boolean
}

export default function StockTransferPage() {
  const queryClient = useQueryClient()
  const productSearchRef = useRef<HTMLDivElement>(null)

  // States
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [availableStock, setAvailableStock] = useState<number>(0)

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll({ isActive: true }),
  })

  // Fetch products for search
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch, limit: 20, status: 'ACTIVE' }),
    enabled: showProductSearch,
  })

  // Fetch source warehouse stock when product and warehouse selected
  const { data: stockData, refetch: refetchStock } = useQuery({
    queryKey: ['warehouse-stock', fromWarehouseId, selectedProduct?.id],
    queryFn: () => warehousesApi.getStock(fromWarehouseId, { productId: selectedProduct?.id }),
    enabled: !!fromWarehouseId && !!selectedProduct,
  })

  const warehouses: WarehouseType[] = warehousesData?.data?.data || warehousesData?.data || []
  const products: Product[] = productsData?.data?.data || productsData?.data || []

  // Update available stock when data changes
  useEffect(() => {
    if (stockData?.data?.data) {
      const stockItem = stockData.data.data.find((s: any) => s.productId === selectedProduct?.id)
      if (stockItem) {
        setAvailableStock(Number(stockItem.quantity) - Number(stockItem.reserved || 0))
      } else {
        setAvailableStock(0)
      }
    } else {
      setAvailableStock(0)
    }
  }, [stockData, selectedProduct])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: (data: any) => warehousesApi.transferStock(data),
    onSuccess: () => {
      toast.success('Stok transferi başarıyla tamamlandı')
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      // Reset form
      setSelectedProduct(null)
      setQuantity('')
      setNotes('')
      refetchStock()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Transfer işlemi başarısız')
    },
  })

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setProductSearch('')
    setShowProductSearch(false)
    setQuantity('')
  }

  // Handle transfer
  const handleTransfer = () => {
    if (!fromWarehouseId) {
      toast.error('Lütfen kaynak depo seçin')
      return
    }
    if (!toWarehouseId) {
      toast.error('Lütfen hedef depo seçin')
      return
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error('Kaynak ve hedef depo aynı olamaz')
      return
    }
    if (!selectedProduct) {
      toast.error('Lütfen bir ürün seçin')
      return
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.error('Lütfen geçerli bir miktar girin')
      return
    }
    if (Number(quantity) > availableStock) {
      toast.error(`Yetersiz stok. Mevcut: ${availableStock}`)
      return
    }

    transferMutation.mutate({
      fromWarehouseId,
      toWarehouseId,
      productId: selectedProduct.id,
      quantity: Number(quantity),
      notes,
    })
  }

  // Swap warehouses
  const handleSwapWarehouses = () => {
    const temp = fromWarehouseId
    setFromWarehouseId(toWarehouseId)
    setToWarehouseId(temp)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6" />
          Depolar Arası Stok Transferi
        </h1>
        <p className="text-muted-foreground">
          Ürünleri bir depodan diğerine transfer edin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Depo Seçimi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Depo Seçimi
              </CardTitle>
              <CardDescription>Kaynak ve hedef depoları seçin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* Kaynak Depo */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Kaynak Depo *</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={fromWarehouseId}
                    onChange={(e) => {
                      setFromWarehouseId(e.target.value)
                      setSelectedProduct(null)
                      setQuantity('')
                    }}
                  >
                    <option value="">Depo seçin...</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                        {warehouse.isDefault && ' - Varsayılan'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-6"
                  onClick={handleSwapWarehouses}
                  disabled={!fromWarehouseId && !toWarehouseId}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                {/* Hedef Depo */}
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Hedef Depo *</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                  >
                    <option value="">Depo seçin...</option>
                    {warehouses
                      .filter((w) => w.id !== fromWarehouseId)
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                          {warehouse.isDefault && ' - Varsayılan'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Visual Arrow */}
              {fromWarehouseId && toWarehouseId && (
                <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="font-medium">
                      {warehouses.find((w) => w.id === fromWarehouseId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Kaynak</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-primary" />
                  <div className="text-center">
                    <p className="font-medium">
                      {warehouses.find((w) => w.id === toWarehouseId)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Hedef</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ürün Seçimi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ürün ve Miktar
              </CardTitle>
              <CardDescription>Transfer edilecek ürünü ve miktarı belirleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ürün *</label>
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        {selectedProduct.image ? (
                          <img
                            src={selectedProduct.image.startsWith('http') ? selectedProduct.image : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${selectedProduct.image}`}
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{selectedProduct.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {selectedProduct.sku} | Birim: {selectedProduct.unit}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(null)
                        setQuantity('')
                      }}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : (
                  <div className="relative" ref={productSearchRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ürün adı veya SKU ile arayın..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setShowProductSearch(true)
                      }}
                      onFocus={() => setShowProductSearch(true)}
                      className="pl-10"
                      disabled={!fromWarehouseId}
                    />
                    {!fromWarehouseId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Önce kaynak depo seçin
                      </p>
                    )}

                    {/* Product Search Results */}
                    {showProductSearch && fromWarehouseId && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                        {productsLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : products.length > 0 ? (
                          products.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-3"
                              onClick={() => handleSelectProduct(product)}
                            >
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.sku} | {product.category?.name || 'Kategori yok'}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Ürün bulunamadı
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity and Stock Info */}
              {selectedProduct && fromWarehouseId && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transfer Miktarı *</label>
                    <Input
                      type="number"
                      min="1"
                      max={availableStock}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Miktar girin..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mevcut Stok</label>
                    <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                      <span className={availableStock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {availableStock} {selectedProduct.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Transfer Notu (Opsiyonel)</label>
                <textarea
                  className="w-full h-20 px-3 py-2 border rounded-md bg-background resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transfer ile ilgili notlar..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary & Action */}
        <div className="space-y-6">
          {/* Transfer Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kaynak Depo:</span>
                  <span className="font-medium">
                    {warehouses.find((w) => w.id === fromWarehouseId)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hedef Depo:</span>
                  <span className="font-medium">
                    {warehouses.find((w) => w.id === toWarehouseId)?.name || '-'}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ürün:</span>
                    <span className="font-medium">{selectedProduct?.name || '-'}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Miktar:</span>
                  <span className="font-medium">
                    {quantity ? `${quantity} ${selectedProduct?.unit || ''}` : '-'}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleTransfer}
                disabled={
                  transferMutation.isPending ||
                  !fromWarehouseId ||
                  !toWarehouseId ||
                  !selectedProduct ||
                  !quantity ||
                  Number(quantity) <= 0 ||
                  Number(quantity) > availableStock
                }
              >
                {transferMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transfer Ediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Transferi Onayla
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Bilgi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Transfer işlemi anında gerçekleşir</p>
                <p>• Kaynak depodaki stok düşer</p>
                <p>• Hedef depodaki stok artar</p>
                <p>• Tüm transferler stok hareketlerinde kayıt altına alınır</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
