# Funkcionalna specifikacija - Sistem fakturisanja iz radnih naloga

## 1. Pregled sistema

### 1.1 Cilj
Implementacija kompletnog sistema fakturisanja koji omogućava kreiranje faktura isključivo iz završenih radnih naloga, sa naprednom pretragom, wizard interfejsom i potpunom ACL kontrolom.

### 1.2 Ključne karakteristike
- **Jedini način kreiranja fakture**: Iz završenih radnih naloga
- **Nasleđivanje podataka**: Kupac, stavke i cene se automatski preuzimaju
- **Napredna pretraga**: FTS i fuzzy matching za brzo pronalaženje stavki
- **Wizard interfejs**: 3-koračni proces kreiranja fakture
- **ACL kontrola**: Detaljne dozvole za sve operacije
- **Audit log**: Potpuno praćenje svih promena
- **PDF generisanje**: Server-side generisanje sa QR kodom

## 2. Korisnički tokovi

### 2.1 Analitičar (glavni tok)
1. Otvara modul Fakture
2. Klikće "Nova faktura iz radnog naloga"
3. **Korak 1**: Pretraga i selekcija stavki radnih naloga
   - Server-side pretraga sa FTS
   - Filtri: kupac, period, status
   - Multi-selekcija stavki
4. **Korak 2**: Podešavanje detalja fakture
   - Automatski popunjeni podaci kupca
   - Datumi, rokovi plaćanja
   - Način plaćanja
5. **Korak 3**: Pregled i eksport
   - Preview fakture
   - Generisanje PDF-a
   - Slanje email-om

### 2.2 Menadžer
- Pregled svih faktura
- Odobravanje pre slanja
- Pristup izveštajima
- Upravljanje postavkama

### 2.3 Bukovođa
- Knjiženje faktura
- Praćenje uplata
- Fiskalizacija
- Finansijski izveštaji

## 3. Tehnička arhitektura

### 3.1 Baza podataka

#### Postojeće tabele (koriste se)
```sql
-- work_orders (završeni nalozi)
-- work_order_items (stavke naloga)
-- companies (kupci)
-- products (artikli)
-- invoices (fakture)
-- invoice_items (stavke faktura)
-- payments (uplate)
-- user_roles, role_permissions, permissions (ACL)
-- audit_log (praćenje promena)
```

#### Nove tabele potrebne
```sql
-- invoice_settings (postavke fakturisanja)
CREATE TABLE invoice_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category TEXT, -- 'numbering', 'defaults', 'fiscal', 'pdf'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_work_order_items (veza faktura-RN stavke) - POSTOJI
-- Dodatno polje potrebno:
ALTER TABLE invoice_items 
ADD COLUMN work_order_item_id UUID REFERENCES work_order_items(id);

-- invoice_templates (šabloni za PDF)
CREATE TABLE invoice_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_html TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Indeksi za pretragu
```sql
-- Full Text Search
CREATE INDEX idx_work_order_items_fts ON work_order_items 
USING gin(to_tsvector('serbian', description));

-- Trigram za fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_work_order_items_trgm ON work_order_items 
USING gin(description gin_trgm_ops);

-- Composite indeksi za performanse
CREATE INDEX idx_wo_items_composite ON work_order_items(work_order_id, is_completed)
WHERE is_completed = true;
```

### 3.2 API Endpoints

#### Pretraga stavki radnih naloga
```typescript
POST /api/work-order-items/search
{
  query?: string,           // FTS/fuzzy pretraga
  company_id?: string,      // filter po kupcu
  date_from?: string,       // period od
  date_to?: string,         // period do
  status?: string[],        // statusi RN
  already_invoiced?: boolean, // prikaži već fakturisane
  page: number,
  limit: number
}

Response: {
  items: WorkOrderItem[],
  total: number,
  aggregations: {
    total_amount: number,
    by_company: Record<string, number>
  }
}
```

#### Kreiranje fakture iz RN
```typescript
POST /api/invoices/from-work-orders
{
  work_order_items: string[], // ID-jevi stavki
  invoice_date: string,
  due_date: string,
  payment_method: string,
  notes?: string,
  discount_percentage?: number
}
```

### 3.3 Frontend komponente

#### 1. InvoiceFromWorkOrderWizard
```typescript
interface WizardStep {
  id: 'select-items' | 'invoice-details' | 'preview';
  title: string;
  component: React.Component;
  validation: () => boolean;
}

// Korak 1: WorkOrderItemSelector
- Server-side DataGrid sa pretragom
- Checkbox selekcija
- Real-time total kalkulacija
- Grupisanje po RN

