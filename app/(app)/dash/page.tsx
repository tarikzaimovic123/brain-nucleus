import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskList } from '@/components/dashboard/task-list'
import { FileText, Calculator, ClipboardList, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard | Brain Nucleus',
  description: 'PrintPrice Business Management Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch statistics
  const [companiesResult, invoicesResult, quotesResult, workOrdersResult, tasksResult] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact' }),
    supabase.from('invoices').select('id, total_amount, status'),
    supabase.from('quotes').select('id, status'),
    supabase.from('work_orders').select('id, status'),
    supabase.from('tasks').select('*').order('created_at', { ascending: false })
  ])

  const activeInvoices = invoicesResult.data?.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length || 0
  const totalRevenue = invoicesResult.data?.reduce((sum, i) => i.status === 'paid' ? sum + (i.total_amount || 0) : sum, 0) || 0
  const activeQuotes = quotesResult.data?.filter(q => q.status === 'sent' || q.status === 'draft').length || 0
  const activeWorkOrders = workOrdersResult.data?.filter(w => w.status === 'in_progress' || w.status === 'pending').length || 0

  const tasks = tasksResult.data || []
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Pregled poslovanja - Brain Media Podgorica</p>
      </div>

      {/* Business Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivne fakture</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Ukupna naplata: €{totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktivne ponude</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeQuotes}</div>
            <p className="text-xs text-muted-foreground">
              U pripremi i poslate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Radni nalozi</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkOrders}</div>
            <p className="text-xs text-muted-foreground">
              U toku i na čekanju
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kompanije</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companiesResult.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ukupno klijenata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno zadataka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">U toku</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Završeno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Zadaci</CardTitle>
          <CardDescription>Upravljanje zadacima i praćenje napretka</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskList initialTasks={tasks} />
        </CardContent>
      </Card>
    </div>
  )
}