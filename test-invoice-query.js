const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://glnskbhfrpglioehjwhz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnNrYmhmcnBnbGlvZWhqd2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODEzMzMsImV4cCI6MjA3MDE1NzMzM30.gOkgxx_MZ9BtCIpIsqMnFvkItYkMx9BjeQenAJVgwIA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testQuery() {
  console.log('Testing invoice query with company join...\n')
  
  // Test 1: Simple query
  console.log('Test 1: Simple invoice query')
  const { data: simpleData, error: simpleError } = await supabase
    .from('invoices')
    .select('id, invoice_number, company_id')
    .limit(5)
    .order('created_at', { ascending: false })
  
  if (simpleError) {
    console.error('Simple query error:', simpleError)
  } else {
    console.log('Simple results:', simpleData)
  }
  
  // Test 2: Join with companies - find invoices with real customers
  console.log('\nTest 2: Invoice query with company join - looking for real customers')
  const { data: joinData, error: joinError } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      company_id,
      invoice_date,
      total_amount,
      company:companies!company_id (
        id,
        name,
        tax_number
      )
    `)
    .neq('company_id', '36c1f0b8-a7f4-4b17-baa8-d1fc97462391')
    .limit(10)
    .order('invoice_date', { ascending: false })
  
  if (joinError) {
    console.error('Join query error:', joinError)
  } else {
    console.log('Join results:', JSON.stringify(joinData, null, 2))
  }
  
  // Test 3: Direct company query
  console.log('\nTest 3: Direct company query')
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, name, tax_number')
    .neq('id', '36c1f0b8-a7f4-4b17-baa8-d1fc97462391')
    .limit(5)
  
  if (companyError) {
    console.error('Company query error:', companyError)
  } else {
    console.log('Company results:', companyData)
  }
  
  // Test 4: Check if specific company exists
  if (simpleData && simpleData.length > 0 && simpleData[0].company_id) {
    console.log('\nTest 4: Check specific company')
    const { data: specificCompany, error: specificError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', simpleData[0].company_id)
      .single()
    
    if (specificError) {
      console.error('Specific company error:', specificError)
    } else {
      console.log('Specific company:', specificCompany)
    }
  }
}

testQuery()