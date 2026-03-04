'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { productsApi, categoriesApi } from '@/lib/api'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    categoryId: '',
    unit: 'ADET',
    packSize: 1,
    basePrice: 0,
    costPrice: 0,
    taxRate: 8,
    minStock: 0,
    maxStock: 0,
    image: '',
    status: 'ACTIVE',
    isFeatured: false,
    initialStock: 0,
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getAll()
        setCategories(res.data.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Kategoriler yüklenirken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [])

  const generateSKU = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase() || 'PRD'
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.categoryId) {
      toast.error('Lütfen bir kategori seçin')
      return
    }

    setSaving(true)

    try {
      const sku = formData.sku || generateSKU()
      
      await productsApi.create({
        ...formData,
        sku,
        basePrice: Number(formData.basePrice),
        costPrice: Number(formData.costPrice) || null,
        taxRate: Number(formData.taxRate),
        packSize: Number(formData.packSize),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock) || null,
        image: formData.image || null,
        barcode: formData.barcode || null,
        description: formData.description || null,
        initialStock: Number(formData.initialStock) || 0,
      })
      
      toast.success('Ürün başarıyla oluşturuldu')
      router.push('/products')
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast.error(error.response?.data?.message || 'Ürün oluşturulurken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Yeni Ürün</h1>
          <p className="text-muted-foreground">Yeni bir ürün ekleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Temel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Temel Bilgiler</CardTitle>
              <CardDescription>Ürün adı, açıklaması ve kategorisi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Ürün Adı *</label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ürün adını girin"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Açıklama</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ürün açıklaması"
                  rows={3}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md bg-background text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="categoryId" className="text-sm font-medium">Kategori *</label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sku" className="text-sm font-medium">SKU</label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Otomatik oluşturulur"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="barcode" className="text-sm font-medium">Barkod</label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Barkod numarası"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Görsel */}
          <Card>
            <CardHeader>
              <CardTitle>Ürün Görseli</CardTitle>
              <CardDescription>Ürün görselini yükleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ürün Görseli</label>
                <ImageUpload
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  onRemove={() => setFormData({ ...formData, image: '' })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="image" className="text-sm font-medium">veya URL Girin</label>
                <Input
                  id="image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Öne Çıkan Ürün</label>
                  <p className="text-xs text-muted-foreground">Ana sayfada gösterilsin mi?</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">Durum</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="INACTIVE">Pasif</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Stokta Yok</SelectItem>
                    <SelectItem value="DISCONTINUED">Üretimden Kalktı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fiyat ve Birim */}
          <Card>
            <CardHeader>
              <CardTitle>Fiyat ve Birim</CardTitle>
              <CardDescription>Satış fiyatı ve birim bilgileri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="basePrice" className="text-sm font-medium">Satış Fiyatı (₺) *</label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="costPrice" className="text-sm font-medium">Maliyet Fiyatı (₺)</label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="taxRate" className="text-sm font-medium">KDV Oranı (%)</label>
                  <Select
                    value={formData.taxRate.toString()}
                    onValueChange={(value) => setFormData({ ...formData, taxRate: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="8">%8</SelectItem>
                      <SelectItem value="18">%18</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit" className="text-sm font-medium">Birim</label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADET">Adet</SelectItem>
                      <SelectItem value="KG">Kilogram</SelectItem>
                      <SelectItem value="PORSIYON">Porsiyon</SelectItem>
                      <SelectItem value="BARDAK">Bardak</SelectItem>
                      <SelectItem value="FİNCAN">Fincan</SelectItem>
                      <SelectItem value="DİLİM">Dilim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="packSize" className="text-sm font-medium">Paket Adedi</label>
                <Input
                  id="packSize"
                  type="number"
                  min="1"
                  value={formData.packSize}
                  onChange={(e) => setFormData({ ...formData, packSize: parseInt(e.target.value) || 1 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stok */}
          <Card>
            <CardHeader>
              <CardTitle>Stok Bilgileri</CardTitle>
              <CardDescription>Başlangıç stoğu ve stok seviyeleri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="initialStock" className="text-sm font-medium">Başlangıç Stok Miktarı *</label>
                <Input
                  id="initialStock"
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })}
                  placeholder="Mevcut stok miktarı"
                />
                <p className="text-xs text-muted-foreground">Bu miktar varsayılan depoya eklenecektir</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="minStock" className="text-sm font-medium">Minimum Stok Uyarısı</label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Stok bu seviyenin altına düşünce uyarı verilir</p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="maxStock" className="text-sm font-medium">Maksimum Stok</label>
                  <Input
                    id="maxStock"
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/products">
            <Button type="button" variant="outline">
              İptal
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Ürünü Oluştur
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
