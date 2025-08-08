import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Podešavanja | Brain Nucleus',
  description: 'Podešavanja aplikacije',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Podešavanja</h1>
        <p className="text-gray-500">Konfiguriši postavke aplikacije</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Podešavanja će biti dodata uskoro...</p>
      </div>
    </div>
  )
}