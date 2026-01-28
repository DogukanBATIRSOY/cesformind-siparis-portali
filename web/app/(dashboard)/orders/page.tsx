'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ordersApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  DRAFT: 'secondary',
  PENDING: 'warning',
  CONFIRMED: 'default',
  PREPARING: 'secondary',
  READY: 'default',
  OUT_FOR_DELIVERY: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Taslak',
  PENDING: 'Bekliyor',
  CONFIRMED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Hazır',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
  RETURNED: 'İade',
}

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [orderType, setOrderType] = useState('') // all, guest, member

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, status],
    queryFn: () =>
      ordersApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      }),
  })

  const allOrders = data?.data?.data || []
  const meta = data?.data?.meta
  
  // Frontend filtering for order type
  const orders = allOrders.filter((order: any) => {
    if (orderType === 'guest') {
      return order.orderNumber?.startsWith('GST-')
    }
    if (orderType === 'member') {
      return !order.orderNumber?.startsWith('GST-')
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siparişler</h1>
          <p className="text-muted-foreground">
            Tüm siparişleri görüntüleyin ve yönetin
          </p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sipariş
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
                placeholder="Sipariş no veya müşteri ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <select
              className="h-10 px-3 border rounded-md bg-background"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="">Tüm Siparişler</option>
              <option value="guest">🛒 Misafir Siparişleri</option>
              <option value="member">👤 Üye Siparişleri</option>
            </select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Sipariş No</th>
                  <th className="text-left p-4 font-medium">Müşteri</th>
                  <th className="text-left p-4 font-medium">Tarih</th>
                  <th className="text-left p-4 font-medium">Kalem</th>
                  <th className="text-left p-4 font-medium">Tutar</th>
                  <th className="text-left p-4 font-medium">Durum</th>
                  <th className="text-left p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Sipariş bulunamadı
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          {order.orderNumber?.startsWith('GST-') && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                              Misafir
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {order.customer?.companyName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.customer?.code}
                            {order.customer?.code?.startsWith('GUEST-') && (
                              <span className="ml-1 text-orange-500">(Misafir)</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="p-4">{order._count?.items || 0}</td>
                      <td className="p-4 font-medium">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusColors[order.status] as any}>
                          {statusLabels[order.status]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
    </div>
  )
}
