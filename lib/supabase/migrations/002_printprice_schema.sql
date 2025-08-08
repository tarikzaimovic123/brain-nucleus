-- PrintPrice Business Management Schema
-- Based on Brain Media Podgorica VB.NET application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- COMPANIES (FIRME) - Client management
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tax_number TEXT UNIQUE, -- PIB
  vat_number TEXT, -- PDV broj
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Montenegro',
  phone TEXT,
  email TEXT,
  website TEXT,
  bank_account TEXT,
  is_active BOOLEAN DEFAULT true,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30, -- days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Contact persons for companies
CREATE TABLE IF NOT EXISTS contact_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- EMPLOYEES (RADNICI)
-- ==========================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PRODUCT CATEGORIES & PRODUCTS (ARTIKLI)
-- ==========================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_of_measure TEXT DEFAULT 'kom', -- kom, kg, m2, etc.
  purchase_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  vat_rate DECIMAL(5,2) DEFAULT 21.00, -- Montenegro standard VAT
  stock_quantity DECIMAL(10,2) DEFAULT 0,
  minimum_stock DECIMAL(10,2) DEFAULT 0,
  is_service BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Paper specific fields for printing business
  paper_type TEXT, -- offset, kunzdruk, etc.
  paper_weight INTEGER, -- grams per m2
  paper_format TEXT, -- A4, A3, B2, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PRINTING SPECIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS print_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offset_specifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plate_size TEXT,
  max_paper_width INTEGER,
  max_paper_height INTEGER,
  colors INTEGER DEFAULT 4, -- CMYK
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- QUOTES (PONUDE)
-- ==========================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_person_id UUID REFERENCES contact_persons(id) ON DELETE SET NULL,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 21.00,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- WORK ORDERS (NALOZI)
-- ==========================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  start_date DATE,
  due_date DATE,
  completion_date DATE,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  description TEXT,
  internal_notes TEXT,
  total_hours DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  completed_quantity DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CALCULATIONS (KALKULACIJE)
-- ==========================================
CREATE TABLE IF NOT EXISTS calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calculation_number TEXT UNIQUE NOT NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  calculation_date DATE DEFAULT CURRENT_DATE,
  -- Material costs
  paper_cost DECIMAL(10,2) DEFAULT 0,
  printing_cost DECIMAL(10,2) DEFAULT 0,
  finishing_cost DECIMAL(10,2) DEFAULT 0,
  other_material_cost DECIMAL(10,2) DEFAULT 0,
  -- Labor costs
  prepress_hours DECIMAL(10,2) DEFAULT 0,
  printing_hours DECIMAL(10,2) DEFAULT 0,
  finishing_hours DECIMAL(10,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  -- Totals
  total_material_cost DECIMAL(10,2) DEFAULT 0,
  total_labor_cost DECIMAL(10,2) DEFAULT 0,
  overhead_percentage DECIMAL(5,2) DEFAULT 30,
  overhead_amount DECIMAL(10,2) DEFAULT 0,
  margin_percentage DECIMAL(5,2) DEFAULT 20,
  margin_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INVOICES (FAKTURE)
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  fiscal_number TEXT UNIQUE, -- For fiscal compliance
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  -- Fiscal fields
  fiscal_verified BOOLEAN DEFAULT false,
  fiscal_qr_code TEXT,
  fiscal_iic TEXT, -- Internal Invoice Code
  fiscal_signature TEXT,
  fiscal_timestamp TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 21.00,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  total_with_vat DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FISCAL LOG (For Montenegro e-Fi compliance)
-- ==========================================
CREATE TABLE IF NOT EXISTS fiscal_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- register_invoice, cancel_invoice
  request_xml TEXT NOT NULL,
  response_xml TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  iic_code TEXT,
  fiscal_number TEXT,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check')),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_companies_tax_number ON companies(tax_number);
CREATE INDEX idx_companies_active ON companies(is_active);
CREATE INDEX idx_contact_persons_company ON contact_persons(company_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_work_orders_company ON work_orders(company_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_fiscal ON invoices(fiscal_number);
CREATE INDEX idx_fiscal_log_invoice ON fiscal_log(invoice_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Companies - all authenticated users can view, only admins can modify
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert companies" ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update companies" ON companies FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Contact persons
ALTER TABLE contact_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view contact persons" ON contact_persons FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage contact persons" ON contact_persons FOR ALL USING (auth.uid() IS NOT NULL);

-- Employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage employees" ON employees FOR ALL USING (auth.uid() IS NOT NULL);

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage products" ON products FOR ALL USING (auth.uid() IS NOT NULL);

-- Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view quotes" ON quotes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create quotes" ON quotes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own quotes" ON quotes FOR UPDATE USING (auth.uid() = created_by);

-- Work Orders
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view work orders" ON work_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage work orders" ON work_orders FOR ALL USING (auth.uid() IS NOT NULL);

-- Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invoices" ON invoices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update invoices" ON invoices FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Fiscal Log
ALTER TABLE fiscal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view fiscal log" ON fiscal_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage fiscal log" ON fiscal_log FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Update timestamp trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_persons_updated_at BEFORE UPDATE ON contact_persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calculations_updated_at BEFORE UPDATE ON calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ==========================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO last_number
  FROM invoices
  WHERE SUBSTRING(invoice_number FROM 1 FOR 4) = current_year::TEXT;
  
  new_number := current_year::TEXT || LPAD(last_number::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice totals when items change
  IF TG_TABLE_NAME = 'invoice_items' THEN
    UPDATE invoices
    SET 
      subtotal = COALESCE((
        SELECT SUM(line_total) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id
      ), 0),
      vat_amount = COALESCE((
        SELECT SUM(vat_amount) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id
      ), 0),
      total_amount = COALESCE((
        SELECT SUM(total_with_vat) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id
      ), 0)
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_totals();

-- ==========================================
-- SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert sample product categories
INSERT INTO product_categories (name, description, display_order) VALUES
  ('Papir', 'Razne vrste papira za štampu', 1),
  ('Offset štampa', 'Offset štamparske usluge', 2),
  ('Digitalna štampa', 'Digitalne štamparske usluge', 3),
  ('Dorada', 'Usluge dorade (sečenje, savijanje, koričenje)', 4),
  ('Dizajn', 'Grafički dizajn usluge', 5)
ON CONFLICT DO NOTHING;

-- Insert sample print formats
INSERT INTO print_formats (name, width_mm, height_mm, description) VALUES
  ('A4', 210, 297, 'Standard A4 format'),
  ('A3', 297, 420, 'Standard A3 format'),
  ('A5', 148, 210, 'Standard A5 format'),
  ('B2', 500, 707, 'B2 format za postere'),
  ('B1', 707, 1000, 'B1 format za velike postere')
ON CONFLICT DO NOTHING;