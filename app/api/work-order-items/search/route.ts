import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema
const searchSchema = z.object({
  query: z.string().optional(),
  company_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  status: z.array(z.string()).optional(),
  already_invoiced: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50)
})

export async function POST(request: NextRequest) {
  console.log('📡 API work-order-items/search called')
  
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.email)

    // Parse and validate request body
    const body = await request.json()
    console.log('📥 Request body:', body)
    const params = searchSchema.parse(body)
    
    // Calculate offset
    const offset = (params.page - 1) * params.limit

    // Call the search function
    console.log('🔍 Calling RPC with params:', {
      search_query: params.query || null,
      p_company_id: params.company_id || null,
      p_date_from: params.date_from || null,
      p_date_to: params.date_to || null,
      p_status: params.status || null,
      p_show_invoiced: params.already_invoiced || false,
      p_limit: params.limit,
      p_offset: offset
    })
    
    const { data, error } = await supabase.rpc('search_work_order_items', {
      search_query: params.query || null,
      p_company_id: params.company_id || null,
      p_date_from: params.date_from || null,
      p_date_to: params.date_to || null,
      p_status: params.status || null,
      p_show_invoiced: params.already_invoiced || false,
      p_limit: params.limit,
      p_offset: offset
    })

    if (error) {
      console.error('❌ RPC Search error:', error)
      return NextResponse.json({ error: 'Search failed', details: error.message }, { status: 500 })
    }
    
    console.log('✅ RPC returned', data?.length || 0, 'items')

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('work_order_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', true)
      .match(params.company_id ? { work_order_id: params.company_id } : {})

    // Map the results to expected format
    const mappedData = data?.map((item: any) => ({
      item_id: item.item_id,
      work_order_id: item.wo_id,
      order_number: item.order_number,
      company_id: item.comp_id,
      company_name: item.company_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      is_completed: item.is_completed,
      completed_at: item.completed_at,
      already_invoiced: item.already_invoiced,
      invoice_id: item.invoice_id,
      rank: item.rank
    })) || []

    // Calculate aggregations
    const aggregations = {
      total_amount: mappedData.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0) || 0,
      total_items: mappedData.length || 0,
      by_company: mappedData.reduce((acc: any, item: any) => {
        if (!acc[item.company_name]) {
          acc[item.company_name] = 0
        }
        acc[item.company_name] += item.line_total || 0
        return acc
      }, {})
    }

    return NextResponse.json({
      items: mappedData,
      total: count || 0,
      page: params.page,
      limit: params.limit,
      total_pages: Math.ceil((count || 0) / params.limit),
      aggregations
    })

  } catch (error) {
    console.error('API error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}