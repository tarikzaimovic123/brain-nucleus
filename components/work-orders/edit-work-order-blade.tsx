'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Save, Loader2, Package, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { WorkOrder } from '@/types/work-orders'
import { format } from 'date-fns'
import { usePermissionContext } from '@/lib/contexts/permission-context'

const workOrderSchema = z.object({
  company_id: z.string().min(1, 'Firma je obavezna'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  start_date: z.string().min(1, 'Datum početka je obavezan'),
  due_date: z.string().min(1, 'Rok završetka je obavezan'),
  description: z.string().optional(),
  internal_notes: z.string().optional(),
  progress_percentage: z.number().min(0).max(100),
  is_visible_to_client: z.boolean(),
  current_phase: z.string().optional(),
})

type WorkOrderFormData = z.infer<typeof workOrderSchema>

interface EditWorkOrderBladeProps {
  workOrder: WorkOrder | null
  onClose: () => void
  onSave: () => void
}

export function EditWorkOrderBlade({ workOrder, onClose, onSave }: EditWorkOrderBladeProps) {
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState<string>('')
  const { toast } = useToast()
  const { checkPermissionWithToast } = usePermissionContext()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      company_id: workOrder?.company_id || '',
      status: workOrder?.status || 'pending',
      priority: workOrder?.priority || 'normal',
      start_date: workOrder?.start_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: workOrder?.due_date || format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Default 7 dana
      description: workOrder?.description || '',
      internal_notes: workOrder?.internal_notes || '',
      progress_percentage: workOrder?.progress_percentage || 0,
      is_visible_to_client: workOrder?.is_visible_to_client ?? true,
      current_phase: workOrder?.current_phase || 'priprema',
    },
  })

  const progressValue = watch('progress_percentage')
  const selectedCompanyId = watch('company_id')

  useEffect(() => {
    fetchCompanies()
    if (!workOrder) {
      generateOrderNumber()
    }
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchQuotes(selectedCompanyId)
    }
  }, [selectedCompanyId])

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (data) {
      setCompanies(data)
    }
  }

  const fetchQuotes = async (companyId: string) => {
    const { data } = await supabase
      .from('quotes')
      .select('id, quote_number')
      .eq('company_id', companyId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (data) {
      setQuotes(data)
    }
  }

  const generateOrderNumber = async () => {
    const year = new Date().getFullYear()
    const { data, error } = await supabase
      .from('work_orders')
      .select('order_number')
      .like('order_number', `RN-${year}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error generating order number:', error)
      return `RN-${year}-0001`
    }

    let nextNumber = 1
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].order_number.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const orderNumber = `RN-${year}-${nextNumber.toString().padStart(4, '0')}`
    setGeneratedOrderNumber(orderNumber)
    return orderNumber
  }

  const onSubmit = async (data: WorkOrderFormData) => {
    // Check permissions before proceeding
    const requiredAction = workOrder ? 'update' : 'create'
    const actionName = workOrder ? 'ažuriranje radnog naloga' : 'kreiranje radnog naloga'
    
    if (!checkPermissionWithToast('work_orders', requiredAction, actionName)) {
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Morate biti prijavljeni da biste kreirali radni nalog.',
      })
      setSaving(false)
      return
    }

    try {
      if (workOrder) {
        // Update existing work order
        const { error } = await supabase
          .from('work_orders')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workOrder.id)

        if (error) throw error

        // Add status history entry if status changed
        if (data.status !== workOrder.status) {
          await supabase
            .from('work_order_status_history')
            .insert({
              work_order_id: workOrder.id,
              status: data.status,
              changed_by: user?.id,
              notes: `Status promenjen iz ${workOrder.status} u ${data.status}`,
            })
        }

        // Update progress in phases if needed
        if (data.progress_percentage === 100 && data.status !== 'completed') {
          setValue('status', 'completed')
        }

        toast({
          title: 'Uspešno ažurirano',
          description: 'Radni nalog je uspešno ažuriran.',
        })
      } else {
        // Create new work order with generated number
        const orderNumber = await generateOrderNumber()
        
        console.log('Creating work order with number:', orderNumber)
        console.log('Form data:', data)
        
        const { data: newWorkOrder, error } = await supabase
          .from('work_orders')
          .insert({
            order_number: orderNumber,
            ...data,
            created_by: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating work order:', error)
          throw error
        }

        // Create initial status history
        await supabase
          .from('work_order_status_history')
          .insert({
            work_order_id: newWorkOrder.id,
            status: data.status,
            changed_by: user?.id,
            notes: 'Radni nalog kreiran',
          })

        // Create default phases
        const defaultPhases = [
          { phase_name: 'Priprema', phase_order: 1 },
          { phase_name: 'Dizajn', phase_order: 2 },
          { phase_name: 'Štampa', phase_order: 3 },
          { phase_name: 'Dorada', phase_order: 4 },
          { phase_name: 'Pakovanje', phase_order: 5 },
          { phase_name: 'Isporuka', phase_order: 6 },
        ]

        await supabase
          .from('work_order_phases')
          .insert(
            defaultPhases.map(phase => ({
              work_order_id: newWorkOrder.id,
              ...phase,
              status: 'pending',
            }))
          )

        toast({
          title: 'Uspešno kreiran',
          description: 'Novi radni nalog je uspešno kreiran.',
        })
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving work order:', error)
      
      // Specifične poruke za različite greške
      let errorMessage = 'Došlo je do greške prilikom čuvanja.'
      
      if (error.code === '23505') {
        errorMessage = 'Radni nalog sa ovim brojem već postoji.'
      } else if (error.code === '23503') {
        errorMessage = 'Neispravna referenca. Proverite da li firma postoji.'
      } else if (error.code === '22P02') {
        errorMessage = 'Neispravni podaci. Proverite sva polja.'
      } else if (error.message?.includes('company_id')) {
        errorMessage = 'Morate izabrati firmu.'
      } else if (error.message?.includes('due_date')) {
        errorMessage = 'Rok završetka mora biti posle datuma početka.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        variant: 'destructive',
        title: 'Greška pri kreiranju radnog naloga',
        description: errorMessage,
      })
    } finally {
      setSaving(false)
    }
  }

  const getPhaseForProgress = (percentage: number) => {
    if (percentage === 0) return 'priprema'
    if (percentage < 20) return 'priprema'
    if (percentage < 40) return 'dizajn'
    if (percentage < 60) return 'štampa'
    if (percentage < 80) return 'dorada'
    if (percentage < 100) return 'pakovanje'
    return 'isporuka'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {workOrder ? 'Izmeni radni nalog' : 'Novi radni nalog'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {workOrder ? `Izmena naloga #${workOrder.order_number}` : 'Kreiranje novog radnog naloga'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
        <div className="space-y-6 p-6">
          {/* Validation Errors Summary */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Molimo ispravite sledeće greške:</strong>
                <ul className="list-disc list-inside mt-2">
                  {errors.company_id && <li>{errors.company_id.message}</li>}
                  {errors.start_date && <li>{errors.start_date.message}</li>}
                  {errors.due_date && <li>{errors.due_date.message}</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Basic Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Osnovni podaci</h3>
            
            {!workOrder && generatedOrderNumber && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Broj naloga će biti: <strong>{generatedOrderNumber}</strong>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="company_id">Firma *</Label>
                <Select
                  value={watch('company_id')}
                  onValueChange={(value) => setValue('company_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite firmu" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.company_id && (
                  <p className="text-sm text-red-500">{errors.company_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value: any) => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Čeka</SelectItem>
                    <SelectItem value="in_progress">U toku</SelectItem>
                    <SelectItem value="completed">Završen</SelectItem>
                    <SelectItem value="cancelled">Otkazan</SelectItem>
                    <SelectItem value="on_hold">Pauziran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value: any) => setValue('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nizak</SelectItem>
                    <SelectItem value="normal">Normalan</SelectItem>
                    <SelectItem value="high">Visok</SelectItem>
                    <SelectItem value="urgent">Hitno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Rokovi</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Datum početka</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Rok završetka</Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                />
              </div>
            </div>
          </Card>

          {/* Progress */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Napredak</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Procenat završenosti</Label>
                  <span className="text-sm font-medium">{progressValue}%</span>
                </div>
                <Slider
                  value={[progressValue]}
                  onValueChange={(value) => {
                    setValue('progress_percentage', value[0])
                    setValue('current_phase', getPhaseForProgress(value[0]))
                  }}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Trenutna faza: {getPhaseForProgress(progressValue)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_visible_to_client">Vidljivo klijentu</Label>
                <Switch
                  id="is_visible_to_client"
                  checked={watch('is_visible_to_client')}
                  onCheckedChange={(checked) => setValue('is_visible_to_client', checked)}
                />
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Opis i napomene</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Opis radnog naloga..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internal_notes">Interne napomene</Label>
                <Textarea
                  id="internal_notes"
                  {...register('internal_notes')}
                  placeholder="Napomene vidljive samo zaposlenima..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {progressValue === 100 && watch('status') !== 'completed' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Napredak je 100%. Status će biti automatski postavljen na "Završen".
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Otkaži
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {workOrder ? 'Sačuvaj izmene' : 'Kreiraj nalog'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}