'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { customersApi, usersApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Save,
  X,
  AlertTriangle,
  CreditCard,
  Calendar,
  Banknote,
  UserCheck,
  Shield,
  Plus,
  Trash2,
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

export default function CustomerEditPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    taxNumber: '',
    taxOffice: '',
    type: '',
    creditLimit: 0,
    paymentTermDays: 0,
    notes: '',
  })

  // Adres yönetimi state
  const [addresses, setAddresses] = useState<any[]>([])
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [newAddress, setNewAddress] = useState({
    title: '',
    address: '',
    district: '',
    city: '',
    postalCode: '',
    isDefault: false,
    isDelivery: true,
    isBilling: false,
    deliveryNotes: '',
  })

  // Onay formu state
  const [approvalData, setApprovalData] = useState({
    creditLimit: 50000,
    paymentTermDays: 30,
    salesRepId: '',
  })

  // Müşteri bilgilerini getir
  const { data, isLoading } = useQuery({
    queryKey: ['customer', params.id],
    queryFn: () => customersApi.getById(params.id as string),
    enabled: !!params.id,
  })

  // Satış temsilcilerini getir
  const { data: salesRepsData } = useQuery({
    queryKey: ['sales-reps'],
    queryFn: () => usersApi.getAll({ role: 'SALES_REP', status: 'ACTIVE' }),
  })

  const customer = data?.data?.data
  const salesReps = salesRepsData?.data?.data || []

  // Form verilerini müşteri verileriyle doldur
  useEffect(() => {
    if (customer) {
      setFormData({
        companyName: customer.companyName || '',
        contactName: customer.contactName || '',
        contactPhone: customer.contactPhone || '',
        contactEmail: customer.contactEmail || '',
        taxNumber: customer.taxNumber || '',
        taxOffice: customer.taxOffice || '',
        type: customer.type || '',
        creditLimit: customer.creditLimit || 0,
        paymentTermDays: customer.paymentTermDays || 0,
        notes: customer.notes || '',
      })
      setApprovalData({
        creditLimit: customer.creditLimit || 50000,
        paymentTermDays: customer.paymentTermDays || 30,
        salesRepId: customer.salesRepId || '',
      })
      setAddresses(customer.addresses || [])
    }
  }, [customer])

  // Güncelleme mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => customersApi.update(params.id as string, data),
    onSuccess: () => {
      toast.success('Müşteri bilgileri güncellendi')
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Güncelleme başarısız')
    },
  })

  // Onaylama mutation
  const approveMutation = useMutation({
    mutationFn: (data: any) => customersApi.approve(params.id as string, data),
    onSuccess: () => {
      toast.success('Müşteri onaylandı')
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowApproveModal(false)
    },
    onError: () => {
      toast.error('Onaylama başarısız')
    },
  })

  // Reddetme mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => customersApi.reject(params.id as string, reason),
    onSuccess: () => {
      toast.success('Müşteri başvurusu reddedildi')
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowRejectModal(false)
      router.push('/customers')
    },
    onError: () => {
      toast.error('İşlem başarısız')
    },
  })

  // Durum güncelleme mutation
  const statusMutation = useMutation({
    mutationFn: (status: string) => customersApi.updateStatus(params.id as string, status),
    onSuccess: () => {
      toast.success('Müşteri durumu güncellendi')
      queryClient.invalidateQueries({ queryKey: ['customer', params.id] })
    },
    onError: () => {
      toast.error('Durum güncelleme başarısız')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      addresses: addresses,
    })
  }

  const handleAddAddress = () => {
    if (!newAddress.address || !newAddress.city) {
      toast.error('Lütfen adres ve şehir bilgilerini girin')
      return
    }
    
    const addressToAdd = {
      ...newAddress,
      id: `temp-${Date.now()}`,
    }
    
    setAddresses([...addresses, addressToAdd])
    setNewAddress({
      title: '',
      address: '',
      district: '',
      city: '',
      postalCode: '',
      isDefault: false,
      isDelivery: true,
      isBilling: false,
      deliveryNotes: '',
    })
    setShowAddAddressModal(false)
    toast.success('Adres eklendi. Kaydetmek için "Kaydet" butonuna tıklayın.')
  }

  const handleDeleteAddress = (addressId: string) => {
    setAddresses(addresses.filter(a => a.id !== addressId))
    toast.success('Adres silindi. Kaydetmek için "Kaydet" butonuna tıklayın.')
  }

  const handleSetDefaultAddress = (addressId: string) => {
    setAddresses(addresses.map(a => ({
      ...a,
      isDefault: a.id === addressId,
    })))
  }

  const handleApprove = () => {
    approveMutation.mutate({
      ...approvalData,
      status: 'ACTIVE',
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Lütfen red sebebi girin')
      return
    }
    rejectMutation.mutate(rejectReason)
  }

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

  const isPendingApproval = customer.status === 'PENDING_APPROVAL'

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
        <div className="flex items-center gap-2">
          {isPendingApproval ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reddet
              </Button>
              <Button onClick={() => setShowApproveModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Onayla
              </Button>
            </>
          ) : (
            <>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    İptal
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Onay Bekliyor Uyarısı */}
      {isPendingApproval && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">
                  Bu müşteri onay bekliyor
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Müşteri başvurusunu inceleyip onaylayabilir veya reddedebilirsiniz.
                  Onay sonrası müşteri sisteme giriş yapabilecek ve sipariş verebilecektir.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Başvuru Tarihi: {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Müşteri Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Firma Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Firma Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Firma Adı</label>
                  {isEditing ? (
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{customer.companyName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Müşteri Tipi</label>
                  {isEditing ? (
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {Object.entries(customerTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium">{customerTypeLabels[customer.type] || customer.type}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vergi Numarası</label>
                  {isEditing ? (
                    <Input
                      value={formData.taxNumber}
                      onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{customer.taxNumber || '-'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vergi Dairesi</label>
                  {isEditing ? (
                    <Input
                      value={formData.taxOffice}
                      onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{customer.taxOffice || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* İletişim Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                İletişim Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    İletişim Kişisi
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{customer.contactName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Telefon
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                  ) : (
                    <a href={`tel:${customer.contactPhone}`} className="font-medium text-primary hover:underline">
                      {customer.contactPhone}
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                ) : (
                  <a href={`mailto:${customer.contactEmail}`} className="font-medium text-primary hover:underline">
                    {customer.contactEmail}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fatura Adresi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fatura Adresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.addresses && customer.addresses.filter((a: any) => a.isBilling).length > 0 ? (
                <div className="space-y-4">
                  {customer.addresses.filter((a: any) => a.isBilling).map((address: any) => (
                    <div
                      key={address.id}
                      className="p-4 rounded-lg border border-blue-200 bg-blue-50/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{address.title || 'Fatura Adresi'}</p>
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                              Fatura
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {address.address}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.district} / {address.city}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Fatura adresi bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Teslimat Adresleri */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Teslimat Adresleri
              </CardTitle>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddAddressModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Yeni Adres
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {addresses.filter((a: any) => a.isDelivery).length > 0 ? (
                <div className="space-y-4">
                  {addresses.filter((a: any) => a.isDelivery).map((address: any, index: number) => (
                    <div
                      key={address.id}
                      className={`p-4 rounded-lg border ${address.isDefault ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              Teslimat Adresi {index + 1}
                              {address.title && ` - ${address.title}`}
                            </p>
                            {address.isDefault && (
                              <Badge variant="default" className="text-xs">Varsayılan</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {address.address}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.district} / {address.city}
                          </p>
                          {address.deliveryNotes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Not: {address.deliveryNotes}
                            </p>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            {!address.isDefault && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultAddress(address.id)}
                              >
                                Varsayılan Yap
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Teslimat adresi bulunmuyor</p>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowAddAddressModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      İlk Adresi Ekle
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notlar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Müşteri hakkında notlar..."
                />
              ) : (
                <p className="text-muted-foreground">
                  {customer.notes || 'Not bulunmuyor'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ Kolon */}
        <div className="space-y-6">
          {/* Finansal Bilgiler - Sadece kurumsal müşteriler için */}
          {customer.type !== 'INDIVIDUAL' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Finansal Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    Kredi Limiti
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    />
                  ) : (
                    <p className="text-2xl font-bold">
                      ₺{customer.creditLimit?.toLocaleString('tr-TR') || '0'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Ödeme Vadesi
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.paymentTermDays}
                      onChange={(e) => setFormData({ ...formData, paymentTermDays: parseInt(e.target.value) || 0 })}
                    />
                  ) : (
                    <p className="font-medium">{customer.paymentTermDays || 0} gün</p>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Mevcut Bakiye</span>
                    <span className={`font-semibold ${(customer.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₺{Math.abs(customer.currentBalance || 0).toLocaleString('tr-TR')}
                      {(customer.currentBalance || 0) > 0 ? ' Borç' : ' Alacak'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Ödeme Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Bireysel Müşteri</strong>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Bireysel müşterilere kredi limiti tanımlanmaz. Ödemeler peşin veya kapıda ödeme şeklinde yapılır.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Satış Temsilcisi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Satış Temsilcisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.salesRep ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {customer.salesRep.firstName} {customer.salesRep.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {customer.salesRep.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-2">
                  Atanmamış
                </p>
              )}
            </CardContent>
          </Card>

          {/* Durum Yönetimi */}
          {!isPendingApproval && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Durum Yönetimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.status === 'ACTIVE' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => statusMutation.mutate('INACTIVE')}
                    >
                      <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                      Pasif Yap
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={() => statusMutation.mutate('SUSPENDED')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Askıya Al
                    </Button>
                  </>
                )}
                {customer.status === 'INACTIVE' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-600 hover:text-green-700"
                    onClick={() => statusMutation.mutate('ACTIVE')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aktif Yap
                  </Button>
                )}
                {customer.status === 'SUSPENDED' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-green-600 hover:text-green-700"
                    onClick={() => statusMutation.mutate('ACTIVE')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Askıdan Çıkar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tarih Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tarih Bilgileri
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

      {/* Onaylama Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Müşteri Onayı
              </CardTitle>
              <CardDescription>
                {customer.companyName} müşterisini onaylayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Müşteri Tipi Bilgisi */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Müşteri Tipi: </span>
                  <span className="font-medium">{customerTypeLabels[customer.type] || customer.type}</span>
                </p>
              </div>

              {/* Bireysel müşteriler için bilgi */}
              {customer.type === 'INDIVIDUAL' ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Bireysel Müşteri:</strong> Bireysel müşterilere kredi limiti ve vade tanımlanmaz. 
                    Ödemeler peşin veya kapıda ödeme şeklinde yapılır.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kredi Limiti (₺)</label>
                    <Input
                      type="number"
                      value={approvalData.creditLimit}
                      onChange={(e) => setApprovalData({ ...approvalData, creditLimit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ödeme Vadesi (Gün)</label>
                    <Input
                      type="number"
                      value={approvalData.paymentTermDays}
                      onChange={(e) => setApprovalData({ ...approvalData, paymentTermDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Satış Temsilcisi (Opsiyonel)</label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={approvalData.salesRepId}
                  onChange={(e) => setApprovalData({ ...approvalData, salesRepId: e.target.value })}
                >
                  <option value="">Seçiniz...</option>
                  {salesReps.map((rep: any) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.firstName} {rep.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowApproveModal(false)}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Onaylanıyor...' : 'Onayla'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reddetme Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Başvuru Reddi
              </CardTitle>
              <CardDescription>
                {customer.companyName} başvurusunu reddedin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Uyarı:</strong> Bu işlem geri alınamaz. Müşteri başvurusu reddedilecek
                  ve kullanıcı bilgilendirilecektir.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Red Sebebi *</label>
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background resize-none"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Red sebebini açıklayın..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                  }}
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                >
                  {rejectMutation.isPending ? 'Reddediliyor...' : 'Reddet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Yeni Adres Ekleme Modal */}
      {showAddAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Yeni Teslimat Adresi
              </CardTitle>
              <CardDescription>
                Müşteri için yeni teslimat adresi ekleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Adres Başlığı</label>
                <Input
                  placeholder="Örn: Merkez, Şube 1, Depo..."
                  value={newAddress.title}
                  onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Adres *</label>
                <textarea
                  className="w-full h-20 px-3 py-2 border rounded-md bg-background resize-none"
                  placeholder="Tam adres..."
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">İlçe</label>
                  <Input
                    placeholder="İlçe"
                    value={newAddress.district}
                    onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Şehir *</label>
                  <Input
                    placeholder="Şehir"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Posta Kodu</label>
                <Input
                  placeholder="Posta kodu"
                  value={newAddress.postalCode}
                  onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Teslimat Notları</label>
                <Input
                  placeholder="Örn: Arka kapıdan teslim..."
                  value={newAddress.deliveryNotes}
                  onChange={(e) => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAddress.isDefault}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Varsayılan adres olarak ayarla</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddAddressModal(false)
                    setNewAddress({
                      title: '',
                      address: '',
                      district: '',
                      city: '',
                      postalCode: '',
                      isDefault: false,
                      isDelivery: true,
                      isBilling: false,
                      deliveryNotes: '',
                    })
                  }}
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleAddAddress}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
