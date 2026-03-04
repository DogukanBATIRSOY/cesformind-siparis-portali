'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Package, 
  Users, 
  Truck, 
  CreditCard,
  Warehouse,
  Calendar,
  Download,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { reportsApi } from '@/lib/api'

type ReportType = 'dashboard' | 'sales' | 'products' | 'customers' | 'deliveries' | 'payments' | 'stock'

const reportTabs = [
  { id: 'dashboard', label: 'Genel Bakış', icon: BarChart3 },
  { id: 'sales', label: 'Satışlar', icon: TrendingUp },
  { id: 'products', label: 'Ürünler', icon: Package },
  { id: 'customers', label: 'Müşteriler', icon: Users },
  { id: 'deliveries', label: 'Teslimatlar', icon: Truck },
  { id: 'payments', label: 'Ödemeler', icon: CreditCard },
  { id: 'stock', label: 'Stok', icon: Warehouse },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('tr-TR').format(value)
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('dashboard')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">İş analitiği ve performans raporları</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tarih Aralığı:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-40"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setDateRange({
                    startDate: today.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0],
                  })
                }}
              >
                Bugün
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const weekAgo = new Date(today.setDate(today.getDate() - 7))
                  setDateRange({
                    startDate: weekAgo.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  })
                }}
              >
                Son 7 Gün
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const monthAgo = new Date(today.setMonth(today.getMonth() - 1))
                  setDateRange({
                    startDate: monthAgo.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  })
                }}
              >
                Son 30 Gün
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {reportTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as ReportType)}
              className="flex-shrink-0"
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Report Content */}
      {activeTab === 'dashboard' && <DashboardReport />}
      {activeTab === 'sales' && <SalesReport dateRange={dateRange} />}
      {activeTab === 'products' && <ProductsReport dateRange={dateRange} />}
      {activeTab === 'customers' && <CustomersReport dateRange={dateRange} />}
      {activeTab === 'deliveries' && <DeliveriesReport dateRange={dateRange} />}
      {activeTab === 'payments' && <PaymentsReport dateRange={dateRange} />}
      {activeTab === 'stock' && <StockReport />}
    </div>
  )
}

