'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

export function ImageUpload({ value, onChange, onRemove, disabled, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // value prop değiştiğinde preview'ı güncelle
  useEffect(() => {
    setPreview(value || null)
  }, [value])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Sadece resim dosyaları yüklenebilir (JPEG, PNG, GIF, WebP)')
      return
    }

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB\'dan küçük olmalı')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Dosyayı base64'e çevir ve önizleme için kullan
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          setPreview(result) // Önizleme için de kullan
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const token = localStorage.getItem('token')
      const response = await axios.post(
        `${API_URL}/upload/image`,
        { image: base64, filename: file.name },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data.success) {
        const imageUrl = `${API_URL.replace('/api', '')}${response.data.data.url}`
        onChange(imageUrl)
        setPreview(imageUrl)
      } else {
        throw new Error(response.data.message)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.response?.data?.message || 'Resim yüklenirken hata oluştu')
      setPreview(value || null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onChange('')
    onRemove?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {preview || value ? (
        <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted group">
          <img
            src={preview || value}
            alt="Yüklenen görsel"
            className="w-full h-full object-cover"
            onError={() => setPreview(null)}
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Değiştir'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            'w-48 h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-muted/50',
            uploading && 'opacity-50 cursor-wait'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center px-4">
                Resim yüklemek için tıklayın
              </span>
              <span className="text-xs text-muted-foreground">
                Max 5MB
              </span>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
