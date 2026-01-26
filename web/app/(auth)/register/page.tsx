'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Building, User, MapPin, CheckCircle, Eye, EyeOff, Search, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { authApi } from '@/lib/api'

// Form tipi
interface RegisterForm {
  membershipType: 'INDIVIDUAL' | 'CORPORATE' | ''
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  companyName?: string
  taxNumber?: string
  taxOffice?: string
  customerType?: string
  address: string
  district: string
  city: string
  latitude?: number
  longitude?: number
}

const customerTypes = [
  { value: 'RESTAURANT', label: 'Restoran' },
  { value: 'MARKET', label: 'Market' },
  { value: 'HOTEL', label: 'Otel' },
  { value: 'CAFE', label: 'Kafe' },
  { value: 'CATERING', label: 'Catering' },
  { value: 'WHOLESALE', label: 'Toptan Satış' },
  { value: 'OTHER', label: 'Diğer' },
]

const cities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 
  'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Samsun', 'Denizli',
  'Şanlıurfa', 'Malatya', 'Trabzon', 'Erzurum', 'Van', 'Diyarbakır',
  'Sakarya', 'Kocaeli', 'Manisa', 'Aydın', 'Balıkesir', 'Muğla'
].sort()

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [membershipType, setMembershipType] = useState<'INDIVIDUAL' | 'CORPORATE' | null>(null)
  const [step, setStep] = useState(0) // 0: üyelik tipi seçimi
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    watch,
    setValue,
    reset,
  } = useForm<any>({
    defaultValues: {
      membershipType: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      taxNumber: '',
      taxOffice: '',
      customerType: '',
      address: '',
      district: '',
      city: '',
      latitude: undefined,
      longitude: undefined,
    }
  })

  // Üyelik tipi seçildiğinde
  const selectMembershipType = (type: 'INDIVIDUAL' | 'CORPORATE') => {
    setMembershipType(type)
    setValue('membershipType', type)
    setStep(1)
  }

  // Google Maps adres seçildiğinde form alanlarını doldur
  const handleAddressSelect = (result: {
    address: string
    district: string
    city: string
    latitude?: number
    longitude?: number
  }) => {
    if (result.address) setValue('address', result.address)
    if (result.district) setValue('district', result.district)
    if (result.city) setValue('city', result.city)
    if (result.latitude) setValue('latitude', result.latitude)
    if (result.longitude) setValue('longitude', result.longitude)
  }

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateStep = (currentStep: number): boolean => {
    const values = watch()
    const errors: Record<string, string> = {}
    
    if (currentStep === 1) {
      if (!values.firstName || values.firstName.length < 2) errors.firstName = 'Ad en az 2 karakter olmalı'
      if (!values.lastName || values.lastName.length < 2) errors.lastName = 'Soyad en az 2 karakter olmalı'
      if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Geçerli bir email adresi giriniz'
      if (!values.phone || values.phone.length < 10) errors.phone = 'Geçerli bir telefon numarası giriniz'
      
      if (!values.password || values.password.length < 8) {
        errors.password = 'Şifre en az 8 karakter olmalı'
      } else if (!/[a-z]/.test(values.password)) {
        errors.password = 'Şifre en az 1 küçük harf içermeli'
      } else if (!/[A-Z]/.test(values.password)) {
        errors.password = 'Şifre en az 1 büyük harf içermeli'
      } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password)) {
        errors.password = 'Şifre en az 1 özel karakter içermeli'
      }
      
      if (values.password !== values.confirmPassword) errors.confirmPassword = 'Şifreler eşleşmiyor'
    } else if (currentStep === 2 && membershipType === 'CORPORATE') {
      if (!values.companyName || values.companyName.length < 2) errors.companyName = 'Firma adı gerekli'
      if (!values.taxNumber || values.taxNumber.length < 10 || values.taxNumber.length > 11) errors.taxNumber = 'Vergi numarası 10 veya 11 haneli olmalı'
      if (!values.taxOffice || values.taxOffice.length < 2) errors.taxOffice = 'Vergi dairesi gerekli'
      if (!values.customerType) errors.customerType = 'Müşteri tipi seçiniz'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateAddressStep = (): boolean => {
    const values = watch()
    const errors: Record<string, string> = {}
    
    if (!values.address || values.address.length < 10) errors.address = 'Adres en az 10 karakter olmalı'
    if (!values.district || values.district.length < 2) errors.district = 'İlçe gerekli'
    if (!values.city || values.city.length < 2) errors.city = 'İl gerekli'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    const isValid = validateStep(step)
    if (isValid) {
      setFormErrors({})
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step === 1) {
      setMembershipType(null)
      setStep(0)
      reset()
    } else {
      setStep(step - 1)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Son adım validasyonu
    if (!validateAddressStep()) {
      return
    }
    
    const data = watch()
    
    setIsLoading(true)
    try {
      await authApi.register({
        ...data,
        // Bireysel üyelik için firma adı olarak ad soyad kullan
        companyName: membershipType === 'INDIVIDUAL' 
          ? `${data.firstName} ${data.lastName}` 
          : data.companyName,
        customerType: membershipType === 'INDIVIDUAL' ? 'INDIVIDUAL' : data.customerType,
      })
      setIsSuccess(true)
      toast.success('Başvurunuz alındı!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kayıt başarısız')
    } finally {
      setIsLoading(false)
    }
  }

  // Toplam adım sayısı
  const totalSteps = membershipType === 'CORPORATE' ? 3 : 2

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Başvurunuz Alındı!</h2>
            <p className="text-muted-foreground mb-6">
              {membershipType === 'INDIVIDUAL' 
                ? 'Bireysel üyelik başvurunuz başarıyla alınmıştır. Hesabınız onaylandıktan sonra email adresinize bilgilendirme yapılacaktır.'
                : 'Kurumsal üyelik başvurunuz başarıyla alınmıştır. Başvurunuz incelendikten sonra email adresinize bilgilendirme yapılacaktır.'
              }
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800">
                <strong>Not:</strong> Başvuru onay süreci genellikle 1-2 iş günü içerisinde 
                tamamlanmaktadır. Acil durumlar için{' '}
                <a href="tel:02121234567" className="text-blue-600 hover:underline">
                  0212 123 45 67
                </a>{' '}
                numaralı telefondan bize ulaşabilirsiniz.
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">
                Giriş Sayfasına Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Cesformind"
              width={160}
              height={50}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Üyelik Başvurusu</CardTitle>
          <CardDescription>
            {step === 0 ? 'Üyelik tipinizi seçin' : membershipType === 'INDIVIDUAL' ? 'Bireysel Üyelik' : 'Kurumsal Üyelik'}
          </CardDescription>
          
          {/* Progress Steps - Sadece üyelik tipi seçildikten sonra göster */}
          {step > 0 && (
            <>
              <div className="flex items-center justify-center gap-2 pt-4">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        s === step
                          ? 'bg-primary text-white'
                          : s < step
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                    </div>
                    {s < totalSteps && (
                      <div
                        className={`w-12 h-1 mx-1 ${
                          s < step ? 'bg-green-500' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-8 text-xs text-muted-foreground pt-1">
                <span>Kişisel</span>
                {membershipType === 'CORPORATE' && <span>Firma</span>}
                <span>Adres</span>
              </div>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Step 0: Üyelik Tipi Seçimi */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-6">
                Size en uygun üyelik tipini seçin
              </p>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => selectMembershipType('INDIVIDUAL')}
                  className="p-6 border-2 rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                      <UserCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Bireysel Üyelik</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Kişisel alışverişleriniz için ideal. Hızlı kayıt, kolay sipariş.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Fatura bilgisi gerekmez
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Hızlı onay süreci
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Kişisel teslimat adresi
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectMembershipType('CORPORATE')}
                  className="p-6 border-2 rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                      <Building className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Kurumsal Üyelik</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        İşletmeniz için özel fiyatlar ve fatura kesimi imkanı.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Kurumsal fatura
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Özel fiyatlandırma
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Vadeli ödeme imkanı
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Zaten hesabınız var mı?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Giriş Yap
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Form Steps */}
          {step > 0 && (
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Step 1: Kişisel Bilgiler */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                    <User className="h-5 w-5" />
                    <span className="font-medium">Kişisel Bilgiler</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ad *</label>
                      <Input
                        placeholder="Adınız"
                        {...register('firstName')}
                      />
                    {formErrors.firstName && (
                      <p className="text-xs text-red-500">{formErrors.firstName}</p>
                    )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Soyad *</label>
                      <Input
                        placeholder="Soyadınız"
                        {...register('lastName')}
                      />
                    {formErrors.lastName && (
                      <p className="text-xs text-red-500">{formErrors.lastName}</p>
                    )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="ornek@email.com"
                      {...register('email')}
                    />
                  {formErrors.email && (
                    <p className="text-xs text-red-500">{formErrors.email}</p>
                  )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon *</label>
                    <Input
                      placeholder="05XX XXX XX XX"
                      {...register('phone')}
                    />
                  {formErrors.phone && (
                    <p className="text-xs text-red-500">{formErrors.phone}</p>
                  )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şifre *</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-xs text-red-500">{formErrors.password}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Min 8 karakter, 1 büyük harf, 1 küçük harf, 1 özel karakter
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şifre Tekrar *</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Firma Bilgileri (Sadece Kurumsal) */}
              {step === 2 && membershipType === 'CORPORATE' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                    <Building className="h-5 w-5" />
                    <span className="font-medium">Firma Bilgileri</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Firma Adı *</label>
                    <Input
                      placeholder="Firma Adı"
                      {...register('companyName' as any)}
                    />
                    {formErrors.companyName && (
                      <p className="text-xs text-red-500">{formErrors.companyName}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vergi No *</label>
                      <Input
                        placeholder="1234567890"
                        maxLength={11}
                        {...register('taxNumber' as any)}
                      />
                      {formErrors.taxNumber && (
                        <p className="text-xs text-red-500">{formErrors.taxNumber}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vergi Dairesi *</label>
                      <Input
                        placeholder="Vergi Dairesi"
                        {...register('taxOffice' as any)}
                      />
                      {formErrors.taxOffice && (
                        <p className="text-xs text-red-500">{formErrors.taxOffice}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Müşteri Tipi *</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      {...register('customerType' as any)}
                    >
                      <option value="">Seçiniz...</option>
                      {customerTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.customerType && (
                      <p className="text-xs text-red-500">{formErrors.customerType}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2/3: Adres Bilgileri */}
              {((step === 2 && membershipType === 'INDIVIDUAL') || (step === 3 && membershipType === 'CORPORATE')) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 text-primary">
                    <MapPin className="h-5 w-5" />
                    <span className="font-medium">
                      {membershipType === 'INDIVIDUAL' ? 'Teslimat Adresi' : 'Firma Adresi'}
                    </span>
                  </div>

                  {/* Google Maps Adres Arama */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Adres Ara (Google Maps)
                    </label>
                    <AddressAutocomplete
                      onAddressSelect={handleAddressSelect}
                      placeholder="Adres aramak için yazmaya başlayın..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Adres seçtiğinizde aşağıdaki alanlar otomatik doldurulacaktır
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        veya manuel girin
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adres *</label>
                    <Input
                      placeholder="Sokak, Mahalle, Bina No..."
                      {...register('address')}
                    />
                    {formErrors.address && (
                      <p className="text-xs text-red-500">{formErrors.address}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">İl *</label>
                      <select
                        className="w-full h-10 px-3 border rounded-md bg-background"
                        {...register('city')}
                        value={watch('city') || ''}
                      >
                        <option value="">Seçiniz...</option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      {formErrors.city && (
                        <p className="text-xs text-red-500">{formErrors.city}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">İlçe *</label>
                      <Input
                        placeholder="İlçe"
                        {...register('district')}
                      />
                      {formErrors.district && (
                        <p className="text-xs text-red-500">{formErrors.district}</p>
                      )}
                    </div>
                  </div>

                  {/* Konum bilgisi göster */}
                  {(watch('latitude') && watch('longitude')) && (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="h-4 w-4" />
                      Konum bilgisi kaydedildi
                    </div>
                  )}
                  
                  <div className="bg-muted/50 p-4 rounded-lg text-sm">
                    <p className="font-medium mb-2">Başvuru Bilgileri</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      {membershipType === 'INDIVIDUAL' ? (
                        <>
                          <li>Bireysel üyelik başvurunuz hızlıca değerlendirilecektir</li>
                          <li>Onay sonrası hemen sipariş verebilirsiniz</li>
                        </>
                      ) : (
                        <>
                          <li>Başvurunuz 1-2 iş günü içinde değerlendirilecektir</li>
                          <li>Onay sonrası email ile bilgilendirileceksiniz</li>
                          <li>Kredi limiti ve ödeme vadesi onay sonrası belirlenecektir</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri
                </Button>
                
                {((membershipType === 'INDIVIDUAL' && step < 2) || (membershipType === 'CORPORATE' && step < 3)) ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1"
                  >
                    Devam
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Başvuruyu Gönder
                  </Button>
                )}
              </div>
            </form>
          )}

          {step > 0 && (
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Zaten hesabınız var mı?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Giriş Yap
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
