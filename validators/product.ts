import { z } from 'zod'

export const productCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  display_order: z.number().int().default(0),
})

export const productSchema = z.object({
  category_id: z.string().uuid().optional(),
  code: z.string().min(1, 'Product code is required').max(50),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  unit_of_measure: z.string().default('kom'),
  purchase_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  vat_rate: z.number().min(0).max(100).default(21),
  stock_quantity: z.number().min(0).default(0),
  minimum_stock: z.number().min(0).default(0),
  is_service: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // Paper specific fields
  paper_type: z.string().optional(),
  paper_weight: z.number().int().min(0).optional(),
  paper_format: z.string().optional(),
})

export type ProductCategoryFormData = z.infer<typeof productCategorySchema>
export type ProductFormData = z.infer<typeof productSchema>