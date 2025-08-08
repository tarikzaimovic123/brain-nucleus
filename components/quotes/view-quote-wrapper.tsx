"use client"

import { useState, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import { ViewQuoteBlade } from './view-quote-blade'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { Loader2 } from "lucide-react"
import type { Quote } from "@/types/quotes"

interface ViewQuoteWrapperProps {
  quoteId: string
}

export function ViewQuoteWrapper({ quoteId }: ViewQuoteWrapperProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const { closeTopBlade } = useBladeStack()

  useEffect(() => {
    fetchQuote()
  }, [quoteId])

  const fetchQuote = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!company_id (
            id,
            name,
            address,
            city,
            postal_code,
            pib,
            registration_number,
            contact_person,
            phone,
            email
          ),
          contact:contacts!contact_person_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            position
          ),
          quote_items (
            id,
            product_id,
            product_name,
            description,
            quantity,
            unit_price,
            line_total,
            product:products!product_id (
              id,
              name,
              unit
            )
          )
        `)
        .eq('id', quoteId)
        .single()

      if (error) throw error
      setQuote(data)
    } catch (error) {
      console.error('Error fetching quote:', error)
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
            <span>Učitavanje ponude...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Ponuda nije pronađena</p>
        </div>
      </div>
    )
  }

  return (
    <ViewQuoteBlade
      quote={quote}
      onClose={closeTopBlade}
      onEdit={() => {
        // TODO: Add edit functionality
        console.log('Edit quote:', quoteId)
      }}
      onDelete={() => {
        // TODO: Add delete functionality  
        console.log('Delete quote:', quoteId)
      }}
    />
  )
}