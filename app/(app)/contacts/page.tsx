import { Metadata } from 'next'
import { ContactsClient } from './contacts-client'

export const metadata: Metadata = {
  title: 'Kontakti | Brain Nucleus',
  description: 'Upravljanje kontakt osobama',
}

export default function ContactsPage() {
  return <ContactsClient />
}