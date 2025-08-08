"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Shield, UserPlus, Search, MoreHorizontal, Edit, Trash2, Key, Mail, Phone, Calendar, Building } from "lucide-react"
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
import { format, parseISO } from "date-fns"
import { sr } from "date-fns/locale"

interface Role {
  id: string
  name: string
  description: string | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  roles?: Role[]
}

interface UserStats {
  total: number
  active: number
  inactive: number
  admins: number
  managers: number
  employees: number
  viewers: number
}

export function UsersClient() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    managers: 0,
    employees: 0,
    viewers: 0
  })

  const { toast } = useToast()
  const { openBlade } = useBladeStack()
  const { isAdmin, withPermissionCheck, loading: permissionsLoading } = usePermissionContext()

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
    setCurrentPage(1)
  }, [users, searchQuery, roleFilter, statusFilter])

  const fetchUsers = async () => {
    console.log('🔍 Fetching users...')
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Get user profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('📊 Profiles:', profiles)

      // For each profile, get their roles
      const profilesWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select(`
              role:roles (
                id,
                name,
                description
              )
            `)
            .eq('user_id', profile.id)

          console.log(`User ${profile.email} roles data:`, userRoles)

          // Simplify the roles structure
          const simplifiedRoles = userRoles?.map((ur: any) => ur.role) || []

          return {
            ...profile,
            email: profile.email || 'N/A',
            roles: simplifiedRoles
          }
        })
      )
      
      console.log('✅ Fetched', profilesWithRoles.length, 'users with roles')
      console.log('📋 Users with roles:', profilesWithRoles)
      setUsers(profilesWithRoles)
      calculateStats(profilesWithRoles)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju korisnika'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (usersData: UserProfile[]) => {
    const stats: UserStats = {
      total: usersData.length,
      active: usersData.filter(u => u.is_active).length,
      inactive: usersData.filter(u => !u.is_active).length,
      admins: usersData.filter(u => u.roles?.some((role: any) => 
        role.name === 'admin' || role.name === 'super_admin'
      )).length,
      managers: usersData.filter(u => u.roles?.some((role: any) => 
        role.name === 'manager'
      )).length,
      employees: usersData.filter(u => u.roles?.some((role: any) => 
        role.name === 'employee'
      )).length,
      viewers: usersData.filter(u => u.roles?.some((role: any) => 
        role.name === 'viewer'
      )).length
    }

    setStats(stats)
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.roles?.some((role: any) => role.name === roleFilter)
      )
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.is_active)
    }

    setFilteredUsers(filtered)
  }

  const handleView = async (user: UserProfile) => {
    // Import ViewUserBlade dynamically
    const { ViewUserBlade } = await import('@/components/users/view-user-blade')
    
    openBlade(ViewUserBlade, {
      user: user,
      onClose: () => {},
      onEdit: () => handleEdit(user),
      onDelete: () => handleDelete(user)
    }, { width: 'lg' })
  }

  const handleEdit = async (user: UserProfile) => {
    // Import EditUserBlade dynamically
    const { EditUserBlade } = await import('@/components/users/edit-user-blade')
    
    openBlade(EditUserBlade, {
      user: user,
      onClose: () => {},
      onSave: () => {
        fetchUsers()
      }
    }, { width: 'lg' })
  }

  const handleDelete = async (user: UserProfile) => {
    if (!confirm(`Da li ste sigurni da želite da obrišete korisnika ${user.email}?`)) {
      return
    }

    try {
      const supabase = createClient()
      
      // Deactivate user instead of deleting
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Uspeh',
        description: 'Korisnik je deaktiviran'
      })
      
      fetchUsers()
    } catch (error) {
      console.error('Error deactivating user:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri deaktivaciji korisnika'
      })
    }
  }

  const handleCreateUser = async () => {
    // Import EditUserBlade dynamically
    const { EditUserBlade } = await import('@/components/users/edit-user-blade')
    
    openBlade(EditUserBlade, {
      user: null,
      onClose: () => {},
      onSave: () => {
        fetchUsers()
      }
    }, { width: 'lg' })
  }

  const handleManageRoles = async () => {
    // Import ManageRolesBlade dynamically
    const { ManageRolesBlade } = await import('@/components/users/manage-roles-blade')
    
    openBlade(ManageRolesBlade, {
      onClose: () => {},
      onUpdate: () => {
        fetchUsers()
      }
    }, { width: 'lg' })
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'manager': return 'Menadžer'
      case 'employee': return 'Zaposleni'
      case 'viewer': return 'Pregledač'
      default: return roleName
    }
  }

  const columns = [
    {
      key: 'user',
      header: 'Korisnik',
      sortable: true,
      accessor: (user: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{user.full_name || 'Nepoznato ime'}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'roles',
      header: 'Uloge',
      accessor: (user: UserProfile) => {
        console.log('Rendering roles for user:', user.email, 'Roles:', user.roles)
        return (
          <div className="flex flex-wrap gap-1">
            {user.roles && user.roles.length > 0 ? (
              user.roles.map((role: any, idx) => {
                console.log('Rendering role:', role)
                // Ensure we're getting the right data
                const roleName = typeof role === 'object' ? role.name : role
                return (
                  <Badge 
                    key={idx} 
                    className={getRoleBadgeColor(roleName)}
                  >
                    {getRoleDisplayName(roleName)}
                  </Badge>
                )
              })
            ) : (
              <Badge variant="outline">Bez uloge</Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'phone',
      header: 'Telefon',
      accessor: (user: UserProfile) => (
        <span className="text-sm">
          {user.phone || '-'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (user: UserProfile) => (
        <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
          {user.is_active ? 'Aktivan' : 'Neaktivan'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      header: 'Datum kreiranja',
      sortable: true,
      accessor: (user: UserProfile) => (
        <span className="text-sm">
          {format(parseISO(user.created_at), 'dd.MM.yyyy', { locale: sr })}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Korisnici
          </h1>
          <p className="text-muted-foreground mt-1">
            Upravljanje korisnicima i dozvolama
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard resource="roles" action="update">
            <Button variant="outline" onClick={handleManageRoles}>
              <Shield className="h-4 w-4 mr-2" />
              Upravljaj ulogama
            </Button>
          </PermissionGuard>
          <PermissionGuard resource="users" action="create">
            <Button onClick={withPermissionCheck('users', 'create', handleCreateUser, 'kreiranje korisnika')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novi korisnik
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ukupno korisnika</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.active} aktivnih • {stats.inactive} neaktivnih
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-muted-foreground">Administratori</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.admins}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Puna kontrola sistema
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Menadžeri</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.managers}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Upravljanje timom
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">Zaposleni</span>
          </div>
          <div className="text-2xl font-bold mt-1">{stats.employees}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.viewers} pregledača
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
                placeholder="Pretraži po imenu, email-u, telefonu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Uloga" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sve uloge</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Menadžer</SelectItem>
              <SelectItem value="employee">Zaposleni</SelectItem>
              <SelectItem value="viewer">Pregledač</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="active">Aktivan</SelectItem>
              <SelectItem value="inactive">Neaktivan</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setRoleFilter('all')
                setStatusFilter('all')
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
          data={filteredUsers}
          columns={columns}
          isLoading={loading || permissionsLoading}
          onView={handleView}
          onEdit={withPermissionCheck('users', 'update', handleEdit, 'ažuriranje korisnika')}
          onDelete={withPermissionCheck('users', 'delete', handleDelete, 'brisanje korisnika')}
          emptyMessage="Nema korisnika za prikaz"
        />
      </Card>
    </div>
  )
}