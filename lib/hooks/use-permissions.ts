import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface Permission {
  id: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  description: string | null
}

interface UserPermissions {
  roles: Role[]
  permissions: Permission[]
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  isAdmin: boolean
  isManager: boolean
}

export function usePermissions(resource?: string): UserPermissions & { loading: boolean } {
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<UserPermissions>({
    roles: [],
    permissions: [],
    canCreate: false,
    canRead: true, // Everyone can read by default
    canUpdate: false,
    canDelete: false,
    isAdmin: false,
    isManager: false
  })

  useEffect(() => {
    fetchUserPermissions()
  }, [resource])

  const fetchUserPermissions = async () => {
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          role:roles (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)

      const roles = userRoles?.map((ur: any) => ur.role) || []
      
      // Check if user is admin or manager
      const isAdmin = roles.some((role: Role) => 
        role.name === 'admin' || role.name === 'super_admin'
      )
      const isManager = roles.some((role: Role) => 
        role.name === 'manager'
      )

      // If admin, grant all permissions
      if (isAdmin) {
        setPermissions({
          roles,
          permissions: [],
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          isAdmin: true,
          isManager: false
        })
        setLoading(false)
        return
      }

      // Get permissions for user's roles
      const roleIds = roles.map((r: Role) => r.id)
      if (roleIds.length > 0) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select(`
            permission:permissions (
              id,
              resource,
              action
            )
          `)
          .in('role_id', roleIds)

        const allPermissions = rolePerms?.map((rp: any) => rp.permission) || []
        
        // Filter permissions for specific resource if provided
        const resourcePermissions = resource 
          ? allPermissions.filter((p: Permission) => p.resource === resource || p.resource === '*')
          : allPermissions

        // Check specific actions
        const canCreate = resourcePermissions.some((p: Permission) => 
          p.action === 'create' || p.action === '*'
        )
        const canUpdate = resourcePermissions.some((p: Permission) => 
          p.action === 'update' || p.action === '*'
        )
        const canDelete = resourcePermissions.some((p: Permission) => 
          p.action === 'delete' || p.action === '*'
        )

        setPermissions({
          roles,
          permissions: resourcePermissions,
          canCreate: canCreate || isManager,
          canRead: true,
          canUpdate: canUpdate || isManager,
          canDelete: canDelete || isManager,
          isAdmin: false,
          isManager
        })
      } else {
        // No roles = minimal permissions
        setPermissions({
          roles: [],
          permissions: [],
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          isAdmin: false,
          isManager: false
        })
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  return { ...permissions, loading }
}

// Helper function to check if user has specific permission
export function hasPermission(
  permissions: Permission[], 
  resource: string, 
  action: string
): boolean {
  return permissions.some(p => 
    (p.resource === resource || p.resource === '*') && 
    (p.action === action || p.action === '*')
  )
}