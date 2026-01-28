'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { customersApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  KeyRound,
  User,
  X,
  Copy,
  Check,
} from 'lucide-react'

const typeLabels: Record<string, string> = {
  INDIVIDUAL: 'Bireysel',
  CORPORATE: 'Kurumsal',
  RESTAURANT: 'Restoran',
  MARKET: 'Market',
  HOTEL: 'Otel',
  CAFE: 'Kafe',
  CATERING: 'Catering',
  WHOLESALE: 'Toptan',
  DISTRIBUTOR: 'Distribütör',
  DEALER: 'Bayi',
  OTHER: 'Diğer',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  PENDING_APPROVAL: 'warning',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_APPROVAL: 'Onay Bekliyor',
}

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean
    customer: any
    loading: boolean
    result: { password: string; email: string } | null
  }>({ open: false, customer: null, loading: false, result: null })
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, type, status],
    queryFn: () =>
      customersApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
      }),
  })

  const customers = data?.data?.data || []
  const meta = data?.data?.meta

  // Şifre sıfırlama
  const handleResetPassword = async () => {
    if (!resetPasswordModal.customer) return
    
    setResetPasswordModal((prev) => ({ ...prev, loading: true }))
    
    try {
      const response = await customersApi.resetPassword(resetPasswordModal.customer.id)
      const { temporaryPassword, userEmail } = response.data.data
      
      setResetPasswordModal((prev) => ({
        ...prev,
        loading: false,
        result: { password: temporaryPassword, email: userEmail },
      }))
      
      toast.success('Şifre başarıyla sıfırlandı')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Şifre sıfırlanırken hata oluştu')
      setResetPasswordModal((prev) => ({ ...prev, loading: false }))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeResetModal = () => {
    setResetPasswordModal({ open: false, customer: null, loading: false, result: null })
    setCopied(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="text-muted-foreground">
            Müşteri (cari) hesaplarını yönetin
          </p>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müşteri
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri adı, kod veya telefon ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 border rounded-md bg-background"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Tüm Tipler</option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 px-3 border rounded-md bg-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Müşteri bulunamadı
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer: any) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{customer.companyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.code}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusColors[customer.status] as any}>
                    {statusLabels[customer.status]}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.contactPhone}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {typeLabels[customer.type]}
                  </div>
                  {customer.addresses?.[0] && (
                    <div className="text-sm text-muted-foreground">
                      {customer.addresses[0].district}, {customer.addresses[0].city}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Bakiye</p>
                    <p className="font-semibold">
                      {formatCurrency(customer.currentBalance)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="icon" title="Görüntüle">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/customers/${customer.id}/edit`}>
                      <Button variant="ghost" size="icon" title="Düzenle">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Şifre Sıfırla"
                      onClick={() =>
                        setResetPasswordModal({
                          open: true,
                          customer,
                          loading: false,
                          result: null,
                        })
                      }
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {meta.total} müşteri
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Sayfa {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Şifre Sıfırlama Modal */}
      {resetPasswordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeResetModal}
          />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Şifre Sıfırla
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={closeResetModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetPasswordModal.result ? (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                      Şifre başarıyla sıfırlandı!
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{resetPasswordModal.result.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Yeni Şifre</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
                            {resetPasswordModal.result.password}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copyToClipboard(resetPasswordModal.result!.password)
                            }
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kullanıcı ilk girişte şifresini değiştirmek zorunda kalacak.
                  </p>
                  <Button className="w-full" onClick={closeResetModal}>
                    Tamam
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {resetPasswordModal.customer?.companyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {resetPasswordModal.customer?.code}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bu müşterinin şifresini sıfırlamak istediğinizden emin misiniz?
                    Yeni bir geçici şifre oluşturulacak ve kullanıcı ilk girişte
                    şifresini değiştirmek zorunda kalacak.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={closeResetModal}
                    >
                      İptal
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleResetPassword}
                      disabled={resetPasswordModal.loading}
                    >
                      {resetPasswordModal.loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Sıfırlanıyor...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Şifreyi Sıfırla
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
