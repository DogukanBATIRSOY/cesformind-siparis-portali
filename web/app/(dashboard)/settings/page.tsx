'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/providers'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Settings as SettingsIcon, 
  Building2, 
  Bell, 
  Palette,
  Globe,
  Shield,
  Database,
  Save,
  RefreshCw,
  Users,
  Truck,
  CreditCard,
  Printer,
  Mail,
  MessageSquare,
  Key,
  Clock,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'

// Ayar tipleri
interface CompanySettings {
  name: string
  phone: string
  email: string
  address: string
  taxNumber: string
  taxOffice: string
}

interface NotificationSettings {
  newOrder: boolean
  deliveryUpdate: boolean
  lowStock: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'tr' | 'en'
  dateFormat: string
  currency: string
  itemsPerPage: number
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  passwordExpireDays: number
  loginAttemptLimit: number
}

interface OrderSettings {
  minOrderAmount: number
  defaultPaymentTerm: number
  autoConfirmOrders: boolean
  requireApproval: boolean
  sendOrderConfirmation: boolean
}

interface DeliverySettings {
  defaultDeliveryTime: string
  maxDeliveriesPerDriver: number
  autoAssignDriver: boolean
  sendDeliveryNotification: boolean
}

interface EmailSettings {
  enabled: boolean
  requireVerification: boolean
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  fromName: string
  fromEmail: string
}

interface SmsSettings {
  enabled: boolean
  provider: 'netgsm' | 'iletimerkezi' | 'mutlucell' | 'other'
  apiKey: string
  apiSecret: string
  sender: string
}

const defaultCompanySettings: CompanySettings = {
  name: 'Cesorder Sipariş Sistemi',
  phone: '0212 123 45 67',
  email: 'info@cesorder.com',
  address: 'İstanbul, Türkiye',
  taxNumber: '1234567890',
  taxOffice: 'Kadıköy',
}

const defaultNotificationSettings: NotificationSettings = {
  newOrder: true,
  deliveryUpdate: true,
  lowStock: true,
  emailNotifications: false,
  smsNotifications: false,
  pushNotifications: true,
}

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'light',
  language: 'tr',
  dateFormat: 'dd.MM.yyyy',
  currency: 'TRY',
  itemsPerPage: 25,
}

const defaultSecuritySettings: SecuritySettings = {
  twoFactorAuth: false,
  sessionTimeout: 60,
  passwordExpireDays: 90,
  loginAttemptLimit: 5,
}

const defaultEmailSettings: EmailSettings = {
  enabled: false,
  requireVerification: false,
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  fromName: 'Cesorder',
  fromEmail: '',
}

const defaultSmsSettings: SmsSettings = {
  enabled: false,
  provider: 'netgsm',
  apiKey: '',
  apiSecret: '',
  sender: '',
}

const defaultOrderSettings: OrderSettings = {
  minOrderAmount: 100,
  defaultPaymentTerm: 30,
  autoConfirmOrders: false,
  requireApproval: true,
  sendOrderConfirmation: true,
}

