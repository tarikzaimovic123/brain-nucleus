import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Izveštaji | Brain Nucleus',
  description: 'Poslovna analitika i izveštaji',
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Izveštaji</h1>
        <p className="text-gray-500">Poslovna analitika i izveštaji</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Modul za izveštaje će biti dodat uskoro...</p>
      </div>
    </div>
  )
}