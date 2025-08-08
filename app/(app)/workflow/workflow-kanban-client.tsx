'use client'

import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { 
  Search, Filter, Calendar, TrendingUp, Clock, AlertCircle, 
  Package, Eye, User, MoreVertical, ChevronRight, Plus,
  FileText, Factory, Receipt, CreditCard, CheckCircle2,
  Timer, Users, Building2, DollarSign, Activity, BarChart3,
  Zap, Target, Briefcase, ArrowUpDown, LayoutGrid, List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'
import { sr } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { ViewQuoteWrapper } from '@/components/quotes/view-quote-wrapper'
import { ViewWorkOrderWrapper } from '@/components/work-orders/view-work-order-wrapper'
import { ViewInvoiceWrapper } from '@/components/invoices/view-invoice-wrapper'

// Tipovi za workflow
interface WorkflowItem {
  id: string
  type: 'quote' | 'work_order' | 'invoice' | 'payment'
  status: string
  title: string
  company: string
  companyId: string
  amount: number
  dueDate?: string
  assignedTo?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  progress?: number
  tags: string[]
  createdAt: string
  updatedAt: string
  linkedItems: {
    quoteId?: string
    workOrderId?: string
    invoiceId?: string
  }
  metadata?: any
}

interface WorkflowColumn {
  id: string
  title: string
  icon: any
  color: string
  items: WorkflowItem[]
  itemCount?: number
  totalValue?: number
}

// Workflow statusi mapiranje
const WORKFLOW_STAGES = {
  'new_quote': { title: '📝 Nova ponuda', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-700' },
  'quote_sent': { title: '⏳ Čeka odgovor', color: 'bg-yellow-100 border-yellow-300', textColor: 'text-yellow-700' },
  'quote_accepted': { title: '✅ Prihvaćena', color: 'bg-green-100 border-green-300', textColor: 'text-green-700' },
  'in_production': { title: '🏭 U proizvodnji', color: 'bg-purple-100 border-purple-300', textColor: 'text-purple-700' },
  'production_complete': { title: '📦 Završeno', color: 'bg-indigo-100 border-indigo-300', textColor: 'text-indigo-700' },
  'invoiced': { title: '💰 Fakturisano', color: 'bg-orange-100 border-orange-300', textColor: 'text-orange-700' },
  'paid': { title: '✔️ Naplaćeno', color: 'bg-emerald-100 border-emerald-300', textColor: 'text-emerald-700' }
}

export function WorkflowKanbanClient() {
  const [columns, setColumns] = useState<WorkflowColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'list'>('kanban')
  const [companies, setCompanies] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    avgCompletionTime: 0,
    overdueItems: 0,
    todayItems: 0,
    weekItems: 0
  })
  const { toast } = useToast()
  const { openBlade } = useBladeStack()
  const supabase = createClient()

  useEffect(() => {
    fetchWorkflowData()
    fetchFilters()
  }, [])

  const fetchWorkflowData = async () => {
    setLoading(true)
    
    try {
      // Fetch ponude
      const { data: quotes } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!company_id (
            id,
            name
          ),
          quote_items (
            line_total
          )
        `)
        .order('created_at', { ascending: false })

      // Fetch radni nalozi
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select(`
          *,
          company:companies!company_id (
            id,
            name
          ),
          quote:quotes!quote_id (
            id,
            quote_number
          ),
          work_order_phases (
            status
          )
        `)
        .order('created_at', { ascending: false })

      // Fetch fakture (placeholder - pretpostavljam strukturu)
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies!company_id (
            id,
            name
          ),
          work_order:work_orders!work_order_id (
            id,
            order_number
          )
        `)
        .order('created_at', { ascending: false })

      // Transform data into workflow items
      const workflowItems: WorkflowItem[] = []
      
      // Process quotes
      quotes?.forEach(quote => {
        const total = quote.quote_items?.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0) || 0
        
        let columnId = 'new_quote'
        if (quote.status === 'sent') columnId = 'quote_sent'
        else if (quote.status === 'accepted') columnId = 'quote_accepted'
        
        workflowItems.push({
          id: `quote-${quote.id}`,
          type: 'quote',
          status: quote.status,
          title: `Ponuda #${quote.quote_number}`,
          company: quote.company?.name || 'N/A',
          companyId: quote.company_id,
          amount: total,
          dueDate: quote.valid_until,
          priority: 'normal',
          tags: ['ponuda'],
          createdAt: quote.created_at,
          updatedAt: quote.updated_at || quote.created_at,
          linkedItems: {},
          metadata: { quoteId: quote.id, columnId }
        })
      })

      // Process work orders
      workOrders?.forEach(wo => {
        const completedPhases = wo.work_order_phases?.filter((p: any) => p.status === 'completed').length || 0
        const totalPhases = wo.work_order_phases?.length || 1
        const progress = Math.round((completedPhases / totalPhases) * 100)
        
        let columnId = 'in_production'
        if (wo.status === 'completed') columnId = 'production_complete'
        
        workflowItems.push({
          id: `wo-${wo.id}`,
          type: 'work_order',
          status: wo.status,
          title: `RN #${wo.order_number}`,
          company: wo.company?.name || 'N/A',
          companyId: wo.company_id,
          amount: 0, // Could calculate from quote
          dueDate: wo.due_date,
          assignedTo: wo.assigned_to,
          priority: wo.priority || 'normal',
          progress,
          tags: ['proizvodnja'],
          createdAt: wo.created_at,
          updatedAt: wo.updated_at || wo.created_at,
          linkedItems: { quoteId: wo.quote_id },
          metadata: { workOrderId: wo.id, columnId }
        })
      })

      // Process invoices
      invoices?.forEach(invoice => {
        let columnId = 'invoiced'
        if (invoice.payment_status === 'paid') columnId = 'paid'
        // Dodavanje overdue logike
        if (invoice.due_date && parseISO(invoice.due_date) < new Date() && invoice.payment_status === 'unpaid') {
          invoice.priority = 'urgent' // Označava kao hitno ako kasni
        }
        
        workflowItems.push({
          id: `inv-${invoice.id}`,
          type: 'invoice',
          status: invoice.payment_status,
          title: `Faktura #${invoice.invoice_number}`,
          company: invoice.company?.name || 'N/A',
          companyId: invoice.company_id,
          amount: invoice.total_amount,
          dueDate: invoice.due_date,
          priority: 'normal',
          tags: ['faktura'],
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at || invoice.created_at,
          linkedItems: { workOrderId: invoice.work_order_id },
          metadata: { invoiceId: invoice.id, columnId }
        })
      })

      // Organize into columns
      const columnData: WorkflowColumn[] = Object.entries(WORKFLOW_STAGES).map(([id, stage]) => {
        const items = workflowItems.filter(item => item.metadata?.columnId === id)
        const totalValue = items.reduce((sum, item) => sum + item.amount, 0)
        
        return {
          id,
          title: stage.title,
          icon: FileText,
          color: stage.color,
          items,
          itemCount: items.length,
          totalValue
        }
      })

      setColumns(columnData)
      
      // Calculate stats
      const now = new Date()
      const weekFromNow = addDays(now, 7)
      const overdueItems = workflowItems.filter(item => 
        item.dueDate && parseISO(item.dueDate) < now && !['paid', 'completed'].includes(item.status)
      ).length
      
      const todayItems = workflowItems.filter(item => {
        if (!item.dueDate) return false
        const dueDate = parseISO(item.dueDate)
        return dueDate.toDateString() === now.toDateString()
      }).length
      
      const weekItems = workflowItems.filter(item => {
        if (!item.dueDate) return false
        const dueDate = parseISO(item.dueDate)
        return dueDate >= now && dueDate <= weekFromNow
      }).length

      setStats({
        totalItems: workflowItems.length,
        totalValue: workflowItems.reduce((sum, item) => sum + item.amount, 0),
        avgCompletionTime: 7, // Calculate from actual data
        overdueItems,
        todayItems,
        weekItems
      })
      
    } catch (error) {
      console.error('Error fetching workflow data:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju workflow podataka'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchFilters = async () => {
    // Fetch companies for filter
    const { data: companiesData } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
    
    if (companiesData) {
      setCompanies(companiesData)
    }

    // Mock team members - replace with actual data
    setTeamMembers([
      { id: '1', name: 'Marko Marković', avatar: '/avatars/marko.jpg' },
      { id: '2', name: 'Ana Anić', avatar: '/avatars/ana.jpg' },
      { id: '3', name: 'Petar Petrović', avatar: '/avatars/petar.jpg' }
    ])
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceColumn = columns.find(col => col.id === source.droppableId)
    const destColumn = columns.find(col => col.id === destination.droppableId)
    
    if (!sourceColumn || !destColumn) return

    const item = sourceColumn.items.find(item => item.id === draggableId)
    if (!item) return

    // Remove from source
    const newSourceItems = [...sourceColumn.items]
    newSourceItems.splice(source.index, 1)
    
    // Add to destination
    const newDestItems = [...destColumn.items]
    newDestItems.splice(destination.index, 0, item)
    
    // Update columns
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return { ...col, items: newSourceItems }
      }
      if (col.id === destination.droppableId) {
        return { ...col, items: newDestItems }
      }
      return col
    })
    
    setColumns(newColumns)

    // Update in database based on item type and new column
    try {
      if (item.type === 'quote' && destination.droppableId === 'quote_accepted') {
        // Update quote status
        await supabase
          .from('quotes')
          .update({ status: 'accepted' })
          .eq('id', item.metadata.quoteId)
        
        toast({
          title: 'Status ažuriran',
          description: 'Ponuda je označena kao prihvaćena'
        })
      }
      // Add more status update logic for other transitions
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri ažuriranju statusa'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'normal': return 'bg-blue-500'
      case 'low': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'quote': return FileText
      case 'work_order': return Factory
      case 'invoice': return Receipt
      case 'payment': return CreditCard
      default: return Package
    }
  }

  const handleViewItem = (item: WorkflowItem) => {
    if (item.type === 'quote' && item.metadata?.quoteId) {
      openBlade(ViewQuoteWrapper, { quoteId: item.metadata.quoteId })
    } else if (item.type === 'work_order' && item.metadata?.workOrderId) {
      openBlade(ViewWorkOrderWrapper, { workOrderId: item.metadata.workOrderId })
    } else if (item.type === 'invoice' && item.metadata?.invoiceId) {
      openBlade(ViewInvoiceWrapper, { invoiceId: item.metadata.invoiceId })
    }
  }

  const filteredColumns = columns.map(col => ({
    ...col,
    items: col.items.filter(item => {
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !item.company.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterCompany !== 'all' && item.companyId !== filterCompany) return false
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false
      if (filterAssignee !== 'all' && item.assignedTo !== filterAssignee) return false
      return true
    })
  }))

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Workflow Management
            </h1>
            <p className="text-muted-foreground">Pratite ceo proces od ponude do naplate</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Activity className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova ponuda
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži po nazivu ili firmi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sve firme" />
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
          
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi prioriteti</SelectItem>
              <SelectItem value="urgent">Hitno</SelectItem>
              <SelectItem value="high">Visok</SelectItem>
              <SelectItem value="normal">Normalan</SelectItem>
              <SelectItem value="low">Nizak</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[180px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Dodeljeno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.totalItems}</span>
            <span className="text-muted-foreground">ukupno</span>
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">€{stats.totalValue.toLocaleString()}</span>
            <span className="text-muted-foreground">vrednost</span>
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.avgCompletionTime}d</span>
            <span className="text-muted-foreground">prosek</span>
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          {stats.overdueItems > 0 && (
            <>
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{stats.overdueItems}</span>
                <span>kasni</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
            </>
          )}
          
          <div className="flex items-center gap-2 text-orange-600">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{stats.todayItems}</span>
            <span>danas</span>
          </div>
          
          <div className="flex items-center gap-2 text-blue-600">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{stats.weekItems}</span>
            <span>ove nedelje</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="flex-1">
            <div className="flex gap-4 p-6 h-full min-w-max">
              {filteredColumns.map(column => (
                <div key={column.id} className="flex flex-col w-80">
                  <div className={cn(
                    "rounded-t-lg border-2 p-3",
                    WORKFLOW_STAGES[column.id as keyof typeof WORKFLOW_STAGES]?.color
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold",
                          WORKFLOW_STAGES[column.id as keyof typeof WORKFLOW_STAGES]?.textColor
                        )}>
                          {column.title}
                        </h3>
                        <Badge variant="secondary" className="ml-auto">
                          {column.items.length}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Sortiraj po datumu
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Sortiraj po vrednosti
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {column.totalValue !== undefined && column.totalValue > 0 && (
                      <p className="text-xs mt-1 opacity-75">
                        €{column.totalValue.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 bg-gray-100 p-2 space-y-2 overflow-y-auto rounded-b-lg",
                          snapshot.isDraggingOver && "bg-blue-50"
                        )}
                      >
                        {column.items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "p-3 cursor-move hover:shadow-lg transition-shadow",
                                  snapshot.isDragging && "shadow-xl rotate-2 scale-105"
                                )}
                              >
                                <div className="space-y-2">
                                  {/* Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      {React.createElement(getItemIcon(item.type), {
                                        className: "h-4 w-4 text-muted-foreground"
                                      })}
                                      <span className="font-medium text-sm">{item.title}</span>
                                    </div>
                                    <div className={cn(
                                      "h-2 w-2 rounded-full",
                                      getPriorityColor(item.priority)
                                    )} />
                                  </div>
                                  
                                  {/* Company */}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    <span>{item.company}</span>
                                  </div>
                                  
                                  {/* Amount */}
                                  {item.amount > 0 && (
                                    <div className="font-semibold text-sm">
                                      €{item.amount.toLocaleString()}
                                    </div>
                                  )}
                                  
                                  {/* Progress */}
                                  {item.progress !== undefined && (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Napredak</span>
                                        <span className="font-medium">{item.progress}%</span>
                                      </div>
                                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-primary transition-all"
                                          style={{ width: `${item.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Due Date */}
                                  {item.dueDate && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span className={cn(
                                        parseISO(item.dueDate) < new Date() && "text-red-600 font-medium"
                                      )}>
                                        {format(parseISO(item.dueDate), 'dd.MM.yyyy', { locale: sr })}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Tags */}
                                  {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Footer */}
                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center gap-1">
                                      {item.assignedTo && (
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs">
                                            {item.assignedTo.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleViewItem(item)
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DragDropContext>
      )}

      {/* Timeline View - Placeholder */}
      {viewMode === 'timeline' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Timeline View</h3>
            <p className="text-muted-foreground">Vizualizacija procesa kroz vreme - uskoro!</p>
          </div>
        </div>
      )}

      {/* List View - Placeholder */}
      {viewMode === 'list' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">List View</h3>
            <p className="text-muted-foreground">Tabelarni prikaz svih procesa - uskoro!</p>
          </div>
        </div>
      )}
    </div>
  )
}