// Korak 2: InvoiceDetailsForm
- Auto-populated company info
- Date pickers
- Payment terms
- Optional discounts

// Korak 3: InvoicePreview
- Live preview
- PDF download
- Email sending
- Save draft option
```

#### 2. InvoiceSettingsConfigurator
```typescript
interface InvoiceSettings {
  numbering: {
    format: string; // "FAK-{YYYY}-{NNNN}"
    reset_yearly: boolean;
    next_number: number;
  };
  defaults: {
    payment_terms: number; // days
    payment_method: string;
    currency: string;
    vat_rate: number;
  };
  fiscal: {
    enabled: boolean;
    test_mode: boolean;
    certificate_path: string;
  };
  pdf: {
    template_id: string;
    logo_url: string;
    footer_text: string;
  };
}
```

### 3.4 Sigurnosni sloj

#### ACL Dozvole
```sql
-- Potrebne dozvole
invoices.create_from_work_order
invoices.read
invoices.update
invoices.delete
invoices.approve
invoices.fiscalize
invoices.export_pdf
invoice_settings.manage
```

#### RLS Politike
```sql
-- Samo završene RN stavke mogu biti fakturisane
CREATE POLICY invoice_only_completed_items ON invoice_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_order_items woi
    WHERE woi.id = work_order_item_id
    AND woi.is_completed = true
  )
);

-- Sprečava duplo fakturisanje
CREATE UNIQUE INDEX idx_prevent_duplicate_invoicing 
ON invoice_items(work_order_item_id) 
WHERE work_order_item_id IS NOT NULL;
```

### 3.5 Integracije

#### PDF Generisanje (Server-side)
```typescript
// Puppeteer za PDF generisanje
import puppeteer from 'puppeteer';

async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Render HTML template
  const html = await renderInvoiceTemplate(invoice);
  await page.setContent(html);
  
  // Generate PDF
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true
  });
  
  await browser.close();
  return pdf;
}
```

#### QR Kod za fiskalizaciju
```typescript
import QRCode from 'qrcode';

function generateFiscalQR(invoice: Invoice): string {
  const data = {
    iic: invoice.fiscal_iic,
    tin: company.tax_number,
    dateTime: invoice.fiscal_timestamp,
    totalAmount: invoice.total_amount
  };
  
  return QRCode.toDataURL(JSON.stringify(data));
}
```

## 4. Migracije

### 4.1 Migracija postojećih podataka
```sql
-- Linkovanje postojećih faktura sa RN (ako postoje)
UPDATE invoices i
SET work_order_id = wo.id
FROM work_orders wo
WHERE wo.company_id = i.company_id
AND wo.completion_date <= i.invoice_date
AND NOT EXISTS (
  SELECT 1 FROM invoices i2 
  WHERE i2.work_order_id = wo.id
);
```

### 4.2 Inicijalne postavke
```sql
INSERT INTO invoice_settings (setting_key, setting_value, category) VALUES
('numbering_format', '"FAK-{YYYY}-{NNNN}"'::jsonb, 'numbering'),
('payment_terms_default', '30'::jsonb, 'defaults'),
('vat_rate_default', '21'::jsonb, 'defaults'),
('fiscal_enabled', 'false'::jsonb, 'fiscal');
```

## 5. Testiranje

### 5.1 Unit testovi
- Validacija numerisanja faktura
- Kalkulacije PDV-a
- Prevencija duplog fakturisanja

### 5.2 Integracioni testovi
- End-to-end wizard flow
- PDF generisanje
- ACL provere

### 5.3 Performance testovi
- Pretraga sa 100k+ stavki
- Bulk fakturisanje
- Concurrent users

## 6. Deployment

### 6.1 Environment varijable
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
FISCAL_CERTIFICATE_PATH=/certs/fiscal.p12
FISCAL_API_URL=https://efi.tax.gov.me/api
```

### 6.2 Potrebni servisi
- PostgreSQL 15+ (za FTS i pg_trgm)
- Redis (za queue)
- Chromium (za PDF)

## 7. Monitoring

### 7.1 Metrike
- Broj kreiranih faktura/dan
- Prosečno vreme kreiranja
- Greške fiskalizacije
- PDF generation time

### 7.2 Alarmi
- Neuspešne fiskalizacije > 5
- Duplo fakturisanje pokušaj
- Performance degradacija

## 8. Budući razvoj

### Faza 2
- Automatsko fakturisanje (cron)
- Bulk operacije
- Recurring invoices
- Multi-currency support

### Faza 3
- AI predviđanje rokova plaćanja
- Smart grouping stavki
- Automated reminders
- Payment gateway integracija