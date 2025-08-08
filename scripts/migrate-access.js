const { default: MDBReader } = require('mdb-reader');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.2XVss9ReSmWOWD_Kk9vbX6en0rGfjlHf0r9CPNR3V1E';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Access database paths
const DB_PATHS = {
  main: '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb',
  harmon: '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/HARMON.mdb',
  fiscal: '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/Fiskal_log.mdb',
  latest: '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/poslednji-bekap/BazaBrain.mdb'
};

async function analyzeDatabase(dbPath, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing ${dbName}: ${dbPath}`);
  console.log('='.repeat(60));

  try {
    const buffer = fs.readFileSync(dbPath);
    const reader = new MDBReader(buffer);
    
    const tables = reader.getTableNames();
    console.log(`Found ${tables.length} tables:`);
    
    const structure = {};
    
    for (const tableName of tables) {
      try {
        const table = reader.getTable(tableName);
        const columns = table.getColumnNames();
        const data = table.getData();
        
        structure[tableName] = {
          columns: columns,
          rowCount: data.length,
          sampleData: data.slice(0, 2)
        };
        
        console.log(`\n📊 Table: ${tableName}`);
        console.log(`   Columns: ${columns.join(', ')}`);
        console.log(`   Rows: ${data.length}`);
        
      } catch (err) {
        console.log(`   ⚠️ Error reading table ${tableName}: ${err.message}`);
      }
    }
    
    return structure;
  } catch (err) {
    console.error(`❌ Error reading database: ${err.message}`);
    return null;
  }
}

async function migrateCompanies(reader) {
  console.log('\n📤 Migrating Companies...');
  
  const tableNames = ['Firme', 'Firma', 'Companies', 'Kompanije', 'Klijenti', 'Kupci'];
  let migrated = 0;
  
  for (const tableName of tableNames) {
    try {
      const table = reader.getTable(tableName);
      if (!table) continue;
      
      const data = table.getData();
      if (data.length === 0) continue;
      
      console.log(`   Found ${data.length} records in ${tableName}`);
      
      for (const row of data) {
        const company = {
          name: row.Naziv || row.NazivFirme || row.Ime || row.Name || `Company ${migrated + 1}`,
          tax_number: row.PIB || row.Pib || row.TaxNumber || null,
          vat_number: row.PDV || row.PdvBroj || row.VatNumber || null,
          address: row.Adresa || row.Ulica || row.Address || null,
          city: row.Grad || row.Mjesto || row.City || null,
          postal_code: row.PostanskiBroj || row.PostalCode || null,
          phone: row.Telefon || row.Tel || row.Phone || null,
          email: row.Email || row.Mail || null,
          bank_account: row.ZiroRacun || row.Racun || row.BankAccount || null,
          is_active: true,
          country: 'Montenegro',
          payment_terms: 30,
          credit_limit: 0
        };
        
        // Clean up data
        Object.keys(company).forEach(key => {
          if (company[key] === '') company[key] = null;
          if (typeof company[key] === 'string') {
            company[key] = company[key].trim();
          }
        });
        
        // Insert into Supabase
        const { error } = await supabase
          .from('companies')
          .upsert(company, { 
            onConflict: 'tax_number',
            ignoreDuplicates: true 
          });
        
        if (!error) {
          migrated++;
        } else if (!error.message.includes('duplicate')) {
          console.log(`   ⚠️ Error inserting company: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Migrated ${migrated} companies from ${tableName}`);
      break; // Only process first matching table
    } catch (err) {
      // Table doesn't exist, continue
    }
  }
  
  return migrated;
}

async function migrateProducts(reader) {
  console.log('\n📤 Migrating Products...');
  
  // First, ensure we have a default category
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
  
  const tableNames = ['Artikli', 'Artikal', 'Products', 'Proizvodi', 'Roba', 'ArtikalPapir', 'ArtikalProlaz'];
  let migrated = 0;
  
  for (const tableName of tableNames) {
    try {
      const table = reader.getTable(tableName);
      if (!table) continue;
      
      const data = table.getData();
      if (data.length === 0) continue;
      
      console.log(`   Found ${data.length} records in ${tableName}`);
      
      for (const row of data) {
        const product = {
          category_id: defaultCategoryId,
          code: row.Sifra || row.Code || row.Kod || `ART${String(migrated + 1).padStart(4, '0')}`,
          name: row.Naziv || row.Name || row.Ime || `Product ${migrated + 1}`,
          description: row.Opis || row.Description || null,
          unit_of_measure: row.JedinicaMjere || row.JM || row.Unit || 'kom',
          purchase_price: parseFloat(row.NabavnaCijena || row.Nabavna || 0) || 0,
          selling_price: parseFloat(row.ProdajnaCijena || row.Prodajna || row.Cijena || 0) || 0,
          vat_rate: parseFloat(row.PDV || row.Vat || row.Porez || 21) || 21,
          stock_quantity: parseFloat(row.Stanje || row.Kolicina || row.Stock || 0) || 0,
          minimum_stock: parseFloat(row.MinimalnaZaliha || row.MinStock || 0) || 0,
          is_service: false,
          is_active: true,
          // Paper specific fields if available
          paper_type: row.TipPapira || row.VrstaPapira || null,
          paper_weight: row.Gramatura ? parseInt(row.Gramatura) : null,
          paper_format: row.Format || null
        };
        
        // Clean up data
        Object.keys(product).forEach(key => {
          if (product[key] === '') product[key] = null;
          if (typeof product[key] === 'string') {
            product[key] = product[key].trim();
          }
        });
        
        // Insert into Supabase
        const { error } = await supabase
          .from('products')
          .upsert(product, {
            onConflict: 'code',
            ignoreDuplicates: true
          });
        
        if (!error) {
          migrated++;
        } else if (!error.message.includes('duplicate')) {
          console.log(`   ⚠️ Error inserting product: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Migrated ${migrated} products from ${tableName}`);
    } catch (err) {
      // Table doesn't exist, continue
    }
  }
  
  return migrated;
}

async function migrateInvoices(reader) {
  console.log('\n📤 Migrating Invoices...');
  
  // Get a default company
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
  
  let defaultCompanyId;
  if (!companies || companies.length === 0) {
    // Create default company
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
  
  const tableNames = ['Fakture', 'Faktura', 'Invoices', 'Racuni', 'Racun', 'FaktureList'];
  let migrated = 0;
  
  for (const tableName of tableNames) {
    try {
      const table = reader.getTable(tableName);
      if (!table) continue;
      
      const data = table.getData();
      if (data.length === 0) continue;
      
      console.log(`   Found ${data.length} records in ${tableName}`);
      
      for (const row of data) {
        // Parse date
        let invoiceDate = new Date().toISOString().split('T')[0];
        if (row.Datum || row.Date || row.InvoiceDate) {
          try {
            const dateValue = row.Datum || row.Date || row.InvoiceDate;
            if (dateValue instanceof Date) {
              invoiceDate = dateValue.toISOString().split('T')[0];
            } else if (typeof dateValue === 'string') {
              invoiceDate = new Date(dateValue).toISOString().split('T')[0];
            }
          } catch (e) {
            // Keep default date
          }
        }
        
        const totalAmount = parseFloat(row.Iznos || row.Ukupno || row.Total || row.TotalAmount || 0) || 0;
        const vatAmount = parseFloat(row.PDV || row.Vat || row.Porez || 0) || (totalAmount * 0.21 / 1.21);
        const subtotal = totalAmount - vatAmount;
        
        const invoice = {
          invoice_number: row.Broj || row.BrojFakture || row.InvoiceNumber || `INV${Date.now()}`,
          company_id: defaultCompanyId,
          invoice_date: invoiceDate,
          status: 'issued',
          subtotal: subtotal,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          paid_amount: 0,
          discount_percentage: 0,
          discount_amount: 0,
          fiscal_verified: false,
          notes: row.Napomena || row.Notes || null
        };
        
        // Clean up data
        Object.keys(invoice).forEach(key => {
          if (invoice[key] === '') invoice[key] = null;
          if (typeof invoice[key] === 'string') {
            invoice[key] = invoice[key].trim();
          }
        });
        
        // Insert into Supabase
        const { error } = await supabase
          .from('invoices')
          .upsert(invoice, {
            onConflict: 'invoice_number',
            ignoreDuplicates: true
          });
        
        if (!error) {
          migrated++;
        } else if (!error.message.includes('duplicate')) {
          console.log(`   ⚠️ Error inserting invoice: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Migrated ${migrated} invoices from ${tableName}`);
    } catch (err) {
      // Table doesn't exist, continue
    }
  }
  
  return migrated;
}

async function migrateWorkOrders(reader) {
  console.log('\n📤 Migrating Work Orders...');
  
  const tableNames = ['Nalozi', 'Nalog', 'RadniNalozi', 'WorkOrders'];
  let migrated = 0;
  
  for (const tableName of tableNames) {
    try {
      const table = reader.getTable(tableName);
      if (!table) continue;
      
      const data = table.getData();
      if (data.length === 0) continue;
      
      console.log(`   Found ${data.length} records in ${tableName}`);
      
      // Get a default company
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      const defaultCompanyId = companies?.[0]?.id;
      
      for (const row of data) {
        const workOrder = {
          order_number: row.Broj || row.BrojNaloga || `WO${Date.now()}`,
          company_id: defaultCompanyId,
          status: 'pending',
          priority: 'normal',
          description: row.Opis || row.Description || null,
          internal_notes: row.Napomena || row.Notes || null,
          total_hours: 0
        };
        
        // Parse dates if available
        if (row.DatumPocetka || row.StartDate) {
          try {
            workOrder.start_date = new Date(row.DatumPocetka || row.StartDate).toISOString().split('T')[0];
          } catch (e) {}
        }
        
        if (row.Rok || row.DueDate) {
          try {
            workOrder.due_date = new Date(row.Rok || row.DueDate).toISOString().split('T')[0];
          } catch (e) {}
        }
        
        // Insert into Supabase
        const { error } = await supabase
          .from('work_orders')
          .upsert(workOrder, {
            onConflict: 'order_number',
            ignoreDuplicates: true
          });
        
        if (!error) {
          migrated++;
        }
      }
      
      console.log(`   ✅ Migrated ${migrated} work orders from ${tableName}`);
    } catch (err) {
      // Continue
    }
  }
  
  return migrated;
}

async function main() {
  console.log('='.repeat(60));
  console.log('ACCESS TO SUPABASE MIGRATION TOOL');
  console.log('='.repeat(60));
  
  // Check which databases exist
  const availableDbs = [];
  for (const [key, dbPath] of Object.entries(DB_PATHS)) {
    if (fs.existsSync(dbPath)) {
      availableDbs.push({ key, path: dbPath });
      console.log(`✅ Found ${key} database: ${dbPath}`);
    } else {
      console.log(`❌ Not found: ${dbPath}`);
    }
  }
  
  if (availableDbs.length === 0) {
    console.error('No Access databases found!');
    return;
  }
  
  // Analyze and migrate each database
  for (const db of availableDbs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${db.key} database`);
    console.log('='.repeat(60));
    
    try {
      const buffer = fs.readFileSync(db.path);
      const reader = new MDBReader(buffer);
      
      // Analyze structure
      const tables = reader.getTableNames();
      console.log(`\n📊 Database contains ${tables.length} tables`);
      console.log(`Tables: ${tables.join(', ')}`);
      
      // Save structure to file
      const structure = await analyzeDatabase(db.path, db.key);
      if (structure) {
        fs.writeFileSync(
          `access_structure_${db.key}.json`,
          JSON.stringify(structure, null, 2)
        );
        console.log(`✅ Structure saved to access_structure_${db.key}.json`);
      }
      
      // Migrate data
      console.log('\n🚀 Starting data migration...');
      
      const companiesCount = await migrateCompanies(reader);
      const productsCount = await migrateProducts(reader);
      const invoicesCount = await migrateInvoices(reader);
      const workOrdersCount = await migrateWorkOrders(reader);
      
      console.log('\n📊 Migration Summary:');
      console.log(`   Companies: ${companiesCount}`);
      console.log(`   Products: ${productsCount}`);
      console.log(`   Invoices: ${invoicesCount}`);
      console.log(`   Work Orders: ${workOrdersCount}`);
      
    } catch (err) {
      console.error(`❌ Error processing ${db.key}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ MIGRATION COMPLETED!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Check your Supabase dashboard for migrated data');
  console.log('2. Review the access_structure_*.json files for detailed analysis');
  console.log('3. Test the application with migrated data');
}

// Run migration
main().catch(console.error);