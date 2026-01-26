'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Settings as SettingsIcon, 
  Building2, 
  Bell, 
  Palette,
  Globe,
  Shield,
  Database,
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground">
          Sistem ve uygulama ayarlarını yönetin
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Şirket Bilgileri - Sadece Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Şirket Bilgileri
              </CardTitle>
              <CardDescription>
                Şirket ve iletişim bilgilerini düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Şirket Adı</label>
                <Input defaultValue="Cesformind Sipariş Portali" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefon</label>
                <Input defaultValue="0212 123 45 67" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input defaultValue="info@uyargida.com" />
              </div>
              <Button>Kaydet</Button>
            </CardContent>
          </Card>
        )}

        {/* Bildirim Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirim Ayarları
            </CardTitle>
            <CardDescription>
              Bildirim tercihlerinizi yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Yeni Sipariş</p>
                <p className="text-sm text-muted-foreground">Yeni sipariş geldiğinde bildirim al</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Teslimat Güncellemeleri</p>
                <p className="text-sm text-muted-foreground">Teslimat durumu değiştiğinde bildirim al</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Düşük Stok Uyarısı</p>
                <p className="text-sm text-muted-foreground">Stok minimum seviyeye düştüğünde bildirim al</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Bildirimleri</p>
                <p className="text-sm text-muted-foreground">Önemli güncellemeleri email ile al</p>
              </div>
              <input type="checkbox" className="h-4 w-4" />
            </div>
            <Button variant="outline">Kaydet</Button>
          </CardContent>
        </Card>

        {/* Görünüm Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Görünüm
            </CardTitle>
            <CardDescription>
              Arayüz görünümünü özelleştirin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <select className="w-full h-10 px-3 border rounded-md bg-background">
                <option value="light">Açık</option>
                <option value="dark">Koyu</option>
                <option value="system">Sistem</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dil</label>
              <select className="w-full h-10 px-3 border rounded-md bg-background">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarih Formatı</label>
              <select className="w-full h-10 px-3 border rounded-md bg-background">
                <option value="dd.mm.yyyy">GG.AA.YYYY</option>
                <option value="yyyy-mm-dd">YYYY-AA-GG</option>
                <option value="mm/dd/yyyy">AA/GG/YYYY</option>
              </select>
            </div>
            <Button variant="outline">Kaydet</Button>
          </CardContent>
        </Card>

        {/* Güvenlik Ayarları - Sadece Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Güvenlik
              </CardTitle>
              <CardDescription>
                Güvenlik ayarlarını yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">İki Faktörlü Doğrulama</p>
                  <p className="text-sm text-muted-foreground">Ekstra güvenlik katmanı ekleyin</p>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Oturum Zaman Aşımı</p>
                  <p className="text-sm text-muted-foreground">İnaktif oturumları otomatik kapat</p>
                </div>
                <select className="h-10 px-3 border rounded-md bg-background">
                  <option value="30">30 dakika</option>
                  <option value="60">1 saat</option>
                  <option value="120">2 saat</option>
                  <option value="480">8 saat</option>
                </select>
              </div>
              <Button variant="outline">Kaydet</Button>
            </CardContent>
          </Card>
        )}

        {/* Sistem Bilgisi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sistem Bilgisi
            </CardTitle>
            <CardDescription>
              Uygulama ve sistem bilgileri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Versiyon</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Ortam</span>
              <span className="font-medium">Production</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Son Güncelleme</span>
              <span className="font-medium">26.01.2026</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">API Durumu</span>
              <span className="font-medium text-green-600">Çalışıyor</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
