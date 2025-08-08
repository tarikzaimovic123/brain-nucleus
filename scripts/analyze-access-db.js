const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')
const path = require('path')

// Path to the Access database
const dbPath = '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb'

console.log('🔍 Analyzing Access Database:', dbPath)
console.log('=' .repeat(80))

try {
  // Read the database
  const buffer = fs.readFileSync(dbPath)
  const reader = new MDBReader(buffer)
  
  // Get all table names
  const tableNames = reader.getTableNames()
  
  console.log(`\n📊 Total tables found: ${tableNames.length}`)
  console.log('=' .repeat(80))
  
  // Filter tables related to invoices (fakture) and work orders (nalog)
  const relevantTables = tableNames.filter(table => 
    table.toLowerCase().includes('faktur') || 
    table.toLowerCase().includes('nalog') ||
    table.toLowerCase().includes('invoice') ||
    table.toLowerCase().includes('order')
  )
  
  console.log('\n🎯 RELEVANT TABLES (fakture/nalog related):')
  console.log('-' .repeat(80))
  relevantTables.forEach(tableName => {
    console.log(`\n📋 Table: ${tableName}`)
    console.log('-' .repeat(40))
    
    try {
      const table = reader.getTable(tableName)
      const columns = table.getColumnNames()
      const rowCount = table.getData().length
      
      console.log(`  Columns (${columns.length}):`)
      columns.forEach(col => {
        console.log(`    - ${col}`)
      })
      console.log(`  Row count: ${rowCount}`)
      
      // Show sample data for important tables
      if (tableName.toLowerCase().includes('fakture_nalog') || 
          tableName.toLowerCase().includes('nalog_ostalo')) {
        console.log('\n  🔗 IMPORTANT LINKING TABLE - Sample data:')
        const data = table.getData()
        if (data.length > 0) {
          // Show first 3 rows
          data.slice(0, 3).forEach((row, idx) => {
            console.log(`    Row ${idx + 1}:`, JSON.stringify(row, null, 2))
          })
        }
      }
    } catch (e) {
      console.log(`  ❌ Error reading table: ${e.message}`)
    }
  })
  
  // Special focus on key tables
  console.log('\n' + '=' .repeat(80))
  console.log('🔍 DETAILED ANALYSIS OF KEY TABLES:')
  console.log('=' .repeat(80))
  
  // Analyze fakture table
  const faktureTable = tableNames.find(t => t.toLowerCase() === 'fakture')
  if (faktureTable) {
    console.log('\n📄 FAKTURE Table Analysis:')
    const table = reader.getTable(faktureTable)
    const data = table.getData()
    console.log(`  Total invoices: ${data.length}`)
    
    // Check structure
    const columns = table.getColumnNames()
    console.log('  Key columns:', columns.filter(c => 
      c.toLowerCase().includes('id') || 
      c.toLowerCase().includes('broj') ||
      c.toLowerCase().includes('datum') ||
      c.toLowerCase().includes('iznos')
    ))
    
    // Sample invoice
    if (data.length > 0) {
      console.log('\n  Sample invoice:', JSON.stringify(data[0], null, 2))
    }
  }
  
  // Analyze nalog table
  const nalogTable = tableNames.find(t => t.toLowerCase() === 'nalog' || t.toLowerCase() === 'nalozi')
  if (nalogTable) {
    console.log('\n📋 NALOG Table Analysis:')
    const table = reader.getTable(nalogTable)
    const data = table.getData()
    console.log(`  Total work orders: ${data.length}`)
    
    // Check structure
    const columns = table.getColumnNames()
    console.log('  Key columns:', columns.filter(c => 
      c.toLowerCase().includes('id') || 
      c.toLowerCase().includes('broj') ||
      c.toLowerCase().includes('datum') ||
      c.toLowerCase().includes('status')
    ))
    
    // Sample work order
    if (data.length > 0) {
      console.log('\n  Sample work order:', JSON.stringify(data[0], null, 2))
    }
  }
  
  // Check for linking tables
  console.log('\n' + '=' .repeat(80))
  console.log('🔗 RELATIONSHIP TABLES:')
  console.log('=' .repeat(80))
  
  const linkingTables = tableNames.filter(t => 
    (t.toLowerCase().includes('fakture') && t.toLowerCase().includes('nalog')) ||
    t.toLowerCase().includes('_ostalo') ||
    t.toLowerCase().includes('stavke')
  )
  
  linkingTables.forEach(tableName => {
    console.log(`\n🔗 ${tableName}:`)
    const table = reader.getTable(tableName)
    const columns = table.getColumnNames()
    const data = table.getData()
    
    console.log('  Columns:', columns)
    console.log(`  Row count: ${data.length}`)
    
    if (data.length > 0) {
      console.log('  First row:', data[0])
    }
  })
  
  // Summary
  console.log('\n' + '=' .repeat(80))
  console.log('📊 SUMMARY:')
  console.log('=' .repeat(80))
  console.log(`Total tables: ${tableNames.length}`)
  console.log(`Invoice/Order related tables: ${relevantTables.length}`)
  console.log('\nKey tables found:')
  relevantTables.forEach(t => console.log(`  - ${t}`))
  
} catch (error) {
  console.error('❌ Error reading database:', error.message)
  console.error(error.stack)
}