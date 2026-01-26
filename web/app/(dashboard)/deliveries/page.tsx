'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { deliveriesApi, usersApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Eye,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Package,
  Route,
  Calendar,
  Phone,
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

const statusIcons: Record<string, any> = {
  PENDING: Clock,
  ASSIGNED: User,
  PICKED_UP: Package,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle,
  FAILED: XCircle,
  RETURNED: AlertCircle,
}

export default function DeliveriesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  // Teslimatları getir
  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', page, search, status],
    queryFn: () =>
      deliveriesApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      }),
  })

  // İstatistikleri getir
  const { data: statsData } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: () => deliveriesApi.getStats(),
  })

  // Sürücüleri getir
  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => usersApi.getAll({ role: 'DELIVERY', status: 'ACTIVE' }),
  })

  // Sürücü atama
  const assignMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId: string }) =>
      deliveriesApi.assignDriver(id, { driverId }),
    onSuccess: () => {
      toast.success('Sürücü başarıyla atandı')
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
      setShowAssignModal(false)
      setSelectedDelivery(null)
    },
    onError: () => {
      toast.error('Sürücü atama başarısız')
    },
  })

  // Durum güncelleme
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      deliveriesApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Durum güncellendi')
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] })
    },
    onError: () => {
      toast.error('Durum güncelleme başarısız')
    },
  })

  const deliveries = data?.data?.data || []
  const meta = data?.data?.meta
  const stats = statsData?.data?.data || {
    pending: 0,
    inTransit: 0,
    delivered: 0,
    failed: 0,
    total: 0,
  }
  const drivers = driversData?.data?.data || []

  const handleAssignDriver = (delivery: any) => {
    setSelectedDelivery(delivery)
    setShowAssignModal(true)
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string
    value: number
    icon: any
    color: string
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
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teslimatlar</h1>
          <p className="text-muted-foreground">
            Teslimat takibi ve yönetimi
          </p>
        </div>
        <Link href="/deliveries/routes">
          <Button variant="outline">
            <Route className="h-4 w-4 mr-2" />
            Rota Planla
          </Button>
        </Link>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Toplam Teslimat"
          value={stats.total}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Bekleyen"
          value={stats.pending}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Yolda"
          value={stats.inTransit}
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          title="Teslim Edildi"
          value={stats.delivered}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Başarısız"
          value={stats.failed}
          icon={XCircle}
          color="bg-red-500"
        />
      </div>

      {/* Filtreler */}
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
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teslimat Listesi */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Sipariş</th>
                  <th className="text-left p-4 font-medium">Müşteri</th>
                  <th className="text-left p-4 font-medium">Adres</th>
                  <th className="text-left p-4 font-medium">Sürücü</th>
                  <th className="text-left p-4 font-medium">Planlanan Tarih</th>
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
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Truck className="h-12 w-12 text-muted-foreground/50" />
                        <p>Teslimat bulunamadı</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deliveries.map((delivery: any) => {
                    const StatusIcon = statusIcons[delivery.status] || Clock
                    return (
                      <tr key={delivery.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <Link
                            href={`/orders/${delivery.order?.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {delivery.order?.orderNumber}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {delivery.order?.customer?.companyName}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {delivery.order?.customer?.contactPhone}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-start gap-2 max-w-xs">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">
                              {delivery.order?.address?.district}, {delivery.order?.address?.city}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {delivery.driver ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {delivery.driver.firstName} {delivery.driver.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {delivery.driver.phone}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignDriver(delivery)}
                            >
                              <User className="h-4 w-4 mr-1" />
                              Sürücü Ata
                            </Button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {delivery.plannedDate
                                ? formatDate(delivery.plannedDate)
                                : '-'}
                            </span>
                          </div>
                          {delivery.plannedTimeStart && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {delivery.plannedTimeStart} - {delivery.plannedTimeEnd}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={statusColors[delivery.status] as any}
                            className="flex items-center gap-1 w-fit"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusLabels[delivery.status]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/deliveries/${delivery.id}`}>
                              <Button variant="ghost" size="icon" title="Detay">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {delivery.status === 'ASSIGNED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Yola Çıkar"
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: delivery.id,
                                    status: 'IN_TRANSIT',
                                  })
                                }
                              >
                                <Truck className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            {delivery.status === 'IN_TRANSIT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Teslim Edildi"
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: delivery.id,
                                    status: 'DELIVERED',
                                  })
                                }
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
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

      {/* Sürücü Atama Modal */}
      {showAssignModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Sürücü Ata</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sipariş: {selectedDelivery.order?.orderNumber}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium">
                    {selectedDelivery.order?.customer?.companyName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDelivery.order?.address?.district},{' '}
                    {selectedDelivery.order?.address?.city}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sürücü Seçin</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {drivers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aktif sürücü bulunamadı
                      </p>
                    ) : (
                      drivers.map((driver: any) => (
                        <button
                          key={driver.id}
                          onClick={() =>
                            assignMutation.mutate({
                              id: selectedDelivery.id,
                              driverId: driver.id,
                            })
                          }
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                          disabled={assignMutation.isPending}
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {driver.firstName} {driver.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {driver.phone}
                            </p>
                          </div>
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedDelivery(null)
                    }}
                  >
                    İptal
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
