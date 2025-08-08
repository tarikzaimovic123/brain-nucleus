"use client"

import { useState, useEffect } from "react"
import { X, Shield, Plus, Edit, Trash2, Key, Users, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  permissions?: RolePermission[]
}

interface Permission {
  id: string
  resource: string
  action: string
  description: string | null
}

interface RolePermission {
  permission: Permission
}

interface ManageRolesBladeProps {
  onClose: () => void
  onUpdate: () => void
}

export function ManageRolesBlade({ onClose, onUpdate }: ManageRolesBladeProps) {
  const [activeTab, setActiveTab] = useState("roles")
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch roles with permissions
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            permission:permissions (
              id,
              resource,
              action,
              description
            )
          )
        `)
        .order('name')

      if (rolesError) throw rolesError

      // Fetch all permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('resource, action')

      if (permissionsError) throw permissionsError

      setRoles(rolesData || [])
      setPermissions(permissionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju podataka'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setSelectedPermissions(role.role_permissions?.map(rp => rp.permission.id) || [])
    setShowRoleDialog(true)
  }

  const handleDeleteRole = async (role: Role) => {
    // Prevent deletion of system roles
    if (['super_admin', 'admin', 'manager', 'employee', 'viewer'].includes(role.name)) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Sistemske uloge se ne mogu brisati'
      })
      return
    }

    if (!confirm(`Da li ste sigurni da želite da obrišete ulogu ${role.name}?`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error

      toast({
        title: 'Uspeh',
        description: 'Uloga je obrisana'
      })
      
      fetchData()
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri brisanju uloge'
      })
    }
  }

  const handleSaveRole = async (name: string, description: string) => {
    try {
      const supabase = createClient()
      
      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({ name, description })
          .eq('id', editingRole.id)

        if (error) throw error

        // Update permissions
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', editingRole.id)

        if (selectedPermissions.length > 0) {
          const permissionInserts = selectedPermissions.map(permId => ({
            role_id: editingRole.id,
            permission_id: permId
          }))

          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permissionInserts)

          if (permError) throw permError
        }

        toast({
          title: 'Uspeh',
          description: 'Uloga je ažurirana'
        })
      } else {
        // Create new role
        const { data: newRole, error } = await supabase
          .from('roles')
          .insert({ name, description })
          .select()
          .single()

        if (error) throw error

        // Assign permissions
        if (selectedPermissions.length > 0 && newRole) {
          const permissionInserts = selectedPermissions.map(permId => ({
            role_id: newRole.id,
            permission_id: permId
          }))

          const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permissionInserts)

          if (permError) throw permError
        }

        toast({
          title: 'Uspeh',
          description: 'Uloga je kreirana'
        })
      }

      setShowRoleDialog(false)
      setEditingRole(null)
      setSelectedPermissions([])
      fetchData()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving role:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: error.message || 'Greška pri čuvanju uloge'
      })
    }
  }

  const handleSavePermission = async (resource: string, action: string, description: string) => {
    try {
      const supabase = createClient()
      
      if (editingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('permissions')
          .update({ resource, action, description })
          .eq('id', editingPermission.id)

        if (error) throw error

        toast({
          title: 'Uspeh',
          description: 'Dozvola je ažurirana'
        })
      } else {
        // Create new permission
        const { error } = await supabase
          .from('permissions')
          .insert({ resource, action, description })

        if (error) throw error

        toast({
          title: 'Uspeh',
          description: 'Dozvola je kreirana'
        })
      }

      setShowPermissionDialog(false)
      setEditingPermission(null)
      fetchData()
    } catch (error: any) {
      console.error('Error saving permission:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: error.message || 'Greška pri čuvanju dozvole'
      })
    }
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Upravljanje ulogama</h2>
            <p className="text-sm text-muted-foreground">Konfigurišite uloge i dozvole</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b px-6">
            <TabsList className="h-12 bg-transparent p-0 rounded-none">
              <TabsTrigger 
                value="roles" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Uloge
              </TabsTrigger>
              <TabsTrigger 
                value="permissions" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Dozvole
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="roles" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Sistemske uloge</h3>
              <Button onClick={() => {
                setEditingRole(null)
                setSelectedPermissions([])
                setShowRoleDialog(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova uloga
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {roles.map((role) => (
                  <Card key={role.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRoleBadgeColor(role.name)}>
                            {getRoleDisplayName(role.name)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({role.role_permissions?.length || 0} dozvola)
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!['super_admin', 'admin', 'manager', 'employee', 'viewer'].includes(role.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Sistemske dozvole</h3>
              <Button onClick={() => {
                setEditingPermission(null)
                setShowPermissionDialog(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nova dozvola
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4">
                {permissions.map((permission) => (
                  <Card key={permission.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {permission.resource}.{permission.action}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPermission(permission)
                            setShowPermissionDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Uredi ulogu' : 'Nova uloga'}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editingRole}
            permissions={permissions}
            selectedPermissions={selectedPermissions}
            onSelectedPermissionsChange={setSelectedPermissions}
            onSave={handleSaveRole}
            onCancel={() => {
              setShowRoleDialog(false)
              setEditingRole(null)
              setSelectedPermissions([])
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? 'Uredi dozvolu' : 'Nova dozvola'}
            </DialogTitle>
          </DialogHeader>
          <PermissionForm
            permission={editingPermission}
            onSave={handleSavePermission}
            onCancel={() => {
              setShowPermissionDialog(false)
              setEditingPermission(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Role Form Component
function RoleForm({
  role,
  permissions,
  selectedPermissions,
  onSelectedPermissionsChange,
  onSave,
  onCancel
}: {
  role: Role | null
  permissions: Permission[]
  selectedPermissions: string[]
  onSelectedPermissionsChange: (permissions: string[]) => void
  onSave: (name: string, description: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, description)
  }

  const handlePermissionToggle = (permissionId: string) => {
    if (selectedPermissions.includes(permissionId)) {
      onSelectedPermissionsChange(selectedPermissions.filter(p => p !== permissionId))
    } else {
      onSelectedPermissionsChange([...selectedPermissions, permissionId])
    }
  }

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-name">Naziv uloge</Label>
        <Input
          id="role-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-description">Opis</Label>
        <Textarea
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Dozvole</Label>
        <div className="max-h-60 overflow-y-auto space-y-4 border rounded-lg p-4">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource}>
              <h4 className="font-medium mb-2">{resource}</h4>
              <div className="space-y-2 pl-4">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={selectedPermissions.includes(perm.id)}
                      onCheckedChange={() => handlePermissionToggle(perm.id)}
                    />
                    <Label
                      htmlFor={`perm-${perm.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {perm.action} - {perm.description}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Otkaži
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sačuvaj
        </Button>
      </DialogFooter>
    </form>
  )
}

// Permission Form Component
function PermissionForm({
  permission,
  onSave,
  onCancel
}: {
  permission: Permission | null
  onSave: (resource: string, action: string, description: string) => void
  onCancel: () => void
}) {
  const [resource, setResource] = useState(permission?.resource || '')
  const [action, setAction] = useState(permission?.action || '')
  const [description, setDescription] = useState(permission?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resource.trim() || !action.trim()) return
    onSave(resource, action, description)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="perm-resource">Resurs</Label>
        <Input
          id="perm-resource"
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          placeholder="npr. users, invoices, products"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="perm-action">Akcija</Label>
        <Input
          id="perm-action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="npr. create, read, update, delete"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="perm-description">Opis</Label>
        <Textarea
          id="perm-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Otkaži
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Sačuvaj
        </Button>
      </DialogFooter>
    </form>
  )
}