export interface Product {
  id: string
  category_id?: string | null
  code: string
  name: string
  description?: string | null
  unit_of_measure: string
  purchase_price?: number | null
  selling_price?: number | null
  vat_rate: number
  stock_quantity: number
  minimum_stock: number
  is_service: boolean
  is_active: boolean
  paper_type?: string | null
  paper_weight?: number | null
  paper_format?: string | null
  created_at: string
  updated_at: string
  
  // Relations
  category?: ProductCategory | null
}

export interface ProductCategory {
  id: string
  name: string
  description?: string | null
  parent_id?: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  category_id?: string
  code: string
  name: string
  description?: string
  unit_of_measure: string
  purchase_price?: number | null
  selling_price?: number | null
  vat_rate: number
  stock_quantity: number
  minimum_stock: number
  is_service: boolean
  is_active: boolean
  paper_type?: string
  paper_weight?: number | null
  paper_format?: string
}