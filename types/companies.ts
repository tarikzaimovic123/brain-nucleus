export interface Company {
  id: string
  name: string
  country: string
  is_active: boolean
  credit_limit: number
  payment_terms: number
  tax_number?: string
  vat_number?: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  website?: string
  bank_account?: string
  created_at: string
  updated_at: string
}

export interface CompanyFormData {
  name: string
  country: string
  is_active: boolean
  credit_limit: number
  payment_terms: number
  tax_number?: string
  vat_number?: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  website?: string
  bank_account?: string
}