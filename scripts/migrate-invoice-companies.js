const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.4B6v4evGk7GzDVJXRtF2R1YafoP5iwqEePQIhg3daKo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrate() {
  console.log('🚀 Starting invoice-company migration...\n')
  
  try {
    // Read Access database
    const buffer = fs.readFileSync('/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb')
    const reader = new MDBReader(buffer)
    
    // Get FIRME table
    const firmeTable = reader.getTable('FIRME')
    const firmeData = firmeTable.getData()
    console.log(`Found ${firmeData.length} companies in Access database`)
    
    // Get FAKTURE table
    const faktureTable = reader.getTable('FAKTURE')
    const faktureData = faktureTable.getData()
    console.log(`Found ${faktureData.length} invoices in Access database`)
    
    // First, ensure companies exist in Supabase
    console.log('\n📊 Checking companies in Supabase...')
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id, tax_number, name')
    
    console.log(`Found ${existingCompanies.length} companies in Supabase`)
    
    // Create a map of tax_number to company_id
    const companyMap = new Map()
    existingCompanies.forEach(c => {
      if (c.tax_number) {
        companyMap.set(c.tax_number, c.id)
      }
    })
    
    // Also create a map of FIRMA_ID to Supabase company_id
    const firmaIdToSupabaseId = new Map()
    
    // Process each FIRMA record
    for (const firma of firmeData) {
      if (firma.MATICNI) {
        // Check if company exists in Supabase by tax_number (MATICNI is PIB)
        const supabaseCompanyId = companyMap.get(firma.MATICNI)
        if (supabaseCompanyId) {
          firmaIdToSupabaseId.set(firma.FIRMA_ID, supabaseCompanyId)
        } else {
          // Company doesn't exist, we might need to create it
          console.log(`⚠️  Company not found in Supabase: ${firma.NAZIV} (PIB: ${firma.MATICNI})`)
        }
      }
    }
    
    console.log(`\n✅ Mapped ${firmaIdToSupabaseId.size} companies between Access and Supabase`)
    
    // Now update invoices with correct company_id
    console.log('\n📄 Updating invoices with correct company_id...')
    
    // Get all invoices from Supabase
    const { data: supabaseInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, company_id, invoice_year')
    
    console.log(`Found ${supabaseInvoices.length} invoices in Supabase`)
    
    // Create map of invoice_number to invoice record
    const invoiceMap = new Map()
    supabaseInvoices.forEach(inv => {
      // Key format: "number_year" to match Access structure
      const parts = inv.invoice_number.split('/')
      if (parts.length === 2) {
        const year = parseInt(parts[0])
        const number = parseInt(parts[1])
        const key = `${number}_${year}`
        invoiceMap.set(key, inv)
      }
    })
    
    // Track updates
    let updatedCount = 0
    let failedCount = 0
    const updates = []
    
    // Process each Access invoice
    for (const faktura of faktureData) {
      const invoiceKey = `${faktura.BROJ_FAK}_${faktura.GODINA}`
      const supabaseInvoice = invoiceMap.get(invoiceKey)
      
      if (supabaseInvoice && faktura.FIRMA_ID) {
        const newCompanyId = firmaIdToSupabaseId.get(faktura.FIRMA_ID)
        
        if (newCompanyId && newCompanyId !== supabaseInvoice.company_id) {
          updates.push({
            id: supabaseInvoice.id,
            company_id: newCompanyId
          })
          
          if (updates.length >= 50) {
            // Batch update
            for (const update of updates) {
              const { error } = await supabase
                .from('invoices')
                .update({ company_id: update.company_id })
                .eq('id', update.id)
              
              if (error) {
                console.error(`Failed to update invoice ${update.id}:`, error.message)
                failedCount++
              } else {
                updatedCount++
              }
            }
            updates.length = 0
            console.log(`  Updated ${updatedCount} invoices so far...`)
          }
        }
      }
    }
    
    // Process remaining updates
    if (updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from('invoices')
          .update({ company_id: update.company_id })
          .eq('id', update.id)
        
        if (error) {
          console.error(`Failed to update invoice ${update.id}:`, error.message)
          failedCount++
        } else {
          updatedCount++
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 MIGRATION SUMMARY:')
    console.log('='.repeat(80))
    console.log(`✅ Successfully updated: ${updatedCount} invoices`)
    console.log(`❌ Failed updates: ${failedCount} invoices`)
    
    // Verify some results
    console.log('\n🔍 Verification - Sample updated invoices:')
    const { data: verifyInvoices } = await supabase
      .from('invoices')
      .select(`
        invoice_number,
        company:companies (
          name,
          tax_number
        )
      `)
      .neq('company_id', '36c1f0b8-a7f4-4b17-baa8-d1fc97462391') // Not "Nepoznat klijent"
      .limit(5)
    
    verifyInvoices?.forEach(inv => {
      console.log(`  Invoice ${inv.invoice_number}: ${inv.company?.name} (PIB: ${inv.company?.tax_number})`)
    })
    
  } catch (error) {
    console.error('❌ Error during migration:', error)
  }
}

// Run migration
migrate()