'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { paymentsApi, customersApi, ordersApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Eye,
  Plus,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  AlertCircle,
  Receipt,
  Truck,
  Globe,
  X,
} from 'lucide-react'

const paymentTypeColors: Record<string, string> = {
  CASH: 'secondary',
  CREDIT_CARD: 'default',
  BANK_TRANSFER: 'default',
  ONLINE: 'default',
  DOOR_CASH: 'secondary',
  DOOR_CARD: 'default',
  CHECK: 'warning',
  PROMISSORY_NOTE: 'warning',
  DBS: 'default',
}

const paymentTypeLabels: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Havale/EFT',
  ONLINE: 'Online Ödeme',
  DOOR_CASH: 'Kapıda Nakit',
  DOOR_CARD: 'Kapıda Kart',
  CHECK: 'Çek',
  PROMISSORY_NOTE: 'Senet',
  DBS: 'DBS',
}

const paymentTypeIcons: Record<string, any> = {
  CASH: Banknote,
  CREDIT_CARD: CreditCard,
  BANK_TRANSFER: Building2,
  ONLINE: Globe,
  DOOR_CASH: Truck,
  DOOR_CARD: Truck,
  CHECK: Receipt,
  PROMISSORY_NOTE: Receipt,
  DBS: Building2,
}

