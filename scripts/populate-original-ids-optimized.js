const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration  
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.4B6v4evGk7GzDVJXRtF2R1YafoP5iwqEePQIhg3daKo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function populateOriginalIds() {
  console.log('🔄 Populating original IDs - OPTIMIZED VERSION')
  console.log('=' .repeat(80))
  
  try {
    // Read Access database
    const dbPath = '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb'
    const buffer = fs.readFileSync(dbPath)
    const reader = new MDBReader(buffer)
    
    // 1. Get all existing data from Supabase first
    console.log('📥 Loading existing data from Supabase...')
    
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, original_id')
    
    const { data: existingWorkOrders } = await supabase
      .from('work_orders')
      .select('id, order_number, original_id')
    
    console.log(`  Loaded ${existingInvoices?.length || 0} invoices`)
    console.log(`  Loaded ${existingWorkOrders?.length || 0} work orders`)
    
    // Create maps for quick lookup
    const invoiceMap = new Map()
    existingInvoices?.forEach(inv => {
      invoiceMap.set(inv.invoice_number, inv)
    })
    
    const workOrderMap = new Map()
    existingWorkOrders?.forEach(wo => {
      workOrderMap.set(wo.order_number, wo)
    })
    
    // 2. Process Access data and build batch updates
    console.log('\n📄 Processing INVOICES from Access...')
    const faktureTable = reader.getTable('FAKTURE')
    const faktureData = faktureTable.getData()
    
    const invoiceUpdates = []
    for (const faktura of faktureData) {
      const invoiceNumber = `${faktura.GODINA}/${String(faktura.BROJ_FAK).padStart(6, '0')}`
      const existing = invoiceMap.get(invoiceNumber)
      
      if (existing && !existing.original_id) {
        invoiceUpdates.push({
          id: existing.id,
          original_id: faktura.ID_FAKTURA,
          invoice_year: faktura.GODINA,
          invoice_type: faktura.VR_FAKTURA
        })
      }
    }
    
    console.log(`  Found ${invoiceUpdates.length} invoices to update`)
    
    // 3. Process work orders
    console.log('\n📋 Processing WORK ORDERS from Access...')
    const nalogTable = reader.getTable('NALOG')
    const nalogData = nalogTable.getData()
    
    const workOrderUpdates = []
    for (const nalog of nalogData) {
      // Check all possible year formats
      for (let year = 2021; year <= 2025; year++) {
        const orderNumber = `RN-${year}-${String(nalog.ID_NALOGA).padStart(6, '0')}`
        const existing = workOrderMap.get(orderNumber)
        
        if (existing && !existing.original_id) {
          workOrderUpdates.push({
            id: existing.id,
            original_id: nalog.ID_NALOGA,
            project_id: nalog.ID_PROJEKTA
          })
          break
        }
      }
    }
    
    console.log(`  Found ${workOrderUpdates.length} work orders to update`)
    
    // 4. Batch update in chunks
    console.log('\n📤 Updating database...')
    
    // Update invoices in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < invoiceUpdates.length; i += BATCH_SIZE) {
      const batch = invoiceUpdates.slice(i, Math.min(i + BATCH_SIZE, invoiceUpdates.length))
      
      // Use upsert for batch update
      const { error } = await supabase
        .from('invoices')
        .upsert(batch, { onConflict: 'id' })
      
      if (error) {
        console.error('Error updating invoices batch:', error)
      } else {
        console.log(`  Updated invoices ${i + 1}-${Math.min(i + BATCH_SIZE, invoiceUpdates.length)}`)
      }
    }
    
    // Update work orders in batches
    for (let i = 0; i < workOrderUpdates.length; i += BATCH_SIZE) {
      const batch = workOrderUpdates.slice(i, Math.min(i + BATCH_SIZE, workOrderUpdates.length))
      
      const { error } = await supabase
        .from('work_orders')
        .upsert(batch, { onConflict: 'id' })
      
      if (error) {
        console.error('Error updating work orders batch:', error)
      } else {
        console.log(`  Updated work orders ${i + 1}-${Math.min(i + BATCH_SIZE, workOrderUpdates.length)}`)
      }
    }
    
    // 5. Final verification
    console.log('\n🔍 Final verification...')
    
    const { count: invoicesWithOriginal } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .not('original_id', 'is', null)
    
    const { count: workOrdersWithOriginal } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .not('original_id', 'is', null)
    
    console.log(`✅ Invoices with original_id: ${invoicesWithOriginal}`)
    console.log(`✅ Work orders with original_id: ${workOrdersWithOriginal}`)
    
    console.log('\n✅ Original ID population completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

populateOriginalIds()