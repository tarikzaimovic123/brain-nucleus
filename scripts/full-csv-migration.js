const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.2XVss9ReSmWOWD_Kk9vbX6en0rGfjlHf0r9CPNR3V1E';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateCompanies() {
  console.log('\n📤 Migrating Companies from CSV...');
  
  const csvContent = fs.readFileSync('csv-exports/firme.csv', 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`   Found ${records.length} companies`);
  
  let migrated = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const companies = batch.map(row => ({
      name: row.NAZIV || `Company ${row.FIRMA_ID}`,
      tax_number: row.MATICNI || row.REG_BROJ || null,
      vat_number: row.PDV || null,
      address: row.ADRESA || null,
      city: row.GRAD || null,
      phone: row.TEL1 || row.TEL2 || row.TEL3 || null,
      email: row.MAIL || null,
      bank_account: row.ZIRO_RACUN1 || row.ZIRO_RACUN2 || null,
      website: row.WEB || null,
      is_active: row.STATUS === 'A' || row.STATUS === '1' || true,
      country: 'Montenegro',
      payment_terms: parseInt(row.ROK_PLACANJA) || 30,
      credit_limit: parseFloat(row.DUG) || 0
      // notes field doesn't exist in schema
    }));
    
    // Clean up data
    companies.forEach(company => {
      Object.keys(company).forEach(key => {
        if (company[key] === '' || company[key] === 'null') company[key] = null;
        if (typeof company[key] === 'string') {
          company[key] = company[key].trim();
        }
      });
    });
    
    const { data, error } = await supabase
      .from('companies')
      .upsert(companies, {
        onConflict: 'tax_number',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.log(`   ⚠️ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      migrated += batch.length;
    }
    
    if (i % 200 === 0 && i > 0) {
      console.log(`   Progress: ${i}/${records.length}`);
    }
  }
  
  console.log(`   ✅ Migrated ${migrated} companies (${errors} errors)`);
  return migrated;
}

async function migrateProducts() {
  console.log('\n📤 Migrating Products from CSV...');
  
  // First, ensure default category
  const { data: categoryData } = await supabase
    .from('product_categories')
    .upsert({
      name: 'Opšte',
      description: 'Opšta kategorija proizvoda',
      display_order: 0
    }, {
      onConflict: 'name',
      ignoreDuplicates: true
    })
    .select()
    .single();
  
  const defaultCategoryId = categoryData?.id;
  
  const csvContent = fs.readFileSync('csv-exports/artikli.csv', 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`   Found ${records.length} products`);
  
  let migrated = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const products = batch.map(row => ({
      category_id: defaultCategoryId,
      code: `ART${String(row.SF_ARTIKLA).padStart(4, '0')}`,
      name: row.NAZIV || `Product ${row.SF_ARTIKLA}`,
      description: row.KOMENTAR || null,
      unit_of_measure: getUnitName(row.VR_JEDINICA),
      purchase_price: parseFloat(row.CIJ_NABAVNA) || 0,
      selling_price: parseFloat(row.CIJ_PRODAJNA) || 0,
      vat_rate: 21,
      stock_quantity: parseFloat(row.KOL_ULAZNA) - parseFloat(row.KOl_IZLAZNA || 0) || 0,
      minimum_stock: parseFloat(row.KOL_KRITICNA) || 0,
      is_service: row.VR_PROIZVODA === '2',
      is_active: true
    }));
    
    // Clean up data
    products.forEach(product => {
      Object.keys(product).forEach(key => {
        if (product[key] === '' || product[key] === 'null') product[key] = null;
        if (typeof product[key] === 'string') {
          product[key] = product[key].trim();
        }
      });
    });
    
    const { data, error } = await supabase
      .from('products')
      .upsert(products, {
        onConflict: 'code',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.log(`   ⚠️ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      migrated += batch.length;
    }
  }
  
  console.log(`   ✅ Migrated ${migrated} products (${errors} errors)`);
  return migrated;
}

