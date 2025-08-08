'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { productSchema, type ProductFormData } from '@/validators/product'
import type { Product, ProductCategory } from '@/types/database'

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  categories: ProductCategory[]
  onSuccess: () => void
}

export function ProductDialog({ open, onOpenChange, product, categories, onSuccess }: ProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<ProductFormData>({
    category_id: product?.category_id || undefined,
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    unit_of_measure: product?.unit_of_measure || 'kom',
    purchase_price: product?.purchase_price || undefined,
    selling_price: product?.selling_price || undefined,
    vat_rate: product?.vat_rate || 21,
    stock_quantity: product?.stock_quantity || 0,
    minimum_stock: product?.minimum_stock || 0,
    is_service: product?.is_service || false,
    is_active: product?.is_active ?? true,
    paper_type: product?.paper_type || '',
    paper_weight: product?.paper_weight || undefined,
    paper_format: product?.paper_format || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = productSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0].toString()] = error.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (product) {
      const { error } = await supabase
        .from('products')
        .update(validation.data)
        .eq('id', product.id)

      if (!error) {
        onSuccess()
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([validation.data])

      if (!error) {
        onSuccess()
      }
    }

    setLoading(false)
  }

  const units = [
    { value: 'kom', label: 'Komad' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'm', label: 'Metar' },
    { value: 'm2', label: 'Kvadratni metar' },
    { value: 'm3', label: 'Kubni metar' },
    { value: 'l', label: 'Litar' },
    { value: 'h', label: 'Sat' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{product ? 'Izmeni proizvod' : 'Novi proizvod'}</DialogTitle>
            <DialogDescription>
              {product ? 'Izmeni podatke o proizvodu' : 'Unesi podatke o novom proizvodu'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Šifra proizvoda *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
              </div>

              <div>
                <Label htmlFor="category">Kategorija</Label>
                <Select 
                  value={formData.category_id || ''} 
                  onValueChange={(value) => setFormData({ ...formData, category_id: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberi kategoriju" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Naziv proizvoda *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="unit">Jedinica mere</Label>
                <Select 
                  value={formData.unit_of_measure} 
                  onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="purchase_price">Nabavna cena (€)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || undefined })}
                />
              </div>

              <div>
                <Label htmlFor="selling_price">Prodajna cena (€)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price || ''}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="vat_rate">PDV stopa (%)</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  step="0.01"
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 21 })}
                />
              </div>

              {!formData.is_service && (
                <>
                  <div>
                    <Label htmlFor="stock_quantity">Količina na lageru</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      step="0.01"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimum_stock">Minimalna zaliha</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      step="0.01"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Paper specific fields */}
            <div className="space-y-2">
              <Label>Specifikacije papira (opciono)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paper_type" className="text-sm">Tip papira</Label>
                  <Input
                    id="paper_type"
                    placeholder="npr. Offset, Kunstdruk"
                    value={formData.paper_type}
                    onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="paper_weight" className="text-sm">Gramatura (g/m²)</Label>
                  <Input
                    id="paper_weight"
                    type="number"
                    placeholder="npr. 80, 120"
                    value={formData.paper_weight || ''}
                    onChange={(e) => setFormData({ ...formData, paper_weight: parseInt(e.target.value) || undefined })}
                  />
                </div>

                <div>
                  <Label htmlFor="paper_format" className="text-sm">Format</Label>
                  <Input
                    id="paper_format"
                    placeholder="npr. A4, B2"
                    value={formData.paper_format}
                    onChange={(e) => setFormData({ ...formData, paper_format: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_service"
                  checked={formData.is_service}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_service: checked })}
                />
                <Label htmlFor="is_service">Usluga</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktivan</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Otkaži
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Čuvanje...' : product ? 'Izmeni' : 'Sačuvaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}