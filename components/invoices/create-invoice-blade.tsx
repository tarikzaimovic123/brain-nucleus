"use client"

import { useState, useEffect } from "react"
import { X, Plus, Building, Calendar, Euro, FileText, Trash2 } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { useBladeStack } from '@/lib/contexts/blade-stack-context'

interface Company {
  id: string
  name: string
  tax_number?: string
}

interface Product {
  id: string
  name: string
  unit: string
  selling_price?: number
  vat_rate?: number
}

interface InvoiceItem {
  id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  line_total: number
  vat_amount: number
  total_with_vat: number
}

interface CreateInvoiceBladeProps {
  onSuccess?: (invoiceId: string) => void
}

export function CreateInvoiceBlade({ onSuccess }: CreateInvoiceBladeProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    company_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    payment_method: 'transfer',
    notes: ''
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      product_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      line_total: 0,
      vat_amount: 0,
      total_with_vat: 0
    }
  ])

  const { toast } = useToast()
  const { closeTopBlade } = useBladeStack()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoadingData(true)
    try {
      const supabase = createClient()
      
      // Load companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, tax_number')
        .eq('active', true)
        .order('name')

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, unit, selling_price, vat_rate')
        .eq('active', true)
        .order('name')

      setCompanies(companiesData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju podataka'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const calculateItemTotals = (item: InvoiceItem): InvoiceItem => {
    const lineTotal = item.quantity * item.unit_price
    const vatAmount = lineTotal * (item.vat_rate / 100)
    const totalWithVat = lineTotal + vatAmount

    return {
      ...item,
      line_total: lineTotal,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // If product is selected, auto-fill data
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].description = product.name
        newItems[index].unit_price = product.selling_price || 0
        newItems[index].vat_rate = product.vat_rate || 21
      }
    }

    // Recalculate totals
    newItems[index] = calculateItemTotals(newItems[index])
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      product_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      line_total: 0,
      vat_amount: 0,
      total_with_vat: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
  const totalVat = items.reduce((sum, item) => sum + item.vat_amount, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.total_with_vat, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.company_id) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Molimo izaberite kupca'
      })
      return
    }

    if (items.some(item => !item.description || item.quantity <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Sve stavke moraju imati opis i količinu veću od 0'
      })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Generate invoice number
      const invoiceNumber = `FAK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          company_id: formData.company_id,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          status: 'draft',
          payment_status: 'unpaid',
          payment_method: formData.payment_method,
          subtotal: subtotal,
          vat_amount: totalVat,
          total_amount: totalAmount,
          paid_amount: 0,
          notes: formData.notes,
          fiscal_verified: false
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        line_total: item.line_total,
        vat_amount: item.vat_amount,
        total_with_vat: item.total_with_vat,
        display_order: items.indexOf(item)
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError

      toast({
        title: 'Uspeh',
        description: `Faktura ${invoiceNumber} je kreirana`
      })

      onSuccess?.(invoice.id)
      closeTopBlade()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri kreiranju fakture'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Učitavanje...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Nova faktura</h2>
                <p className="text-blue-100">Kreiranje nove fakture za kupca</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={closeTopBlade} className="text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Osnovni podaci
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Kupac *</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite kupca" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                          {company.tax_number && <span className="text-muted-foreground ml-2">PIB: {company.tax_number}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_method">Način plaćanja</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Bančni transfer</SelectItem>
                      <SelectItem value="cash">Gotovina</SelectItem>
                      <SelectItem value="card">Kartica</SelectItem>
                      <SelectItem value="check">Ček</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="invoice_date">Datum fakture</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="due_date">Datum dospeća</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Stavke fakture
                  </CardTitle>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj stavku
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Proizvod</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="w-[80px]">Količina</TableHead>
                        <TableHead className="w-[100px]">Cena</TableHead>
                        <TableHead className="w-[80px]">PDV %</TableHead>
                        <TableHead className="w-[100px]">Ukupno</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Select
                              value={item.product_id || 'none'}
                              onValueChange={(value) => updateItem(index, 'product_id', value === 'none' ? '' : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Proizvod" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Bez proizvoda</SelectItem>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Opis stavke"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.vat_rate}
                              onChange={(e) => updateItem(index, 'vat_rate', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            €{item.total_with_vat.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Osnova (bez PDV):</span>
                      <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PDV:</span>
                      <span>€{totalVat.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>UKUPNO:</span>
                      <span>€{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Napomene</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Dodatne napomene za fakturu..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeTopBlade}>
                Otkaži
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Kreiranje...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Kreiraj fakturu
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
    </div>
  )
}