// Dashboard Report
function DashboardReport() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-report'],
    queryFn: () => reportsApi.getDashboard(),
  })

  const stats = data?.data?.data

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bugünkü Sipariş"
          value={stats?.today?.orders || 0}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Bugünkü Ciro"
          value={formatCurrency(stats?.today?.revenue || 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Aylık Sipariş"
          value={stats?.monthly?.orders || 0}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Aylık Ciro"
          value={formatCurrency(stats?.monthly?.revenue || 0)}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Pending Items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Sipariş</p>
                <p className="text-2xl font-bold">{stats?.pending?.orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Teslimat</p>
                <p className="text-2xl font-bold">{stats?.pending?.deliveries || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Düşük Stok</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.pending?.lowStock || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer & Product Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Müşteriler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Toplam Müşteri</span>
                <span className="font-bold text-xl">{stats?.customers?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Aktif Müşteri</span>
                <span className="font-bold text-xl text-green-600">{stats?.customers?.active || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${stats?.customers?.total > 0 
                      ? (stats.customers.active / stats.customers.total) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ürünler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Aktif Ürün</span>
                <span className="font-bold text-xl">{stats?.products?.total || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Siparişler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Sipariş No</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Müşteri</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Tarih</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Tutar</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats?.recentOrders?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Henüz sipariş yok
                    </td>
                  </tr>
                ) : (
                  stats?.recentOrders?.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-4 py-2 font-medium">{order.orderNo}</td>
                      <td className="px-4 py-2">{order.customer?.companyName || '-'}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatCurrency(Number(order.totalAmount))}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Sales Report
function SalesReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sales-report', dateRange],
    queryFn: () => reportsApi.getSales(dateRange),
  })

  const report = data?.data?.data

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Toplam Sipariş"
          value={report?.summary?.totalOrders || 0}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Toplam Ciro"
          value={formatCurrency(report?.summary?.totalRevenue || 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Ortalama Sipariş"
          value={formatCurrency(report?.summary?.avgOrderValue || 0)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Chart Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Günlük Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Tarih</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Sipariş</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Ciro</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Grafik</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report?.chart?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  report?.chart?.map((item: any) => {
                    const maxRevenue = Math.max(...(report.chart?.map((c: any) => c.revenue) || [1]))
                    const percentage = (item.revenue / maxRevenue) * 100
                    return (
                      <tr key={item.date}>
                        <td className="px-4 py-2">{item.date}</td>
                        <td className="px-4 py-2 text-right">{item.orders}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-2 w-48">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Products Report
function ProductsReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products-report', dateRange],
    queryFn: () => reportsApi.getProductReport(dateRange),
  })

  const products = data?.data?.data || []

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">En Çok Satan Ürünler</CardTitle>
        <CardDescription>Seçilen tarih aralığında en çok satış yapan ürünler</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Ürün</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">SKU</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Kategori</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Adet</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Veri bulunamadı
                  </td>
                </tr>
              ) : (
                products.map((product: any, index: number) => (
                  <tr key={product.productId}>
                    <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2 font-medium">{product.productName}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-2">{product.category || '-'}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(Number(product.totalQuantity))}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(product.totalRevenue))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Customers Report
function CustomersReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customers-report', dateRange],
    queryFn: () => reportsApi.getCustomerReport(dateRange),
  })

  const customers = data?.data?.data || []

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">En Çok Sipariş Veren Müşteriler</CardTitle>
        <CardDescription>Seçilen tarih aralığında en çok sipariş veren müşteriler</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Müşteri</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Kod</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Tip</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Satış Temsilcisi</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Sipariş</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Veri bulunamadı
                  </td>
                </tr>
              ) : (
                customers.map((customer: any, index: number) => (
                  <tr key={customer.customerId}>
                    <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2 font-medium">{customer.companyName}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{customer.customerCode}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">
                        {customer.type === 'CORPORATE' ? 'Kurumsal' : 'Bireysel'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">{customer.salesRep || '-'}</td>
                    <td className="px-4 py-2 text-right">{customer.totalOrders}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(customer.totalRevenue))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Deliveries Report
function DeliveriesReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['deliveries-report', dateRange],
    queryFn: () => reportsApi.getDeliveryReport(dateRange),
  })

  const report = data?.data?.data

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Toplam Teslimat"
          value={report?.summary?.total || 0}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Teslim Edildi"
          value={report?.summary?.delivered || 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Başarısız"
          value={report?.summary?.failed || 0}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Bekliyor"
          value={report?.summary?.pending || 0}
          icon={Clock}
          color="yellow"
        />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Başarı Oranı</p>
                <p className="text-2xl font-bold text-emerald-600">%{report?.summary?.successRate || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Teslimatçı Performansı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Teslimatçı</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Teslimat Sayısı</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Grafik</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!report?.byDriver?.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  report.byDriver.map((driver: any) => {
                    const maxDeliveries = Math.max(...(report.byDriver?.map((d: any) => d.totalDeliveries) || [1]))
                    const percentage = (driver.totalDeliveries / maxDeliveries) * 100
                    return (
                      <tr key={driver.driverId}>
                        <td className="px-4 py-2 font-medium">{driver.driverName}</td>
                        <td className="px-4 py-2 text-right">{driver.totalDeliveries}</td>
                        <td className="px-4 py-2 w-48">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Payments Report
function PaymentsReport({ dateRange }: { dateRange: { startDate: string; endDate: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payments-report', dateRange],
    queryFn: () => reportsApi.getPaymentReport(dateRange),
  })

  const report = data?.data?.data

  const paymentTypeLabels: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kredi Kartı',
    BANK_TRANSFER: 'Havale/EFT',
    CHECK: 'Çek',
    TERM: 'Vadeli',
    DBS: 'DBS',
    ON_DELIVERY: 'Kapıda Ödeme',
    CREDIT: 'Açık Hesap',
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Toplam Ödeme"
          value={report?.summary?.totalCount || 0}
          icon={CreditCard}
          color="blue"
        />
        <StatCard
          title="Toplam Tutar"
          value={formatCurrency(Number(report?.summary?.totalAmount) || 0)}
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ödeme Tipine Göre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!report?.byType?.length ? (
              <p className="text-center text-muted-foreground py-8">Veri bulunamadı</p>
            ) : (
              report.byType.map((item: any) => {
                const totalAmount = Number(report.summary?.totalAmount) || 1
                const percentage = (Number(item.amount) / totalAmount) * 100
                return (
                  <div key={item.type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{paymentTypeLabels[item.type] || item.type}</span>
                      <span className="text-muted-foreground">{item.count} ödeme</span>
                      <span className="font-bold">{formatCurrency(Number(item.amount))}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Stock Report
function StockReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-report'],
    queryFn: () => reportsApi.getStockReport(),
  })

  const report = data?.data?.data

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Ürün"
          value={report?.summary?.totalProducts || 0}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Stok Değeri"
          value={formatCurrency(report?.summary?.totalValue || 0)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Düşük Stok"
          value={report?.summary?.lowStockCount || 0}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Stokta Yok"
          value={report?.summary?.outOfStockCount || 0}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Stock List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stok Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Ürün</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">SKU</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Depo</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Stok</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Rezerve</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Kullanılabilir</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!report?.stocks?.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Stok verisi bulunamadı
                    </td>
                  </tr>
                ) : (
                  report.stocks.slice(0, 50).map((stock: any, index: number) => (
                    <tr key={index} className={stock.status !== 'OK' ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-2 font-medium">{stock.productName}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{stock.sku}</td>
                      <td className="px-4 py-2">{stock.warehouseName}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(Number(stock.quantity))} {stock.unit}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(Number(stock.reserved))}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatNumber(stock.available)}</td>
                      <td className="px-4 py-2 text-center">
                        <StockStatusBadge status={stock.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Components
function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Bekliyor', className: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Onaylandı', className: 'bg-blue-100 text-blue-700' },
    PROCESSING: { label: 'Hazırlanıyor', className: 'bg-purple-100 text-purple-700' },
    SHIPPED: { label: 'Kargoda', className: 'bg-indigo-100 text-indigo-700' },
    DELIVERED: { label: 'Teslim Edildi', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'İptal', className: 'bg-red-100 text-red-700' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return <Badge className={config.className}>{config.label}</Badge>
}

function StockStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    OK: { label: 'Normal', className: 'bg-green-100 text-green-700' },
    LOW: { label: 'Düşük', className: 'bg-yellow-100 text-yellow-700' },
    OUT_OF_STOCK: { label: 'Stokta Yok', className: 'bg-red-100 text-red-700' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return <Badge className={config.className}>{config.label}</Badge>
}
