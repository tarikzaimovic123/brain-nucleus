import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zaposleni | Brain Nucleus',
  description: 'Upravljanje zaposlenima',
}

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Zaposleni</h1>
        <p className="text-gray-500">Upravljanje zaposlenima i korisnicima</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Modul za zaposlene će biti dodat uskoro...</p>
      </div>
    </div>
  )
}