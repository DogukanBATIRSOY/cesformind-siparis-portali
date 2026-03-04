'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { productsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react'

const statusColors: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  OUT_OF_STOCK: 'destructive',
  DISCONTINUED: 'outline',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  OUT_OF_STOCK: 'Stokta Yok',
  DISCONTINUED: 'Satışta Değil',
}

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryId, status],
    queryFn: () =>
      productsApi.getAll({
        page,
        limit: 20,
        search: search || undefined,
        categoryId: categoryId || undefined,
        status: status || undefined,
      }),
  })

  const products = data?.data?.data || []
  const meta = data?.data?.meta

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((p: any) => p.id))
    }
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return
    
    if (!confirm(`${selectedProducts.length} ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    setIsDeleting(true)
    let successCount = 0
    let errorCount = 0

    for (const productId of selectedProducts) {
      try {
        await productsApi.delete(productId)
        successCount++
      } catch (error) {
        errorCount++
      }
    }

    setIsDeleting(false)
    setSelectedProducts([])
    queryClient.invalidateQueries({ queryKey: ['products'] })

    if (successCount > 0) {
      toast.success(`${successCount} ürün başarıyla silindi`)
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ürün silinemedi`)
    }
  }

  const isAllSelected = products.length > 0 && selectedProducts.length === products.length
  const isSomeSelected = selectedProducts.length > 0 && selectedProducts.length < products.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <p className="text-muted-foreground">
            Ürün kataloğunu görüntüleyin ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedProducts.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Siliniyor...' : `${selectedProducts.length} Ürün Sil`}
            </Button>
          )}
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ürün
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı, SKU veya barkod ara..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 border rounded-md bg-background"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 w-12">
                    <button onClick={handleSelectAll} className="flex items-center justify-center">
                      {isAllSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium">Ürün</th>
                  <th className="text-left p-4 font-medium">SKU</th>
                  <th className="text-left p-4 font-medium">Kategori</th>
                  <th className="text-left p-4 font-medium">Fiyat</th>
                  <th className="text-left p-4 font-medium">Stok</th>
                  <th className="text-left p-4 font-medium">Durum</th>
                  <th className="text-left p-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Ürün bulunamadı
                    </td>
                  </tr>
                ) : (
                  products.map((product: any) => (
                    <tr 
                      key={product.id} 
                      className={`border-b hover:bg-muted/50 ${selectedProducts.includes(product.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-4">
                        <button 
                          onClick={() => handleSelectProduct(product.id)}
                          className="flex items-center justify-center"
                        >
                          {selectedProducts.includes(product.id) ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : product.images?.[0] ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.barcode && (
                              <p className="text-sm text-muted-foreground">
                                {product.barcode}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm">{product.sku}</td>
                      <td className="p-4">{product.category?.name}</td>
                      <td className="p-4 font-medium">
                        {formatCurrency(product.basePrice)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              product.totalStock <= product.minStock
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            {product.totalStock}
                          </span>
                          {product.totalStock <= product.minStock && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusColors[product.status] as any}>
                          {statusLabels[product.status]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/products/${product.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Toplam {meta.total} ürün
                {selectedProducts.length > 0 && ` (${selectedProducts.length} seçili)`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Sayfa {page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
