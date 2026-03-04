'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { usersApi, warehousesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Package,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
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

const DEFAULT_PERMISSIONS: Record<string, Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>> = {
  DEALER_ADMIN: {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    settings: { canView: true, canCreate: false, canEdit: true, canDelete: false },
  },
  SALES_REP: {
    customers: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    payments: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    warehouses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  WAREHOUSE_USER: {
    customers: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    products: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    deliveries: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    payments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    warehouses: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  DELIVERY: {
    customers: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    products: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    orders: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    deliveries: { canView: true, canCreate: false, canEdit: true, canDelete: false },
    payments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    warehouses: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
}

export default function NewUserPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'SALES_REP',
    warehouseId: '',
  })

  const [permissions, setPermissions] = useState<Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>(
    DEFAULT_PERMISSIONS['SALES_REP'] || {}
  )

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll({ status: 'active' }),
  })

  const warehouses = warehousesData?.data?.data || []

  useEffect(() => {
    if (formData.role && DEFAULT_PERMISSIONS[formData.role]) {
      setPermissions(DEFAULT_PERMISSIONS[formData.role])
    }
  }, [formData.role])

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla oluşturuldu')
      router.push('/users')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kullanıcı oluşturulamadı')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır')
      return
    }

    createMutation.mutate({
      ...formData,
      warehouseId: formData.warehouseId || undefined,
      permissions,
    })
  }

  const handlePermissionChange = (module: string, permission: string, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Kullanıcı</h1>
          <p className="text-muted-foreground">Sisteme yeni kullanıcı ekleyin</p>
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
              <label className="block text-sm font-medium mb-1">
                Şifre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="En az 8 karakter"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 özel karakter
              </p>
            </div>
          </div>
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
          <p className="text-sm text-muted-foreground mb-4">
            Seçilen role göre varsayılan izinler atanır. İsterseniz özelleştirebilirsiniz.
          </p>

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
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  )
}
