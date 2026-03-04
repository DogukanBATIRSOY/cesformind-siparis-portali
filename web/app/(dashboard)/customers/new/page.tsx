'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/lib/api'
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
  Save,
  Loader2,
  Plus,
  Trash2,
  Star,
  Truck,
  Receipt,
  Copy,
  Store,
  Lock,
  Eye,
  EyeOff,
  UserCog,
} from 'lucide-react'

const customerTypeOptions = [
  { value: 'DEALER', label: 'Bayi', description: 'Bayi olarak çalışacak, kendi müşterilerini yönetebilecek' },
  { value: 'RESTAURANT', label: 'Restoran', description: 'Restoran işletmesi' },
  { value: 'MARKET', label: 'Market', description: 'Market/Bakkal' },
  { value: 'HOTEL', label: 'Otel', description: 'Otel işletmesi' },
  { value: 'CAFE', label: 'Kafe', description: 'Kafe/Kahvehane' },
  { value: 'CATERING', label: 'Catering', description: 'Catering hizmeti' },
  { value: 'WHOLESALE', label: 'Toptan Satış', description: 'Toptan satış noktası' },
  { value: 'INDIVIDUAL', label: 'Bireysel', description: 'Bireysel müşteri' },
  { value: 'OTHER', label: 'Diğer', description: 'Diğer müşteri tipleri' },
]

interface DeliveryAddress {
  id: string
  title: string
  address: string
  city: string
  district: string
  postalCode: string
  isDefault: boolean
  deliveryNotes: string
}

const createEmptyDeliveryAddress = (isFirst: boolean = false): DeliveryAddress => ({
  id: crypto.randomUUID(),
  title: isFirst ? 'Merkez' : '',
  address: '',
  city: '',
  district: '',
  postalCode: '',
  isDefault: isFirst,
  deliveryNotes: '',
})

