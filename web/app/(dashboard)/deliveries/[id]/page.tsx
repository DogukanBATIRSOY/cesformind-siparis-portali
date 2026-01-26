'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { deliveriesApi, usersApi } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  Phone,
  Building,
  Calendar,
  FileText,
  Camera,
  Edit,
  Navigation,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  PENDING: 'warning',
  ASSIGNED: 'secondary',
  PICKED_UP: 'default',
  IN_TRANSIT: 'default',
  DELIVERED: 'success',
  FAILED: 'destructive',
  RETURNED: 'destructive',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Alındı',
  IN_TRANSIT: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  FAILED: 'Başarısız',
  RETURNED: 'İade',
}

export default function DeliveryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [failureReason, setFailureReason] = useState('')
  const [driverNote, setDriverNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['delivery', params.id],
    queryFn: () => deliveriesApi.getById(params.id as string),
    enabled: !!params.id,
  })

  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => usersApi.getAll({ role: 'DELIVERY', status: 'ACTIVE' }),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      deliveriesApi.updateStatus(params.id as string, status),
    onSuccess: () => {
      toast.success('Durum güncellendi')
      queryClient.invalidateQueries({ queryKey: ['delivery', params.id] })
    },
    onError: () => {
      toast.error('Durum güncelleme başarısız')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (data: any) =>
      deliveriesApi.complete(params.id as string, data),
    onSuccess: () => {
      toast.success('Teslimat tamamlandı')
      queryClient.invalidateQueries({ queryKey: ['delivery', params.id] })
      setShowCompleteModal(false)
    },
    onError: () => {
      toast.error('Teslimat tamamlama başarısız')
    },
  })

  const assignMutation = useMutation({
    mutationFn: (driverId: string) =>
      deliveriesApi.assignDriver(params.id as string, { driverId }),
    onSuccess: () => {
      toast.success('Sürücü atandı')
      queryClient.invalidateQueries({ queryKey: ['delivery', params.id] })
    },
    onError: () => {
      toast.error('Sürücü atama başarısız')
    },
  })

  const delivery = data?.data?.data
  const drivers = driversData?.data?.data || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Teslimat bulunamadı</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>
    )
  }

  const handleComplete = () => {
    completeMutation.mutate({
      receiverName,
      receiverPhone,
      driverNote,
    })
  }

  const handleFail = () => {
    statusMutation.mutate('FAILED')
    // TODO: failure reason'ı da kaydet
    setShowFailModal(false)
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Teslimat Detayı
              <Badge variant={statusColors[delivery.status] as any}>
                {statusLabels[delivery.status]}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Sipariş: {delivery.order?.orderNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {delivery.status === 'PENDING' && (
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Sürücü Ata
            </Button>
          )}
          {delivery.status === 'ASSIGNED' && (
            <Button onClick={() => statusMutation.mutate('IN_TRANSIT')}>
              <Truck className="h-4 w-4 mr-2" />
              Yola Çıkar
            </Button>
          )}
          {delivery.status === 'IN_TRANSIT' && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowFailModal(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Başarısız
              </Button>
              <Button onClick={() => setShowCompleteModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Teslim Et
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Sipariş ve Müşteri Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sipariş Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sipariş Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş No</p>
                  <Link
                    href={`/orders/${delivery.order?.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {delivery.order?.orderNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                  <p className="font-medium">
                    {formatDate(delivery.order?.orderDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                  <p className="font-medium">
                    {formatCurrency(delivery.order?.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ürün Sayısı</p>
                  <p className="font-medium">
                    {delivery.order?.items?.length || 0} kalem
                  </p>
                </div>
              </div>

              {delivery.order?.customerNote && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Müşteri Notu</p>
                  <p className="text-sm mt-1">{delivery.order.customerNote}</p>
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
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-lg">
                      {delivery.order?.customer?.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {delivery.order?.customer?.code}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        İletişim Kişisi
                      </p>
                      <p className="font-medium">
                        {delivery.order?.customer?.contactName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a
                        href={`tel:${delivery.order?.customer?.contactPhone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {delivery.order?.customer?.contactPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teslimat Adresi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Teslimat Adresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{delivery.order?.address?.title}</p>
                  <p className="text-muted-foreground mt-1">
                    {delivery.order?.address?.address}
                  </p>
                  <p className="text-muted-foreground">
                    {delivery.order?.address?.district} /{' '}
                    {delivery.order?.address?.city}
                  </p>
                </div>

                {delivery.order?.address?.deliveryNotes && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">
                      Teslimat Notu
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {delivery.order.address.deliveryNotes}
                    </p>
                  </div>
                )}

                {(delivery.order?.address?.latitude &&
                  delivery.order?.address?.longitude) && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.order.address.latitude},${delivery.order.address.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Haritada Aç
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon - Teslimat Durumu */}
        <div className="space-y-6">
          {/* Sürücü Bilgisi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Sürücü
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delivery.driver ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-lg">
                      {delivery.driver.firstName} {delivery.driver.lastName}
                    </p>
                    <a
                      href={`tel:${delivery.driver.phone}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {delivery.driver.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">
                    Henüz sürücü atanmadı
                  </p>
                  <select
                    className="mt-3 w-full h-10 px-3 border rounded-md bg-background"
                    onChange={(e) => {
                      if (e.target.value) {
                        assignMutation.mutate(e.target.value)
                      }
                    }}
                    disabled={assignMutation.isPending}
                  >
                    <option value="">Sürücü Seç...</option>
                    {drivers.map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.firstName} {driver.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planlanan Zaman */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planlanan Zaman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tarih</p>
                  <p className="font-medium">
                    {delivery.plannedDate
                      ? formatDate(delivery.plannedDate)
                      : 'Belirlenmedi'}
                  </p>
                </div>
                {delivery.plannedTimeStart && (
                  <div>
                    <p className="text-sm text-muted-foreground">Saat Aralığı</p>
                    <p className="font-medium">
                      {delivery.plannedTimeStart} - {delivery.plannedTimeEnd}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teslimat Bilgileri (Tamamlandıysa) */}
          {delivery.status === 'DELIVERED' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Teslim Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Teslim Tarihi</p>
                    <p className="font-medium">{formatDate(delivery.actualDate)}</p>
                  </div>
                  {delivery.receiverName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Teslim Alan</p>
                      <p className="font-medium">{delivery.receiverName}</p>
                    </div>
                  )}
                  {delivery.driverNote && (
                    <div>
                      <p className="text-sm text-muted-foreground">Sürücü Notu</p>
                      <p className="text-sm">{delivery.driverNote}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Başarısız Teslimat Bilgisi */}
          {delivery.status === 'FAILED' && delivery.failureReason && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Başarısızlık Sebebi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{delivery.failureReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Durum Geçmişi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Durum Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Oluşturuldu</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(delivery.createdAt)}
                    </p>
                  </div>
                </div>
                {delivery.driver && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Sürücü Atandı</p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.driver.firstName} {delivery.driver.lastName}
                      </p>
                    </div>
                  </div>
                )}
                {delivery.actualDate && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Teslim Edildi</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(delivery.actualDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Teslimat Tamamlama Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Teslimatı Tamamla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teslim Alan Kişi</label>
                  <Input
                    placeholder="Ad Soyad"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefon (Opsiyonel)</label>
                  <Input
                    placeholder="05XX XXX XX XX"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Not (Opsiyonel)</label>
                  <Input
                    placeholder="Teslimat notu..."
                    value={driverNote}
                    onChange={(e) => setDriverNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCompleteModal(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? 'Kaydediliyor...' : 'Tamamla'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Başarısız Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Teslimat Başarısız
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Başarısızlık Sebebi</label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                  >
                    <option value="">Sebep seçin...</option>
                    <option value="Adres bulunamadı">Adres bulunamadı</option>
                    <option value="Müşteri yerinde değil">Müşteri yerinde değil</option>
                    <option value="Müşteri kabul etmedi">Müşteri kabul etmedi</option>
                    <option value="Ürün hasarlı">Ürün hasarlı</option>
                    <option value="Yanlış ürün">Yanlış ürün</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Açıklama (Opsiyonel)</label>
                  <Input
                    placeholder="Ek açıklama..."
                    value={driverNote}
                    onChange={(e) => setDriverNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowFailModal(false)}
                  >
                    İptal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleFail}
                    disabled={!failureReason || statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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
