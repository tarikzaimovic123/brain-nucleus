'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { companySchema, type CompanyFormData } from '@/validators/company'
import type { Company } from '@/types/database'

interface CompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  onSuccess: () => void
}

export function CompanyDialog({ open, onOpenChange, company, onSuccess }: CompanyDialogProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || '',
    tax_number: company?.tax_number || '',
    vat_number: company?.vat_number || '',
    address: company?.address || '',
    city: company?.city || '',
    postal_code: company?.postal_code || '',
    country: company?.country || 'Montenegro',
    phone: company?.phone || '',
    email: company?.email || '',
    website: company?.website || '',
    bank_account: company?.bank_account || '',
    is_active: company?.is_active ?? true,
    credit_limit: company?.credit_limit || 0,
    payment_terms: company?.payment_terms || 30,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const validation = companySchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.issues.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0].toString()] = error.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (company) {
      const { error } = await supabase
        .from('companies')
        .update(validation.data)
        .eq('id', company.id)

      if (!error) {
        onSuccess()
      }
    } else {
      const { error } = await supabase
        .from('companies')
        .insert([validation.data])

      if (!error) {
        onSuccess()
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{company ? 'Izmeni kompaniju' : 'Nova kompanija'}</DialogTitle>
            <DialogDescription>
              {company ? 'Izmeni podatke o kompaniji' : 'Unesi podatke o novoj kompaniji'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Naziv kompanije *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="tax_number">PIB</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vat_number">PDV broj</Label>
                <Input
                  id="vat_number"
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bank_account">Žiro račun</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Adresa</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Grad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="postal_code">Poštanski broj</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="country">Država</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="website">Web sajt</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && <p className="text-sm text-red-500 mt-1">{errors.website}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="credit_limit">Kreditni limit (€)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Rok plaćanja (dana)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktivna</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Otkaži
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Čuvanje...' : company ? 'Izmeni' : 'Sačuvaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}