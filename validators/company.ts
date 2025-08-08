import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  tax_number: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('Montenegro'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  bank_account: z.string().optional(),
  is_active: z.boolean().default(true),
  credit_limit: z.number().min(0).default(0),
  payment_terms: z.number().min(0).max(365).default(30),
})

export const contactPersonSchema = z.object({
  company_id: z.string().uuid(),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  position: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  is_primary: z.boolean().default(false),
})

export type CompanyFormData = z.infer<typeof companySchema>
export type ContactPersonFormData = z.infer<typeof contactPersonSchema>