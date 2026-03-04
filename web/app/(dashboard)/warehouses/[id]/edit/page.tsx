'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { warehousesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  Trash2,
  Warehouse,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export default function WarehouseEditPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const warehouseId = params.id as string

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    isActive: true,
    isDefault: false,
  })

  // Fetch warehouse
  const { data, isLoading, error } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => warehousesApi.getById(warehouseId),
    enabled: !!warehouseId,
  })

  const warehouse = data?.data?.data

  // Populate form when data loads
  useEffect(() => {
    if (warehouse) {
      setFormData({
        code: warehouse.code || '',
        name: warehouse.name || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        isActive: warehouse.isActive ?? true,
        isDefault: warehouse.isDefault ?? false,
      })
    }
  }, [warehouse])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => warehousesApi.update(warehouseId, data),
    onSuccess: () => {
      toast.success('Depo bilgileri güncellendi')
      queryClient.invalidateQueries({ queryKey: ['warehouse', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      router.push(`/warehouses/${warehouseId}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Güncelleme başarısız')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => warehousesApi.delete(warehouseId),
    onSuccess: () => {
      toast.success('Depo silindi')
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      router.push('/warehouses')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code.trim()) {
      toast.error('Depo kodu gerekli')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Depo adı gerekli')
      return
    }

    updateMutation.mutate(formData)
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className="text-center py-12">
        <Warehouse className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Depo bulunamadı</h2>
        <Link href="/warehouses">
          <Button variant="link" className="mt-2">Depolara dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Depo Düzenle</h1>
            <p className="text-muted-foreground">{warehouse.name} - {warehouse.code}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteModal(true)}
          disabled={warehouse._count?.orders > 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Depoyu Sil
        </Button>
      </div>

      {/* Warning if warehouse has orders */}
      {warehouse._count?.orders > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Bu depo silinemez</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Bu depoda {warehouse._count?.orders || 0} sipariş bulunmaktadır.
                  Silmek için önce siparişleri tamamlayın veya iptal edin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Depo Bilgileri
                </CardTitle>
                <CardDescription>Temel depo bilgilerini düzenleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Depo Kodu *</label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="ÖRN: DEPO-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Depo Adı *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Merkez Depo"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adres Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adres</label>
                  <textarea
                    className="w-full h-20 px-3 py-2 border rounded-md bg-background resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Açık adres..."
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
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Durum Ayarları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 w-5 h-5"
                  />
                  <div>
                    <p className="font-medium">Aktif</p>
                    <p className="text-sm text-muted-foreground">Depo işlem yapabilir</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300 w-5 h-5"
                  />
                  <div>
                    <p className="font-medium">Varsayılan Depo</p>
                    <p className="text-sm text-muted-foreground">Yeni siparişler için varsayılan</p>
                  </div>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Özet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ürün Çeşidi:</span>
                  <span className="font-medium">{warehouse._count?.stocks || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sipariş Sayısı:</span>
                  <span className="font-medium">{warehouse._count?.orders || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Personel:</span>
                  <span className="font-medium">{warehouse.users?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Depoyu Sil
              </CardTitle>
              <CardDescription>
                Bu işlem geri alınamaz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>{warehouse.name}</strong> deposunu silmek istediğinizden emin misiniz?
                  Bu işlem kalıcıdır ve geri alınamaz.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Evet, Sil
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
