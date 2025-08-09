"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, Euro, Clock, CheckCircle, AlertTriangle, Download, Send, Shield, Filter, Calendar, Building2, Search, MoreHorizontal, Eye, Edit, Trash2, Printer, CreditCard, Factory, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useBladeStack } from "@/lib/contexts/blade-stack-context"
import { usePermissionContext, PermissionGuard } from "@/lib/contexts/permission-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataGrid } from "@/components/shared/data-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ViewInvoiceBlade } from "@/components/invoices/view-invoice-blade"
import { EditInvoiceBlade } from "@/components/invoices/edit-invoice-blade"
import { InvoiceFromWorkOrderWizard } from "@/components/invoices/invoice-from-work-order-wizard"
import { InvoiceSettingsBlade } from "@/components/invoices/invoice-settings-blade"
import { format, parseISO, isAfter } from "date-fns"
import { sr } from "date-fns/locale"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  line_total: number
  vat_amount: number
  total_with_vat: number
  display_order?: number
}

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
  fiscal_verified: boolean
  created_at: string
  company?: {
    id: string
    name: string
    tax_number?: string
  }
  work_order?: {
    id: string
    order_number: string
  }
  invoice_items?: InvoiceItem[]
}

interface InvoiceStats {
  total: number
  draft: number
  sent: number
  unpaid: number
  partial: number
  paid: number
  overdue: number
  totalValue: number
  paidValue: number
  unpaidValue: number
  avgPaymentDays: number
}

