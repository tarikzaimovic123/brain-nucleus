const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODEzMzMsImV4cCI6MjA3MDE1NzMzM30.gOkgxx_MZ9BtCIpIsqMnFvkItYkMx9BjeQenAJVgwIA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function compareStructures() {
  console.log('🔍 COMPARING ACCESS DB vs SUPABASE DB')
  console.log('=' .repeat(80))
  
  // 1. Read Access database
  const dbPath = '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb'
  const buffer = fs.readFileSync(dbPath)
  const reader = new MDBReader(buffer)
  
  // 2. Get Access invoice data
  console.log('\n📊 ACCESS DATABASE ANALYSIS:')
  console.log('-' .repeat(80))
  
  const faktureTable = reader.getTable('FAKTURE')
  const faktureData = faktureTable.getData()
  console.log(`✅ FAKTURE table: ${faktureData.length} records`)
  
  const faktureNalogTable = reader.getTable('FAKTURE_NALOG')
  const faktureNalogData = faktureNalogTable.getData()
  console.log(`✅ FAKTURE_NALOG table: ${faktureNalogData.length} records`)
  
  const nalogTable = reader.getTable('NALOG')
  const nalogData = nalogTable.getData()
  console.log(`✅ NALOG table: ${nalogData.length} records`)
  
  const nalogStavkeTable = reader.getTable('NALOG_STAVKE')
  const nalogStavkeData = nalogStavkeTable.getData()
  console.log(`✅ NALOG_STAVKE table: ${nalogStavkeData.length} records`)
  
  const nalogOstaloTable = reader.getTable('NALOG_OSALO')
  const nalogOstaloData = nalogOstaloTable.getData()
  console.log(`✅ NALOG_OSALO table: ${nalogOstaloData.length} records`)
  
  // 3. Get Supabase data
  console.log('\n📊 SUPABASE DATABASE ANALYSIS:')
  console.log('-' .repeat(80))
  
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
  
  console.log(`✅ invoices table: ${invoices?.length || 0} records`)
  
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    
  console.log(`✅ work_orders table: ${workOrders?.length || 0} records`)
  
  // 4. Analyze relationships
  console.log('\n🔗 RELATIONSHIP ANALYSIS:')
  console.log('-' .repeat(80))
  
  // Count unique relationships in Access
  const uniqueInvoiceWorkOrderLinks = new Set()
  faktureNalogData.forEach(link => {
    const key = `${link.ID_FAKTURA}_${link.GODINA}_${link.VR_FAKTURA}_${link.ID_NALOGA}`
    uniqueInvoiceWorkOrderLinks.add(key)
  })
  
  console.log(`Access DB: ${uniqueInvoiceWorkOrderLinks.size} unique invoice-work order links`)
  
  // Check our linking
  const { data: linkedInvoices } = await supabase
    .from('invoices')
    .select('id, work_order_id')
    .not('work_order_id', 'is', null)
  
  console.log(`Supabase DB: ${linkedInvoices?.length || 0} invoices linked to work orders`)
  
  // 5. Missing structures
  console.log('\n❌ MISSING/DIFFERENT STRUCTURES:')
  console.log('-' .repeat(80))
  
  console.log('1. FAKTURE_NALOG linking table:')
  console.log('   - Access: Uses composite key (ID_FAKTURA + GODINA + VR_FAKTURA)')
  console.log('   - Supabase: Direct foreign key (work_order_id in invoices table)')
  console.log('   - Impact: Many-to-many relationships not supported')
  
  console.log('\n2. NALOG_OSALO table (8971 records):')
  console.log('   - Contains additional items/services for work orders')
  console.log('   - Not migrated to Supabase')
  
  console.log('\n3. Year-based partitioning:')
  console.log('   - Access: Uses GODINA field for year partitioning')
  console.log('   - Supabase: No year partitioning')
  
  // 6. Sample linking data
  console.log('\n📋 SAMPLE LINKING DATA FROM ACCESS:')
  console.log('-' .repeat(80))
  
  // Show how invoices link to work orders
  const sampleLinks = faktureNalogData.slice(0, 5)
  sampleLinks.forEach(link => {
    // Find the invoice
    const invoice = faktureData.find(f => 
      f.ID_FAKTURA === link.ID_FAKTURA && 
      f.GODINA === link.GODINA && 
      f.VR_FAKTURA === link.VR_FAKTURA
    )
    
    // Find the work order
    const workOrder = nalogData.find(n => n.ID_NALOGA === link.ID_NALOGA)
    
    console.log(`\nInvoice ${invoice?.BROJ_FAK}/${invoice?.GODINA} → Work Order ${workOrder?.ID_NALOGA}`)
    console.log(`  Invoice amount: €${invoice?.IZNOS}`)
    console.log(`  Work order name: ${workOrder?.NAZIV}`)
  })
  
  // 7. Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  console.log('-' .repeat(80))
  console.log('1. Create invoice_work_order_items junction table for many-to-many')
  console.log('2. Migrate NALOG_OSALO data as work_order_additional_items')
  console.log('3. Add invoice_year field for backward compatibility')
  console.log('4. Create migration script to properly link all historical data')
}

compareStructures().catch(console.error)