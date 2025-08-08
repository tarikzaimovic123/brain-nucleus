import type { Company } from './companies'
import type { Contact } from './contacts'
import type { Product } from './products'

export interface Quote {
  id: string
  quote_number: string
  company_id?: string | null
  contact_person_id?: string | null
  quote_date: string
  valid_until?: string | null
  status?: string | null
  subtotal?: number | null
  vat_amount?: number | null
  total_amount?: number | null
  discount_percentage?: number | null
  discount_amount?: number | null
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  
  // Relations
  company?: Company | null
  contact_person?: Contact | null
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  vat_rate?: number | null
  discount_percentage?: number | null
  line_total: number
  display_order?: number | null
  created_at: string
  
  // Relations
  product?: Product | null
}

export interface QuoteFormData {
  company_id?: string
  contact_person_id?: string
  quote_date: string
  valid_until?: string
  status?: string
  discount_percentage?: number
  notes?: string
  internal_notes?: string
  quote_items: QuoteItemFormData[]
}

export interface QuoteItemFormData {
  id?: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  vat_rate?: number
  discount_percentage?: number
}

export interface QuoteStats {
  total_quotes: number
  active_quotes: number
  pending_quotes: number
  expired_quotes: number
  total_value: number
  average_value: number
}