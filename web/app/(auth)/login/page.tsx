'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
})

type LoginForm = z.infer<typeof loginSchema>

// Meta (Facebook) Icon Component
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [isLoading, setIsLoading] = useState(false)
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  
  // Sayfa yüklendiğinde localStorage'dan hatayı oku
  useEffect(() => {
    const savedError = localStorage.getItem('loginError')
    if (savedError) {
      setLoginError(savedError)
    }
  }, [])
  
  // Hata değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (loginError) {
      localStorage.setItem('loginError', loginError)
    }
  }, [loginError])
  
  const clearError = () => {
    setLoginError(null)
    localStorage.removeItem('loginError')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    clearError() // Önceki hatayı temizle
    try {
      const response = await authApi.login(data)
      const { token, user } = response.data.data

      setAuth(user, token)
      
      // İlk girişte şifre değiştirme zorunlu mu kontrol et
      if (user.mustChangePassword) {
        toast.info('İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.')
        router.push('/change-password')
      } else {
        toast.success('Giriş başarılı!')
        
        // Kullanıcı tipine göre yönlendirme
        if (user.customer?.type === 'INDIVIDUAL') {
          // Bireysel müşteri → Ana sayfa (ürün seçimi)
          router.push('/')
        } else {
          // Kurumsal müşteri, Admin, Staff → Dashboard
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      // Email doğrulama gerekiyorsa yönlendir
      if (error.response?.data?.data?.requiresVerification) {
        const email = error.response?.data?.data?.email
        toast.info('Lütfen önce email adresinizi doğrulayın')
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }
      
      // Hata mesajını belirle
      const errorMessage = error.response?.data?.message || 'Giriş başarısız'
      const displayMessage = errorMessage === 'Geçersiz email veya şifre' 
        ? 'Parolanız hatalı, lütfen tekrar deneyiniz.' 
        : errorMessage
      
      setLoginError(displayMessage)
      localStorage.setItem('loginError', displayMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Meta (Facebook) Login Handler
  const handleMetaLogin = async () => {
    setIsMetaLoading(true)
    try {
      const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
      const REDIRECT_URI = `${window.location.origin}/auth/facebook/callback`
      
      if (!FACEBOOK_APP_ID) {
        toast.error('Meta giriş yapılandırması eksik')
        setIsMetaLoading(false)
        return
      }

      // Facebook OAuth URL
      const scope = 'email,public_profile'
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&response_type=code`
      
      // Redirect to Facebook
      window.location.href = authUrl
    } catch (error) {
      toast.error('Meta ile giriş başlatılamadı')
      setIsMetaLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4">
              <Image
                src="/t-order.png"
                alt="T-ORDER"
                width={280}
                height={90}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#852EC5] to-[#4F79DD] bg-clip-text text-transparent">
            Sipariş Portali
          </CardTitle>
          <CardDescription className="text-gray-600">
            B2C ve B2B Gıda Sipariş ve Teslimat Sistemi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                placeholder="ornek@email.com"
                className="border-gray-300 focus:border-[#4F79DD] focus:ring-[#4F79DD]"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Şifre</label>
              <Input
                type="password"
                placeholder="••••••••"
                className="border-gray-300 focus:border-[#4F79DD] focus:ring-[#4F79DD]"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            {/* Hata Mesajı - localStorage ile kalıcı */}
            {loginError && (
              <div className="p-4 rounded-lg bg-red-100 border-2 border-red-500 shadow-lg relative">
                <button 
                  type="button"
                  onClick={clearError}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center justify-center gap-2 pr-6">
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 font-bold text-base">
                    {loginError}
                  </p>
                </div>
                <p className="text-red-600 text-sm text-center mt-2">
                  Lütfen bilgilerinizi kontrol edip tekrar deneyiniz.
                </p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#852EC5] to-[#4F79DD] hover:from-[#7025a8] hover:to-[#3d62c4] text-white shadow-lg" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giriş Yap
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">veya</span>
            </div>
          </div>

          {/* Meta Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
            onClick={handleMetaLogin}
            disabled={isMetaLoading}
          >
            {isMetaLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MetaIcon />
            )}
            <span className="ml-2">Meta ile Giriş Yap</span>
          </Button>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-[#4F79DD] hover:text-[#852EC5] hover:underline font-medium"
            >
              Şifremi unuttum
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-center text-gray-500 mb-3">
              Henüz hesabınız yok mu?
            </p>
            <Link href="/register">
              <Button 
                variant="outline" 
                className="w-full border-[#4F79DD] text-[#4F79DD] hover:bg-[#4F79DD]/10 hover:border-[#852EC5]"
              >
                Üyelik Başvurusu Yap
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
