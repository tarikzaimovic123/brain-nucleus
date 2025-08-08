'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, BarChart3, AlertCircle, Download, Upload, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ViewProductBlade } from '@/components/products/view-product-blade'
import { EditProductBlade } from '@/components/products/edit-product-blade'
import { DataGrid, type DataGridColumn } from '@/components/shared/data-grid'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/products'
import { format } from 'date-fns'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, hasPermission, loading: permissionsLoading } = usePermissionContext()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories!category_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data as any)
    }
    setLoading(false)
  }

  const handleEdit = withPermissionCheck('products', 'update', (product: Product) => {
    openBlade(EditProductBlade, {
      product: product,
      onClose: () => {},
      onSuccess: () => {
        fetchProducts()
      }
    }, { width: 'lg' })
  }, 'ažuriranje artikla')

  const handleDelete = withPermissionCheck('products', 'delete', async (product: Product) => {
    if (!confirm(`Da li ste sigurni da želite obrisati artikal "${product.name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (!error) {
      fetchProducts()
    }
  }, 'brisanje artikla')

  const handleView = (product: Product) => {
    openBlade(ViewProductBlade, {
      product: product,
      onClose: () => {},
      onEdit: () => {
        openBlade(EditProductBlade, {
          product: product,
          onClose: () => {},
          onSuccess: () => {
            fetchProducts()
          }
        }, { width: 'lg' })
      },
      onDelete: async () => {
        await handleDelete(product)
      }
    }, { width: 'lg' })
  }

  // Calculate statistics
  const activeProducts = products.filter(p => p.is_active)
  const services = products.filter(p => p.is_service)
  const lowStock = products.filter(p => !p.is_service && p.stock_quantity <= p.minimum_stock)
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.selling_price || 0)), 0)

  const columns: DataGridColumn<Product>[] = [
    {
      key: 'code',
      header: 'Šifra',
      sortable: true,
      accessor: (product) => (
        <div className="font-mono text-sm font-medium">{product.code}</div>
      ),
    },
    {
      key: 'name',
      header: 'Naziv artikla',
      sortable: true,
      accessor: (product) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{product.name}</div>
            {product.category && (
              <div className="text-xs text-muted-foreground">{product.category.name}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tip',
      sortable: true,
      align: 'center',
      accessor: (product) => (
        <Badge variant={product.is_service ? "secondary" : "outline"}>
          {product.is_service ? 'Usluga' : 'Proizvod'}
        </Badge>
      ),
    },
    {
      key: 'unit_of_measure',
      header: 'JM',
      sortable: true,
      align: 'center',
      accessor: (product) => (
        <span className="text-sm">{product.unit_of_measure}</span>
      ),
    },
    {
      key: 'stock_quantity',
      header: 'Stanje',
      sortable: true,
      align: 'right',
      accessor: (product) => {
        if (product.is_service) {
          return <span className="text-sm text-muted-foreground">-</span>
        }
        const isLowStock = product.stock_quantity <= product.minimum_stock
        return (
          <div className="flex items-center justify-end gap-2">
            {isLowStock && (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
            <span className={isLowStock ? 'text-orange-600 font-medium' : 'text-sm'}>
              {product.stock_quantity.toFixed(2)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'purchase_price',
      header: 'Nabavna cijena',
      sortable: true,
      align: 'right',
      accessor: (product) => (
        <span className="text-sm">
          {product.purchase_price ? `€${product.purchase_price.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'selling_price',
      header: 'Prodajna cijena',
      sortable: true,
      align: 'right',
      accessor: (product) => (
        <span className="font-medium">
          {product.selling_price ? `€${product.selling_price.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: 'vat_rate',
      header: 'PDV',
      sortable: true,
      align: 'center',
      accessor: (product) => (
        <Badge variant="outline" className="font-mono">
          {product.vat_rate}%
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      align: 'center',
      accessor: (product) => (
        <Badge 
          variant={product.is_active ? "default" : "secondary"}
          className={product.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
        >
          {product.is_active ? 'Aktivan' : 'Neaktivan'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Datum kreiranja',
      sortable: true,
      accessor: (product) => (
        <span className="text-sm text-muted-foreground">
          {product.created_at ? format(new Date(product.created_at), 'dd.MM.yyyy') : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Artikli</h1>
          <p className="text-sm text-muted-foreground">
            Upravljanje artiklima, proizvodima i uslugama
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Uvezi
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Izvezi
          </Button>
          <PermissionGuard resource="products" action="create">
            <Button 
              onClick={() => {
                openBlade(EditProductBlade, {
                  product: null,
                  onClose: () => {},
                  onSuccess: () => {
                    fetchProducts()
                  }
                }, { width: 'lg' })
              }}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novi artikal
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ukupno artikala</p>
              <p className="text-2xl font-semibold">{products.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeProducts.length} aktivnih
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Proizvodi / Usluge</p>
              <p className="text-2xl font-semibold">
                {products.length - services.length} / {services.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {products.length > 0 ? ((services.length / products.length) * 100).toFixed(0) : 0}% usluga
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Niska zaliha</p>
              <p className="text-2xl font-semibold">{lowStock.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                artikala ispod minimuma
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vrijednost zalihe</p>
              <p className="text-2xl font-semibold">
                €{totalValue.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                prodajna vrijednost
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Grid */}
      <Card className="p-0">
        <DataGrid
          data={products}
          columns={columns}
          onEdit={hasPermission('products', 'update') ? handleEdit : undefined}
          onDelete={hasPermission('products', 'delete') ? handleDelete : undefined}
          onView={handleView}
          selectable={true}
          searchable={true}
          pageSize={25}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={loading}
          emptyMessage="Nema pronađenih artikala"
        />
      </Card>
    </div>
  )
}