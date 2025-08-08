const { default: MDBReader } = require('mdb-reader')
const fs = require('fs')

const buffer = fs.readFileSync('/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb')
const reader = new MDBReader(buffer)

const tableNames = reader.getTableNames()

console.log('Searching for company table...\n')

// Get FAKTURE sample to see FIRMA_ID values
const faktureTable = reader.getTable('FAKTURE')
const faktureData = faktureTable.getData()
const sampleFirmaIds = [...new Set(faktureData.slice(0, 100).map(f => f.FIRMA_ID).filter(id => id))]
console.log('Sample FIRMA_ID values from FAKTURE:', sampleFirmaIds.slice(0, 10))

// Search for table with these IDs
tableNames.forEach(tableName => {
  if (tableName.startsWith('MSys')) return
  
  try {
    const table = reader.getTable(tableName)
    const columns = table.getColumnNames()
    const data = table.getData()
    
    // Check if table has ID column and company-like columns
    if (columns.includes('ID') && data.length > 0) {
      const hasCompanyColumns = columns.some(c => 
        c.toUpperCase().includes('NAZIV') || 
        c.toUpperCase().includes('PIB') || 
        c.toUpperCase().includes('ADRESA') ||
        c.toUpperCase().includes('FIRMA')
      )
      
      if (hasCompanyColumns) {
        // Check if any ID matches our FIRMA_ID values
        const ids = data.map(r => r.ID)
        const matchFound = sampleFirmaIds.some(firmaId => ids.includes(firmaId))
        
        if (matchFound) {
          console.log(`\n✅ FOUND COMPANY TABLE: ${tableName}`)
          console.log('  Columns:', columns.join(', '))
          console.log('  Total rows:', data.length)
          console.log('\n  Sample record:')
          const sampleRecord = data.find(r => sampleFirmaIds.includes(r.ID))
          console.log(JSON.stringify(sampleRecord, null, 2))
        }
      }
    }
  } catch (e) {
    // Skip errors
  }
})

// Also check for tables with "firma" in columns
console.log('\n\nTables with company-related columns:')
tableNames.forEach(tableName => {
  if (tableName.startsWith('MSys')) return
  
  try {
    const table = reader.getTable(tableName)
    const columns = table.getColumnNames()
    
    const hasCompanyColumns = columns.some(c => 
      c.toUpperCase().includes('FIRMA') || 
      c.toUpperCase().includes('NAZIV') ||
      c.toUpperCase().includes('PIB')
    )
    
    if (hasCompanyColumns) {
      console.log(`  - ${tableName}: ${columns.filter(c => 
        c.toUpperCase().includes('FIRMA') || 
        c.toUpperCase().includes('NAZIV') ||
        c.toUpperCase().includes('PIB')
      ).join(', ')}`)
    }
  } catch (e) {
    // Skip
  }
})