export function InvoicesClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [companies, setCompanies] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    draft: 0,
    sent: 0,
    unpaid: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    totalValue: 0,
    paidValue: 0,
    unpaidValue: 0,
    avgPaymentDays: 0
  })

  const { toast } = useToast()
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, hasPermission, checkPermissionWithToast } = usePermissionContext()

  useEffect(() => {
    fetchInvoices()
    fetchCompanies()
  }, [])

  useEffect(() => {
    filterInvoices()
    setCurrentPage(1) // Reset to first page when filters change
  }, [invoices, searchQuery, statusFilter, paymentStatusFilter, companyFilter])

  const fetchInvoices = async () => {
    console.log('🔍 Fetching invoices...')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies!company_id (
            id,
            name,
            tax_number
          ),
          work_order:work_orders!work_order_id (
            id,
            order_number
          ),
          invoice_items (
            id,
            description,
            quantity,
            unit_price,
            vat_rate,
            line_total,
            vat_amount,
            total_with_vat,
            display_order
          )
        `)
        .order('invoice_date', { ascending: false })  // Changed to invoice_date instead of created_at

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      console.log('✅ Fetched', data?.length, 'invoices')
      
      // Sort to show invoices with real customers first
      const sortedData = (data || []).sort((a, b) => {
        const aHasRealCustomer = a.company_id && a.company_id !== '36c1f0b8-a7f4-4b17-baa8-d1fc97462391'
        const bHasRealCustomer = b.company_id && b.company_id !== '36c1f0b8-a7f4-4b17-baa8-d1fc97462391'
        
        if (aHasRealCustomer && !bHasRealCustomer) return -1
        if (!aHasRealCustomer && bHasRealCustomer) return 1
        return 0
      })
      
      // Log first few invoices to check company data
      console.log('📊 First 5 invoices with company data:')
      sortedData.slice(0, 5).forEach(inv => {
        console.log(`  - ${inv.invoice_number}: ${inv.company?.name || 'NO COMPANY'} (ID: ${inv.company_id})`)
      })
      
      setInvoices(sortedData)
      calculateStats(sortedData)
    } catch (error) {
      console.error('❌ Error fetching invoices:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju faktura'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
    
    if (data) setCompanies(data)
  }

  const calculateStats = (invoicesData: Invoice[]) => {
    const now = new Date()
    
    const stats: InvoiceStats = {
      total: invoicesData.length,
      draft: invoicesData.filter(inv => inv.status === 'draft').length,
      sent: invoicesData.filter(inv => inv.status === 'sent' || inv.status === 'issued').length,
      unpaid: invoicesData.filter(inv => inv.payment_status === 'unpaid').length,
      partial: invoicesData.filter(inv => inv.payment_status === 'partial').length,
      paid: invoicesData.filter(inv => inv.payment_status === 'paid').length,
      overdue: invoicesData.filter(inv => 
        inv.due_date && isAfter(now, parseISO(inv.due_date)) && inv.payment_status !== 'paid'
      ).length,
      totalValue: invoicesData.reduce((sum, inv) => sum + inv.total_amount, 0),
      paidValue: invoicesData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0),
      unpaidValue: invoicesData.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0),
      avgPaymentDays: 15 // TODO: Calculate from actual payment data
    }

    setStats(stats)
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.company?.name.toLowerCase().includes(query) ||
        invoice.work_order?.order_number.toLowerCase().includes(query)
      )
    }

    // Status filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.payment_status === paymentStatusFilter)
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.company_id === companyFilter)
    }

    setFilteredInvoices(filtered)
  }

  const handleView = (invoice: Invoice) => {
    console.log('🔍 Opening invoice:', invoice.invoice_number, invoice.id)
    openBlade(ViewInvoiceBlade, {
      invoice: invoice,
      onClose: () => {},
      onEdit: () => handleEdit(invoice),
      onDelete: () => handleDelete(invoice)
    }, { width: 'lg' })
  }

  const handleEdit = withPermissionCheck('invoices', 'update', (invoice: Invoice) => {
    openBlade(EditInvoiceBlade, {
      invoice: invoice,
      onClose: () => {},
      onSuccess: () => {
        fetchInvoices()
      }
    }, { width: 'lg' })
  }, 'ažuriranje fakture')

  const handleDelete = withPermissionCheck('invoices', 'delete', async (invoice: Invoice) => {
    if (!confirm(`Da li ste sigurni da želite da obrišete fakturu ${invoice.invoice_number}?`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)

      if (error) throw error

      toast({
        title: 'Uspeh',
        description: 'Faktura je obrisana'
      })
      
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri brisanju fakture'
      })
    }
  }, 'brisanje fakture')

  const handleBulkFiscalize = () => {
    toast({
      title: 'Info',
      description: 'Grupna fiskalizacija je u izradi'
    })
  }

  const handleBulkSend = () => {
    toast({
      title: 'Info',
      description: 'Grupno slanje je u izradi'
    })
  }

  const handleCreateInvoice = withPermissionCheck('invoices', 'create', () => {
    console.log('➕ Opening create invoice blade')
    openBlade(EditInvoiceBlade, {
      invoice: null,
      onClose: () => {},
      onSuccess: () => {
        fetchInvoices()
      }
    }, { width: 'lg' })
  }, 'kreiranje fakture')

  const handleCreateFromWorkOrder = withPermissionCheck('invoices', 'create_from_work_order', () => {
    console.log('🏭 Opening invoice from work order wizard')
    openBlade(InvoiceFromWorkOrderWizard, {
      onSuccess: () => {
        fetchInvoices()
      }
    }, { width: 'xl' })
  }, 'kreiranje fakture iz radnog naloga')

  const handleOpenSettings = withPermissionCheck('invoice_settings', 'manage', () => {
    console.log('⚙️ Opening invoice settings')
    openBlade(InvoiceSettingsBlade, {
      onClose: () => {}
    }, { width: 'lg' })
  }, 'upravljanje postavkama fakturisanja')


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'issued': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'unpaid': return 'bg-red-100 text-red-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const columns = [
    {
      key: 'invoice_number',
      header: 'Broj fakture',
      sortable: true,
      render: (invoice: Invoice) => (
        <div>
          <div className="font-medium">{invoice.invoice_number}</div>
          {invoice.fiscal_number && (
            <div className="text-xs text-muted-foreground">FK: {invoice.fiscal_number}</div>
          )}
          {invoice.work_order && (
            <div className="text-xs text-blue-600">RN: {invoice.work_order.order_number}</div>
          )}
        </div>
      )
    },
    {
      key: 'company.name',
      header: 'Kupac',
      sortable: true,
      render: (invoice: Invoice) => {
        // Debug log
        if (!invoice.company?.name) {
          console.log('⚠️ Missing company for invoice:', invoice.invoice_number, 'Company ID:', invoice.company_id)
        }
        return (
          <div>
            <div className="font-medium">{invoice.company?.name || 'Nepoznat kupac'}</div>
            {invoice.company?.tax_number && (
              <div className="text-xs text-muted-foreground">PIB: {invoice.company.tax_number}</div>
            )}
          </div>
        )
      }
    },
    {
      key: 'invoice_date',
      header: 'Datum',
      sortable: true,
      render: (invoice: Invoice) => format(parseISO(invoice.invoice_date), 'dd.MM.yyyy', { locale: sr })
    },
    {
      key: 'due_date',
      header: 'Dospeće',
      sortable: true,
      render: (invoice: Invoice) => {
        if (!invoice.due_date) return '-'
        const dueDate = parseISO(invoice.due_date)
        const isOverdue = isAfter(new Date(), dueDate) && invoice.payment_status !== 'paid'
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {format(dueDate, 'dd.MM.yyyy', { locale: sr })}
          </span>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
          {invoice.fiscal_verified && (
            <span title="Fiskalizovano">
              <Shield className="h-4 w-4 text-green-600" />
            </span>
          )}
          {invoice.work_order_id && (
            <span title="Iz radnog naloga">
              <Factory className="h-4 w-4 text-blue-600" />
            </span>
          )}
        </div>
      )
    },
    {
      key: 'payment_status',
      header: 'Naplata',
      sortable: true,
      render: (invoice: Invoice) => {
        const isOverdue = invoice.due_date && 
          isAfter(new Date(), parseISO(invoice.due_date)) && 
          invoice.payment_status !== 'paid'
        
        return (
          <Badge className={getPaymentStatusColor(isOverdue ? 'overdue' : invoice.payment_status)}>
            {isOverdue ? 'Kašnjenje' : invoice.payment_status}
          </Badge>
        )
      }
    },
    {
      key: 'total_amount',
      header: 'Iznos',
      sortable: true,
      render: (invoice: Invoice) => (
        <div className="text-right">
          <div className="font-medium">€{invoice.total_amount.toFixed(2)}</div>
          {invoice.paid_amount > 0 && (
            <div className="text-xs text-green-600">
              Plaćeno: €{invoice.paid_amount.toFixed(2)}
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Fakture
          </h1>
          <p className="text-muted-foreground mt-1">
            Upravljanje fakturama i naplatama
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard resource="invoice_settings" action="manage">
            <Button variant="outline" size="icon" onClick={handleOpenSettings} title="Postavke">
              <Settings className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <Button variant="outline" onClick={handleBulkFiscalize}>
            <Shield className="h-4 w-4 mr-2" />
            Grupna fiskalizacija
          </Button>
          <Button variant="outline" onClick={handleBulkSend}>
            <Send className="h-4 w-4 mr-2" />
            Grupno slanje
          </Button>
          <PermissionGuard resource="invoices" action="create_from_work_order">
            <Button variant="outline" onClick={handleCreateFromWorkOrder}>
              <Factory className="h-4 w-4 mr-2" />
              Iz radnog naloga
            </Button>
          </PermissionGuard>
          <PermissionGuard resource="invoices" action="create">
            <Button onClick={handleCreateInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Nova faktura
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ukupno faktura</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.draft} draft • {stats.sent} poslano
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ukupna vrednost</span>
          </div>
          <div className="text-2xl font-bold mt-1">€{stats.totalValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Za naplatu ovaj mesec
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Naplaćeno</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">€{stats.paidValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.paid} faktura plaćeno
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-muted-foreground">Kašnjenja</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</div>
          <div className="text-xs text-muted-foreground mt-1">
            €{stats.unpaidValue.toLocaleString()} neplaćeno
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po broju, firmi, radnom nalogu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Poslano</SelectItem>
              <SelectItem value="issued">Izdato</SelectItem>
              <SelectItem value="paid">Plaćeno</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Naplata" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve naplate</SelectItem>
              <SelectItem value="unpaid">Neplaćeno</SelectItem>
              <SelectItem value="partial">Delimično</SelectItem>
              <SelectItem value="paid">Plaćeno</SelectItem>
            </SelectContent>
          </Select>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Firma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve firme</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== 'all' || paymentStatusFilter !== 'all' || companyFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setPaymentStatusFilter('all')
                setCompanyFilter('all')
              }}
            >
              Resetuj
            </Button>
          )}
        </div>
      </Card>

      {/* Data Grid */}
      <Card>
        <DataGrid
          data={filteredInvoices}
          columns={columns}
          isLoading={loading}
          onView={handleView}
          onEdit={hasPermission('invoices', 'update') ? handleEdit : undefined}
          onDelete={hasPermission('invoices', 'delete') ? handleDelete : undefined}
          emptyMessage="Nema faktura za prikaz"
        />
      </Card>
    </div>
  )
}