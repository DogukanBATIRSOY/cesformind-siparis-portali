'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { usersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Shield,
  ShieldCheck,
  Building2,
  Truck,
  Package,
  UserCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Süper Admin',
  DEALER_ADMIN: 'Bayi Admin',
  SALES_REP: 'Plasiyer',
  WAREHOUSE_USER: 'Depo Kullanıcısı',
  DELIVERY: 'Teslimat',
  CUSTOMER: 'Müşteri',
  ADMIN: 'Admin',
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  DEALER_ADMIN: 'bg-blue-100 text-blue-800',
  SALES_REP: 'bg-green-100 text-green-800',
  WAREHOUSE_USER: 'bg-orange-100 text-orange-800',
  DELIVERY: 'bg-yellow-100 text-yellow-800',
  CUSTOMER: 'bg-gray-100 text-gray-800',
  ADMIN: 'bg-red-100 text-red-800',
}

const ROLE_ICONS: Record<string, any> = {
  SUPER_ADMIN: ShieldCheck,
  DEALER_ADMIN: Building2,
  SALES_REP: UserCircle,
  WAREHOUSE_USER: Package,
  DELIVERY: Truck,
  CUSTOMER: Users,
  ADMIN: Shield,
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  SUSPENDED: 'Askıya Alınmış',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
}

const STATUS_ICONS: Record<string, any> = {
  ACTIVE: CheckCircle,
  INACTIVE: XCircle,
  SUSPENDED: Clock,
}

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role: roleFilter, status: statusFilter, page }],
    queryFn: () =>
      usersApi.getAll({
        search,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('Kullanıcı silindi')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowDeleteModal(false)
      setSelectedUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Şifre sıfırlandı')
      setShowResetPasswordModal(false)
      setSelectedUser(null)
      setNewPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Şifre sıfırlama başarısız')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      usersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Durum güncellendi')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Güncelleme başarısız')
    },
  })

  const users = data?.data?.data || []
  const meta = data?.data?.meta || { total: 0, totalPages: 1 }

  const handleDelete = (user: any) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
    setOpenDropdown(null)
  }

  const handleResetPassword = (user: any) => {
    setSelectedUser(user)
    setShowResetPasswordModal(true)
    setNewPassword('')
    setOpenDropdown(null)
  }

  const handleStatusChange = (user: any, status: string) => {
    statusMutation.mutate({ id: user.id, status })
    setOpenDropdown(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">Sistem kullanıcılarını yönetin</p>
          </div>
        </div>
        <Button onClick={() => router.push('/users/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Filtreler */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim, email veya telefon ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tüm Roller</option>
            <option value="SUPER_ADMIN">Süper Admin</option>
            <option value="DEALER_ADMIN">Bayi Admin</option>
            <option value="SALES_REP">Plasiyer</option>
            <option value="WAREHOUSE_USER">Depo Kullanıcısı</option>
            <option value="DELIVERY">Teslimat</option>
            <option value="CUSTOMER">Müşteri</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
            <option value="SUSPENDED">Askıya Alınmış</option>
          </select>
        </div>
      </div>

      {/* Kullanıcı Listesi */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Kullanıcı</th>
                <th className="text-left p-4 font-medium">Rol</th>
                <th className="text-left p-4 font-medium">Durum</th>
                <th className="text-left p-4 font-medium">Son Giriş</th>
                <th className="text-left p-4 font-medium">Oluşturan</th>
                <th className="text-right p-4 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                users.map((user: any) => {
                  const RoleIcon = ROLE_ICONS[user.role] || Users
                  const StatusIcon = STATUS_ICONS[user.status] || CheckCircle

                  return (
                    <tr key={user.id} className="border-t hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[user.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {STATUS_LABELS[user.status] || user.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('tr-TR')
                          : 'Henüz giriş yapmadı'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {user.createdByUser
                          ? `${user.createdByUser.firstName} ${user.createdByUser.lastName}`
                          : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setOpenDropdown(openDropdown === user.id ? null : user.id)
                              }
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>

                            {openDropdown === user.id && (
                              <div className="absolute right-0 top-full mt-1 bg-card border rounded-md shadow-lg z-10 min-w-[160px]">
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  onClick={() => {
                                    router.push(`/users/${user.id}/edit`)
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  Düzenle
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  onClick={() => handleResetPassword(user)}
                                >
                                  <Key className="h-4 w-4" />
                                  Şifre Sıfırla
                                </button>
                                <div className="border-t my-1" />
                                {user.status === 'ACTIVE' ? (
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-orange-600"
                                    onClick={() => handleStatusChange(user, 'INACTIVE')}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Pasife Al
                                  </button>
                                ) : (
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"
                                    onClick={() => handleStatusChange(user, 'ACTIVE')}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Aktifleştir
                                  </button>
                                )}
                                <div className="border-t my-1" />
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                                  onClick={() => handleDelete(user)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Toplam {meta.total} kullanıcı
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Önceki
              </Button>
              <span className="text-sm">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === meta.totalPages}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Silme Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Kullanıcıyı Sil</h3>
            <p className="text-muted-foreground mb-6">
              <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> kullanıcısını
              silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedUser(null)
                }}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(selectedUser.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Şifre Sıfırlama Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Şifre Sıfırla</h3>
            <p className="text-muted-foreground mb-4">
              <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> için yeni şifre belirleyin.
            </p>
            <Input
              type="password"
              placeholder="Yeni şifre (min. 8 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-4"
            />
            <p className="text-xs text-muted-foreground mb-4">
              Kullanıcı bir sonraki girişinde şifresini değiştirmek zorunda kalacak.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResetPasswordModal(false)
                  setSelectedUser(null)
                  setNewPassword('')
                }}
              >
                İptal
              </Button>
              <Button
                onClick={() =>
                  resetPasswordMutation.mutate({
                    id: selectedUser.id,
                    password: newPassword,
                  })
                }
                disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              >
                {resetPasswordMutation.isPending ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </div>
  )
}
