const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.4B6v4evGk7GzDVJXRtF2R1YafoP5iwqEePQIhg3daKo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configuration
const CONFIG = {
  accessDbPath: '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb',
  batchSize: 100, // Process in batches for safety
  dryRun: true, // Set to false to actually migrate
  logFile: `migration-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
}

// Migration state
const migrationState = {
  startTime: new Date(),
  faktureNalog: {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  },
  nalogOstalo: {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  },
  mappings: {
    invoices: new Map(), // Access ID -> Supabase ID
    workOrders: new Map() // Access ID -> Supabase ID
  }
}

// Logging functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}`
  console.log(logMessage)
  
  // Also save to state for final report
  if (!migrationState.logs) migrationState.logs = []
  migrationState.logs.push(logMessage)
}

function logError(context, error, data = null) {
  log(`ERROR in ${context}: ${error.message}`, 'ERROR')
  
  const errorDetail = {
    context,
    error: error.message,
    stack: error.stack,
    data,
    timestamp: new Date().toISOString()
  }
  
  if (context.includes('FAKTURE_NALOG')) {
    migrationState.faktureNalog.errors.push(errorDetail)
  } else if (context.includes('NALOG_OSALO')) {
    migrationState.nalogOstalo.errors.push(errorDetail)
  }
}

// Save migration report
function saveReport() {
  const report = {
    ...migrationState,
    endTime: new Date(),
    duration: new Date() - migrationState.startTime,
    success: migrationState.faktureNalog.failed === 0 && migrationState.nalogOstalo.failed === 0
  }
  
  fs.writeFileSync(CONFIG.logFile, JSON.stringify(report, null, 2))
  log(`Report saved to ${CONFIG.logFile}`)
}

// Step 1: Build ID mappings between Access and Supabase
async function buildIdMappings() {
  log('Building ID mappings between Access and Supabase databases...')
  
  try {
    // Get all invoices with original_id
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, original_id, invoice_year, invoice_type')
    
    if (invError) throw invError
    
    // Map by invoice number for now (since we don't have original_id populated yet)
    invoices.forEach(inv => {
      // Parse invoice number format: "YYYY/NNNNNN"
      const parts = inv.invoice_number.split('/')
      if (parts.length === 2) {
        const year = parseInt(parts[0])
        const number = parseInt(parts[1])
        
        // Create mapping key similar to Access structure
        const key = `${number}_${year}`
        migrationState.mappings.invoices.set(key, inv.id)
      }
    })
    
    log(`Mapped ${migrationState.mappings.invoices.size} invoices`)
    
    // Get all work orders
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id, order_number, original_id')
    
    if (woError) throw woError
    
    workOrders.forEach(wo => {
      // Map by original_id
      if (wo.original_id) {
        migrationState.mappings.workOrders.set(wo.original_id, wo.id)
      }
    })
    
    log(`Mapped ${migrationState.mappings.workOrders.size} work orders`)
    
  } catch (error) {
    logError('buildIdMappings', error)
    throw error
  }
}

