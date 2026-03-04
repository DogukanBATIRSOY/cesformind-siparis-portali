'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  Truck, 
  CreditCard,
  Calendar,
  FileText,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { toast } from 'sonner'
import Image from 'next/image'

const statusLabels: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Hazır',
  SHIPPED: 'Yola Çıktı',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal Edildi',
  RETURNED: 'İade Edildi',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-orange-100 text-orange-800',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Banka Transferi',
  ON_DELIVERY: 'Kapıda Ödeme',
  CREDIT: 'Açık Hesap',
  DBS: 'DBS (Doğrudan Borçlandırma)',
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId),
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.update(orderId, { status }),
    onSuccess: () => {
      toast.success('Sipariş durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Durum güncellenemedi')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Sipariş bulunamadı</p>
        <Button onClick={() => router.back()} className="mt-4">
          Geri Dön
        </Button>
      </div>
    )
  }

  const order = data.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Sipariş #{order.orderNumber}
              {order.orderNumber?.startsWith('GST-') && (
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                  Misafir Sipariş
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[order.status]}>
            {statusLabels[order.status]}
          </Badge>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sipariş Kalemleri ({order.items?.length || 0} ürün)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.product?.image ? (
                        <Image
                          src={item.product.image.startsWith('http') ? item.product.image : `${process.env.NEXT_PUBLIC_API_URL}${item.product.image}`}
                          alt={item.product?.name || 'Ürün'}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : item.product?.images?.[0]?.url ? (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product?.name || 'Ürün'}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product?.name || 'Ürün'}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product?.sku || '-'} | Barkod: {item.product?.barcode || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity} {item.unit}</p>
                      <p className="text-sm text-muted-foreground">
                        {Number(item.unitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      {item.discount > 0 && (
                        <p className="text-sm text-green-600">-%{Number(item.discount)}</p>
                      )}
                      <p className="font-semibold">
                        {Number(item.total).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span>{Number(order.subtotal).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>İndirim ({order.discountPercent}%)</span>
                    <span>-{Number(order.discountAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KDV</span>
                  <span>{Number(order.taxAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Toplam</span>
                  <span>{Number(order.totalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(order.customerNote || order.internalNote) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.customerNote && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Müşteri Notu</p>
                    <p>{order.customerNote}</p>
                  </div>
                )}
                {order.internalNote && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dahili Not</p>
                    <p>{order.internalNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Right */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.customer ? (
                <>
                  <div>
                    <p className="font-medium">{order.customer.companyName}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.code}</p>
                  </div>
                  {order.customer.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer.contactName}</span>
                    </div>
                  )}
                  {order.customer.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer.contactPhone}</span>
                    </div>
                  )}
                  {order.customer.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{order.customer.contactEmail}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Müşteri bilgisi bulunamadı</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Teslimat Adresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.address ? (
                <div className="space-y-1">
                  <p className="font-medium">{order.address.title}</p>
                  <p className="text-sm">{order.address.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.address.district}, {order.address.city}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Adres bilgisi bulunamadı</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Info */}
          {order.delivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Teslimat Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durum</span>
                  <Badge variant="outline">{order.delivery.status}</Badge>
                </div>
                {order.delivery.driver && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sürücü</span>
                    <span>{order.delivery.driver.firstName} {order.delivery.driver.lastName}</span>
                  </div>
                )}
                {order.delivery.plannedDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Planlanan Tarih</span>
                    <span>{format(new Date(order.delivery.plannedDate), 'dd MMM yyyy', { locale: tr })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödeme Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ödeme Yöntemi</span>
                <span>{paymentMethodLabels[order.paymentMethod] || order.paymentMethod || 'Belirtilmemiş'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ödeme Durumu</span>
                <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'outline'}>
                  {order.paymentStatus === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.status === 'PENDING' && (
                <>
                  <Button 
                    className="w-full" 
                    onClick={() => updateStatusMutation.mutate('CONFIRMED')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Siparişi Onayla
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => updateStatusMutation.mutate('CANCELLED')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Siparişi İptal Et
                  </Button>
                </>
              )}
              {order.status === 'CONFIRMED' && (
                <Button 
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('PREPARING')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Hazırlamaya Başla
                </Button>
              )}
              {order.status === 'PREPARING' && (
                <Button 
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('READY')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Hazır
                </Button>
              )}
              {order.status === 'READY' && (
                <Button 
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('SHIPPED')}
                  disabled={updateStatusMutation.isPending}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Yola Çıkar
                </Button>
              )}
              {order.status === 'SHIPPED' && (
                <Button 
                  className="w-full"
                  onClick={() => updateStatusMutation.mutate('DELIVERED')}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Teslim Edildi
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
