"use client"

import { useState, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import { ViewWorkOrderBlade } from './view-work-order-blade'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { Loader2 } from "lucide-react"

interface ViewWorkOrderWrapperProps {
  workOrderId: string
}

export function ViewWorkOrderWrapper({ workOrderId }: ViewWorkOrderWrapperProps) {
  const [workOrder, setWorkOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const { closeTopBlade } = useBladeStack()

  useEffect(() => {
    fetchWorkOrder()
  }, [workOrderId])

  const fetchWorkOrder = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_orders')
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
          quote:quotes!quote_id (
            id,
            quote_number,
            quote_date,
            total_amount
          ),
          work_order_items (
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
          ),
          work_order_phases (
            id,
            phase_name,
            description,
            status,
            started_at,
            completed_at,
            estimated_hours,
            actual_hours,
            order_index
          )
        `)
        .eq('id', workOrderId)
        .single()

      if (error) throw error
      setWorkOrder(data)
    } catch (error) {
      console.error('Error fetching work order:', error)
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
            <span>Učitavanje radnog naloga...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p>Radni nalog nije pronađen</p>
        </div>
      </div>
    )
  }

  return (
    <ViewWorkOrderBlade
      workOrder={workOrder}
      onClose={closeTopBlade}
      onEdit={() => {
        // TODO: Add edit functionality
        console.log('Edit work order:', workOrderId)
      }}
      onDelete={() => {
        // TODO: Add delete functionality  
        console.log('Delete work order:', workOrderId)
      }}
    />
  )
}