import { Metadata } from 'next'
import { ProductsClient } from './products-client'

export const metadata: Metadata = {
  title: 'Artikli | Brain Nucleus',
  description: 'Upravljanje artiklima i uslugama',
}

export default function ProductsPage() {
  return <ProductsClient />
}