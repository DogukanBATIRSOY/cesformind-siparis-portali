'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  items: OrderItem[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Beklemede', color: 'warning', icon: Clock },
  CONFIRMED: { label: 'Onaylandı', color: 'info', icon: CheckCircle },
  PREPARING: { label: 'Hazırlanıyor', color: 'info', icon: Package },
  READY: { label: 'Hazır', color: 'success', icon: CheckCircle },
  SHIPPED: { label: 'Yola Çıktı', color: 'info', icon: Truck },
  DELIVERED: { label: 'Teslim Edildi', color: 'success', icon: CheckCircle },
  CANCELLED: { label: 'İptal Edildi', color: 'destructive', icon: XCircle },
}

export default function MyOrdersPage() {
  const router = useRouter()
  const { isAuthenticated, user, token } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/orders/my-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setOrders(response.data.data || [])
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [isAuthenticated, token, router])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Siparişlerim</h1>
              <p className="text-sm text-muted-foreground">
                Merhaba, {user?.firstName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Henüz siparişiniz yok</h2>
            <p className="text-muted-foreground mb-6">
              İlk siparişinizi vermek için ürünleri keşfedin
            </p>
            <Link href="/">
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Ürünleri Keşfet
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.PENDING
              const StatusIcon = status.icon

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Sipariş #{order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Badge variant={status.color as any} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {order.items?.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="flex-1 truncate">
                            {item.productName}
                          </span>
                          <span className="text-muted-foreground mx-2">
                            x{item.quantity}
                          </span>
                          <span className="font-medium">
                            {formatPrice(item.totalPrice)}
                          </span>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{order.items.length - 3} ürün daha
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="font-medium">Toplam</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