const defaultDeliverySettings: DeliverySettings = {
  defaultDeliveryTime: '09:00-18:00',
  maxDeliveriesPerDriver: 20,
  autoAssignDriver: false,
  sendDeliveryNotification: true,
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isAdmin = user?.role === 'ADMIN'
  const [activeTab, setActiveTab] = useState('company')
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  // State for all settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings)
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings)
  const [orderSettings, setOrderSettings] = useState<OrderSettings>(defaultOrderSettings)
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings)
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings)
  const [smsSettings, setSmsSettings] = useState<SmsSettings>(defaultSmsSettings)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      const savedCompany = localStorage.getItem('settings_company')
      const savedNotification = localStorage.getItem('settings_notification')
      const savedAppearance = localStorage.getItem('settings_appearance')
      const savedSecurity = localStorage.getItem('settings_security')
      const savedOrder = localStorage.getItem('settings_order')
      const savedDelivery = localStorage.getItem('settings_delivery')
      const savedEmail = localStorage.getItem('settings_email')
      const savedSms = localStorage.getItem('settings_sms')

      if (savedCompany) setCompanySettings(JSON.parse(savedCompany))
      if (savedNotification) setNotificationSettings(JSON.parse(savedNotification))
      if (savedAppearance) {
        const parsed = JSON.parse(savedAppearance)
        setAppearanceSettings(parsed)
      }
      if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity))
      if (savedOrder) setOrderSettings(JSON.parse(savedOrder))
      if (savedDelivery) setDeliverySettings(JSON.parse(savedDelivery))
      if (savedEmail) setEmailSettings(JSON.parse(savedEmail))
      if (savedSms) setSmsSettings(JSON.parse(savedSms))
    }
    loadSettings()
  }, [])

  const saveSettings = async (type: string, data: any) => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      localStorage.setItem(`settings_${type}`, JSON.stringify(data))
      toast.success('Ayarlar başarıyla kaydedildi')
    } catch (error) {
      toast.error('Ayarlar kaydedilemedi')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'company', label: 'Şirket', icon: Building2, adminOnly: true },
    { id: 'notifications', label: 'Bildirimler', icon: Bell, adminOnly: false },
    { id: 'appearance', label: 'Görünüm', icon: Palette, adminOnly: false },
    { id: 'security', label: 'Güvenlik', icon: Shield, adminOnly: true },
    { id: 'email', label: 'Email Ayarları', icon: Mail, adminOnly: true },
    { id: 'sms', label: 'SMS Ayarları', icon: MessageSquare, adminOnly: true },
    { id: 'orders', label: 'Siparişler', icon: CreditCard, adminOnly: true },
    { id: 'delivery', label: 'Teslimat', icon: Truck, adminOnly: true },
    { id: 'system', label: 'Sistem', icon: Database, adminOnly: false },
  ]

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || isAdmin)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground">
          Sistem ve uygulama ayarlarını yönetin
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Company Settings */}
          {activeTab === 'company' && isAdmin && (
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şirket Adı</label>
                    <Input
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon</label>
                    <Input
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adres</label>
                    <Input
                      value={companySettings.address}
                      onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vergi Numarası</label>
                    <Input
                      value={companySettings.taxNumber}
                      onChange={(e) => setCompanySettings({ ...companySettings, taxNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vergi Dairesi</label>
                    <Input
                      value={companySettings.taxOffice}
                      onChange={(e) => setCompanySettings({ ...companySettings, taxOffice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('company', companySettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
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
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Olay Bildirimleri</h3>
                  <ToggleSetting
                    label="Yeni Sipariş"
                    description="Yeni sipariş geldiğinde bildirim al"
                    checked={notificationSettings.newOrder}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, newOrder: checked })}
                  />
                  <ToggleSetting
                    label="Teslimat Güncellemeleri"
                    description="Teslimat durumu değiştiğinde bildirim al"
                    checked={notificationSettings.deliveryUpdate}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, deliveryUpdate: checked })}
                  />
                  <ToggleSetting
                    label="Düşük Stok Uyarısı"
                    description="Stok minimum seviyeye düştüğünde bildirim al"
                    checked={notificationSettings.lowStock}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, lowStock: checked })}
                  />
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground">Bildirim Kanalları</h3>
                  <ToggleSetting
                    label="Email Bildirimleri"
                    description="Önemli güncellemeleri email ile al"
                    icon={Mail}
                    checked={notificationSettings.emailNotifications}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                  <ToggleSetting
                    label="SMS Bildirimleri"
                    description="Kritik uyarıları SMS ile al"
                    icon={MessageSquare}
                    checked={notificationSettings.smsNotifications}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                  />
                  <ToggleSetting
                    label="Push Bildirimleri"
                    description="Tarayıcı push bildirimleri"
                    icon={Bell}
                    checked={notificationSettings.pushNotifications}
                    onChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('notification', notificationSettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Görünüm Ayarları
                </CardTitle>
                <CardDescription>
                  Arayüz görünümünü özelleştirin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Tema</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setTheme('light')
                        setAppearanceSettings({ ...appearanceSettings, theme: 'light' })
                        toast.success('Tema değiştirildi: Açık')
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        mounted && theme === 'light' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                        <Sun className="h-6 w-6 text-yellow-500" />
                      </div>
                      <span className="text-sm font-medium">Açık</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark')
                        setAppearanceSettings({ ...appearanceSettings, theme: 'dark' })
                        toast.success('Tema değiştirildi: Koyu')
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        mounted && theme === 'dark' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center">
                        <Moon className="h-6 w-6 text-blue-400" />
                      </div>
                      <span className="text-sm font-medium">Koyu</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system')
                        setAppearanceSettings({ ...appearanceSettings, theme: 'system' })
                        toast.success('Tema değiştirildi: Sistem')
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        mounted && theme === 'system' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-900 border-2 border-gray-400 flex items-center justify-center">
                        <Monitor className="h-6 w-6 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium">Sistem</span>
                    </button>
                  </div>
                  {mounted && theme === 'system' && (
                    <p className="text-sm text-muted-foreground">
                      Şu anda sistem teması: {resolvedTheme === 'dark' ? 'Koyu' : 'Açık'}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dil</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={appearanceSettings.language}
                      onChange={(e) => setAppearanceSettings({ ...appearanceSettings, language: e.target.value as any })}
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tarih Formatı</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={appearanceSettings.dateFormat}
                      onChange={(e) => setAppearanceSettings({ ...appearanceSettings, dateFormat: e.target.value })}
                    >
                      <option value="dd.MM.yyyy">GG.AA.YYYY</option>
                      <option value="yyyy-MM-dd">YYYY-AA-GG</option>
                      <option value="MM/dd/yyyy">AA/GG/YYYY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Para Birimi</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={appearanceSettings.currency}
                      onChange={(e) => setAppearanceSettings({ ...appearanceSettings, currency: e.target.value })}
                    >
                      <option value="TRY">Türk Lirası (₺)</option>
                      <option value="USD">Amerikan Doları ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sayfa Başına Kayıt</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={appearanceSettings.itemsPerPage}
                      onChange={(e) => setAppearanceSettings({ ...appearanceSettings, itemsPerPage: parseInt(e.target.value) })}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('appearance', appearanceSettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Güvenlik Ayarları
                </CardTitle>
                <CardDescription>
                  Güvenlik ve oturum ayarlarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ToggleSetting
                  label="İki Faktörlü Doğrulama"
                  description="Tüm kullanıcılar için 2FA zorunluluğu"
                  icon={Key}
                  checked={securitySettings.twoFactorAuth}
                  onChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })}
                />
                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Oturum Zaman Aşımı</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 dakika</option>
                      <option value={60}>1 saat</option>
                      <option value={120}>2 saat</option>
                      <option value={480}>8 saat</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şifre Geçerlilik Süresi</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={securitySettings.passwordExpireDays}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpireDays: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 gün</option>
                      <option value={60}>60 gün</option>
                      <option value={90}>90 gün</option>
                      <option value={180}>180 gün</option>
                      <option value={0}>Süresiz</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Maksimum Giriş Denemesi</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={securitySettings.loginAttemptLimit}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttemptLimit: parseInt(e.target.value) })}
                    >
                      <option value={3}>3 deneme</option>
                      <option value={5}>5 deneme</option>
                      <option value={10}>10 deneme</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('security', securitySettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Ayarları
                </CardTitle>
                <CardDescription>
                  SMTP ve email doğrulama ayarlarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ToggleSetting
                  label="Email Servisi Aktif"
                  description="Email gönderim servisini etkinleştir"
                  icon={Mail}
                  checked={emailSettings.enabled}
                  onChange={(checked) => setEmailSettings({ ...emailSettings, enabled: checked })}
                />
                <ToggleSetting
                  label="Email Doğrulama Zorunlu"
                  description="Bireysel üyeler için kayıt sırasında email doğrulama zorunlu olsun"
                  icon={Shield}
                  checked={emailSettings.requireVerification}
                  onChange={(checked) => setEmailSettings({ ...emailSettings, requireVerification: checked })}
                />
                
                {emailSettings.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">SMTP Sunucu Ayarları</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">SMTP Sunucu</label>
                        <Input
                          placeholder="smtp.gmail.com"
                          value={emailSettings.smtpHost}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Port</label>
                        <Input
                          placeholder="587"
                          value={emailSettings.smtpPort}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kullanıcı Adı</label>
                        <Input
                          placeholder="your@email.com"
                          value={emailSettings.smtpUser}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Şifre</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={emailSettings.smtpPassword}
                          onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Gönderen Adı</label>
                        <Input
                          placeholder="Cesorder"
                          value={emailSettings.fromName}
                          onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Gönderen Email</label>
                        <Input
                          placeholder="noreply@cesorder.com"
                          value={emailSettings.fromEmail}
                          onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('email', emailSettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SMS Settings */}
          {activeTab === 'sms' && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Ayarları
                </CardTitle>
                <CardDescription>
                  SMS gönderim servisi ayarlarını yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ToggleSetting
                  label="SMS Servisi Aktif"
                  description="SMS gönderim servisini etkinleştir"
                  icon={MessageSquare}
                  checked={smsSettings.enabled}
                  onChange={(checked) => setSmsSettings({ ...smsSettings, enabled: checked })}
                />
                
                {smsSettings.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMS Sağlayıcı</label>
                      <select
                        className="w-full h-10 px-3 border rounded-md bg-background"
                        value={smsSettings.provider}
                        onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value as any })}
                      >
                        <option value="netgsm">NetGSM</option>
                        <option value="iletimerkezi">İleti Merkezi</option>
                        <option value="mutlucell">Mutlucell</option>
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <Input
                          placeholder="API Key"
                          value={smsSettings.apiKey}
                          onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Secret</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={smsSettings.apiSecret}
                          onChange={(e) => setSmsSettings({ ...smsSettings, apiSecret: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Gönderen Başlığı</label>
                        <Input
                          placeholder="CESORDER"
                          value={smsSettings.sender}
                          onChange={(e) => setSmsSettings({ ...smsSettings, sender: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          SMS sağlayıcınızdan onaylı gönderici başlığınızı girin
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('sms', smsSettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Settings */}
          {activeTab === 'orders' && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Sipariş Ayarları
                </CardTitle>
                <CardDescription>
                  Sipariş işlemleri için varsayılan ayarlar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum Sipariş Tutarı (₺)</label>
                    <Input
                      type="number"
                      value={orderSettings.minOrderAmount}
                      onChange={(e) => setOrderSettings({ ...orderSettings, minOrderAmount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Varsayılan Vade (Gün)</label>
                    <Input
                      type="number"
                      value={orderSettings.defaultPaymentTerm}
                      onChange={(e) => setOrderSettings({ ...orderSettings, defaultPaymentTerm: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-4">
                  <ToggleSetting
                    label="Otomatik Sipariş Onayı"
                    description="Siparişleri otomatik olarak onayla"
                    checked={orderSettings.autoConfirmOrders}
                    onChange={(checked) => setOrderSettings({ ...orderSettings, autoConfirmOrders: checked })}
                  />
                  <ToggleSetting
                    label="Yönetici Onayı Gerekli"
                    description="Belirli tutarın üzerindeki siparişler için onay iste"
                    checked={orderSettings.requireApproval}
                    onChange={(checked) => setOrderSettings({ ...orderSettings, requireApproval: checked })}
                  />
                  <ToggleSetting
                    label="Sipariş Onay Bildirimi"
                    description="Sipariş onaylandığında müşteriye bildirim gönder"
                    checked={orderSettings.sendOrderConfirmation}
                    onChange={(checked) => setOrderSettings({ ...orderSettings, sendOrderConfirmation: checked })}
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('order', orderSettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Settings */}
          {activeTab === 'delivery' && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Teslimat Ayarları
                </CardTitle>
                <CardDescription>
                  Teslimat işlemleri için varsayılan ayarlar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Varsayılan Teslimat Saatleri</label>
                    <Input
                      value={deliverySettings.defaultDeliveryTime}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, defaultDeliveryTime: e.target.value })}
                      placeholder="09:00-18:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sürücü Başına Maks. Teslimat</label>
                    <Input
                      type="number"
                      value={deliverySettings.maxDeliveriesPerDriver}
                      onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDeliveriesPerDriver: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-4">
                  <ToggleSetting
                    label="Otomatik Sürücü Atama"
                    description="Teslimatları otomatik olarak en uygun sürücüye ata"
                    checked={deliverySettings.autoAssignDriver}
                    onChange={(checked) => setDeliverySettings({ ...deliverySettings, autoAssignDriver: checked })}
                  />
                  <ToggleSetting
                    label="Teslimat Bildirimi"
                    description="Teslimat durumu değiştiğinde müşteriye bildirim gönder"
                    checked={deliverySettings.sendDeliveryNotification}
                    onChange={(checked) => setDeliverySettings({ ...deliverySettings, sendDeliveryNotification: checked })}
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => saveSettings('delivery', deliverySettings)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Info */}
          {activeTab === 'system' && (
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
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <InfoRow label="Uygulama Adı" value="Cesorder Sipariş Sistemi" />
                  <InfoRow label="Versiyon" value="1.0.0" />
                  <InfoRow label="Ortam" value="Production" />
                  <InfoRow label="Son Güncelleme" value={new Date().toLocaleDateString('tr-TR')} />
                  <InfoRow 
                    label="API Durumu" 
                    value={<span className="text-green-600 font-medium">Çalışıyor</span>} 
                  />
                  <InfoRow label="Veritabanı" value="SQLite" />
                  <InfoRow label="Sunucu" value="Node.js / Express" />
                  <InfoRow label="Frontend" value="Next.js 14" />
                </div>
                {isAdmin && (
                  <div className="pt-4 flex gap-2">
                    <Button variant="outline" disabled>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Önbelleği Temizle
                    </Button>
                    <Button variant="outline" disabled>
                      <Database className="h-4 w-4 mr-2" />
                      Veritabanı Yedeği
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Toggle Setting Component
function ToggleSetting({ 
  label, 
  description, 
  checked, 
  onChange,
  icon: Icon 
}: { 
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: any
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-foreground after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  )
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
