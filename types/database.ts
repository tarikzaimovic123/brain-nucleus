// Database types for Brain Nucleus - PrintPrice module

export interface Company {
  id: string
  name: string
  tax_number?: string
  vat_number?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  bank_account?: string
  is_active: boolean
  credit_limit?: number
  payment_terms?: number
  created_at: string
  updated_at: string
  created_by?: string
}

export interface ContactPerson {
  id: string
  company_id: string
  first_name: string
  last_name: string
  position?: string
  phone?: string
  mobile?: string
  email?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id?: string
  employee_code: string
  first_name: string
  last_name: string
  position?: string
  department?: string
  phone?: string
  mobile?: string
  email?: string
  hire_date?: string
  is_active: boolean
  hourly_rate?: number
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  parent_id?: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id?: string
  code: string
  name: string
  description?: string
  unit_of_measure: string
  purchase_price?: number
  selling_price?: number
  vat_rate: number
  stock_quantity: number
  minimum_stock: number
  is_service: boolean
  is_active: boolean
  paper_type?: string
  paper_weight?: number
  paper_format?: string
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  quote_number: string
  company_id?: string
  contact_person_id?: string
  quote_date: string
  valid_until?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  subtotal: number
  vat_amount: number
  total_amount: number
  discount_percentage: number
  discount_amount: number
  notes?: string
  internal_notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount_percentage: number
  line_total: number
  display_order: number
  created_at: string
}

export interface WorkOrder {
  id: string
  order_number: string
  quote_id?: string
  company_id?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  start_date?: string
  due_date?: string
  completion_date?: string
  assigned_to?: string
  description?: string
  internal_notes?: string
  total_hours: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface WorkOrderItem {
  id: string
  work_order_id: string
  product_id?: string
  description: string
  quantity: number
  completed_quantity: number
  notes?: string
  created_at: string
}

export interface Calculation {
  id: string
  calculation_number: string
  work_order_id?: string
  company_id?: string
  calculation_date: string
  paper_cost: number
  printing_cost: number
  finishing_cost: number
  other_material_cost: number
  prepress_hours: number
  printing_hours: number
  finishing_hours: number
  labor_rate: number
  total_material_cost: number
  total_labor_cost: number
  overhead_percentage: number
  overhead_amount: number
  margin_percentage: number
  margin_amount: number
  final_price: number
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  fiscal_number?: string
  work_order_id?: string
  company_id: string
  invoice_date: string
  due_date?: string
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  payment_method?: 'cash' | 'bank_transfer' | 'card' | 'check'
  subtotal: number
  vat_amount: number
  total_amount: number
  paid_amount: number
  discount_percentage: number
  discount_amount: number
  notes?: string
  fiscal_verified: boolean
  fiscal_qr_code?: string
  fiscal_iic?: string
  fiscal_signature?: string
  fiscal_timestamp?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount_percentage: number
  line_total: number
  vat_amount: number
  total_with_vat: number
  display_order: number
  created_at: string
}

export interface FiscalLog {
  id: string
  invoice_id?: string
  request_type: string
  request_xml: string
  response_xml?: string
  status: 'pending' | 'success' | 'error'
  error_message?: string
  iic_code?: string
  fiscal_number?: string
  qr_code?: string
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  payment_date: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'check'
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface PrintFormat {
  id: string
  name: string
  width_mm: number
  height_mm: number
  description?: string
  created_at: string
}

export interface OffsetSpecification {
  id: string
  name: string
  plate_size?: string
  max_paper_width?: number
  max_paper_height?: number
  colors: number
  description?: string
  created_at: string
}