const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.4B6v4evGk7GzDVJXRtF2R1YafoP5iwqEePQIhg3daKo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function populateOriginalIds() {
  console.log('🔄 Populating original IDs from Access database...')
  console.log('=' .repeat(80))
  
  try {
    // Read Access database
    const dbPath = '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb'
    const buffer = fs.readFileSync(dbPath)
    const reader = new MDBReader(buffer)
    
    // 1. Update invoices with original_id
    console.log('\n📄 Processing INVOICES...')
    const faktureTable = reader.getTable('FAKTURE')
    const faktureData = faktureTable.getData()
    
    let invoiceUpdateCount = 0
    for (const faktura of faktureData) {
      // Build invoice number format: YYYY/NNNNNN
      const invoiceNumber = `${faktura.GODINA}/${String(faktura.BROJ_FAK).padStart(6, '0')}`
      
      // Update Supabase invoice with original_id
      const { data, error } = await supabase
        .from('invoices')
        .update({
          original_id: faktura.ID_FAKTURA,
          invoice_year: faktura.GODINA,
          invoice_type: faktura.VR_FAKTURA
        })
        .eq('invoice_number', invoiceNumber)
        .select()
      
      if (data && data.length > 0) {
        invoiceUpdateCount++
        if (invoiceUpdateCount % 100 === 0) {
          console.log(`  Updated ${invoiceUpdateCount} invoices...`)
        }
      }
    }
    console.log(`✅ Updated ${invoiceUpdateCount} invoices with original_id`)
    
    // 2. Update work_orders with original_id
    console.log('\n📋 Processing WORK ORDERS...')
    const nalogTable = reader.getTable('NALOG')
    const nalogData = nalogTable.getData()
    
    let workOrderUpdateCount = 0
    for (const nalog of nalogData) {
      // Try multiple formats for order number
      const orderNumbers = [
        `RN-2021-${String(nalog.ID_NALOGA).padStart(6, '0')}`,
        `RN-2022-${String(nalog.ID_NALOGA).padStart(6, '0')}`,
        `RN-2023-${String(nalog.ID_NALOGA).padStart(6, '0')}`,
        `RN-2024-${String(nalog.ID_NALOGA).padStart(6, '0')}`,
        `RN-2025-${String(nalog.ID_NALOGA).padStart(6, '0')}`
      ]
      
      for (const orderNumber of orderNumbers) {
        const { data, error } = await supabase
          .from('work_orders')
          .update({
            original_id: nalog.ID_NALOGA,
            project_id: nalog.ID_PROJEKTA
          })
          .eq('order_number', orderNumber)
          .select()
        
        if (data && data.length > 0) {
          workOrderUpdateCount++
          break // Found and updated, move to next
        }
      }
      
      if (workOrderUpdateCount % 100 === 0 && workOrderUpdateCount > 0) {
        console.log(`  Updated ${workOrderUpdateCount} work orders...`)
      }
    }
    console.log(`✅ Updated ${workOrderUpdateCount} work orders with original_id`)
    
    // 3. Verify the updates
    console.log('\n🔍 Verifying updates...')
    
    const { data: invoicesWithOriginal } = await supabase
      .from('invoices')
      .select('id', { count: 'exact' })
      .not('original_id', 'is', null)
    
    const { data: workOrdersWithOriginal } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .not('original_id', 'is', null)
    
    console.log(`Invoices with original_id: ${invoicesWithOriginal?.length || 0}`)
    console.log(`Work orders with original_id: ${workOrdersWithOriginal?.length || 0}`)
    
    // 4. Show sample mappings
    const { data: sampleInvoices } = await supabase
      .from('invoices')
      .select('invoice_number, original_id, invoice_year, invoice_type')
      .not('original_id', 'is', null)
      .limit(5)
    
    if (sampleInvoices && sampleInvoices.length > 0) {
      console.log('\nSample invoice mappings:')
      sampleInvoices.forEach(inv => {
        console.log(`  ${inv.invoice_number} → original_id: ${inv.original_id}, year: ${inv.invoice_year}, type: ${inv.invoice_type}`)
      })
    }
    
    const { data: sampleWorkOrders } = await supabase
      .from('work_orders')
      .select('order_number, original_id, project_id')
      .not('original_id', 'is', null)
      .limit(5)
    
    if (sampleWorkOrders && sampleWorkOrders.length > 0) {
      console.log('\nSample work order mappings:')
      sampleWorkOrders.forEach(wo => {
        console.log(`  ${wo.order_number} → original_id: ${wo.original_id}, project_id: ${wo.project_id}`)
      })
    }
    
    console.log('\n✅ Original ID population completed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

populateOriginalIds()