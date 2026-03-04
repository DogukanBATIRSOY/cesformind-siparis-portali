'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, warehousesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Shield,
  Package,
  Check,
  X,
  Loader2,
  Key,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Süper Admin', description: 'Tüm sistem yetkilerine sahip' },
  { value: 'DEALER_ADMIN', label: 'Bayi Admin', description: 'Kendi bayisi altındaki kullanıcıları ve işlemleri yönetir' },
  { value: 'SALES_REP', label: 'Plasiyer', description: 'Müşteri ziyaretleri ve sipariş oluşturma yetkisi' },
  { value: 'WAREHOUSE_USER', label: 'Depo Kullanıcısı', description: 'Depo ve stok işlemlerini yönetir' },
  { value: 'DELIVERY', label: 'Teslimat', description: 'Teslimat işlemlerini gerçekleştirir' },
]

const MODULES = [
  { key: 'customers', label: 'Müşteriler' },
  { key: 'products', label: 'Ürünler' },
  { key: 'orders', label: 'Siparişler' },
  { key: 'deliveries', label: 'Teslimatlar' },
  { key: 'payments', label: 'Ödemeler' },
  { key: 'warehouses', label: 'Depolar' },
  { key: 'reports', label: 'Raporlar' },
  { key: 'users', label: 'Kullanıcılar' },
  { key: 'settings', label: 'Ayarlar' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Pasif' },
  { value: 'SUSPENDED', label: 'Askıya Alınmış' },
]

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const userId = params.id as string

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    status: '',
    warehouseId: '',
  })

  const [permissions, setPermissions] = useState<Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>({})

  const [showResetPassword, setShowResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getById(userId),
  })

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll({ status: 'active' }),
  })

  const warehouses = warehousesData?.data?.data || []
  const user = userData?.data?.data

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        status: user.status || '',
        warehouseId: user.warehouseId || '',
      })

      // İzinleri ayarla
      const perms: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {}
      if (user.permissions && Array.isArray(user.permissions)) {
        user.permissions.forEach((p: any) => {
          perms[p.module] = {
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
          }
        })
      }
      setPermissions(perms)
    }
  }, [user])

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(userId, data),
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla güncellendi')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      router.push('/users')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Güncelleme başarısız')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) => usersApi.resetPassword(userId, password),
    onSuccess: () => {
      toast.success('Şifre sıfırlandı')
      setShowResetPassword(false)
      setNewPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Şifre sıfırlama başarısız')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    updateMutation.mutate({
      ...formData,
      warehouseId: formData.warehouseId || null,
      permissions,
    })
  }

  const handlePermissionChange = (module: string, permission: string, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        canView: prev[module]?.canView || false,
        canCreate: prev[module]?.canCreate || false,
        canEdit: prev[module]?.canEdit || false,
        canDelete: prev[module]?.canDelete || false,
        [permission]: value,
      },
    }))
  }

  const toggleAllPermissions = (module: string, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        canView: value,
        canCreate: value,
        canEdit: value,
        canDelete: value,
      },
    }))
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span>Kullanıcı bulunamadı</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Kullanıcı Düzenle</h1>
          <p className="text-muted-foreground">
            {user.firstName} {user.lastName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Temel Bilgiler */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Temel Bilgiler
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ad <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Ad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Soyad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                E-posta <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ornek@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Telefon <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5XX XXX XX XX"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Şifre Sıfırlama */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" />
            Şifre Yönetimi
          </h2>

          {!showResetPassword ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetPassword(true)}
            >
              <Key className="h-4 w-4 mr-2" />
              Şifreyi Sıfırla
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Input
                type="password"
                placeholder="Yeni şifre (min. 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="max-w-xs"
              />
              <Button
                type="button"
                onClick={() => resetPasswordMutation.mutate(newPassword)}
                disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              >
                {resetPasswordMutation.isPending ? 'Sıfırlanıyor...' : 'Sıfırla'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowResetPassword(false)
                  setNewPassword('')
                }}
              >
                İptal
              </Button>
            </div>
          )}
        </div>

        {/* Rol ve Depo */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rol ve Atama
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
                disabled={user.role === 'SUPER_ADMIN'}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {ROLES.find((r) => r.value === formData.role)?.description}
              </p>
            </div>

            {formData.role === 'WAREHOUSE_USER' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Atanacak Depo
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="w-full border rounded-md pl-10 pr-3 py-2 text-sm"
                  >
                    <option value="">Depo Seçin</option>
                    {warehouses.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* İzinler */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Modül İzinleri
          </h2>

          {user.role === 'SUPER_ADMIN' ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-purple-700">
                Süper Admin kullanıcıları tüm modüllere tam yetkiye sahiptir. İzinler değiştirilemez.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Modül</th>
                    <th className="text-center py-2 px-3 font-medium">Görüntüle</th>
                    <th className="text-center py-2 px-3 font-medium">Oluştur</th>
                    <th className="text-center py-2 px-3 font-medium">Düzenle</th>
                    <th className="text-center py-2 px-3 font-medium">Sil</th>
                    <th className="text-center py-2 px-3 font-medium">Tümü</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((module) => {
                    const modulePerms = permissions[module.key] || {
                      canView: false,
                      canCreate: false,
                      canEdit: false,
                      canDelete: false,
                    }
                    const allChecked =
                      modulePerms.canView &&
                      modulePerms.canCreate &&
                      modulePerms.canEdit &&
                      modulePerms.canDelete

                    return (
                      <tr key={module.key} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{module.label}</td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={modulePerms.canView}
                            onChange={(e) =>
                              handlePermissionChange(module.key, 'canView', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={modulePerms.canCreate}
                            onChange={(e) =>
                              handlePermissionChange(module.key, 'canCreate', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={modulePerms.canEdit}
                            onChange={(e) =>
                              handlePermissionChange(module.key, 'canEdit', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={modulePerms.canDelete}
                            onChange={(e) =>
                              handlePermissionChange(module.key, 'canDelete', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAllPermissions(module.key, !allChecked)}
                            className={`p-1 rounded ${
                              allChecked
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {allChecked ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Oluşturan Bilgisi */}
        {user.createdByUser && (
          <div className="bg-muted/30 border rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Bu kullanıcı <strong>{user.createdByUser.firstName} {user.createdByUser.lastName}</strong> tarafından{' '}
              {new Date(user.createdAt).toLocaleDateString('tr-TR')} tarihinde oluşturuldu.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            İptal
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  )
}
