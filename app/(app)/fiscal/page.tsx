import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fiskalizacija | Brain Nucleus',
  description: 'Fiskalizacija faktura',
}

export default function FiscalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fiskalizacija</h1>
        <p className="text-gray-500">Fiskalizacija i e-Fi integracija</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Modul za fiskalizaciju će biti dodat uskoro...</p>
      </div>
    </div>
  )
}