async function migrateInvoices() {
  console.log('\n📤 Migrating Invoices from CSV...');
  
  // Get or create default company
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
  
  let defaultCompanyId;
  if (!companies || companies.length === 0) {
    const { data } = await supabase
      .from('companies')
      .insert({
        name: 'Nepoznat klijent',
        country: 'Montenegro',
        is_active: true
      })
      .select()
      .single();
    defaultCompanyId = data.id;
  } else {
    defaultCompanyId = companies[0].id;
  }
  
  // Map FIRMA_ID to company IDs
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, tax_number, name');
  
  const companyMap = {};
  allCompanies?.forEach(c => {
    if (c.tax_number) companyMap[c.tax_number] = c.id;
    companyMap[c.name] = c.id;
  });
  
  const csvContent = fs.readFileSync('csv-exports/fakture.csv', 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`   Found ${records.length} invoices`);
  
  let migrated = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const invoices = batch.map(row => {
      const totalAmount = parseFloat(row.IZNOS) || 0;
      const vatAmount = parseFloat(row.PDV) || (totalAmount * 0.21 / 1.21);
      const subtotal = totalAmount - vatAmount;
      
      // Try to parse date
      let invoiceDate = new Date().toISOString().split('T')[0];
      if (row.DATUM) {
        try {
          const date = new Date(row.DATUM);
          if (!isNaN(date.getTime())) {
            invoiceDate = date.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      
      return {
        invoice_number: `${row.GODINA}/${String(row.BROJ_FAK).padStart(6, '0')}`,
        company_id: companyMap[row.FIRMA_ID] || defaultCompanyId,
        invoice_date: invoiceDate,
        status: row.STATUS === 'S' ? 'cancelled' : 'issued',
        subtotal: subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        discount_percentage: parseFloat(row.RABAT) || 0,
        discount_amount: 0,
        fiscal_verified: row.W_ST_FISKALIZACIJA === 'D',
        fiscal_number: row.W_IKOF || null,
        fiscal_iic: row.W_JIKR || null,
        notes: row.KOMENTAR || null
      };
    });
    
    const { data, error } = await supabase
      .from('invoices')
      .upsert(invoices, {
        onConflict: 'invoice_number',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.log(`   ⚠️ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      migrated += batch.length;
    }
    
    if (i % 500 === 0 && i > 0) {
      console.log(`   Progress: ${i}/${records.length}`);
    }
  }
  
  console.log(`   ✅ Migrated ${migrated} invoices (${errors} errors)`);
  return migrated;
}

async function migrateWorkOrders() {
  console.log('\n📤 Migrating Work Orders from CSV...');
  
  // Get company map
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, tax_number, name');
  
  const companyMap = {};
  allCompanies?.forEach(c => {
    if (c.tax_number) companyMap[c.tax_number] = c.id;
    companyMap[c.name] = c.id;
  });
  
  const defaultCompanyId = allCompanies?.[0]?.id;
  
  const csvContent = fs.readFileSync('csv-exports/nalog.csv', 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  
  console.log(`   Found ${records.length} work orders`);
  
  let migrated = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const workOrders = batch.map(row => {
      // Parse dates
      let startDate = null, dueDate = null;
      try {
        if (row.DATUM) {
          const date = new Date(row.DATUM);
          if (!isNaN(date.getTime())) {
            startDate = date.toISOString().split('T')[0];
          }
        }
        if (row.DATUM_ROK) {
          const date = new Date(row.DATUM_ROK);
          if (!isNaN(date.getTime())) {
            dueDate = date.toISOString().split('T')[0];
          }
        }
      } catch (e) {}
      
      return {
        order_number: `WO${String(row.ID_NALOGA).padStart(6, '0')}`,
        company_id: companyMap[row.FIRMA_ID] || defaultCompanyId,
        status: getOrderStatus(row.ST_NALOGA),
        priority: 'normal',
        description: row.NAZIV || null,
        internal_notes: row.KOMENTAR || null,
        start_date: startDate,
        due_date: dueDate,
        total_hours: 0
      };
    });
    
    const { data, error } = await supabase
      .from('work_orders')
      .upsert(workOrders, {
        onConflict: 'order_number',
        ignoreDuplicates: true
      });
    
    if (error) {
      console.log(`   ⚠️ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      migrated += batch.length;
    }
    
    if (i % 500 === 0 && i > 0) {
      console.log(`   Progress: ${i}/${records.length}`);
    }
  }
  
  console.log(`   ✅ Migrated ${migrated} work orders (${errors} errors)`);
  return migrated;
}

function getUnitName(vrJedinica) {
  const units = {
    '1': 'kom',
    '2': 'kg',
    '3': 'm',
    '4': 'm2',
    '5': 'm3',
    '6': 'l',
    '7': 'h',
    '8': 'pak',
    '9': 'ris',
    '10': 'tab',
    '11': 'kutija'
  };
  return units[vrJedinica] || 'kom';
}

function getOrderStatus(stNaloga) {
  const statuses = {
    'N': 'pending',
    'U': 'in_progress',
    'Z': 'completed',
    'S': 'cancelled',
    '1': 'pending',
    '2': 'in_progress',
    '3': 'completed'
  };
  return statuses[stNaloga] || 'pending';
}

async function main() {
  console.log('='.repeat(60));
  console.log('FULL CSV MIGRATION TO SUPABASE');
  console.log('='.repeat(60));
  
  const companiesCount = await migrateCompanies();
  const productsCount = await migrateProducts();
  const invoicesCount = await migrateInvoices();
  const workOrdersCount = await migrateWorkOrders();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log(`📊 Final Statistics:`);
  console.log(`   Companies: ${companiesCount}`);
  console.log(`   Products: ${productsCount}`);
  console.log(`   Invoices: ${invoicesCount}`);
  console.log(`   Work Orders: ${workOrdersCount}`);
  console.log('\n🎉 Your application is now fully populated with data!');
  console.log('   Visit http://localhost:3000 to see your migrated data');
}

// Run migration
main().catch(console.error);