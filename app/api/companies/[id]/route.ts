import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/supabase/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()
  
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(company)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check permission
  const permissionError = await requirePermission('companies', 'update')
  if (permissionError) return permissionError

  const supabase = createServerClient()
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('companies')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check permission
  const permissionError = await requirePermission('companies', 'delete')
  if (permissionError) return permissionError

  const supabase = createServerClient()
  
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}