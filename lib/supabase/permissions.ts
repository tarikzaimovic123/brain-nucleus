import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface ServerPermissionCheck {
  hasPermission: boolean
  user: any | null
  roles: any[]
  permissions: any[]
  message?: string
}

export async function checkServerPermission(
  resource: string,
  action: string
): Promise<ServerPermissionCheck> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        hasPermission: false,
        user: null,
        roles: [],
        permissions: [],
        message: 'Niste ulogovani'
      }
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
    
    // Check if user is admin
    const isAdmin = roles.some((role: any) => 
      role.name === 'admin' || role.name === 'super_admin'
    )
    
    if (isAdmin) {
      return {
        hasPermission: true,
        user,
        roles,
        permissions: [{ resource: '*', action: '*' }]
      }
    }

    // Check if user is manager (has most permissions except user management)
    const isManager = roles.some((role: any) => role.name === 'manager')
    if (isManager && resource !== 'users' && resource !== 'roles') {
      return {
        hasPermission: true,
        user,
        roles,
        permissions: []
      }
    }

    // Get permissions for user's roles
    const roleIds = roles.map((r: any) => r.id)
    if (roleIds.length === 0) {
      return {
        hasPermission: false,
        user,
        roles: [],
        permissions: [],
        message: 'Nemate dodeljene uloge'
      }
    }

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

    const permissions = rolePerms?.map((rp: any) => rp.permission) || []
    
    // Check if user has specific permission
    const hasPermission = permissions.some((p: any) => 
      (p.resource === resource || p.resource === '*') && 
      (p.action === action || p.action === '*')
    )

    return {
      hasPermission,
      user,
      roles,
      permissions,
      message: hasPermission ? undefined : `Nemate dozvolu za ${action} na ${resource}`
    }
  } catch (error) {
    console.error('Error checking server permissions:', error)
    return {
      hasPermission: false,
      user: null,
      roles: [],
      permissions: [],
      message: 'Greška pri proveri dozvola'
    }
  }
}

// Helper function for API routes
export async function requirePermission(
  resource: string,
  action: string
) {
  const permissionCheck = await checkServerPermission(resource, action)
  
  if (!permissionCheck.hasPermission) {
    return NextResponse.json(
      { 
        error: permissionCheck.message || 'Pristup odbijen',
        resource,
        action 
      },
      { status: 403 }
    )
  }
  
  return null // Permission granted
}

// Decorator for server actions
export function withServerPermission(
  resource: string,
  action: string
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: T
  ): T {
    return (async (...args: Parameters<T>) => {
      const permissionCheck = await checkServerPermission(resource, action)
      
      if (!permissionCheck.hasPermission) {
        throw new Error(permissionCheck.message || 'Pristup odbijen')
      }
      
      return target(...args)
    }) as T
  }
}