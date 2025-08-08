'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, FileText, TrendingUp, Clock, CheckCircle, Euro, Eye, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ViewQuoteBlade } from '@/components/quotes/view-quote-blade'
import { EditQuoteBlade } from '@/components/quotes/edit-quote-blade'
import { DataGrid, type DataGridColumn } from '@/components/shared/data-grid'
import { createClient } from '@/lib/supabase/client'
import type { Quote } from '@/types/quotes'
import { format, isAfter, parseISO } from 'date-fns'
import { sr } from 'date-fns/locale'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

export function QuotesClient() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const searchParams = useSearchParams()
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, hasPermission, checkPermissionWithToast } = usePermissionContext()

  useEffect(() => {
    fetchQuotes()
  }, [])

  // Open quote if coming from notification
  useEffect(() => {
    const viewId = searchParams.get('view')
    if (viewId && quotes.length > 0) {
      const quoteToView = quotes.find(q => q.id === viewId)
      if (quoteToView) {
        handleView(quoteToView)
      }
    }
  }, [searchParams, quotes])

  const fetchQuotes = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        company:companies!company_id (
          id,
          name,
          tax_number
        ),
        contact_person:contact_persons!contact_person_id (
          id,
          first_name,
          last_name,
          email
        ),
        quote_items (
          id,
          description,
          quantity,
          unit_price,
          vat_rate,
          discount_percentage,
          line_total,
          product:products!product_id (
            id,
            name,
            code
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setQuotes(data as any)
    }
    setLoading(false)
  }

  const handleEdit = withPermissionCheck('quotes', 'update', (quote: Quote) => {
    openBlade(EditQuoteBlade, {
      quote: quote,
      onClose: () => {},
      onSave: () => {
        fetchQuotes()
      }
    }, { width: 'lg' })
  }, 'ažuriranje ponude')

  const handleDelete = withPermissionCheck('quotes', 'delete', async (quote: Quote) => {
    if (!confirm(`Da li ste sigurni da želite obrisati ponudu "${quote.quote_number}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quote.id)

    if (!error) {
      fetchQuotes()
    }
  }, 'brisanje ponude')

  const handleView = (quote: Quote) => {
    openBlade(ViewQuoteBlade, {
      quote: quote,
      onClose: () => {},
      onEdit: () => {
        openBlade(EditQuoteBlade, {
          quote: quote,
          onClose: () => {},
          onSave: () => {
            fetchQuotes()
          }
        }, { width: 'lg' })
      },
      onDelete: async () => {
        await handleDelete(quote)
      }
    }, { width: 'lg' })
  }

  const handleCreateNew = withPermissionCheck('quotes', 'create', () => {
    openBlade(EditQuoteBlade, {
      quote: null,
      onClose: () => {},
      onSave: () => {
        fetchQuotes()
      }
    }, { width: 'lg' })
  }, 'kreiranje ponude')

  // Calculate statistics
  const activeQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft')
  const pendingQuotes = quotes.filter(q => q.status === 'sent')
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted')
  const expiredQuotes = quotes.filter(q => 
    q.valid_until && isAfter(new Date(), parseISO(q.valid_until)) && (q.status === 'sent' || q.status === 'draft')
  )
  const totalValue = quotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)
  const averageValue = quotes.length > 0 ? totalValue / quotes.length : 0

  const getStatusBadge = (status?: string | null, validUntil?: string | null) => {
    // Check if expired (only for sent/pending quotes)
    if (validUntil && isAfter(new Date(), parseISO(validUntil)) && (status === 'sent' || status === 'draft')) {
      return <Badge variant="destructive">Istekla</Badge>
    }
    
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Nacrt</Badge>
      case 'sent':
        return <Badge variant="outline">Poslata</Badge>
      case 'accepted':
        return <Badge variant="default">Prihvaćena</Badge>
      case 'rejected':
        return <Badge variant="destructive">Odbijena</Badge>
      case 'expired':
        return <Badge variant="secondary">Istekla</Badge>
      default:
        return <Badge variant="outline">Nepoznato</Badge>
    }
  }

  const columns: DataGridColumn<Quote>[] = [
    {
      key: 'quote_number',
      header: 'Broj ponude',
      sortable: true,
      accessor: (quote) => (
        <div className="font-mono text-sm font-medium">{quote.quote_number}</div>
      ),
    },
    {
      key: 'company',
      header: 'Firma',
      sortable: true,
      accessor: (quote) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{quote.company?.name || 'N/A'}</div>
            {(quote.company as any)?.tax_number && (
              <div className="text-xs text-muted-foreground">PIB: {(quote.company as any).tax_number}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'quote_date',
      header: 'Datum ponude',
      sortable: true,
      accessor: (quote) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {format(parseISO(quote.quote_date), 'dd.MM.yyyy', { locale: sr })}
          </span>
        </div>
      ),
    },
    {
      key: 'valid_until',
      header: 'Važi do',
      sortable: true,
      accessor: (quote) => {
        if (!quote.valid_until) return <span className="text-sm text-muted-foreground">-</span>
        
        const isExpired = isAfter(new Date(), parseISO(quote.valid_until))
        return (
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : ''}`}>
              {format(parseISO(quote.valid_until), 'dd.MM.yyyy', { locale: sr })}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      accessor: (quote) => getStatusBadge(quote.status, quote.valid_until),
    },
    {
      key: 'total_amount',
      header: 'Ukupno',
      sortable: true,
      align: 'right',
      accessor: (quote) => (
        <div className="flex items-center justify-end gap-1">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {quote.total_amount?.toLocaleString('sr-RS', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }) || '0,00'}
          </span>
        </div>
      ),
    },
    {
      key: 'contact_person',
      header: 'Kontakt',
      sortable: true,
      accessor: (quote) => {
        if (!quote.contact_person) return <span className="text-sm text-muted-foreground">-</span>
        
        return (
          <div>
            <div className="text-sm font-medium">
              {quote.contact_person.first_name} {quote.contact_person.last_name}
            </div>
            {quote.contact_person.email && (
              <div className="text-xs text-muted-foreground">{quote.contact_person.email}</div>
            )}
          </div>
        )
      },
    },
  ]


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ponude</h1>
          <p className="text-muted-foreground">Upravljanje ponudama i oferima</p>
        </div>
        <PermissionGuard resource="quotes" action="create">
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova ponuda
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Ukupno ponuda</p>
              <p className="text-2xl font-bold">{quotes.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Aktivne</p>
              <p className="text-2xl font-bold">{activeQuotes.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Prihvaćene</p>
              <p className="text-2xl font-bold">{acceptedQuotes.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Euro className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Ukupna vrednost</p>
              <p className="text-2xl font-bold">
                €{totalValue.toLocaleString('sr-RS', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <DataGrid
          data={quotes}
          columns={columns}
          isLoading={loading}
          onEdit={hasPermission('quotes', 'update') ? handleEdit : undefined}
          onDelete={hasPermission('quotes', 'delete') ? handleDelete : undefined}
          onView={handleView}
          selectable={true}
          searchable={true}
          pageSize={25}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="Nema pronađenih ponuda"
        />
      </Card>
    </div>
  )
}