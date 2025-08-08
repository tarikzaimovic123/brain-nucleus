import { Metadata } from 'next'
import { UsersClient } from './users-client'

export const metadata: Metadata = {
  title: 'Korisnici | Brain Nucleus',
  description: 'Upravljanje korisnicima i dozvolama',
}

export default function UsersPage() {
  return <UsersClient />
}