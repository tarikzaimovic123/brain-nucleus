"use client"

import { useState, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import { ViewInvoiceBladeNew } from './view-invoice-blade-new'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { Loader2 } from "lucide-react"

interface ViewInvoiceWrapperProps {
  invoiceId: string
}

export function ViewInvoiceWrapper({ invoiceId }: ViewInvoiceWrapperProps) {
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const { closeTopBlade } = useBladeStack()

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    console.log('🔍 ViewInvoiceWrapper fetching invoice with ID:', invoiceId)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies (
            id,
            name,
            address,
            city,
            postal_code,
            tax_number,
            phone,
            email
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      
      console.log('✅ Successfully fetched invoice:', data?.invoice_number, data?.id)
      setInvoice(data)
    } catch (error) {
      console.error('❌ Error fetching invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Učitavanje fakture...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Faktura nije pronađena</p>
          <p className="text-sm text-gray-600 mt-2">ID: {invoiceId}</p>
          <button 
            onClick={closeTopBlade}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Zatvori
          </button>
        </div>
      </div>
    )
  }

  return (
    <ViewInvoiceBladeNew
      invoice={invoice}
      onClose={closeTopBlade}
    />
  )
}