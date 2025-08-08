const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.2XVss9ReSmWOWD_Kk9vbX6en0rGfjlHf0r9CPNR3V1E';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateFromJSON() {
  console.log('='.repeat(60));
  console.log('DIRECT DATA MIGRATION FROM ACCESS JSON');
  console.log('='.repeat(60));

  // Load the JSON structure
  const mainData = JSON.parse(fs.readFileSync('access_structure_main.json', 'utf8'));
  const latestData = JSON.parse(fs.readFileSync('access_structure_latest.json', 'utf8'));
  
  // Use latest data if available, otherwise main
  const data = latestData || mainData;

  // 1. MIGRATE COMPANIES (FIRME)
  console.log('\n📤 Migrating Companies from FIRME table...');
  if (data.FIRME && data.FIRME.sampleData && data.FIRME.sampleData.length > 0) {
    console.log(`   Found FIRME table with ${data.FIRME.rowCount} companies`);
    
    // Since we only have sample data, let's at least migrate those
    const companies = data.FIRME.sampleData.map(row => ({
      name: row.NAZIV || `Company ${row.FIRMA_ID}`,
      tax_number: row.MATICNI || row.REG_BROJ || null,
      vat_number: row.PDV || null,
      address: row.ADRESA || null,
      phone: row.TEL1 || row.TEL2 || row.TEL3 || null,
      email: row.MAIL || null,
      bank_account: row.ZIRO_RACUN1 || row.ZIRO_RACUN2 || null,
      website: row.WEB || null,
      is_active: row.STATUS === 'A' || true,
      country: 'Montenegro',
      payment_terms: row.ROK_PLACANJA || 30,
      credit_limit: 0
    }));

    for (const company of companies) {
      const { error } = await supabase
        .from('companies')
        .upsert(company, {
          onConflict: 'tax_number',
          ignoreDuplicates: true
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ⚠️ Error: ${error.message}`);
      }
    }
    console.log(`   ✅ Sample companies migrated`);
    
    // Note for user
    console.log(`   ℹ️ Note: Full migration needs direct Access DB connection`);
    console.log(`   ℹ️ Total companies in database: ${data.FIRME.rowCount}`);
  }

  // 2. MIGRATE PRODUCTS (ARTIKLI)
  console.log('\n📤 Migrating Products from ARTIKLI table...');
  if (data.ARTIKLI && data.ARTIKLI.sampleData && data.ARTIKLI.sampleData.length > 0) {
    console.log(`   Found ARTIKLI table with ${data.ARTIKLI.rowCount} products`);
    
    // First ensure default category
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
    
    const products = data.ARTIKLI.sampleData.map(row => ({
      category_id: defaultCategoryId,
      code: `ART${String(row.SF_ARTIKLA).padStart(4, '0')}`,
      name: row.NAZIV || `Product ${row.SF_ARTIKLA}`,
      description: row.KOMENTAR || null,
      unit_of_measure: getUnitName(row.VR_JEDINICA),
      purchase_price: parseFloat(row.CIJ_NABAVNA) || 0,
      selling_price: parseFloat(row.CIJ_PRODAJNA) || 0,
      vat_rate: 21,
      stock_quantity: parseFloat(row.KOL_ULAZNA - row.KOl_IZLAZNA) || 0,
      minimum_stock: parseFloat(row.KOL_KRITICNA) || 0,
      is_service: false,
      is_active: true
    }));

    for (const product of products) {
      const { error } = await supabase
        .from('products')
        .upsert(product, {
          onConflict: 'code',
          ignoreDuplicates: true
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ⚠️ Error: ${error.message}`);
      }
    }
    console.log(`   ✅ Sample products migrated`);
    console.log(`   ℹ️ Total products in database: ${data.ARTIKLI.rowCount}`);
  }

  // 3. MIGRATE INVOICES (FAKTURE)
  console.log('\n📤 Migrating Invoices from FAKTURE table...');
  if (data.FAKTURE && data.FAKTURE.sampleData && data.FAKTURE.sampleData.length > 0) {
    console.log(`   Found FAKTURE table with ${data.FAKTURE.rowCount} invoices`);
    
    // Get a default company
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
    
    const invoices = data.FAKTURE.sampleData.map(row => {
      const totalAmount = parseFloat(row.IZNOS) || 0;
      const vatAmount = parseFloat(row.PDV) || (totalAmount * 0.21 / 1.21);
      const subtotal = totalAmount - vatAmount;
      
      return {
        invoice_number: `${row.GODINA}/${String(row.BROJ_FAK).padStart(6, '0')}`,
        company_id: defaultCompanyId,
        invoice_date: row.DATUM ? new Date(row.DATUM).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: 'issued',
        subtotal: subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        discount_percentage: parseFloat(row.RABAT) || 0,
        discount_amount: 0,
        fiscal_verified: row.W_ST_FISKALIZACIJA === 'D',
        fiscal_number: row.W_IKOF || null,
        notes: row.KOMENTAR || null
      };
    });

    for (const invoice of invoices) {
      const { error } = await supabase
        .from('invoices')
        .upsert(invoice, {
          onConflict: 'invoice_number',
          ignoreDuplicates: true
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ⚠️ Error: ${error.message}`);
      }
    }
    console.log(`   ✅ Sample invoices migrated`);
    console.log(`   ℹ️ Total invoices in database: ${data.FAKTURE.rowCount}`);
  }

  // 4. MIGRATE WORK ORDERS (NALOG)
  console.log('\n📤 Migrating Work Orders from NALOG table...');
  if (data.NALOG && data.NALOG.sampleData && data.NALOG.sampleData.length > 0) {
    console.log(`   Found NALOG table with ${data.NALOG.rowCount} work orders`);
    
    // Get a default company
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    const defaultCompanyId = companies?.[0]?.id;
    
    const workOrders = data.NALOG.sampleData.map(row => ({
      order_number: `WO${String(row.ID_NALOGA).padStart(6, '0')}`,
      company_id: defaultCompanyId,
      status: getOrderStatus(row.ST_NALOGA),
      priority: 'normal',
      description: row.NAZIV || null,
      internal_notes: row.KOMENTAR || null,
      start_date: row.DATUM ? new Date(row.DATUM).toISOString().split('T')[0] : null,
      due_date: row.DATUM_ROK ? new Date(row.DATUM_ROK).toISOString().split('T')[0] : null,
      total_hours: 0
    }));

    for (const workOrder of workOrders) {
      const { error } = await supabase
        .from('work_orders')
        .upsert(workOrder, {
          onConflict: 'order_number',
          ignoreDuplicates: true
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   ⚠️ Error: ${error.message}`);
      }
    }
    console.log(`   ✅ Sample work orders migrated`);
    console.log(`   ℹ️ Total work orders in database: ${data.NALOG.rowCount}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY:');
  console.log('='.repeat(60));
  console.log(`✅ Companies: ${data.FIRME?.rowCount || 0} total (sample migrated)`);
  console.log(`✅ Products: ${data.ARTIKLI?.rowCount || 0} total (sample migrated)`);
  console.log(`✅ Invoices: ${data.FAKTURE?.rowCount || 0} total (sample migrated)`);
  console.log(`✅ Work Orders: ${data.NALOG?.rowCount || 0} total (sample migrated)`);
  console.log('\n⚠️ Note: Only sample data was migrated.');
  console.log('For full migration, we need to:');
  console.log('1. Export full data from Access to CSV');
  console.log('2. Import CSV files to Supabase');
  console.log('3. Or use Windows machine with Access drivers');
}

function getUnitName(vrJedinica) {
  const units = {
    1: 'kom',
    2: 'kg',
    3: 'm',
    4: 'm2',
    5: 'm3',
    6: 'l',
    7: 'h',
    8: 'pak',
    9: 'ris',
    10: 'tab',
    11: 'kutija'
  };
  return units[vrJedinica] || 'kom';
}

function getOrderStatus(stNaloga) {
  const statuses = {
    'N': 'pending',
    'U': 'in_progress',
    'Z': 'completed',
    'S': 'cancelled'
  };
  return statuses[stNaloga] || 'pending';
}

// Run migration
migrateFromJSON().catch(console.error);