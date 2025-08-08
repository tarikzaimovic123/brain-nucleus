import { Metadata } from 'next'
import { PublicQuoteView } from './public-quote-view'

export const metadata: Metadata = {
  title: 'Pregled ponude | Brain Nucleus',
  description: 'Pregledajte vašu ponudu',
}

interface PageProps {
  params: {
    token: string
  }
}

export default function PublicQuotePage({ params }: PageProps) {
  return <PublicQuoteView token={params.token} />
}