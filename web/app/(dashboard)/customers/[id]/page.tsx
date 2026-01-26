'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { customersApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  Package,
  CreditCard,
  Calendar,
  TrendingUp,
  Clock,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  PENDING_APPROVAL: 'warning',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  SUSPENDED: 'Askıya Alındı',
  PENDING_APPROVAL: 'Onay Bekliyor',
}

const customerTypeLabels: Record<string, string> = {
  RESTAURANT: 'Restoran',
  MARKET: 'Market',
  HOTEL: 'Otel',
  CAFE: 'Kafe',
  CATERING: 'Catering',
  WHOLESALE: 'Toptan Satış',
  INDIVIDUAL: 'Bireysel',
  OTHER: 'Diğer',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['customer', params.id],
    queryFn: () => customersApi.getById(params.id as string),
    enabled: !!params.id,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', params.id],
    queryFn: () => customersApi.getOrders(params.id as string, { limit: 5 }),
    enabled: !!params.id,
  })

  const customer = data?.data?.data
  const recentOrders = ordersData?.data?.data || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Müşteri bulunamadı</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Geri Dön
        </Button>
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {customer.companyName}
              <Badge variant={statusColors[customer.status] as any}>
                {statusLabels[customer.status]}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              {customer.code} • {customerTypeLabels[customer.type] || customer.type}
            </p>
          </div>
        </div>
        <Link href={`/customers/${customer.id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            {customer.status === 'PENDING_APPROVAL' ? 'İncele / Onayla' : 'Düzenle'}
          </Button>
        </Link>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{customer._count?.orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Ciro</p>
                <p className="text-2xl font-bold">{formatCurrency(customer.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kredi Limiti</p>
                <p className="text-2xl font-bold">{formatCurrency(customer.creditLimit || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${(customer.currentBalance || 0) > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bakiye</p>
                <p className={`text-2xl font-bold ${(customer.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(customer.currentBalance || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon */}
        <div className="lg:col-span-2 space-y-6">
          {/* İletişim Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">İletişim Kişisi</p>
                    <p className="font-medium">{customer.contactName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <a href={`tel:${customer.contactPhone}`} className="font-medium text-primary hover:underline">
                      {customer.contactPhone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${customer.contactEmail}`} className="font-medium text-primary hover:underline">
                      {customer.contactEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vergi No / Dairesi</p>
                    <p className="font-medium">{customer.taxNumber || '-'} / {customer.taxOffice || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.addresses && customer.addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.addresses.map((address: any) => (
                    <div
                      key={address.id}
                      className={`p-4 rounded-lg border ${address.isDefault ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{address.title}</p>
                        {address.isDefault && (
                          <Badge variant="outline" className="text-xs">Varsayılan</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{address.address}</p>
                      <p className="text-sm text-muted-foreground">{address.district} / {address.city}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Kayıtlı adres bulunmuyor</p>
              )}
            </CardContent>
          </Card>

          {/* Son Siparişler */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Son Siparişler
              </CardTitle>
              <Link href={`/orders?customerId=${customer.id}`}>
                <Button variant="ghost" size="sm">Tümünü Gör</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order: any) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Henüz sipariş bulunmuyor</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon */}
        <div className="space-y-6">
          {/* Satış Temsilcisi */}
          <Card>
            <CardHeader>
              <CardTitle>Satış Temsilcisi</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.salesRep ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {customer.salesRep.firstName} {customer.salesRep.lastName}
                    </p>
                    <a
                      href={`tel:${customer.salesRep.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {customer.salesRep.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-2">Atanmamış</p>
              )}
            </CardContent>
          </Card>

          {/* Finansal Özet */}
          <Card>
            <CardHeader>
              <CardTitle>Finansal Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kredi Limiti</span>
                <span className="font-medium">{formatCurrency(customer.creditLimit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ödeme Vadesi</span>
                <span className="font-medium">{customer.paymentTermDays || 0} gün</span>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <span className="text-muted-foreground">Mevcut Bakiye</span>
                <span className={`font-semibold ${(customer.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(customer.currentBalance || 0))}
                  {(customer.currentBalance || 0) > 0 ? ' Borç' : ''}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tarihler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tarihler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Kayıt Tarihi</p>
                <p className="font-medium">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Güncelleme</p>
                <p className="font-medium">{formatDate(customer.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
