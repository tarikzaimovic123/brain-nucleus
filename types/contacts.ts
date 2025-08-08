export interface ContactPerson {
  id: string
  company_id: string
  first_name: string
  last_name: string
  position?: string | null
  phone?: string | null
  mobile?: string | null
  email?: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
  
  // Relations
  company?: {
    id: string
    name: string
  }
}

export interface ContactPersonFormData {
  company_id: string
  first_name: string
  last_name: string
  position?: string
  phone?: string
  mobile?: string
  email?: string
  is_primary: boolean
}