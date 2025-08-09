"use client"

import { useState, useEffect } from "react"
import { X, Search, ChevronRight, ChevronLeft, FileText, Calendar, Euro, Check, Loader2, Package, Building, Filter, AlertCircle, AlertTriangle } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { sr } from "date-fns/locale"

interface WorkOrderItem {
  item_id: string
  work_order_id: string
  order_number: string
  company_id: string
  company_name: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  is_completed: boolean
  completed_at: string
  already_invoiced: boolean
  invoice_id?: string
  rank?: number
}

interface Company {
  id: string
  name: string
  tax_number?: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  payment_terms?: number
}

interface InvoiceFromWorkOrderWizardProps {
  onSuccess?: (invoiceId: string) => void
}

type WizardStep = 'select-items' | 'invoice-details' | 'preview'

export function InvoiceFromWorkOrderWizard({ onSuccess }: InvoiceFromWorkOrderWizardProps) {
  console.log('🏭 InvoiceFromWorkOrderWizard mounted')
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-items')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const { toast } = useToast()
  const { closeTopBlade } = useBladeStack()

  // Step 1: Select Items State
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<WorkOrderItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [companies, setCompanies] = useState<Company[]>([])

  // Step 2: Invoice Details State
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [notes, setNotes] = useState('')
  const [discountPercentage, setDiscountPercentage] = useState(0)
  
  // Alert dialog state
  const [showCompanyChangeDialog, setShowCompanyChangeDialog] = useState(false)
  const [pendingItemSelection, setPendingItemSelection] = useState<{itemId: string, companyId: string} | null>(null)

  // Load companies on mount
  useEffect(() => {
    loadCompanies()
  }, [])

  // Search items when query or page changes
  useEffect(() => {
    searchItems()
  }, [searchQuery, page])

  const loadCompanies = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const searchItems = async () => {
    setSearchLoading(true)
    try {
      const searchParams = {
        query: searchQuery || undefined,
        already_invoiced: false, // Always show only non-invoiced items
        page,
        limit: 20
      }
      
      console.log('🔍 Searching with params:', searchParams)
      
      const response = await fetch('/api/work-order-items/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Search results:', data)
      setItems(data.items || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri pretrazi stavki'
      })
    } finally {
      setSearchLoading(false)
    }
  }

  const handleItemToggle = (itemId: string, companyId: string) => {
    const newSelection = new Set(selectedItems)
    
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
      
      // If no items left selected, clear the company selection
      if (newSelection.size === 0) {
        setSelectedCompany(null)
      }
    } else {
      // If selecting item from different company, show modern dialog
      if (selectedCompany && selectedCompany.id !== companyId) {
        setPendingItemSelection({ itemId, companyId })
        setShowCompanyChangeDialog(true)
        return
      }
      
      newSelection.add(itemId)
      
      // Set selected company
      const company = companies.find(c => c.id === companyId)
      if (company) {
        setSelectedCompany(company)
        // Auto-set due date based on payment terms
        if (company.payment_terms) {
          const due = new Date()
          due.setDate(due.getDate() + company.payment_terms)
          setDueDate(due.toISOString().split('T')[0])
        }
      }
    }
    
    setSelectedItems(newSelection)
  }

  const handleConfirmCompanyChange = () => {
    if (pendingItemSelection) {
      const newSelection = new Set<string>()
      newSelection.add(pendingItemSelection.itemId)
      setSelectedItems(newSelection)
      
      // Set new company
      const company = companies.find(c => c.id === pendingItemSelection.companyId)
      if (company) {
        setSelectedCompany(company)
        if (company.payment_terms) {
          const due = new Date()
          due.setDate(due.getDate() + company.payment_terms)
          setDueDate(due.toISOString().split('T')[0])
        }
      }
    }
    
    setShowCompanyChangeDialog(false)
    setPendingItemSelection(null)
  }

  const calculateTotals = () => {
    const selectedItemsData = items.filter(item => selectedItems.has(item.item_id))
    const subtotal = selectedItemsData.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const discountAmount = subtotal * (discountPercentage / 100)
    const afterDiscount = subtotal - discountAmount
    const vatAmount = afterDiscount * 0.21 // 21% PDV
    const total = afterDiscount + vatAmount
    
    return { subtotal, discountAmount, vatAmount, total }
  }

  const handleCreateInvoice = async () => {
    console.log('🚀 Starting invoice creation...')
    console.log('Selected company:', selectedCompany)
    console.log('Selected items:', selectedItems)
    
    if (!selectedCompany) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Nema izabrane firme'
      })
      return
    }

    if (selectedItems.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Nema izabranih stavki'
      })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { subtotal, discountAmount, vatAmount, total } = calculateTotals()
      const selectedItemsData = items.filter(item => selectedItems.has(item.item_id))

      // Generate invoice number
      const { data: settings } = await supabase
        .from('invoice_settings')
        .select('setting_value')
        .eq('setting_key', 'numbering_format')
        .single()

      // setting_value is JSONB, so we need to handle it properly
      const format = typeof settings?.setting_value === 'string' 
        ? settings.setting_value 
        : settings?.setting_value || 'FAK-{YYYY}-{NNNN}'
      const year = new Date().getFullYear()
      const invoiceNumber = format
        .replace('{YYYY}', year.toString())
        .replace('{NNNN}', Math.floor(Math.random() * 9000 + 1000).toString())

      console.log('📝 Generated invoice number:', invoiceNumber)
      console.log('📊 Selected items data:', selectedItemsData)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Create invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        company_id: selectedCompany.id,
        work_order_id: selectedItemsData[0]?.work_order_id, // Link to first WO
        invoice_date: invoiceDate,
        due_date: dueDate,
        status: 'draft',
        payment_status: 'unpaid',
        payment_method: paymentMethod,
        subtotal: subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        paid_amount: 0,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        notes: notes,
        is_from_work_order: true,
        fiscal_verified: false,
        created_by: user.id
      }
      
      console.log('📦 Invoice data to insert:', invoiceData)
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) {
        console.error('❌ Invoice creation error:', invoiceError)
        console.error('❌ Error details:', {
          code: invoiceError.code,
          message: invoiceError.message,
          details: invoiceError.details,
          hint: invoiceError.hint
        })
        throw invoiceError
      }
      
      console.log('✅ Invoice created:', invoice)

      // Create invoice items
      const invoiceItems = selectedItemsData.map((item, index) => ({
        invoice_id: invoice.id,
        work_order_item_id: item.item_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: 21,
        line_total: item.line_total,
        vat_amount: item.line_total * 0.21,
        total_with_vat: item.line_total * 1.21,
        display_order: index
      }))

      console.log('📋 Creating invoice items:', invoiceItems)
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        console.error('❌ Invoice items creation error:', itemsError)
        throw itemsError
      }
      
      console.log('✅ Invoice items created successfully')
      
      // Generate PDF
      console.log('📄 Generating PDF for invoice:', invoice.id)
      try {
        const pdfResponse = await fetch(`/api/invoices/${invoice.id}/pdf`)
        
        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `faktura-${invoiceNumber}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          
          console.log('✅ PDF generated and downloaded')
          
          toast({
            title: 'Uspeh',
            description: `Faktura ${invoiceNumber} je kreirana i PDF je preuzet`
          })
        } else {
          console.warn('⚠️ PDF generation failed, but invoice was created')
          toast({
            title: 'Uspeh',
            description: `Faktura ${invoiceNumber} je kreirana`,
            action: {
              label: 'Preuzmi PDF',
              onClick: async () => {
                const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
                if (response.ok) {
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `faktura-${invoiceNumber}.pdf`
                  link.click()
                  window.URL.revokeObjectURL(url)
                }
              }
            }
          })
        }
      } catch (pdfError) {
        console.error('❌ PDF generation error:', pdfError)
        toast({
          title: 'Uspeh',
          description: `Faktura ${invoiceNumber} je kreirana (PDF generisanje nije uspelo)`
        })
      }

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

  const canProceed = () => {
    const result = (() => {
      switch (currentStep) {
        case 'select-items':
          return selectedItems.size > 0 && selectedCompany !== null
        case 'invoice-details':
          return invoiceDate && dueDate && paymentMethod
        case 'preview':
          return true
        default:
          return false
      }
    })()
    console.log(`🔍 canProceed for ${currentStep}:`, result)
    return result
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'select-items':
        return (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po broju naloga, opisu, firmi, količini, ceni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected company info */}
            {selectedCompany && selectedItems.size > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedCompany.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.tax_number && `PIB: ${selectedCompany.tax_number}`}
                        {selectedCompany.payment_terms && ` • Rok plaćanja: ${selectedCompany.payment_terms} dana`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {selectedItems.size} {selectedItems.size === 1 ? 'stavka' : 'stavki'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItems(new Set())
                          setSelectedCompany(null)
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items table */}
            <Card>
              {items.length > 0 && !searchLoading && (
                <div className="px-4 py-2 bg-muted/30 border-b text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Kliknite na bilo koji red da ga selektujete ili deselektujete
                </div>
              )}
              <CardContent className="p-0">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nema stavki za prikaz</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={items.length > 0 && items.every(i => selectedItems.has(i.item_id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Select all items from same company or first company
                                if (items.length > 0) {
                                  const firstCompanyId = selectedCompany?.id || items[0].company_id
                                  const sameCompanyItems = items.filter(i => i.company_id === firstCompanyId)
                                  const newSelection = new Set(sameCompanyItems.map(i => i.item_id))
                                  setSelectedItems(newSelection)
                                  if (!selectedCompany && sameCompanyItems.length > 0) {
                                    const company = companies.find(c => c.id === firstCompanyId)
                                    if (company) {
                                      setSelectedCompany(company)
                                      if (company.payment_terms) {
                                        const due = new Date()
                                        due.setDate(due.getDate() + company.payment_terms)
                                        setDueDate(due.toISOString().split('T')[0])
                                      }
                                    }
                                  }
                                }
                              } else {
                                // Deselect all
                                setSelectedItems(new Set())
                                setSelectedCompany(null)
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Radni nalog</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead className="text-right">Količina</TableHead>
                        <TableHead className="text-right">Cena</TableHead>
                        <TableHead className="text-right">Ukupno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isSelected = selectedItems.has(item.item_id)
                        
                        return (
                          <TableRow 
                            key={item.item_id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isSelected && "bg-blue-50 hover:bg-blue-100",
                              !isSelected && "hover:bg-gray-50"
                            )}
                            onClick={() => handleItemToggle(item.item_id, item.company_id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleItemToggle(item.item_id, item.company_id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.order_number}
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.company_name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">€{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="text-right font-medium">€{item.line_total?.toFixed(2) || '0.00'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Prethodna
                </Button>
                <span className="text-sm text-muted-foreground">
                  Strana {page} od {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sledeća
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )

      case 'invoice-details':
        const totals = calculateTotals()
        return (
          <div className="space-y-6">
            {/* Company info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Podaci o kupcu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Naziv</Label>
                    <p className="font-medium">{selectedCompany?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PIB</Label>
                    <p className="font-medium">{selectedCompany?.tax_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Adresa</Label>
                    <p className="font-medium">
                      {selectedCompany?.address || 'N/A'}
                      {selectedCompany?.city && `, ${selectedCompany.postal_code} ${selectedCompany.city}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Kontakt</Label>
                    <p className="font-medium">
                      {selectedCompany?.phone || 'N/A'}
                      {selectedCompany?.email && <br />}
                      {selectedCompany?.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detalji fakture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice-date">Datum fakture</Label>
                    <Input
                      id="invoice-date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due-date">Datum dospeća</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-method">Način plaćanja</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bančni transfer</SelectItem>
                        <SelectItem value="cash">Gotovina</SelectItem>
                        <SelectItem value="card">Kartica</SelectItem>
                        <SelectItem value="check">Ček</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount">Popust (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Napomene</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dodatne napomene za fakturu..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Pregled iznosa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Osnova (bez PDV):</span>
                    <span>€{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Popust ({discountPercentage}%):</span>
                      <span>-€{totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>PDV (21%):</span>
                    <span>€{totals.vatAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>UKUPNO:</span>
                    <span>€{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'preview':
        const finalTotals = calculateTotals()
        const selectedItemsData = items.filter(item => selectedItems.has(item.item_id))
        
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="text-xl">Pregled fakture</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3">Podaci o kupcu</h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{selectedCompany?.name}</p>
                      {selectedCompany?.tax_number && <p>PIB: {selectedCompany.tax_number}</p>}
                      {selectedCompany?.address && <p>{selectedCompany.address}</p>}
                      {selectedCompany?.city && <p>{selectedCompany.postal_code} {selectedCompany.city}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold mb-3">Detalji fakture</h3>
                    <div className="space-y-1 text-sm">
                      <p>Datum: {format(new Date(invoiceDate), 'dd.MM.yyyy', { locale: sr })}</p>
                      <p>Dospeće: {format(new Date(dueDate), 'dd.MM.yyyy', { locale: sr })}</p>
                      <p>Način plaćanja: {
                        paymentMethod === 'bank_transfer' ? 'Bančni transfer' :
                        paymentMethod === 'cash' ? 'Gotovina' :
                        paymentMethod === 'card' ? 'Kartica' :
                        paymentMethod === 'check' ? 'Ček' :
                        paymentMethod
                      }</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3">Stavke fakture</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Opis</TableHead>
                        <TableHead className="text-right">Količina</TableHead>
                        <TableHead className="text-right">Cena</TableHead>
                        <TableHead className="text-right">Ukupno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItemsData.map((item) => (
                        <TableRow key={item.item_id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">€{item.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">€{item.line_total?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between">
                      <span>Osnova (bez PDV):</span>
                      <span>€{finalTotals.subtotal.toFixed(2)}</span>
                    </div>
                    {finalTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Popust ({discountPercentage}%):</span>
                        <span>-€{finalTotals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>PDV (21%):</span>
                      <span>€{finalTotals.vatAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>UKUPNO:</span>
                      <span className="text-blue-600">€{finalTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Napomene</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Potvrdite kreiranje fakture</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Faktura će biti kreirana u statusu "Draft". Možete je kasnije urediti pre slanja kupcu.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
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
              <h2 className="text-2xl font-bold">Nova faktura iz radnih naloga</h2>
              <p className="text-blue-100">Kreiranje fakture iz završenih stavki radnih naloga</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={closeTopBlade} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Wizard steps */}
        <div className="mt-6">
          <div className="flex items-center justify-between max-w-2xl">
            <div className={cn(
              "flex items-center gap-3",
              currentStep === 'select-items' ? 'text-white' : 'text-blue-200'
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
                currentStep === 'select-items' ? 'bg-white text-blue-600' : 'bg-white/20'
              )}>
                1
              </div>
              <span className="font-medium">Izbor stavki</span>
            </div>
            
            <div className="flex-1 h-0.5 bg-white/20 mx-4" />
            
            <div className={cn(
              "flex items-center gap-3",
              currentStep === 'invoice-details' ? 'text-white' : 'text-blue-200'
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
                currentStep === 'invoice-details' ? 'bg-white text-blue-600' : 'bg-white/20'
              )}>
                2
              </div>
              <span className="font-medium">Detalji fakture</span>
            </div>
            
            <div className="flex-1 h-0.5 bg-white/20 mx-4" />
            
            <div className={cn(
              "flex items-center gap-3",
              currentStep === 'preview' ? 'text-white' : 'text-blue-200'
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
                currentStep === 'preview' ? 'bg-white text-blue-600' : 'bg-white/20'
              )}>
                3
              </div>
              <span className="font-medium">Pregled i kreiranje</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            {currentStep === 'select-items' && selectedItems.size > 0 && (
              <p className="text-sm text-muted-foreground">
                Izabrano {selectedItems.size} stavki • 
                Ukupno: €{calculateTotals().total.toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {currentStep !== 'select-items' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (currentStep === 'invoice-details') setCurrentStep('select-items')
                  if (currentStep === 'preview') setCurrentStep('invoice-details')
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
            )}
            
            {currentStep !== 'preview' ? (
              <Button
                onClick={() => {
                  if (currentStep === 'select-items') setCurrentStep('invoice-details')
                  if (currentStep === 'invoice-details') setCurrentStep('preview')
                }}
                disabled={!canProceed()}
              >
                Dalje
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  console.log('🔴 Create invoice button clicked!')
                  handleCreateInvoice()
                }}
                disabled={loading || !canProceed()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kreiranje...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Kreiraj fakturu
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Material Design 3 Alert Dialog */}
      <AlertDialog open={showCompanyChangeDialog} onOpenChange={setShowCompanyChangeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold">
                Promena firme
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              Izabrali ste stavku koja pripada drugoj firmi. 
              <br />
              <br />
              Ova akcija će <span className="font-semibold">obrisati trenutnu selekciju</span> i započeti novu sa stavkama izabrane firme.
              <br />
              <br />
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Trenutna firma:</p>
                    <p className="text-amber-700">{selectedCompany?.name || 'Nepoznata'}</p>
                    <p className="font-medium mt-2 mb-1">Nova firma:</p>
                    <p className="text-amber-700">
                      {pendingItemSelection ? 
                        companies.find(c => c.id === pendingItemSelection.companyId)?.name || 'Nepoznata'
                        : 'Nepoznata'}
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              onClick={() => {
                setShowCompanyChangeDialog(false)
                setPendingItemSelection(null)
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              Otkaži
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCompanyChange}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Promeni firmu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}