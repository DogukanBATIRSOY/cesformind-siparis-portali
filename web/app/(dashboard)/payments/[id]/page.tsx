'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  Building,
  Calendar,
  FileText,
  Truck,
  Globe,
  Receipt,
  Printer,
  Mail,
  AlertCircle,
} from 'lucide-react'

const paymentTypeLabels: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Havale/EFT',
  ONLINE: 'Online Ödeme',
  DOOR_CASH: 'Kapıda Nakit',
  DOOR_CARD: 'Kapıda Kart',
  CHECK: 'Çek',
  PROMISSORY_NOTE: 'Senet',
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

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['payment', params.id],
    queryFn: () => paymentsApi.getById(params.id as string),
    enabled: !!params.id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      paymentsApi.update(params.id as string, { status, notes }),
    onSuccess: () => {
      toast.success('Ödeme durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['payment', params.id] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setShowCompleteModal(false)
      setShowCancelModal(false)
    },
    onError: () => {
      toast.error('Güncelleme başarısız')
    },
  })

  const payment = data?.data?.data

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Ödeme bulunamadı</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>
    )
  }

  const TypeIcon = paymentTypeIcons[payment.type] || CreditCard
  const isOnlinePayment = payment.type === 'ONLINE' || payment.type === 'CREDIT_CARD'
  const isDoorPayment = payment.type === 'DOOR_CASH' || payment.type === 'DOOR_CARD'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {payment.paymentNumber}
              <Badge variant={statusColors[payment.status] as any}>
                {statusLabels[payment.status]}
              </Badge>
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              {paymentTypeLabels[payment.type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Mail Gönder
          </Button>
          {payment.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                İptal Et
              </Button>
              <Button onClick={() => setShowCompleteModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Tahsil Edildi
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ödeme Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Ödeme Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Ödeme No</p>
                  <p className="font-medium">{payment.paymentNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ödeme Tipi</p>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {paymentTypeLabels[payment.type]}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tutar</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ödeme Tarihi</p>
                  <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                </div>
                {payment.dueDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vade Tarihi</p>
                    <p className="font-medium">{formatDate(payment.dueDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <Badge variant={statusColors[payment.status] as any}>
                    {statusLabels[payment.status]}
                  </Badge>
                </div>
              </div>

              {/* Ödeme Yöntemi Detayları */}
              {(payment.referenceNumber || payment.bankName) && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-4">Ödeme Detayları</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {payment.referenceNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Referans No
                        </p>
                        <p className="font-medium">{payment.referenceNumber}</p>
                      </div>
                    )}
                    {payment.bankName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Banka</p>
                        <p className="font-medium">{payment.bankName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {payment.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground">Not</p>
                  <p className="mt-1">{payment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Müşteri Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <Link
                    href={`/customers/${payment.customer?.id}`}
                    className="font-medium text-lg hover:text-primary"
                  >
                    {payment.customer?.companyName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {payment.customer?.code}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {payment.customer?.contactName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        VKN: {payment.customer?.taxNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sipariş Bilgileri */}
          {payment.order && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  İlgili Sipariş
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/orders/${payment.order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {payment.order.orderNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.order.orderDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(payment.order.totalAmount)}
                    </p>
                    <Badge variant="outline">{payment.order.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sağ Kolon */}
        <div className="space-y-6">
          {/* Ödeme Durumu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {payment.status === 'COMPLETED' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : payment.status === 'PENDING' ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Ödeme Durumu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div
                  className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                    payment.status === 'COMPLETED'
                      ? 'bg-green-100'
                      : payment.status === 'PENDING'
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                  }`}
                >
                  {payment.status === 'COMPLETED' ? (
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  ) : payment.status === 'PENDING' ? (
                    <Clock className="h-8 w-8 text-yellow-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <p className="mt-4 font-semibold text-lg">
                  {statusLabels[payment.status]}
                </p>
                {payment.status === 'PENDING' && isDoorPayment && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Teslimat sırasında tahsil edilecek
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tahsilat Bilgileri */}
          {payment.collectedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tahsilat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Tahsil Eden</p>
                    <p className="font-medium">{payment.collectedBy}</p>
                  </div>
                  {payment.collectedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tahsilat Tarihi
                      </p>
                      <p className="font-medium">
                        {formatDate(payment.collectedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zaman Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tarih Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Oluşturulma</p>
                  <p className="font-medium">{formatDate(payment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Son Güncelleme
                  </p>
                  <p className="font-medium">{formatDate(payment.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kapıda Ödeme Bilgisi */}
          {isDoorPayment && payment.status === 'PENDING' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Kapıda Ödeme Bekliyor
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Bu ödeme teslimat sırasında tahsil edilecektir.
                      Teslimatçı ödemeyi aldıktan sonra durumu güncelleyecektir.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tahsil Edildi Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Ödeme Tahsil Edildi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Bu ödemeyi tahsil edildi olarak işaretlemek istediğinize emin
                misiniz?
              </p>
              <div className="p-4 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">Tutar</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(false)}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1"
                  onClick={() =>
                    statusMutation.mutate({ status: 'COMPLETED' })
                  }
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? 'Kaydediliyor...' : 'Onayla'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* İptal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Ödeme İptali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Bu ödemeyi iptal etmek istediğinize emin misiniz?
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">İptal Sebebi</label>
                  <Input
                    placeholder="İptal sebebini yazın..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCancelModal(false)}
                  >
                    Vazgeç
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      statusMutation.mutate({
                        status: 'CANCELLED',
                        notes: cancelReason,
                      })
                    }
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'İptal Ediliyor...' : 'İptal Et'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
