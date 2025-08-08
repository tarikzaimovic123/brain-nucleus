'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Truck, Clock, CheckCircle, AlertCircle, Package, Eye, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ViewWorkOrderBlade } from '@/components/work-orders/view-work-order-blade'
import { EditWorkOrderBlade } from '@/components/work-orders/edit-work-order-blade'
import { DataGrid, type DataGridColumn } from '@/components/shared/data-grid'
import { createClient } from '@/lib/supabase/client'
import type { WorkOrder } from '@/types/work-orders'
import { format, parseISO, isAfter, differenceInDays } from 'date-fns'
import { sr } from 'date-fns/locale'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

export function WorkOrdersClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const searchParams = useSearchParams()
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, hasPermission, checkPermissionWithToast } = usePermissionContext()

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  // Open work order if coming from notification
  useEffect(() => {
    const viewId = searchParams.get('view')
    if (viewId && workOrders.length > 0) {
      const orderToView = workOrders.find(wo => wo.id === viewId)
      if (orderToView) {
        handleView(orderToView)
      }
    }
  }, [searchParams, workOrders])

  const fetchWorkOrders = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        company:companies!company_id (
          id,
          name,
          tax_number
        ),
        quote:quotes!quote_id (
          id,
          quote_number,
          total_amount
        ),
        work_order_items (
          id,
          description,
          quantity,
          unit_price,
          line_total,
          is_completed,
          product:products!product_id (
            id,
            name,
            code
          )
        ),
        work_order_phases (
          id,
          phase_name,
          phase_order,
          status,
          started_at,
          completed_at
        ),
        work_order_status_history (
          id,
          old_status,
          new_status,
          changed_at,
          notes
        )
      `)
      .order('created_at', { ascending: false })

    console.log('Work orders fetch result:', { data, error })
    
    if (error) {
      console.error('Error fetching work orders:', error)
    } else if (data) {
      console.log('Work orders fetched:', data.length)
      const rn2025 = data.find(wo => wo.order_number === 'RN-2025-0002')
      console.log('RN-2025-0002 work order:', rn2025)
      console.log('RN-2025-0002 phases:', rn2025?.work_order_phases)
      setWorkOrders(data as any)
    }
    setLoading(false)
  }

  const handleEdit = withPermissionCheck('work_orders', 'update', (workOrder: WorkOrder) => {
    openBlade(EditWorkOrderBlade, {
      workOrder: workOrder,
      onClose: () => {},
      onSuccess: () => {
        fetchWorkOrders()
      }
    }, { width: 'lg' })
  }, 'ažuriranje radnog naloga')

  const handleDelete = withPermissionCheck('work_orders', 'delete', async (workOrder: WorkOrder) => {
    if (!confirm(`Da li ste sigurni da želite obrisati radni nalog "${workOrder.order_number}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', workOrder.id)

    if (!error) {
      fetchWorkOrders()
    }
  }, 'brisanje radnog naloga')

  const handleView = (workOrder: WorkOrder) => {
    openBlade(ViewWorkOrderBlade, {
      workOrder: workOrder,
      onClose: () => {},
      onEdit: () => {
        openBlade(EditWorkOrderBlade, {
          workOrder: workOrder,
          onClose: () => {},
          onSuccess: () => {
            fetchWorkOrders()
          }
        }, { width: 'lg' })
      },
      onDelete: async () => {
        await handleDelete(workOrder)
      }
    }, { width: 'lg' })
  }

  const handleCreateNew = withPermissionCheck('work_orders', 'create', () => {
    openBlade(EditWorkOrderBlade, {
      workOrder: null,
      onClose: () => {},
      onSuccess: () => {
        fetchWorkOrders()
      }
    }, { width: 'lg' })
  }, 'kreiranje radnog naloga')

  // Calculate statistics
  const pendingOrders = workOrders.filter(wo => wo.status === 'pending')
  const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress')
  const completedOrders = workOrders.filter(wo => wo.status === 'completed')
  const overdueOrders = workOrders.filter(wo => 
    wo.due_date && isAfter(new Date(), parseISO(wo.due_date)) && wo.status !== 'completed'
  )

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Čeka</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">U toku</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Završen</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Otkazan</Badge>
      case 'on_hold':
        return <Badge variant="outline">Pauziran</Badge>
      default:
        return <Badge variant="outline">Nepoznato</Badge>
    }
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Hitno</Badge>
      case 'high':
        return <Badge variant="default" className="bg-orange-500">Visok</Badge>
      case 'normal':
        return <Badge variant="secondary">Normalan</Badge>
      case 'low':
        return <Badge variant="outline">Nizak</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  const getProgressColor = (percentage?: number) => {
    if (!percentage) return 'bg-gray-200'
    if (percentage < 30) return 'bg-red-500'
    if (percentage < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const columns: DataGridColumn<WorkOrder>[] = [
    {
      key: 'order_number',
      header: 'Broj naloga',
      sortable: true,
      accessor: (order) => (
        <div className="font-mono text-sm font-medium">{order.order_number}</div>
      ),
    },
    {
      key: 'company',
      header: 'Firma',
      sortable: true,
      accessor: (order) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{order.company?.name || 'N/A'}</div>
            {order.quote && (
              <div className="text-xs text-muted-foreground">Ponuda: {order.quote.quote_number}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      accessor: (order) => getStatusBadge(order.status),
    },
    {
      key: 'priority',
      header: 'Prioritet',
      sortable: true,
      align: 'center',
      accessor: (order) => getPriorityBadge(order.priority),
    },
    {
      key: 'progress',
      header: 'Napredak',
      sortable: true,
      accessor: (order) => (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">{order.progress_percentage || 0}%</span>
            <span className="text-xs text-muted-foreground">{order.current_phase || 'Početak'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressColor(order.progress_percentage)}`}
              style={{ width: `${order.progress_percentage || 0}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Rokovi',
      sortable: true,
      accessor: (order) => {
        const daysLeft = order.due_date ? differenceInDays(parseISO(order.due_date), new Date()) : null
        const isOverdue = daysLeft !== null && daysLeft < 0 && order.status !== 'completed'
        
        return (
          <div className="space-y-1">
            {order.start_date && (
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Početak: {format(parseISO(order.start_date), 'dd.MM.yyyy', { locale: sr })}</span>
              </div>
            )}
            {order.due_date && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Clock className={`h-3 w-3 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
                <span>Rok: {format(parseISO(order.due_date), 'dd.MM.yyyy', { locale: sr })}</span>
                {daysLeft !== null && order.status !== 'completed' && (
                  <span className={`ml-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                    ({isOverdue ? `Kasni ${Math.abs(daysLeft)} dana` : `Još ${daysLeft} dana`})
                  </span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'visibility',
      header: 'Vidljivost',
      sortable: true,
      align: 'center',
      accessor: (order) => (
        order.is_visible_to_client ? (
          <Badge variant="outline" className="text-green-600">
            <Eye className="h-3 w-3 mr-1" />
            Klijent
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-500">
            <User className="h-3 w-3 mr-1" />
            Interno
          </Badge>
        )
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Radni nalozi</h1>
          <p className="text-muted-foreground">Upravljanje proizvodnjom i praćenje napretka</p>
        </div>
        <PermissionGuard resource="work_orders" action="create">
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novi radni nalog
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Na čekanju</p>
              <p className="text-2xl font-bold">{pendingOrders.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Truck className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">U proizvodnji</p>
              <p className="text-2xl font-bold">{inProgressOrders.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Završeni</p>
              <p className="text-2xl font-bold">{completedOrders.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Kasne</p>
              <p className="text-2xl font-bold">{overdueOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <DataGrid
          data={workOrders}
          columns={columns}
          isLoading={loading}
          onEdit={hasPermission('work_orders', 'update') ? handleEdit : undefined}
          onDelete={hasPermission('work_orders', 'delete') ? handleDelete : undefined}
          onView={handleView}
          selectable={true}
          searchable={true}
          pageSize={25}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          emptyMessage="Nema pronađenih radnih naloga"
        />
      </Card>
    </div>
  )
}