export default function NewCustomerPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    taxNumber: '',
    taxOffice: '',
    type: 'RESTAURANT',
    creditLimit: 0,
    paymentTermDays: 30,
    notes: '',
    // Bayi için kullanıcı bilgileri
    createUser: true,
    userEmail: '',
    userPassword: '',
  })

  // Fatura Adresi (tek)
  const [billingAddress, setBillingAddress] = useState({
    title: 'Fatura Adresi',
    address: '',
    city: '',
    district: '',
    postalCode: '',
  })

  // Teslimat Adresleri (çoklu)
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([
    createEmptyDeliveryAddress(true)
  ])

  // Fatura adresini teslimat adresine kopyala
  const copyBillingToDelivery = () => {
    if (!billingAddress.address.trim()) {
      toast.error('Önce fatura adresini doldurun')
      return
    }
    
    const newDeliveryAddress: DeliveryAddress = {
      id: crypto.randomUUID(),
      title: 'Merkez (Fatura Adresi ile Aynı)',
      address: billingAddress.address,
      city: billingAddress.city,
      district: billingAddress.district,
      postalCode: billingAddress.postalCode,
      isDefault: deliveryAddresses.length === 0,
      deliveryNotes: '',
    }
    
    // Eğer ilk adres boşsa, onu değiştir
    if (deliveryAddresses.length === 1 && !deliveryAddresses[0].address.trim()) {
      setDeliveryAddresses([{ ...newDeliveryAddress, isDefault: true }])
    } else {
      setDeliveryAddresses([...deliveryAddresses, newDeliveryAddress])
    }
    
    toast.success('Fatura adresi teslimat adresine kopyalandı')
  }

  const addDeliveryAddress = () => {
    setDeliveryAddresses([...deliveryAddresses, createEmptyDeliveryAddress(false)])
  }

  const removeDeliveryAddress = (id: string) => {
    if (deliveryAddresses.length === 1) {
      toast.error('En az bir teslimat adresi olmalıdır')
      return
    }
    const newAddresses = deliveryAddresses.filter(a => a.id !== id)
    if (deliveryAddresses.find(a => a.id === id)?.isDefault && newAddresses.length > 0) {
      newAddresses[0].isDefault = true
    }
    setDeliveryAddresses(newAddresses)
  }

  const updateDeliveryAddress = (id: string, field: keyof DeliveryAddress, value: any) => {
    setDeliveryAddresses(deliveryAddresses.map(a => {
      if (a.id === id) {
        if (field === 'isDefault' && value === true) {
          return { ...a, [field]: value }
        }
        return { ...a, [field]: value }
      }
      if (field === 'isDefault' && value === true) {
        return { ...a, isDefault: false }
      }
      return a
    }))
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
    onSuccess: (response) => {
      toast.success('Müşteri başarıyla oluşturuldu')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      router.push(`/customers/${response.data.data.id}/edit`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Müşteri oluşturulamadı')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName.trim()) {
      toast.error('Firma adı zorunludur')
      return
    }
    if (!formData.contactName.trim()) {
      toast.error('İletişim kişisi zorunludur')
      return
    }
    if (!formData.contactPhone.trim()) {
      toast.error('Telefon numarası zorunludur')
      return
    }
    if (!formData.contactEmail.trim()) {
      toast.error('Email adresi zorunludur')
      return
    }

    // Fatura adresi kontrolü
    if (!billingAddress.address.trim() || !billingAddress.city.trim()) {
      toast.error('Fatura adresi zorunludur')
      return
    }

    // Teslimat adresi kontrolü
    const validDeliveryAddresses = deliveryAddresses.filter(a => a.address.trim() && a.city.trim())
    if (validDeliveryAddresses.length === 0) {
      toast.error('En az bir teslimat adresi girilmelidir')
      return
    }

    // Bayi için kullanıcı bilgisi kontrolü
    if (formData.type === 'DEALER' && formData.createUser) {
      if (!formData.userEmail.trim()) {
        toast.error('Bayi için email adresi zorunludur')
        return
      }
      if (!formData.userPassword || formData.userPassword.length < 8) {
        toast.error('Bayi şifresi en az 8 karakter olmalıdır')
        return
      }
    }

    const submitData: any = {
      companyName: formData.companyName,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail,
      type: formData.type,
      notes: formData.notes || undefined,
    }

    // Bireysel müşteri değilse vergi bilgilerini ekle
    if (formData.type !== 'INDIVIDUAL') {
      submitData.taxNumber = formData.taxNumber || undefined
      submitData.taxOffice = formData.taxOffice || undefined
      submitData.creditLimit = formData.creditLimit
      submitData.paymentTermDays = formData.paymentTermDays
    }

    // Bayi için kullanıcı bilgilerini ekle
    if (formData.type === 'DEALER' && formData.createUser) {
      submitData.createUser = true
      submitData.userEmail = formData.userEmail
      submitData.userPassword = formData.userPassword
    }

    // Tüm adresleri birleştir
    const allAddresses = [
      // Fatura Adresi
      {
        title: billingAddress.title || 'Fatura Adresi',
        address: billingAddress.address,
        city: billingAddress.city,
        district: billingAddress.district,
        postalCode: billingAddress.postalCode || undefined,
        isDefault: false,
        isDelivery: false,
        isBilling: true,
      },
      // Teslimat Adresleri
      ...validDeliveryAddresses.map(a => ({
        title: a.title || 'Teslimat Adresi',
        address: a.address,
        city: a.city,
        district: a.district,
        postalCode: a.postalCode || undefined,
        isDefault: a.isDefault,
        isDelivery: true,
        isBilling: false,
        deliveryNotes: a.deliveryNotes || undefined,
      })),
    ]

    submitData.addresses = allAddresses

    createMutation.mutate(submitData)
  }

  const isIndividual = formData.type === 'INDIVIDUAL'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Müşteri</h1>
          <p className="text-muted-foreground">Yeni müşteri kaydı oluşturun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon */}
          <div className="lg:col-span-2 space-y-6">
            {/* Firma Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Firma Bilgileri
                </CardTitle>
                <CardDescription>Müşteri firma bilgilerini girin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Firma Adı *</label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Firma adını girin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Müşteri Tipi *</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {customerTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!isIndividual && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vergi Numarası</label>
                      <Input
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                        placeholder="Vergi numarası"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vergi Dairesi</label>
                      <Input
                        value={formData.taxOffice}
                        onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                        placeholder="Vergi dairesi"
                      />
                    </div>
                  </div>
                )}

                {/* Bayi Seçildiğinde Tip Açıklaması */}
                {formData.type === 'DEALER' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Store className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Bayi Hesabı</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Bayi olarak oluşturulan müşteriler için otomatik bir yönetici hesabı oluşturulur.
                          Bu hesap ile bayi kendi müşterilerini, siparişlerini ve kullanıcılarını yönetebilir.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bayi Kullanıcı Bilgileri */}
            {formData.type === 'DEALER' && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-blue-600" />
                    Bayi Yönetici Hesabı
                  </CardTitle>
                  <CardDescription>
                    Bayi için oluşturulacak yönetici hesap bilgilerini girin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="createUser"
                      checked={formData.createUser}
                      onChange={(e) => setFormData({ ...formData, createUser: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="createUser" className="text-sm font-medium cursor-pointer">
                      Bayi için yönetici hesabı oluştur
                    </label>
                  </div>

                  {formData.createUser && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Giriş Email *
                        </label>
                        <Input
                          type="email"
                          value={formData.userEmail}
                          onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                          placeholder="bayi@email.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          Bayi bu email ile sisteme giriş yapacak
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          Şifre *
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.userPassword}
                            onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                            placeholder="En az 8 karakter"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          İlk girişte şifre değiştirmesi istenecek
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Not:</strong> Bayi yöneticisi sadece kendi bayisi altındaki müşterileri, 
                      siparişleri ve kullanıcıları görebilir ve yönetebilir.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* İletişim Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  İletişim Bilgileri
                </CardTitle>
                <CardDescription>Yetkili kişi bilgilerini girin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      İletişim Kişisi *
                    </label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Ad Soyad"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Telefon *
                    </label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@firma.com"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fatura Adresi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Fatura Adresi
                  <Badge variant="secondary" className="ml-2">Zorunlu</Badge>
                </CardTitle>
                <CardDescription>Fatura kesilecek adresi girin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adres Başlığı</label>
                    <Input
                      value={billingAddress.title}
                      onChange={(e) => setBillingAddress({ ...billingAddress, title: e.target.value })}
                      placeholder="Örn: Merkez Ofis"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Posta Kodu</label>
                    <Input
                      value={billingAddress.postalCode}
                      onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                      placeholder="34000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Adres *</label>
                  <textarea
                    className="w-full h-20 px-3 py-2 border rounded-md bg-background resize-none text-sm"
                    value={billingAddress.address}
                    onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
                    placeholder="Sokak, Cadde, Bina No, Daire No..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">İl *</label>
                    <Input
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                      placeholder="İstanbul"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">İlçe</label>
                    <Input
                      value={billingAddress.district}
                      onChange={(e) => setBillingAddress({ ...billingAddress, district: e.target.value })}
                      placeholder="Kadıköy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teslimat Adresleri */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Teslimat Adresleri
                    </CardTitle>
                    <CardDescription>Siparişlerin teslim edileceği adresleri ekleyin</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={copyBillingToDelivery}
                      title="Fatura adresini teslimat adresi olarak kullan"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Faturadan Kopyala
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addDeliveryAddress}>
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Adres
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {deliveryAddresses.map((address, index) => (
                  <div
                    key={address.id}
                    className={`p-4 border rounded-lg space-y-4 ${address.isDefault ? 'border-primary bg-primary/5' : ''}`}
                  >
                    {/* Adres Başlığı */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Teslimat Adresi {index + 1}</span>
                        {address.isDefault && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Varsayılan
                          </Badge>
                        )}
                      </div>
                      {deliveryAddresses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeDeliveryAddress(address.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Adres Başlığı Input */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Adres Başlığı *</label>
                        <Input
                          value={address.title}
                          onChange={(e) => updateDeliveryAddress(address.id, 'title', e.target.value)}
                          placeholder="Örn: Merkez, Şube, Depo..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Posta Kodu</label>
                        <Input
                          value={address.postalCode}
                          onChange={(e) => updateDeliveryAddress(address.id, 'postalCode', e.target.value)}
                          placeholder="34000"
                        />
                      </div>
                    </div>

                    {/* Adres */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Adres *</label>
                      <textarea
                        className="w-full h-20 px-3 py-2 border rounded-md bg-background resize-none text-sm"
                        value={address.address}
                        onChange={(e) => updateDeliveryAddress(address.id, 'address', e.target.value)}
                        placeholder="Sokak, Cadde, Bina No, Daire No..."
                      />
                    </div>

                    {/* İl/İlçe */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">İl *</label>
                        <Input
                          value={address.city}
                          onChange={(e) => updateDeliveryAddress(address.id, 'city', e.target.value)}
                          placeholder="İstanbul"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">İlçe</label>
                        <Input
                          value={address.district}
                          onChange={(e) => updateDeliveryAddress(address.id, 'district', e.target.value)}
                          placeholder="Kadıköy"
                        />
                      </div>
                    </div>

                    {/* Teslimat Notları */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Teslimat Notları</label>
                      <Input
                        value={address.deliveryNotes}
                        onChange={(e) => updateDeliveryAddress(address.id, 'deliveryNotes', e.target.value)}
                        placeholder="Örn: Arka kapıdan giriş, zili çalın..."
                      />
                    </div>

                    {/* Varsayılan Seçeneği */}
                    <div className="pt-2 border-t">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={address.isDefault}
                          onChange={(e) => updateDeliveryAddress(address.id, 'isDefault', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Varsayılan teslimat adresi olarak ayarla</span>
                      </label>
                    </div>
                  </div>
                ))}

                {/* Yeni Adres Ekle Butonu - Alt */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addDeliveryAddress}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Teslimat Adresi Ekle
                </Button>
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
                <textarea
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background resize-none"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Müşteri hakkında notlar..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sağ Kolon */}
          <div className="space-y-6">
            {/* Finansal Bilgiler */}
            {!isIndividual ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Finansal Bilgiler
                  </CardTitle>
                  <CardDescription>Kredi limiti ve ödeme vadesi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Kredi Limiti (₺)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ödeme Vadesi (Gün)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.paymentTermDays}
                      onChange={(e) => setFormData({ ...formData, paymentTermDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Bireysel Müşteri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Bireysel müşterilere kredi limiti tanımlanmaz. 
                      Ödemeler peşin veya kapıda ödeme şeklinde yapılır.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adres Özeti */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adres Özeti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fatura Adresi:</span>
                    </div>
                    <Badge variant={billingAddress.address.trim() ? 'default' : 'secondary'}>
                      {billingAddress.address.trim() ? 'Girildi' : 'Girilmedi'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Teslimat Adresi:</span>
                    </div>
                    <span className="font-medium">{deliveryAddresses.filter(a => a.address.trim()).length} adet</span>
                  </div>
                  {deliveryAddresses.filter(a => a.address.trim()).length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Teslimat Adresleri:</p>
                      <div className="space-y-1">
                        {deliveryAddresses.filter(a => a.address.trim()).map((addr, i) => (
                          <div key={addr.id} className="flex items-center gap-2 text-xs">
                            {addr.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
                            <span className="truncate">{addr.title || `Adres ${i + 1}`}</span>
                            <span className="text-muted-foreground">- {addr.city}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Kaydet Butonu */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Müşteri Oluştur
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
