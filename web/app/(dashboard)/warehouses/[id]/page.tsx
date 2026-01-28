'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Package, 
  Users, 
  MapPin, 
  Edit, 
  Search,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Minus,
  History,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { warehousesApi, productsApi } from '@/lib/api'

const movementTypeLabels: Record<string, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Düzeltme',
  RESERVED: 'Rezerve',
  RELEASED: 'Serbest',
}

const movementTypeColors: Record<string, string> = {
  IN: 'bg-green-100 text-green-700',
  OUT: 'bg-red-100 text-red-700',
  TRANSFER: 'bg-blue-100 text-blue-700',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
  RESERVED: 'bg-purple-100 text-purple-700',
  RELEASED: 'bg-gray-100 text-gray-700',
}

export default function WarehouseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Stock update form
  const [stockForm, setStockForm] = useState({
    productId: '',
    quantity: '',
    type: 'IN',
    notes: '',
  })

  // Transfer form
  const [transferForm, setTransferForm] = useState({
    toWarehouseId: '',
    productId: '',
    quantity: '',
    notes: '',
  })

  // Fetch warehouse
  const { data: warehouseData, isLoading } = useQuery({
    queryKey: ['warehouse', params.id],
    queryFn: () => warehousesApi.getById(params.id as string),
    enabled: !!params.id,
  })

  // Fetch stock
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['warehouse-stock', params.id, showLowStock],
    queryFn: () => warehousesApi.getStock(params.id as string, { lowStock: showLowStock }),
    enabled: !!params.id,
  })

  // Fetch all warehouses for transfer
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll({ isActive: true }),
  })

  // Fetch products for adding stock
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ status: 'ACTIVE', limit: 1000 }),
  })

  const warehouse = warehouseData?.data?.data
  const stocks = stockData?.data?.data || []
  const warehouses = warehousesData?.data?.data || []
  const products = productsData?.data?.data || []

  // Filter stocks
  const filteredStocks = stocks.filter((s: any) => 
    s.product.name.toLowerCase().includes(search.toLowerCase()) ||
    s.product.sku.toLowerCase().includes(search.toLowerCase())
  )

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: (data: any) => warehousesApi.updateStock(params.id as string, data),
    onSuccess: () => {
      toast.success('Stok güncellendi')
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock', params.id] })
      setShowStockModal(false)
      setStockForm({ productId: '', quantity: '', type: 'IN', notes: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Stok güncellenemedi')
    },
  })

  // Transfer stock mutation
  const transferMutation = useMutation({
    mutationFn: (data: any) => warehousesApi.transferStock({
      ...data,
      fromWarehouseId: params.id,
    }),
    onSuccess: () => {
      toast.success('Stok transferi tamamlandı')
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock', params.id] })
      setShowTransferModal(false)
      setTransferForm({ toWarehouseId: '', productId: '', quantity: '', notes: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Transfer başarısız')
    },
  })

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateStockMutation.mutate({
      productId: stockForm.productId,
      quantity: parseFloat(stockForm.quantity),
      type: stockForm.type,
      notes: stockForm.notes,
    })
  }

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    transferMutation.mutate({
      toWarehouseId: transferForm.toWarehouseId,
      productId: transferForm.productId,
      quantity: parseFloat(transferForm.quantity),
      notes: transferForm.notes,
    })
  }

  const openQuickUpdate = (stock: any, type: 'IN' | 'OUT') => {
    setStockForm({
      productId: stock.product.id,
      quantity: '',
      type,
      notes: '',
    })
    setSelectedProduct(stock.product)
    setShowStockModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Depo bulunamadı</h2>
        <Link href="/warehouses">
          <Button variant="link">Depolara dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{warehouse.name}</h1>
            <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
              {warehouse.isActive ? 'Aktif' : 'Pasif'}
            </Badge>
            {warehouse.isDefault && (
              <Badge className="bg-blue-100 text-blue-700">Varsayılan</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{warehouse.code}</p>
        </div>
        <Link href={`/warehouses/${warehouse.id}/edit`}>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </Link>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adres</p>
                <p className="font-medium">
                  {warehouse.address ? `${warehouse.address}, ${warehouse.city}` : warehouse.city || 'Belirtilmemiş'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ürün Çeşidi</p>
                <p className="text-2xl font-bold">{warehouse._count?.stocks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personel</p>
                <p className="text-2xl font-bold">{warehouse._count?.users || warehouse.users?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'stock' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('stock')}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Stoklar
        </button>
        <button
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'movements' 
              ? 'border-primary text-primary font-medium' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('movements')}
        >
          <History className="h-4 w-4 inline mr-2" />
          Hareketler
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ürün ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md">
                <input
                  type="checkbox"
                  checked={showLowStock}
                  onChange={(e) => setShowLowStock(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Düşük stok</span>
              </label>
              <Button onClick={() => {
                setStockForm({ productId: '', quantity: '', type: 'IN', notes: '' })
                setSelectedProduct(null)
                setShowStockModal(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Stok Ekle
              </Button>
              <Button variant="outline" onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </div>
          </div>

          {/* Stock Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ürün</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Kategori</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stok</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Rezerve</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Kullanılabilir</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        {search ? 'Ürün bulunamadı' : 'Henüz stok kaydı yok'}
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((stock: any) => {
                      const available = Number(stock.quantity) - Number(stock.reserved)
                      const isLow = available <= stock.product.minStock
                      return (
                        <tr key={stock.id} className={isLow ? 'bg-orange-50' : ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isLow && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              <span className="font-medium">{stock.product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{stock.product.sku}</td>
                          <td className="px-4 py-3 text-sm">{stock.product.category?.name || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {Number(stock.quantity).toLocaleString('tr-TR')} {stock.product.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {Number(stock.reserved).toLocaleString('tr-TR')}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-orange-600' : 'text-green-600'}`}>
                            {available.toLocaleString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-600"
                                onClick={() => openQuickUpdate(stock, 'IN')}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => openQuickUpdate(stock, 'OUT')}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Stok hareketleri yakında eklenecek</p>
          </CardContent>
        </Card>
      )}

      {/* Stock Update Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {selectedProduct ? `${selectedProduct.name} - Stok Güncelle` : 'Stok Ekle'}
              </CardTitle>
              {selectedProduct && (
                <CardDescription>SKU: {selectedProduct.sku}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockSubmit} className="space-y-4">
                {!selectedProduct && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ürün *</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={stockForm.productId}
                      onChange={(e) => setStockForm({ ...stockForm, productId: e.target.value })}
                      required
                    >
                      <option value="">Ürün seçin...</option>
                      {products.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">İşlem Tipi *</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={stockForm.type}
                      onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}
                    >
                      <option value="IN">Giriş</option>
                      <option value="OUT">Çıkış</option>
                      <option value="ADJUSTMENT">Düzeltme</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Miktar *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={stockForm.quantity}
                      onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Açıklama</label>
                  <Input
                    value={stockForm.notes}
                    onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                    placeholder="İşlem açıklaması..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowStockModal(false)
                      setSelectedProduct(null)
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateStockMutation.isPending}
                  >
                    Kaydet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Stok Transfer
              </CardTitle>
              <CardDescription>
                {warehouse.name} deposundan transfer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hedef Depo *</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={transferForm.toWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                    required
                  >
                    <option value="">Depo seçin...</option>
                    {warehouses
                      .filter((w: any) => w.id !== params.id)
                      .map((w: any) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ürün *</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={transferForm.productId}
                    onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                    required
                  >
                    <option value="">Ürün seçin...</option>
                    {stocks.map((stock: any) => (
                      <option key={stock.product.id} value={stock.product.id}>
                        {stock.product.name} (Stok: {Number(stock.quantity) - Number(stock.reserved)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Miktar *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Açıklama</label>
                  <Input
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    placeholder="Transfer açıklaması..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowTransferModal(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={transferMutation.isPending}
                  >
                    Transfer Et
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
