'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { categoriesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  isActive: boolean
  sortOrder: number
  _count?: {
    products: number
    children: number
  }
  children?: Category[]
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: () => categoriesApi.getTree(),
  })

  const { data: allCategories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => {
      toast.success('Kategori oluşturuldu')
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['categories-all'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Hata oluştu')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      toast.success('Kategori güncellendi')
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['categories-all'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Hata oluştu')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Kategori silindi')
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
      queryClient.invalidateQueries({ queryKey: ['categories-all'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kategori silinemedi')
    },
  })

  const categories: Category[] = data?.data?.data || []

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const openCreateModal = (parentId?: string) => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      parentId: parentId || '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', description: '', parentId: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: formData,
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (category: Category) => {
    if (category._count?.products && category._count.products > 0) {
      toast.error('Ürünü olan kategori silinemez')
      return
    }
    if (category._count?.children && category._count.children > 0) {
      toast.error('Alt kategorisi olan kategori silinemez')
      return
    }
    if (confirm(`"${category.name}" kategorisini silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(category.id)
    }
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedIds.has(category.id)
    const hasChildren = category.children && category.children.length > 0

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 py-3 px-4 hover:bg-gray-50 border-b ${
            level > 0 ? 'bg-gray-50/50' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {isExpanded ? (
            <FolderOpen className="h-5 w-5 text-yellow-500" />
          ) : (
            <Folder className="h-5 w-5 text-yellow-500" />
          )}

          <div className="flex-1">
            <span className="font-medium">{category.name}</span>
            {category.description && (
              <span className="text-sm text-muted-foreground ml-2">
                - {category.description}
              </span>
            )}
          </div>

          <Badge variant={category.isActive ? 'success' : 'secondary'}>
            {category.isActive ? 'Aktif' : 'Pasif'}
          </Badge>

          <span className="text-sm text-muted-foreground min-w-[80px] text-right">
            {category._count?.products || 0} ürün
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openCreateModal(category.id)}
              title="Alt kategori ekle"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(category)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(category)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredCategories = search
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(search.toLowerCase())
      )
    : categories

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kategoriler</h1>
          <p className="text-muted-foreground">
            Ürün kategorilerini yönetin
          </p>
        </div>
        <Button onClick={() => openCreateModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kategori
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kategori ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Kategori Listesi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {search ? 'Kategori bulunamadı' : 'Henüz kategori eklenmemiş'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredCategories.map((category) => renderCategory(category))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori Adı *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Kategori adı"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Açıklama</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kategori açıklaması"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Üst Kategori</label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                >
                  <option value="">Ana Kategori</option>
                  {allCategories?.data?.data?.map((cat: Category) => (
                    <option key={cat.id} value={cat.id} disabled={cat.id === editingCategory?.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCategory ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
