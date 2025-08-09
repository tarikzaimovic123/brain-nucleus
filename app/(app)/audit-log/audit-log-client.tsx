"use client"

import { useState, useEffect } from "react"
import { ScrollText, Filter, Calendar, User, Activity, Database, Globe, Eye, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useBladeStack } from "@/lib/contexts/blade-stack-context"
import { ViewAuditBlade } from "@/components/audit/view-audit-blade"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataGrid } from "@/components/shared/data-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO } from "date-fns"
import { sr } from "date-fns/locale"

interface AuditLog {
  id: string
  table_name: string
  record_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
  new_data: any
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface AuditStats {
  total: number
  inserts: number
  updates: number
  deletes: number
  uniqueUsers: number
  todayActions: number
}

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [tables, setTables] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    inserts: 0,
    updates: 0,
    deletes: 0,
    uniqueUsers: 0,
    todayActions: 0
  })

  const { toast } = useToast()
  const { openBlade } = useBladeStack()

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchQuery, actionFilter, tableFilter, userFilter, dateFilter])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch logs with date filter
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Apply date filter
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data: auditData, error } = await query
      
      if (error) throw error
      
      // Fetch user emails using RPC function
      const userIds = Array.from(new Set(auditData?.map(log => log.user_id).filter(Boolean) || []))
      
      let usersMap: Record<string, string> = {}
      
      if (userIds.length > 0) {
        // Call RPC function to get user emails
        const { data: usersData, error: usersError } = await supabase
          .rpc('get_user_emails', { user_ids: userIds })
        
        if (usersData && !usersError) {
          usersMap = Object.fromEntries(usersData.map(u => [u.user_id, u.email]))
        }
      }
      
      // Merge user emails into audit logs
      const data = auditData?.map(log => ({
        ...log,
        user_email: log.user_id ? usersMap[log.user_id] || null : null
      })) || []

      setLogs(data)
      
      // Extract unique tables and users
      const uniqueTables = [...new Set(data?.map(log => log.table_name) || [])]
      const uniqueUsers = [...new Set(data?.map(log => log.user_email).filter(Boolean) || [])]
      
      setTables(uniqueTables.sort())
      setUsers(uniqueUsers.sort())
      
      // Calculate stats
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju audit logova'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logsData: AuditLog[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const stats: AuditStats = {
      total: logsData.length,
      inserts: logsData.filter(log => log.action === 'INSERT').length,
      updates: logsData.filter(log => log.action === 'UPDATE').length,
      deletes: logsData.filter(log => log.action === 'DELETE').length,
      uniqueUsers: [...new Set(logsData.map(log => log.user_id).filter(Boolean))].length,
      todayActions: logsData.filter(log => 
        new Date(log.created_at) >= today
      ).length
    }

    setStats(stats)
  }

  const filterLogs = () => {
    let filtered = logs

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log =>
        log.table_name.toLowerCase().includes(query) ||
        log.user_email?.toLowerCase().includes(query) ||
        log.record_id?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      )
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter)
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.user_email === userFilter)
    }

    setFilteredLogs(filtered)
  }

  const viewDetails = (log: AuditLog) => {
    openBlade(ViewAuditBlade, {
      audit: log,
      onClose: () => {}
    }, { width: 'lg' })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      'companies': 'Firme',
      'contacts': 'Kontakti',
      'products': 'Artikli',
      'quotes': 'Ponude',
      'work_orders': 'Radni nalozi',
      'invoices': 'Fakture',
      'users': 'Korisnici',
      'work_order_items': 'Stavke radnog naloga'
    }
    return tableNames[tableName] || tableName
  }

  const getActionDisplayName = (action: string) => {
    const actions: Record<string, string> = {
      'INSERT': 'Kreiranje',
      'UPDATE': 'Izmena',
      'DELETE': 'Brisanje'
    }
    return actions[action] || action
  }

  const columns = [
    {
      key: 'created_at',
      header: 'Datum/Vreme',
      sortable: true,
      render: (log: AuditLog) => (
        <div>
          <div className="font-medium">
            {format(parseISO(log.created_at), 'dd.MM.yyyy', { locale: sr })}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(parseISO(log.created_at), 'HH:mm:ss')}
          </div>
        </div>
      )
    },
    {
      key: 'user_email',
      header: 'Korisnik',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{log.user_email || 'Sistem'}</span>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Akcija',
      sortable: true,
      render: (log: AuditLog) => (
        <Badge className={getActionColor(log.action)}>
          {getActionDisplayName(log.action)}
        </Badge>
      )
    },
    {
      key: 'table_name',
      header: 'Tabela',
      sortable: true,
      render: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span>{getTableDisplayName(log.table_name)}</span>
        </div>
      )
    },
    {
      key: 'record_id',
      header: 'ID Zapisa',
      render: (log: AuditLog) => (
        <div className="font-mono text-xs">
          {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
        </div>
      )
    },
    // IP adresa trenutno nije dostupna jer trigger funkcija ne može da je hvata
    // {
    //   key: 'ip_address',
    //   header: 'IP Adresa',
    //   render: (log: AuditLog) => (
    //     <div className="flex items-center gap-2">
    //       <Globe className="h-4 w-4 text-muted-foreground" />
    //       <span className="text-sm">{log.ip_address || '-'}</span>
    //     </div>
    //   )
    // },
    {
      key: 'details',
      header: 'Detalji',
      render: (log: AuditLog) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => viewDetails(log)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ScrollText className="h-8 w-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Praćenje svih promena u sistemu
          </p>
        </div>
        <Button onClick={fetchAuditLogs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Osveži
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ukupno</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Kreirano</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">{stats.inserts}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Izmenjeno</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{stats.updates}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-600" />
            <span className="text-sm text-muted-foreground">Obrisano</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">{stats.deletes}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Korisnici</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.uniqueUsers}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Danas</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.todayActions}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži po tabeli, korisniku, ID-ju..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Akcija" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve akcije</SelectItem>
              <SelectItem value="INSERT">Kreiranje</SelectItem>
              <SelectItem value="UPDATE">Izmena</SelectItem>
              <SelectItem value="DELETE">Brisanje</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve tabele</SelectItem>
              {tables.map(table => (
                <SelectItem key={table} value={table}>
                  {getTableDisplayName(table)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Korisnik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi korisnici</SelectItem>
              {users.map(user => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(value) => {
            setDateFilter(value)
            fetchAuditLogs()
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi periodi</SelectItem>
              <SelectItem value="today">Danas</SelectItem>
              <SelectItem value="week">Ova nedelja</SelectItem>
              <SelectItem value="month">Ovaj mesec</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || actionFilter !== 'all' || tableFilter !== 'all' || userFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setActionFilter('all')
                setTableFilter('all')
                setUserFilter('all')
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
          data={filteredLogs}
          columns={columns}
          isLoading={loading}
          onView={viewDetails}
          emptyMessage="Nema audit logova za prikaz"
          pageSize={25}
        />
      </Card>
    </div>
  )
}