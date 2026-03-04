'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  ShoppingCart, 
  User, 
  MapPin, 
  CreditCard,
  Truck,
  CheckCircle,
  Loader2,
  Minus,
  Plus,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Form validation schema
const guestCheckoutSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir email adresi giriniz'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
  address: z.string().min(10, 'Adres en az 10 karakter olmalı'),
  city: z.string().min(2, 'Şehir seçiniz'),
  district: z.string().min(2, 'İlçe giriniz'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'ONLINE']),
})

type GuestCheckoutForm = z.infer<typeof guestCheckoutSchema>

interface CartItem {
  product: {
    id: string
    name: string
    sku: string
    basePrice: number
    image?: string
  }
  quantity: number
}

export default function GuestCheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [step, setStep] = useState(1) // 1: Sepet, 2: Bilgiler, 3: Ödeme

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GuestCheckoutForm>({
    resolver: zodResolver(guestCheckoutSchema),
    defaultValues: {
      paymentMethod: 'CASH_ON_DELIVERY',
    },
  })

  const paymentMethod = watch('paymentMethod')

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        if (parsedCart.length === 0) {
          router.push('/')
          toast.error('Sepetiniz boş')
        } else {
          setCart(parsedCart)
        }
      } catch (e) {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [router])

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta)
          return { ...item, quantity: newQuantity }
        }
        return item
      })
      localStorage.setItem('cart', JSON.stringify(updated))
      return updated
    })
  }

  const removeItem = (productId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.product.id !== productId)
      localStorage.setItem('cart', JSON.stringify(updated))
      if (updated.length === 0) {
        router.push('/')
        toast.info('Sepetiniz boşaldı')
      }
      return updated
    })
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price)
  }

  const onSubmit = async (data: GuestCheckoutForm) => {
    setIsLoading(true)
    try {
      const orderData = {
        ...data,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.basePrice,
        })),
        totalAmount: cartTotal,
      }

      const response = await axios.post(`${API_URL}/orders/guest`, orderData)

      if (response.data.success) {
        setOrderNumber(response.data.data.orderNumber)
        setIsSuccess(true)
        // Sepeti temizle
        localStorage.removeItem('cart')
        setCart([])
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Sipariş oluşturulamadı')
    } finally {
      setIsLoading(false)
    }
  }

  // Success Screen
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-800 mb-2">
              Siparişiniz Alındı!
            </h1>
            <p className="text-gray-600 mb-4">
              Sipariş numaranız: <span className="font-bold text-lg">{orderNumber}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Siparişiniz onaylandıktan sonra hazırlanacak ve adresinize teslim edilecektir.
              {paymentMethod === 'CASH_ON_DELIVERY' && ' Ödemeyi kapıda nakit veya kredi kartı ile yapabilirsiniz.'}
            </p>
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full" size="lg">
                  Alışverişe Devam Et
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Image
                src="/t-order.png"
                alt="T-ORDER"
                width={120}
                height={40}
                className="object-contain"
              />
            </div>
            <h1 className="text-lg font-semibold ml-4">Misafir Siparişi</h1>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2 md:gap-8">
            {[
              { num: 1, label: 'Sepet', icon: ShoppingCart },
              { num: 2, label: 'Bilgiler', icon: User },
              { num: 3, label: 'Ödeme', icon: CreditCard },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    step === s.num
                      ? 'bg-primary text-white'
                      : step > s.num
                      ? 'bg-green-100 text-green-700 cursor-pointer'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="hidden md:inline text-sm font-medium">{s.label}</span>
                  <span className="md:hidden text-sm font-medium">{s.num}</span>
                </button>
                {idx < 2 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-2 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Cart Review */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Sepetiniz ({cart.length} ürün)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ShoppingCart className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-gray-500">{item.product.sku}</p>
                          <p className="font-semibold text-primary mt-1">
                            {formatPrice(item.product.basePrice)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removeItem(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatPrice(item.product.basePrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button size="lg" onClick={() => setStep(2)}>
                      Devam Et
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Customer Info */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Teslimat Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ad *</label>
                        <Input
                          {...register('firstName')}
                          placeholder="Adınız"
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-500">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Soyad *</label>
                        <Input
                          {...register('lastName')}
                          placeholder="Soyadınız"
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-500">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                          type="email"
                          {...register('email')}
                          placeholder="ornek@email.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500">{errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Telefon *</label>
                        <Input
                          {...register('phone')}
                          placeholder="05XX XXX XX XX"
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-500">{errors.phone.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Şehir *</label>
                        <Input
                          {...register('city')}
                          placeholder="İstanbul"
                        />
                        {errors.city && (
                          <p className="text-sm text-red-500">{errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">İlçe *</label>
                        <Input
                          {...register('district')}
                          placeholder="Kadıköy"
                        />
                        {errors.district && (
                          <p className="text-sm text-red-500">{errors.district.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Adres *</label>
                      <Input
                        {...register('address')}
                        placeholder="Mahalle, Sokak, Bina No, Daire No"
                      />
                      {errors.address && (
                        <p className="text-sm text-red-500">{errors.address.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sipariş Notu (Opsiyonel)</label>
                      <Input
                        {...register('notes')}
                        placeholder="Varsa eklemek istediğiniz notlar..."
                      />
                    </div>

                    <div className="mt-6 flex justify-between">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Geri
                      </Button>
                      <Button onClick={() => setStep(3)}>
                        Devam Et
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Ödeme Yöntemi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'CASH_ON_DELIVERY'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="CASH_ON_DELIVERY"
                        {...register('paymentMethod')}
                        className="w-5 h-5 text-primary"
                      />
                      <Truck className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="font-medium">Kapıda Ödeme</p>
                        <p className="text-sm text-gray-500">
                          Nakit veya kredi kartı ile kapıda ödeme yapın
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === 'ONLINE'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="ONLINE"
                        {...register('paymentMethod')}
                        className="w-5 h-5 text-primary"
                      />
                      <CreditCard className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="font-medium">Online Ödeme</p>
                        <p className="text-sm text-gray-500">
                          Kredi kartı ile güvenli online ödeme
                        </p>
                      </div>
                    </label>

                    {paymentMethod === 'ONLINE' && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          ⚠️ Online ödeme entegrasyonu yakında aktif olacaktır. 
                          Şimdilik kapıda ödeme seçeneğini kullanabilirsiniz.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Geri
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={handleSubmit(onSubmit)}
                      disabled={isLoading || paymentMethod === 'ONLINE'}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          Siparişi Tamamla
                          <CheckCircle className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Sipariş Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.product.name} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.product.basePrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ara Toplam</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kargo</span>
                    <span className="text-green-600">Ücretsiz</span>
                  </div>
                </div>

                <div className="border-t my-4" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Toplam</span>
                  <span className="text-primary">{formatPrice(cartTotal)}</span>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  Siparişiniz onaylandıktan sonra hazırlanacaktır
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
