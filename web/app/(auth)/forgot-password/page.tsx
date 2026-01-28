'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setIsSuccess(true)
      toast.success('Şifre sıfırlama linki gönderildi')
    } catch (error: any) {
      // Güvenlik için her durumda başarılı mesajı göster
      setIsSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center w-full">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-[#852EC5] via-[#4F79DD] to-[#11D1F8] p-4 rounded-xl">
              <Image
                src="/cesorder-logo-white.png"
                alt="Cesorder"
                width={280}
                height={90}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#852EC5] to-[#4F79DD] bg-clip-text text-transparent">
            Şifremi Unuttum
          </CardTitle>
          <CardDescription className="text-gray-600">
            Email adresinizi girin, şifre sıfırlama linki gönderelim
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-[#11D1F8]/20 rounded-full">
                  <CheckCircle className="h-8 w-8 text-[#11D1F8]" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Email Gönderildi!</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi.
                  Lütfen email kutunuzu kontrol edin.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full border-[#4F79DD] text-[#4F79DD] hover:bg-[#4F79DD]/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Giriş Sayfasına Dön
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="ornek@email.com"
                    className="pl-10 border-gray-300 focus:border-[#4F79DD] focus:ring-[#4F79DD]"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#852EC5] to-[#4F79DD] hover:from-[#7025a8] hover:to-[#3d62c4] text-white shadow-lg" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifre Sıfırlama Linki Gönder
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-sm text-[#4F79DD] hover:text-[#852EC5] hover:underline inline-flex items-center font-medium"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Giriş sayfasına dön
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
