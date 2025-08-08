export interface WorkOrder {
  id: string
  order_number: string
  quote_id?: string
  company_id?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  start_date?: string
  due_date?: string
  completion_date?: string
  assigned_to?: string
  description?: string
  internal_notes?: string
  total_hours?: number
  progress_percentage?: number
  is_visible_to_client?: boolean
  current_phase?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  
  // Relations
  company?: {
    id: string
    name: string
    tax_number?: string
  }
  quote?: {
    id: string
    quote_number: string
    total_amount?: number
  }
  work_order_items?: WorkOrderItem[]
  work_order_phases?: WorkOrderPhase[]
  work_order_comments?: WorkOrderComment[]
  work_order_status_history?: WorkOrderStatusHistory[]
}

export interface WorkOrderItem {
  id: string
  work_order_id: string
  product_id?: string
  description?: string
  quantity?: number
  unit_price?: number
  line_total?: number
  is_completed?: boolean
  completed_at?: string
  created_at?: string
  
  // Relations
  product?: {
    id: string
    name: string
    code?: string
  }
}

export interface WorkOrderPhase {
  id: string
  work_order_id: string
  phase_name: string
  phase_order: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  started_at?: string
  completed_at?: string
  assigned_to?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface WorkOrderComment {
  id: string
  work_order_id: string
  comment_text: string
  is_internal: boolean
  created_by?: string
  author_name?: string
  author_email?: string
  created_at: string
}

export interface WorkOrderStatusHistory {
  id: string
  work_order_id: string
  status: string
  changed_by?: string
  changed_at: string
  notes?: string
}

export interface WorkOrderShareLink {
  id: string
  work_order_id: string
  token: string
  created_at: string
  expires_at?: string
  viewed_count?: number
  is_active: boolean
}