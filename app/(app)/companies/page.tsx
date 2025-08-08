import { Metadata } from 'next'
import { CompaniesClient } from './companies-client'

export const metadata: Metadata = {
  title: 'Kompanije | Brain Nucleus',
  description: 'Upravljanje kompanijama i klijentima',
}

export default function CompaniesPage() {
  return <CompaniesClient />
}