const statusColors: Record<string, string> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
  REFUNDED: 'destructive',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Başarısız',
  CANCELLED: 'İptal',
  REFUNDED: 'İade Edildi',
}

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false)

  // Ödemeleri getir
  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, search, status, type],
    queryFn: () =>
      paymentsApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        type: type || undefined,
      }),
  })

  // İstatistikleri getir
  const { data: statsData } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => paymentsApi.getStats(),
  })

  const payments = data?.data?.data || []
  const meta = data?.data?.meta
  const stats = statsData?.data?.data || {
    totalReceived: 0,
    totalPending: 0,
    todayReceived: 0,
    monthlyReceived: 0,
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string
    value: string | number
    icon: any
    color: string
    subtitle?: string
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ödemeler</h1>
          <p className="text-muted-foreground">
            Ödeme ve tahsilat yönetimi
          </p>
        </div>
        <Button onClick={() => setShowNewPaymentModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ödeme Ekle
        </Button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Tahsilat"
          value={formatCurrency(stats.totalReceived)}
          icon={Wallet}
          color="bg-green-500"
        />
        <StatCard
          title="Bekleyen Ödemeler"
          value={formatCurrency(stats.totalPending)}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Bugün Tahsil Edilen"
          value={formatCurrency(stats.todayReceived)}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Bu Ay Tahsil Edilen"
          value={formatCurrency(stats.monthlyReceived)}
          icon={CheckCircle}
          color="bg-purple-500"
        />
      </div>

      {/* Ödeme Yöntemleri */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 1. Online Ödeme */}
        <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Online Ödeme</p>
                <p className="text-xs text-muted-foreground">Kredi/Banka Kartı</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 2. Havale/EFT */}
        <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Havale/EFT</p>
                <p className="text-xs text-muted-foreground">Banka Transferi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 3. DBS */}
        <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-indigo-100 rounded-full">
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium">DBS</p>
                <p className="text-xs text-muted-foreground">Doğrudan Borçlandırma</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 4. Kapıda Ödeme */}
        <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-green-100 rounded-full">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Kapıda Ödeme</p>
                <p className="text-xs text-muted-foreground">Nakit veya Kart</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 5. Vadeli Ödeme */}
        <Card className="border-2 border-dashed hover:border-primary cursor-pointer transition-colors">
          <CardContent className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-orange-100 rounded-full">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Vadeli Ödeme</p>
                <p className="text-xs text-muted-foreground">Çek / Senet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ödeme no, müşteri veya sipariş ara..."
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
              <option value="">Tüm Ödeme Tipleri</option>
              <optgroup label="Online">
                <option value="ONLINE">Online Ödeme</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
              </optgroup>
              <optgroup label="Kapıda Ödeme">
                <option value="DOOR_CASH">Kapıda Nakit</option>
                <option value="DOOR_CARD">Kapıda Kart</option>
              </optgroup>
              <optgroup label="Diğer">
                <option value="CASH">Nakit</option>
                <option value="BANK_TRANSFER">Havale/EFT</option>
                <option value="CHECK">Çek</option>
                <option value="PROMISSORY_NOTE">Senet</option>
                <option value="DBS">DBS (Doğrudan Borçlandırma)</option>
              </optgroup>
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ödeme Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Ödeme No</th>
                  <th className="text-left p-4 font-medium">Müşteri</th>
                  <th className="text-left p-4 font-medium">Sipariş</th>
                  <th className="text-left p-4 font-medium">Ödeme Tipi</th>
                  <th className="text-left p-4 font-medium">Tutar</th>
                  <th className="text-left p-4 font-medium">Tarih</th>
                  <th className="text-left p-4 font-medium">Durum</th>
                  <th className="text-left p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-12 w-12 text-muted-foreground/50" />
                        <p>Ödeme kaydı bulunamadı</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payments.map((payment: any) => {
                    const TypeIcon = paymentTypeIcons[payment.type] || CreditCard
                    return (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <span className="font-medium">{payment.paymentNumber}</span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {payment.customer?.companyName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {payment.customer?.code}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          {payment.order ? (
                            <Link
                              href={`/orders/${payment.order.id}`}
                              className="text-primary hover:underline"
                            >
                              {payment.order.orderNumber}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant={paymentTypeColors[payment.type] as any}>
                              {paymentTypeLabels[payment.type] || payment.type}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="p-4">
                          <Badge variant={statusColors[payment.status] as any}>
                            {statusLabels[payment.status]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/payments/${payment.id}`}>
                              <Button variant="ghost" size="icon" title="Detay">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
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
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Toplam {meta.total} kayıt
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
        </CardContent>
      </Card>

      {/* Yeni Ödeme Modal */}
      {showNewPaymentModal && (
        <NewPaymentModal onClose={() => setShowNewPaymentModal(false)} />
      )}
    </div>
  )
}

// Yeni Ödeme Modal Komponenti
function NewPaymentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'DOOR' | ''>('')
  const [paymentType, setPaymentType] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Müşterileri getir
  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersApi.getAll({ limit: 100, status: 'ACTIVE' }),
  })

  // Seçili müşterinin siparişlerini getir
  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => ordersApi.getAll({ customerId, status: 'DELIVERED' }),
    enabled: !!customerId,
  })

  const customers = customersData?.data?.data || []
  const orders = ordersData?.data?.data || []

  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      toast.success('Ödeme kaydı oluşturuldu')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      onClose()
    },
    onError: () => {
      toast.error('Ödeme kaydı oluşturulamadı')
    },
  })

  const handleSubmit = () => {
    if (!customerId || !amount || !paymentType) {
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    createMutation.mutate({
      customerId,
      orderId: orderId || undefined,
      type: paymentType,
      amount: parseFloat(amount),
      notes,
      status: paymentMethod === 'ONLINE' ? 'COMPLETED' : 'PENDING',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Yeni Ödeme</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Step 1: Ödeme Yöntemi Seçimi */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ödeme yöntemini seçin
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setPaymentMethod('ONLINE')
                    setStep(2)
                  }}
                  className={`p-6 border-2 rounded-lg text-center hover:border-primary transition-colors ${
                    paymentMethod === 'ONLINE' ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-blue-100 rounded-full">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Online Ödeme</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kredi kartı ile anında ödeme
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('DOOR')
                    setStep(2)
                  }}
                  className={`p-6 border-2 rounded-lg text-center hover:border-primary transition-colors ${
                    paymentMethod === 'DOOR' ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-green-100 rounded-full">
                      <Truck className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Kapıda Ödeme</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Teslimat sırasında nakit veya kart
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Ödeme Detayları */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                {paymentMethod === 'ONLINE' ? (
                  <>
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Online Ödeme</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Kapıda Ödeme</span>
                  </>
                )}
              </div>

              {/* Ödeme Tipi */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ödeme Tipi *</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethod === 'ONLINE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentType('CREDIT_CARD')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'CREDIT_CARD'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">Kredi Kartı</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('BANK_TRANSFER')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'BANK_TRANSFER'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">Havale/EFT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('DBS')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'DBS'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">DBS</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentType('DOOR_CASH')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'DOOR_CASH'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <Banknote className="h-4 w-4" />
                        <span className="text-sm">Nakit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('DOOR_CARD')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'DOOR_CARD'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">Kart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('DBS')}
                        className={`p-3 border rounded-lg flex items-center gap-2 ${
                          paymentType === 'DBS'
                            ? 'border-primary bg-primary/5'
                            : ''
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="text-sm">DBS</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Müşteri Seçimi */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Müşteri *</label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    setOrderId('')
                  }}
                >
                  <option value="">Müşteri seçin...</option>
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName} ({customer.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sipariş Seçimi (Opsiyonel) */}
              {customerId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Sipariş (Opsiyonel)
                  </label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={orderId}
                    onChange={(e) => {
                      setOrderId(e.target.value)
                      const order = orders.find((o: any) => o.id === e.target.value)
                      if (order) {
                        setAmount(order.totalAmount.toString())
                      }
                    }}
                  >
                    <option value="">Sipariş seçin (opsiyonel)...</option>
                    {orders.map((order: any) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} - {formatCurrency(order.totalAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tutar */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tutar *</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₺
                  </span>
                </div>
              </div>

              {/* Not */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Not (Opsiyonel)</label>
                <Input
                  placeholder="Ödeme notu..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Kapıda ödeme uyarısı */}
              {paymentMethod === 'DOOR' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Kapıda Ödeme Bildirimi</p>
                      <p className="mt-1">
                        Teslimatçı, ödemeyi tahsil ettikten sonra durumu güncelleyecektir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Geri
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !customerId || !amount || !paymentType}
                >
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Ödeme Oluştur'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
