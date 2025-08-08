import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kalkulacije | Brain Nucleus',
  description: 'Kalkulacije troškova',
}

export default function CalculationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kalkulacije</h1>
        <p className="text-gray-500">Kalkulacije troškova i cena</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Modul za kalkulacije će biti dodat uskoro...</p>
      </div>
    </div>
  )
}