// Step 2: Migrate FAKTURE_NALOG (invoice-work order relationships)
async function migrateFaktureNalog(reader) {
  log('=' .repeat(80))
  log('Starting FAKTURE_NALOG migration...')
  
  try {
    const table = reader.getTable('FAKTURE_NALOG')
    const data = table.getData()
    
    migrationState.faktureNalog.total = data.length
    log(`Found ${data.length} FAKTURE_NALOG records to migrate`)
    
    // Process in batches
    for (let i = 0; i < data.length; i += CONFIG.batchSize) {
      const batch = data.slice(i, Math.min(i + CONFIG.batchSize, data.length))
      log(`Processing batch ${Math.floor(i/CONFIG.batchSize) + 1} (records ${i+1}-${Math.min(i+CONFIG.batchSize, data.length)})`)
      
      const recordsToInsert = []
      
      for (const record of batch) {
        migrationState.faktureNalog.processed++
        
        try {
          // Find corresponding Supabase IDs
          const invoiceKey = `${record.ID_FAKTURA}_${record.GODINA}`
          const invoiceId = migrationState.mappings.invoices.get(invoiceKey)
          const workOrderId = migrationState.mappings.workOrders.get(record.ID_NALOGA)
          
          if (!invoiceId) {
            log(`Warning: Could not find invoice for Access ID ${record.ID_FAKTURA}/${record.GODINA}`, 'WARN')
            migrationState.faktureNalog.failed++
            continue
          }
          
          if (!workOrderId) {
            log(`Warning: Could not find work order for Access ID ${record.ID_NALOGA}`, 'WARN')
            migrationState.faktureNalog.failed++
            continue
          }
          
          recordsToInsert.push({
            invoice_id: invoiceId,
            work_order_id: workOrderId,
            work_order_item_id: record.ID_NALOGA_STAVKE
          })
          
        } catch (error) {
          logError('FAKTURE_NALOG record processing', error, record)
          migrationState.faktureNalog.failed++
        }
      }
      
      // Insert batch if not dry run
      if (recordsToInsert.length > 0) {
        if (CONFIG.dryRun) {
          log(`[DRY RUN] Would insert ${recordsToInsert.length} invoice_work_order_items`)
          migrationState.faktureNalog.successful += recordsToInsert.length
        } else {
          const { data: inserted, error } = await supabase
            .from('invoice_work_order_items')
            .insert(recordsToInsert)
            .select()
          
          if (error) {
            logError('FAKTURE_NALOG batch insert', error, recordsToInsert)
            migrationState.faktureNalog.failed += recordsToInsert.length
          } else {
            log(`Successfully inserted ${inserted.length} invoice_work_order_items`)
            migrationState.faktureNalog.successful += inserted.length
          }
        }
      }
    }
    
    log(`FAKTURE_NALOG migration completed: ${migrationState.faktureNalog.successful} successful, ${migrationState.faktureNalog.failed} failed`)
    
  } catch (error) {
    logError('migrateFaktureNalog', error)
    throw error
  }
}

// Step 3: Migrate NALOG_OSALO (additional work order items)
async function migrateNalogOstalo(reader) {
  log('=' .repeat(80))
  log('Starting NALOG_OSALO migration...')
  
  try {
    const table = reader.getTable('NALOG_OSALO')
    const data = table.getData()
    
    migrationState.nalogOstalo.total = data.length
    log(`Found ${data.length} NALOG_OSALO records to migrate`)
    
    // Process in batches
    for (let i = 0; i < data.length; i += CONFIG.batchSize) {
      const batch = data.slice(i, Math.min(i + CONFIG.batchSize, data.length))
      log(`Processing batch ${Math.floor(i/CONFIG.batchSize) + 1} (records ${i+1}-${Math.min(i+CONFIG.batchSize, data.length)})`)
      
      const recordsToInsert = []
      
      for (const record of batch) {
        migrationState.nalogOstalo.processed++
        
        try {
          // Find corresponding work order
          const workOrderId = migrationState.mappings.workOrders.get(record.ID_NALOGA)
          
          if (!workOrderId) {
            log(`Warning: Could not find work order for Access ID ${record.ID_NALOGA}`, 'WARN')
            migrationState.nalogOstalo.failed++
            continue
          }
          
          recordsToInsert.push({
            work_order_id: workOrderId,
            item_number: record.RBR || 0,
            description: record.OPIS,
            comment: record.R_KOMENTAR,
            price: parseFloat(record.R_CIJENA) || 0,
            quantity: parseFloat(record.KOLICINA) || 1,
            unit: record.MJERA
          })
          
        } catch (error) {
          logError('NALOG_OSALO record processing', error, record)
          migrationState.nalogOstalo.failed++
        }
      }
      
      // Insert batch if not dry run
      if (recordsToInsert.length > 0) {
        if (CONFIG.dryRun) {
          log(`[DRY RUN] Would insert ${recordsToInsert.length} work_order_additional_items`)
          migrationState.nalogOstalo.successful += recordsToInsert.length
        } else {
          const { data: inserted, error } = await supabase
            .from('work_order_additional_items')
            .insert(recordsToInsert)
            .select()
          
          if (error) {
            logError('NALOG_OSALO batch insert', error, recordsToInsert)
            migrationState.nalogOstalo.failed += recordsToInsert.length
          } else {
            log(`Successfully inserted ${inserted.length} work_order_additional_items`)
            migrationState.nalogOstalo.successful += inserted.length
          }
        }
      }
    }
    
    log(`NALOG_OSALO migration completed: ${migrationState.nalogOstalo.successful} successful, ${migrationState.nalogOstalo.failed} failed`)
    
  } catch (error) {
    logError('migrateNalogOstalo', error)
    throw error
  }
}

