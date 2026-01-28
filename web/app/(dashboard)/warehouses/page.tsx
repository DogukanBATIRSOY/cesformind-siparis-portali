'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Warehouse, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Users, 
  MapPin,
  Check,
  X,
  AlertTriangle,
  MoreHorizontal,
  ArrowRightLeft,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { warehousesApi } from '@/lib/api'

export default function WarehousesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingWarehouse, setDeletingWarehouse] = useState<any>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    isDefault: false,
    isActive: true,
  })

  // Transfer form state
  const [transferData, setTransferData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    quantity: '',
    notes: '',
  })

  // Fetch warehouses
  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', showInactive],
    queryFn: () => warehousesApi.getAll({ isActive: showInactive ? undefined : true }),
  })

  // Fetch low stock items
  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => warehousesApi.getLowStock(),
  })

  const warehouses = data?.data?.data || []
  const lowStockCount = lowStockData?.data?.data?.length || 0

  // Filter warehouses
  const filteredWarehouses = warehouses.filter((w: any) => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.toLowerCase().includes(search.toLowerCase()) ||
    w.city?.toLowerCase().includes(search.toLowerCase())
  )

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => warehousesApi.create(data),
    onSuccess: () => {
      toast.success('Depo başarıyla oluşturuldu')
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setShowModal(false)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Depo oluşturulamadı')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => warehousesApi.update(id, data),
    onSuccess: () => {
      toast.success('Depo başarıyla güncellendi')
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setShowModal(false)
      setEditingWarehouse(null)
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Depo güncellenemedi')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.delete(id),
    onSuccess: () => {
      toast.success('Depo başarıyla silindi')
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setShowDeleteModal(false)
      setDeletingWarehouse(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Depo silinemedi')
    },
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      isDefault: false,
      isActive: true,
    })
  }

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse)
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      city: warehouse.city || '',
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
    })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (warehouse: any) => {
    setDeletingWarehouse(warehouse)
    setShowDeleteModal(true)
  }

  // Stats
  const totalWarehouses = warehouses.length
  const activeWarehouses = warehouses.filter((w: any) => w.isActive).length
  const totalProducts = warehouses.reduce((acc: number, w: any) => acc + (w._count?.stocks || 0), 0)
  const totalUsers = warehouses.reduce((acc: number, w: any) => acc + (w._count?.users || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Depolar</h1>
          <p className="text-muted-foreground">Depo ve stok yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTransferModal(true)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Stok Transfer
          </Button>
          <Button onClick={() => {
            resetForm()
            setEditingWarehouse(null)
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Depo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Warehouse className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Depo</p>
                <p className="text-2xl font-bold">{totalWarehouses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aktif Depo</p>
                <p className="text-2xl font-bold">{activeWarehouses}</p>
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
                <p className="text-sm text-muted-foreground">Toplam Ürün</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Düşük Stok</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Depo ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Pasif depoları göster</span>
        </label>
      </div>

      {/* Warehouses Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Warehouse className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Depo bulunamadı</h3>
            <p className="text-muted-foreground mt-1">
              {search ? 'Arama kriterlerine uygun depo yok' : 'Henüz depo eklenmemiş'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse: any) => (
            <Card key={warehouse.id} className={`relative ${!warehouse.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                      {warehouse.isDefault && (
                        <Badge className="bg-blue-100 text-blue-700">Varsayılan</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                  </div>
                  <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
                    {warehouse.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {warehouse.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>{warehouse.address}, {warehouse.city}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>{warehouse._count?.stocks || 0} ürün</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{warehouse._count?.users || 0} personel</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Link href={`/warehouses/${warehouse.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      Detay
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(warehouse)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(warehouse)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingWarehouse ? 'Depo Düzenle' : 'Yeni Depo'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Depo Kodu *</label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="DEPO-01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şehir</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="İstanbul"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Depo Adı *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Merkez Depo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Adres</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Depo adresi"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Varsayılan depo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Aktif</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false)
                      setEditingWarehouse(null)
                      resetForm()
                    }}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingWarehouse ? 'Güncelle' : 'Oluştur'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingWarehouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Depo Sil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                <strong>{deletingWarehouse.name}</strong> deposunu silmek istediğinize emin misiniz?
              </p>
              <p className="text-sm text-muted-foreground">
                Bu işlem geri alınamaz. Stoğu veya siparişi olan depolar silinemez.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingWarehouse(null)
                  }}
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteMutation.mutate(deletingWarehouse.id)}
                  disabled={deleteMutation.isPending}
                >
                  Sil
                </Button>
              </div>
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
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Stok transfer özelliği için depo detay sayfasını kullanın.</p>
                <p className="text-sm mt-2">Depo kartlarındaki "Detay" butonuna tıklayın.</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowTransferModal(false)}
              >
                Kapat
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
