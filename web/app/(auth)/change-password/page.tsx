'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

// Şifre politikası: min 8 karakter, 1 büyük harf, 1 küçük harf, 1 özel karakter
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
  newPassword: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[a-z]/, 'Şifre en az 1 küçük harf içermeli')
    .regex(/[A-Z]/, 'Şifre en az 1 büyük harf içermeli')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Şifre en az 1 özel karakter içermeli'),
  confirmPassword: z.string().min(1, 'Şifre tekrarı gerekli'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Yeni şifre mevcut şifre ile aynı olamaz',
  path: ['newPassword'],
})

type PasswordForm = z.infer<typeof passwordSchema>

// Şifre gücü kontrolü
const checkPasswordStrength = (password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
  return checks
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, setAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasLower: false,
    hasUpper: false,
    hasSpecial: false,
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const newPassword = watch('newPassword', '')

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword))
  }, [newPassword])

  // Kullanıcı giriş yapmamışsa login'e yönlendir
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const onSubmit = async (data: PasswordForm) => {
    setIsLoading(true)
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      
      // Kullanıcı bilgisini güncelle
      if (user) {
        setAuth({ ...user, mustChangePassword: false }, localStorage.getItem('token') || '')
      }
      
      toast.success('Şifreniz başarıyla değiştirildi!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Şifre değiştirme başarısız')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const StrengthIndicator = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-sm ${passed ? 'text-green-600' : 'text-gray-400'}`}>
      {passed ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      <span>{label}</span>
    </div>
  )

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Cesformind"
              width={180}
              height={60}
              className="object-contain"
            />
          </div>
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-amber-100 rounded-full">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Şifre Değiştirme Zorunlu</CardTitle>
          <CardDescription>
            Güvenliğiniz için lütfen şifrenizi değiştirin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.</p>
                <p className="mt-1 text-amber-700">Bu işlem zorunludur ve sisteme erişim için gereklidir.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Mevcut Şifre */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mevcut Şifre</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* Yeni Şifre */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Yeni Şifre</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
              
              {/* Şifre Gücü Göstergesi */}
              {newPassword && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-gray-600 mb-2">Şifre Gereksinimleri:</p>
                  <StrengthIndicator passed={passwordStrength.minLength} label="En az 8 karakter" />
                  <StrengthIndicator passed={passwordStrength.hasLower} label="En az 1 küçük harf (a-z)" />
                  <StrengthIndicator passed={passwordStrength.hasUpper} label="En az 1 büyük harf (A-Z)" />
                  <StrengthIndicator passed={passwordStrength.hasSpecial} label="En az 1 özel karakter (!@#$%...)" />
                </div>
              )}
            </div>

            {/* Yeni Şifre Tekrar */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
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
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Şifreyi Değiştir ve Devam Et
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Çıkış yap ve farklı hesapla giriş yap
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