// Step 4: Verify migration
async function verifyMigration() {
  log('=' .repeat(80))
  log('Verifying migration...')
  
  try {
    // Count records in new tables
    const { count: invoiceWorkOrderCount } = await supabase
      .from('invoice_work_order_items')
      .select('*', { count: 'exact', head: true })
    
    const { count: additionalItemsCount } = await supabase
      .from('work_order_additional_items')
      .select('*', { count: 'exact', head: true })
    
    log(`invoice_work_order_items table has ${invoiceWorkOrderCount} records`)
    log(`work_order_additional_items table has ${additionalItemsCount} records`)
    
    // Check a sample of relationships
    const { data: sampleLinks } = await supabase
      .from('invoice_work_order_items')
      .select(`
        id,
        invoice:invoices!invoice_id (invoice_number),
        work_order:work_orders!work_order_id (order_number)
      `)
      .limit(5)
    
    if (sampleLinks && sampleLinks.length > 0) {
      log('Sample invoice-work order links:')
      sampleLinks.forEach(link => {
        log(`  Invoice ${link.invoice?.invoice_number} → Work Order ${link.work_order?.order_number}`)
      })
    }
    
  } catch (error) {
    logError('verifyMigration', error)
  }
}

// Main migration function
async function migrate() {
  log('🚀 STARTING SAFE MIGRATION PROCESS')
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`)
  
  if (CONFIG.dryRun) {
    log('⚠️  DRY RUN MODE - No actual data will be modified', 'WARN')
  }
  
  try {
    // Read Access database
    log('Reading Access database...')
    const buffer = fs.readFileSync(CONFIG.accessDbPath)
    const reader = new MDBReader(buffer)
    log('Access database loaded successfully')
    
    // Step 1: Build ID mappings
    await buildIdMappings()
    
    // Step 2: Migrate FAKTURE_NALOG
    await migrateFaktureNalog(reader)
    
    // Step 3: Migrate NALOG_OSALO
    await migrateNalogOstalo(reader)
    
    // Step 4: Verify migration
    await verifyMigration()
    
    // Save final report
    saveReport()
    
    // Summary
    log('=' .repeat(80))
    log('MIGRATION SUMMARY:')
    log(`FAKTURE_NALOG: ${migrationState.faktureNalog.successful}/${migrationState.faktureNalog.total} successful`)
    log(`NALOG_OSALO: ${migrationState.nalogOstalo.successful}/${migrationState.nalogOstalo.total} successful`)
    
    if (migrationState.faktureNalog.failed > 0 || migrationState.nalogOstalo.failed > 0) {
      log(`⚠️  There were ${migrationState.faktureNalog.failed + migrationState.nalogOstalo.failed} total failures`, 'WARN')
      log(`Check ${CONFIG.logFile} for details`)
    } else {
      log('✅ Migration completed successfully!')
    }
    
  } catch (error) {
    log(`❌ CRITICAL ERROR: ${error.message}`, 'ERROR')
    saveReport()
    process.exit(1)
  }
}

// Add command line argument parsing
const args = process.argv.slice(2)
if (args.includes('--live')) {
  CONFIG.dryRun = false
  log('⚠️  LIVE MODE ENABLED - Data will be modified!', 'WARN')
}

if (args.includes('--help')) {
  console.log(`
Safe Migration Script - Access to Supabase
==========================================

Usage: node safe-migration-access-to-supabase.js [options]

Options:
  --live     Run in live mode (actually modify data)
  --help     Show this help message

By default, runs in DRY RUN mode to test without modifying data.

This script will:
1. Migrate FAKTURE_NALOG (6548 invoice-work order relationships)
2. Migrate NALOG_OSALO (8971 additional work order items)
3. Create detailed logs and reports
4. Verify the migration

The migration is SAFE because:
- It runs in dry-run mode by default
- Processes data in small batches
- Creates detailed logs of all operations
- Can be re-run safely (uses UNIQUE constraints)
- Generates a complete report
`)
  process.exit(0)
}

// Run migration
migrate()