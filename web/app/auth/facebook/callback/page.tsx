'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function FacebookCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || 'Facebook ile giriş iptal edildi')
        setTimeout(() => router.push('/login'), 3000)
        return
      }

      if (!code) {
        setError('Geçersiz yetkilendirme kodu')
        setTimeout(() => router.push('/login'), 3000)
        return
      }

      try {
        // Backend'e kodu gönder ve token al
        const response = await authApi.facebookCallback(code)
        const { token, user } = response.data.data

        setAuth(user, token)
        toast.success('Meta ile giriş başarılı!')
        
        if (user.mustChangePassword) {
          router.push('/change-password')
        } else {
          router.push('/dashboard')
        }
      } catch (error: any) {
        const message = error.response?.data?.message || 'Meta ile giriş başarısız'
        setError(message)
        toast.error(message)
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#852EC5] via-[#4F79DD] to-[#11D1F8] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="text-red-500 text-5xl">✕</div>
              <h2 className="text-xl font-semibold text-gray-800">Giriş Başarısız</h2>
              <p className="text-gray-600">{error}</p>
              <p className="text-sm text-gray-400">Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-[#1877F2]" />
              <h2 className="text-xl font-semibold text-gray-800">Meta ile Giriş Yapılıyor</h2>
              <p className="text-gray-600">Lütfen bekleyin...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
