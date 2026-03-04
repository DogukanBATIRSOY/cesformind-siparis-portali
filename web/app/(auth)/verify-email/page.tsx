'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Handle input change
  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Pasted value
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newCode = [...code]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit
        }
      })
      setCode(newCode)
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
    } else {
      const newCode = [...code]
      newCode[index] = value.replace(/\D/g, '')
      setCode(newCode)
      
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Verify code
  const handleVerify = async () => {
    const verificationCode = code.join('')
    if (verificationCode.length !== 6) {
      toast.error('Lütfen 6 haneli kodu girin')
      return
    }

    setIsLoading(true)
    try {
      const response = await axios.post(`${API_URL}/auth/verify-email`, {
        email,
        code: verificationCode,
      })

      if (response.data.success) {
        setIsVerified(true)
        toast.success('Email doğrulandı!')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Doğrulama başarısız')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  // Resend code
  const handleResend = async () => {
    setIsResending(true)
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email,
      })

      if (response.data.success) {
        toast.success('Yeni doğrulama kodu gönderildi')
        setCountdown(60) // 60 saniye bekle
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kod gönderilemedi')
    } finally {
      setIsResending(false)
    }
  }

  // Auto-submit when all digits entered
  useEffect(() => {
    if (code.every(digit => digit !== '') && code.join('').length === 6) {
      handleVerify()
    }
  }, [code])

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#852EC5] via-[#4F79DD] to-[#11D1F8] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Doğrulandı!</h2>
            <p className="text-muted-foreground mb-4">
              Hesabınız aktif edildi. Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#852EC5] via-[#4F79DD] to-[#11D1F8] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image
              src="/t-order.png"
              alt="T-ORDER"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Email Doğrulama</CardTitle>
          <CardDescription>
            <strong>{email}</strong> adresine gönderilen 6 haneli kodu girin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Code inputs */}
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold"
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Verify button */}
          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={isLoading || code.join('').length !== 6}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              'Doğrula'
            )}
          </Button>

          {/* Resend section */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Kod gelmedi mi?
            </p>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : countdown > 0 ? (
                `Tekrar gönder (${countdown}s)`
              ) : (
                'Kodu tekrar gönder'
              )}
            </Button>
          </div>

          {/* Back link */}
          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Giriş sayfasına dön
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
