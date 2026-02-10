'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  SlidersHorizontal,
  Plus,
  Save,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Tag,
  DollarSign,
  Filter,
  ArrowUpDown
} from 'lucide-react'

interface FilterOption {
  id: string
  name: string
  type: 'category' | 'price' | 'sort' | 'checkbox'
  enabled: boolean
  order: number
  config?: any
}

interface PriceRangeConfig {
  min: number
  max: number
  step: number
}

interface SortOption {
  id: string
  label: string
  enabled: boolean
}

const defaultFilters: FilterOption[] = [
  { id: 'categories', name: 'Kategoriler', type: 'category', enabled: true, order: 1 },
  { id: 'price_range', name: 'Fiyat Aralığı', type: 'price', enabled: true, order: 2, config: { min: 0, max: 1000, step: 10 } },
  { id: 'sort', name: 'Sıralama', type: 'sort', enabled: true, order: 3 },
  { id: 'in_stock', name: 'Stokta Olanlar', type: 'checkbox', enabled: true, order: 4 },
  { id: 'featured', name: 'Öne Çıkanlar', type: 'checkbox', enabled: true, order: 5 },
]

const defaultSortOptions: SortOption[] = [
  { id: 'default', label: 'Varsayılan', enabled: true },
  { id: 'price_asc', label: 'Fiyat (Düşükten Yükseğe)', enabled: true },
  { id: 'price_desc', label: 'Fiyat (Yüksekten Düşüğe)', enabled: true },
  { id: 'name_asc', label: 'İsim (A-Z)', enabled: true },
  { id: 'name_desc', label: 'İsim (Z-A)', enabled: true },
  { id: 'newest', label: 'En Yeniler', enabled: false },
  { id: 'popular', label: 'En Popülerler', enabled: false },
]

export default function FiltersPage() {
  const [filters, setFilters] = useState<FilterOption[]>(defaultFilters)
  const [sortOptions, setSortOptions] = useState<SortOption[]>(defaultSortOptions)
  const [priceConfig, setPriceConfig] = useState<PriceRangeConfig>({ min: 0, max: 1000, step: 10 })
  const [isSaving, setIsSaving] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem('cms_filter_settings')
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters)
      if (parsed.filters) setFilters(parsed.filters)
      if (parsed.sortOptions) setSortOptions(parsed.sortOptions)
      if (parsed.priceConfig) setPriceConfig(parsed.priceConfig)
    }
  }, [])

  const handleToggleFilter = (filterId: string) => {
    setFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, enabled: !f.enabled } : f
    ))
  }

  const handleToggleSortOption = (optionId: string) => {
    setSortOptions(prev => prev.map(o => 
      o.id === optionId ? { ...o, enabled: !o.enabled } : o
    ))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save to localStorage (in production, this would be an API call)
      const settings = { filters, sortOptions, priceConfig }
      localStorage.setItem('cms_filter_settings', JSON.stringify(settings))
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success('Filtre ayarları kaydedildi')
    } catch (error) {
      toast.error('Kaydetme başarısız')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveFilter = (filterId: string, direction: 'up' | 'down') => {
    const index = filters.findIndex(f => f.id === filterId)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === filters.length - 1)
    ) return

    const newFilters = [...filters]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFilters[index], newFilters[swapIndex]] = [newFilters[swapIndex], newFilters[index]]
    
    // Update order numbers
    newFilters.forEach((f, i) => f.order = i + 1)
    setFilters(newFilters)
  }

  const getFilterIcon = (type: string) => {
    switch (type) {
      case 'category': return <Tag className="h-4 w-4" />
      case 'price': return <DollarSign className="h-4 w-4" />
      case 'sort': return <ArrowUpDown className="h-4 w-4" />
      case 'checkbox': return <Filter className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Filtre Ayarları</h1>
          <p className="text-muted-foreground">
            Landing page filtreleme seçeneklerini yönetin
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Filtre Listesi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filtre Seçenekleri
            </CardTitle>
            <CardDescription>
              Görüntülenecek filtreleri ve sıralarını belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filters.sort((a, b) => a.order - b.order).map((filter, index) => (
                <div
                  key={filter.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    filter.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveFilter(filter.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                    <button
                      onClick={() => handleMoveFilter(filter.id, 'down')}
                      disabled={index === filters.length - 1}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                  </div>
                  
                  <div className={`p-2 rounded-lg ${filter.enabled ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                    {getFilterIcon(filter.type)}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-sm">{filter.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{filter.type}</p>
                  </div>
                  
                  <Badge variant={filter.enabled ? 'default' : 'secondary'} className="text-xs">
                    {filter.enabled ? 'Aktif' : 'Pasif'}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleFilter(filter.id)}
                  >
                    {filter.enabled ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sıralama Seçenekleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Sıralama Seçenekleri
            </CardTitle>
            <CardDescription>
              Kullanıcılara sunulacak sıralama seçeneklerini belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    option.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${option.enabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={option.enabled ? 'default' : 'secondary'} className="text-xs">
                      {option.enabled ? 'Aktif' : 'Pasif'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleSortOption(option.id)}
                    >
                      {option.enabled ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fiyat Aralığı Ayarları */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Fiyat Aralığı Ayarları
            </CardTitle>
            <CardDescription>
              Fiyat filtresinin varsayılan değerlerini belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum</label>
                <Input
                  type="number"
                  value={priceConfig.min}
                  onChange={(e) => setPriceConfig({ ...priceConfig, min: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maksimum</label>
                <Input
                  type="number"
                  value={priceConfig.max}
                  onChange={(e) => setPriceConfig({ ...priceConfig, max: parseInt(e.target.value) || 1000 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Adım</label>
                <Input
                  type="number"
                  value={priceConfig.step}
                  onChange={(e) => setPriceConfig({ ...priceConfig, step: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Bu değerler kullanıcının fiyat filtresinde göreceği varsayılan aralığı belirler.
            </p>
          </CardContent>
        </Card>

        {/* Önizleme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Önizleme
            </CardTitle>
            <CardDescription>
              Filtrelerin nasıl görüneceğini inceleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Filtreler</span>
              </div>
              
              <div className="space-y-4">
                {filters.filter(f => f.enabled).sort((a, b) => a.order - b.order).map((filter) => (
                  <div key={filter.id} className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">{filter.name}</p>
                    {filter.type === 'category' && (
                      <div className="space-y-1">
                        <div className="px-2 py-1 bg-primary text-white rounded text-xs">Tüm Kategoriler</div>
                        <div className="px-2 py-1 hover:bg-gray-200 rounded text-xs text-gray-600">Örnek Kategori</div>
                      </div>
                    )}
                    {filter.type === 'price' && (
                      <div className="flex gap-2">
                        <div className="flex-1 h-7 border rounded px-2 text-xs flex items-center text-gray-400">Min</div>
                        <div className="flex-1 h-7 border rounded px-2 text-xs flex items-center text-gray-400">Max</div>
                      </div>
                    )}
                    {filter.type === 'sort' && (
                      <div className="h-7 border rounded px-2 text-xs flex items-center text-gray-400">
                        Sıralama Seç...
                      </div>
                    )}
                    {filter.type === 'checkbox' && (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-3 h-3 rounded" disabled />
                        <span className="text-xs text-gray-600">{filter.name}</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
