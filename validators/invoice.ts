import { z } from 'zod'

export const invoiceSchema = z.object({
  company_id: z.string().uuid('Company is required'),
  invoice_date: z.string().or(z.date()),
  due_date: z.string().or(z.date()).optional(),
  status: z.enum(['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  payment_method: z.enum(['cash', 'bank_transfer', 'card', 'check']).optional(),
  discount_percentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
})

export const invoiceItemSchema = z.object({
  invoice_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price cannot be negative'),
  vat_rate: z.number().min(0).max(100).default(21),
  discount_percentage: z.number().min(0).max(100).default(0),
})

export const quoteSchema = z.object({
  company_id: z.string().uuid().optional(),
  contact_person_id: z.string().uuid().optional(),
  quote_date: z.string().or(z.date()),
  valid_until: z.string().or(z.date()).optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  discount_percentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
})

export const workOrderSchema = z.object({
  quote_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  start_date: z.string().or(z.date()).optional(),
  due_date: z.string().or(z.date()).optional(),
  assigned_to: z.string().uuid().optional(),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
})

export const calculationSchema = z.object({
  work_order_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  calculation_date: z.string().or(z.date()),
  // Material costs
  paper_cost: z.number().min(0).default(0),
  printing_cost: z.number().min(0).default(0),
  finishing_cost: z.number().min(0).default(0),
  other_material_cost: z.number().min(0).default(0),
  // Labor costs
  prepress_hours: z.number().min(0).default(0),
  printing_hours: z.number().min(0).default(0),
  finishing_hours: z.number().min(0).default(0),
  labor_rate: z.number().min(0).default(0),
  // Percentages
  overhead_percentage: z.number().min(0).max(100).default(30),
  margin_percentage: z.number().min(0).max(100).default(20),
  notes: z.string().optional(),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>
export type QuoteFormData = z.infer<typeof quoteSchema>
export type WorkOrderFormData = z.infer<typeof workOrderSchema>
export type CalculationFormData = z.infer<typeof calculationSchema>