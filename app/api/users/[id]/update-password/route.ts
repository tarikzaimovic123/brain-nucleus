import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const userId = context.params.id
    console.log('Password update API called for user:', userId)
    
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has permission
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
    
    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return NextResponse.json(
        { error: 'Failed to check permissions' },
        { status: 500 }
      )
    }
    
    const isAdmin = userRoles?.some((ur: any) => 
      ur.role?.name === 'admin' || ur.role?.name === 'super_admin'
    )
    
    if (!isAdmin) {
      console.log('User is not admin:', user.email)
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }
    const { password } = await request.json()
    
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if service role key exists
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    // Update user password
    console.log('Attempting to update password with service role for user:', userId)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (error) {
      console.error('Supabase error updating password:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('Password updated successfully via API')
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      userId: userId
    })
  } catch (error: any) {
    console.error('Server error in password update:', error)
    console.error('Error stack:', error.stack)
    
    // Make sure we always return valid JSON
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update password',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}