import { Metadata } from 'next'
import { QuotesClient } from './quotes-client'

export const metadata: Metadata = {
  title: 'Ponude | Brain Nucleus',
  description: 'Upravljanje ponudama i oferima',
}

export default function QuotesPage() {
  return <QuotesClient />
}