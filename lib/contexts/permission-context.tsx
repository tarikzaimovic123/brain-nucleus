'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useToast } from '@/components/ui/use-toast'

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

interface PermissionContextValue {
  user: User | null
  roles: Role[]
  permissions: Permission[]
  loading: boolean
  hasPermission: (resource: string, action: string) => boolean
  canCreate: (resource: string) => boolean
  canRead: (resource: string) => boolean
  canUpdate: (resource: string) => boolean
  canDelete: (resource: string) => boolean
  isAdmin: boolean
  isManager: boolean
  checkPermissionWithToast: (resource: string, action: string, actionName?: string) => boolean
  withPermissionCheck: <T extends any[]>(
    resource: string,
    action: string,
    callback: (...args: T) => void | Promise<void>,
    actionName?: string
  ) => (...args: T) => void | Promise<void>
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isManager, setIsManager] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()
    
    // Load initial permissions
    loadUserPermissions()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Reload permissions when user signs in or changes
        console.log('Reloading permissions for user:', session?.user?.email)
        loadUserPermissions()
      } else if (event === 'SIGNED_OUT') {
        // Clear permissions on sign out
        console.log('Clearing permissions on sign out')
        setUser(null)
        setRoles([])
        setPermissions([])
        setIsAdmin(false)
        setIsManager(false)
        setLoading(false)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUserPermissions = async () => {
    console.log('Loading user permissions...')
    setLoading(true) // Reset loading state
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found, clearing permissions')
        setUser(null)
        setRoles([])
        setPermissions([])
        setIsAdmin(false)
        setIsManager(false)
        setLoading(false)
        return
      }
      
      console.log('Loading permissions for user:', user.email)
      setUser(user)

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

      const fetchedRoles = userRoles?.map((ur: any) => ur.role) || []
      console.log('User roles:', fetchedRoles.map((r: Role) => r.name).join(', '))
      setRoles(fetchedRoles)
      
      // Check if user is admin or manager
      const adminCheck = fetchedRoles.some((role: Role) => 
        role.name === 'admin' || role.name === 'super_admin'
      )
      const managerCheck = fetchedRoles.some((role: Role) => 
        role.name === 'manager'
      )
      
      console.log('Is Admin:', adminCheck, 'Is Manager:', managerCheck)
      setIsAdmin(adminCheck)
      setIsManager(managerCheck)

      // If admin, grant all permissions implicitly
      if (adminCheck) {
        setPermissions([{ id: 'admin', resource: '*', action: '*' }])
        setLoading(false)
        return
      }

      // Get permissions for user's roles
      const roleIds = fetchedRoles.map((r: Role) => r.id)
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
        setPermissions(allPermissions)
      }
      
      console.log('Permissions loaded successfully')
    } catch (error) {
      console.error('Error loading permissions:', error)
      setUser(null)
      setRoles([])
      setPermissions([])
      setIsAdmin(false)
      setIsManager(false)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (resource: string, action: string): boolean => {
    // Admins have all permissions
    if (isAdmin) return true
    
    // Managers have most permissions (except user management)
    if (isManager && resource !== 'users' && resource !== 'roles') return true
    
    // Check specific permissions
    return permissions.some(p => 
      (p.resource === resource || p.resource === '*') && 
      (p.action === action || p.action === '*')
    )
  }

  const canCreate = (resource: string): boolean => hasPermission(resource, 'create')
  const canRead = (resource: string): boolean => hasPermission(resource, 'read') || true // Everyone can read
  const canUpdate = (resource: string): boolean => hasPermission(resource, 'update')
  const canDelete = (resource: string): boolean => hasPermission(resource, 'delete')

  const checkPermissionWithToast = (resource: string, action: string, actionName?: string): boolean => {
    const hasAccess = hasPermission(resource, action)
    
    if (!hasAccess) {
      const actionText = actionName || action
      toast({
        title: "Pristup odbijen",
        description: `Nemate dozvolu za ${actionText} na ${resource}`,
        variant: "destructive"
      })
    }
    
    return hasAccess
  }

  const withPermissionCheck = <T extends any[]>(
    resource: string,
    action: string,
    callback: (...args: T) => void | Promise<void>,
    actionName?: string
  ) => {
    return async (...args: T) => {
      if (checkPermissionWithToast(resource, action, actionName)) {
        return callback(...args)
      }
    }
  }

  const value: PermissionContextValue = {
    user,
    roles,
    permissions,
    loading,
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isAdmin,
    isManager,
    checkPermissionWithToast,
    withPermissionCheck
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissionContext() {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider')
  }
  return context
}

// Permission Guard Component
interface PermissionGuardProps {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ 
  resource, 
  action, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissionContext()
  
  if (loading) return null
  
  if (hasPermission(resource, action)) {
    return <>{children}</>
  }
  
  return <>{fallback}</>
}

// HOC for wrapping components with permission checks
export function withPermission<P extends object>(
  resource: string,
  action: string,
  fallback?: React.ComponentType<P>
) {
  return function WithPermissionComponent(Component: React.ComponentType<P>) {
    return function PermissionWrappedComponent(props: P) {
      const { hasPermission, loading } = usePermissionContext()
      
      if (loading) return null
      
      if (hasPermission(resource, action)) {
        return <Component {...props} />
      }
      
      if (fallback) {
        const FallbackComponent = fallback
        return <FallbackComponent {...props} />
      }
      
      return null
    }
  }
}