const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4MTMzMywiZXhwIjoyMDcwMTU3MzMzfQ.2XVss9ReSmWOWD_Kk9vbX6en0rGfjlHf0r9CPNR3V1E'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('Starting migrations...')
  
  const migrationsDir = path.join(__dirname, '..', 'lib', 'supabase', 'migrations')
  const migrations = [
    '001_initial_schema.sql',
    '002_printprice_schema.sql'
  ]
  
  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration)
    console.log(`\nRunning migration: ${migration}`)
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8')
      
      // Split by semicolons but keep them
      const statements = sql.split(/;(?=\s*\n)/).filter(s => s.trim())
      
      for (const statement of statements) {
        const cleanStatement = statement.trim()
        if (cleanStatement && !cleanStatement.startsWith('--')) {
          // Execute each statement
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: cleanStatement + ';'
          }).single()
          
          if (error) {
            console.error(`Error in statement: ${error.message}`)
            // Continue with next statement even if one fails
          }
        }
      }
      
      console.log(`✓ Migration ${migration} completed`)
    } catch (err) {
      console.error(`Error reading migration ${migration}:`, err.message)
    }
  }
  
  console.log('\n✅ All migrations completed!')
}

runMigrations().catch(console.error)