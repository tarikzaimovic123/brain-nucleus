"use client"

import { useState, useEffect } from "react"
import { X, FileText, Save, Loader2, Calendar, Building, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Combobox } from "@/components/ui/combobox"

interface Invoice {
  id: string
  invoice_number: string
  fiscal_number?: string
  work_order_id?: string
  company_id: string
  invoice_date: string
  due_date?: string
  status: string
  payment_status: string
  payment_method?: string
  subtotal: number
  vat_amount: number
  total_amount: number
  paid_amount: number
  discount_percentage?: number
  discount_amount?: number
  notes?: string
  fiscal_verified: boolean
  created_at: string
}

interface Company {
  id: string
  name: string
  tax_number?: string
  address?: string
  city?: string
  email?: string
  phone?: string
}

interface EditInvoiceBladeProps {
  invoice: Invoice | null
  onClose: () => void
  onSuccess: () => void
}

export function EditInvoiceBlade({ invoice, onClose, onSuccess }: EditInvoiceBladeProps) {
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const { toast } = useToast()
  
  const isEditMode = !!invoice

  // Form state
  const [formData, setFormData] = useState({
    invoice_number: invoice?.invoice_number || "",
    company_id: invoice?.company_id || "",
    invoice_date: invoice?.invoice_date || format(new Date(), "yyyy-MM-dd"),
    due_date: invoice?.due_date || "",
    status: invoice?.status || "draft",
    payment_status: invoice?.payment_status || "pending",
    payment_method: invoice?.payment_method || "",
    subtotal: invoice?.subtotal || 0,
    discount_percentage: invoice?.discount_percentage || 0,
    discount_amount: invoice?.discount_amount || 0,
    vat_amount: invoice?.vat_amount || 0,
    total_amount: invoice?.total_amount || 0,
    paid_amount: invoice?.paid_amount || 0,
    notes: invoice?.notes || ""
  })

  useEffect(() => {
    fetchCompanies()
    if (!isEditMode) {
      generateInvoiceNumber()
    }
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [formData.subtotal, formData.discount_percentage])

  const fetchCompanies = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (data && !error) {
      setCompanies(data)
    }
  }

  const generateInvoiceNumber = async () => {
    const supabase = createClient()
    const year = new Date().getFullYear()
    
    // Get the last invoice number for the current year
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `FA-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error) {
      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number.split('-').pop()
        nextNumber = parseInt(lastNumber) + 1
      }
      const invoiceNumber = `FA-${year}-${nextNumber.toString().padStart(4, '0')}`
      setFormData(prev => ({ ...prev, invoice_number: invoiceNumber }))
    }
  }

  const calculateTotals = () => {
    const subtotal = formData.subtotal
    const discountAmount = (subtotal * formData.discount_percentage) / 100
    const afterDiscount = subtotal - discountAmount
    const vatAmount = afterDiscount * 0.21 // 21% VAT
    const totalAmount = afterDiscount + vatAmount

    setFormData(prev => ({
      ...prev,
      discount_amount: discountAmount,
      vat_amount: vatAmount,
      total_amount: totalAmount
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.company_id) {
      toast({
        title: "Greška",
        description: "Morate izabrati firmu",
        variant: "destructive"
      })
      return
    }

    if (!formData.invoice_date) {
      toast({
        title: "Greška",
        description: "Morate uneti datum fakture",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const invoiceData = {
        ...formData,
        updated_at: new Date().toISOString()
      }

      if (isEditMode) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id)

        if (error) throw error

        toast({
          title: "Uspešno",
          description: "Faktura je uspešno ažurirana"
        })
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert([invoiceData])

        if (error) throw error

        toast({
          title: "Uspešno",
          description: "Faktura je uspešno kreirana"
        })
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving invoice:', error)
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom čuvanja fakture",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditMode ? "Izmeni fakturu" : "Nova faktura"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? `Izmena fakture ${invoice.invoice_number}` : "Kreiranje nove fakture"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Osnovni podaci
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">
                  Broj fakture <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_id">
                  Firma <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                    sublabel: company.tax_number ? `PIB: ${company.tax_number}` : undefined,
                  }))}
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                  placeholder="Izaberite firmu"
                  searchPlaceholder="Pretražite firme..."
                  emptyText="Nema pronađenih firmi"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_date">
                  Datum fakture <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Rok plaćanja</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nacrt</SelectItem>
                    <SelectItem value="sent">Poslata</SelectItem>
                    <SelectItem value="paid">Plaćena</SelectItem>
                    <SelectItem value="overdue">Kasni</SelectItem>
                    <SelectItem value="cancelled">Otkazana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_status">Status plaćanja</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Čeka plaćanje</SelectItem>
                    <SelectItem value="partial">Delimično plaćeno</SelectItem>
                    <SelectItem value="paid">Plaćeno</SelectItem>
                    <SelectItem value="overdue">Kasni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Financial Details */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Finansijski detalji
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subtotal">
                  Osnovica (€) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Popust (%)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_amount">Iznos popusta (€)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount.toFixed(2)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_amount">PDV 21% (€)</Label>
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  value={formData.vat_amount.toFixed(2)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Ukupno (€)</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount.toFixed(2)}
                  disabled
                  className="font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid_amount">Plaćeno (€)</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="payment_method">Način plaćanja</Label>
                <Select
                  value={formData.payment_method || "none"}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value === "none" ? "" : value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nije definisan</SelectItem>
                    <SelectItem value="cash">Gotovina</SelectItem>
                    <SelectItem value="bank_transfer">Bankovni transfer</SelectItem>
                    <SelectItem value="credit_card">Kreditna kartica</SelectItem>
                    <SelectItem value="check">Ček</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Napomene</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatne napomene..."
              rows={4}
              disabled={loading}
            />
          </Card>
        </form>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Otkaži
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? "Sačuvaj izmene" : "Kreiraj fakturu"}
          </Button>
        </div>
      </div>
    </div>
  )
}