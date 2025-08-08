'use client'

import { useState } from 'react'
import { CheckCircle, Clock, Play, SkipForward, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { WorkOrderPhase } from '@/types/work-orders'
import { useToast } from '@/hooks/use-toast'

interface WorkOrderPhasesManagerProps {
  workOrderId: string
  phases: WorkOrderPhase[]
  onUpdate: () => void
  isReadOnly?: boolean
}

export function WorkOrderPhasesManager({ 
  workOrderId, 
  phases, 
  onUpdate,
  isReadOnly = false
}: WorkOrderPhasesManagerProps) {
  const [selectedPhase, setSelectedPhase] = useState<WorkOrderPhase | null>(null)
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const sortedPhases = phases.sort((a, b) => a.phase_order - b.phase_order)

  const updatePhaseStatus = async (phaseId: string, newStatus: string) => {
    if (isReadOnly) return
    
    setUpdating(true)
    
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Add timestamps based on status change
      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      // Add notes if provided
      if (notes.trim()) {
        updateData.notes = notes
      }

      const { error } = await supabase
        .from('work_order_phases')
        .update(updateData)
        .eq('id', phaseId)

      if (error) throw error

      // Calculate overall progress
      const updatedPhases = sortedPhases.map(p => 
        p.id === phaseId ? { ...p, status: newStatus } : p
      )
      const completedCount = updatedPhases.filter(p => p.status === 'completed').length
      const progressPercentage = Math.round((completedCount / updatedPhases.length) * 100)

      // Update work order progress
      await supabase
        .from('work_orders')
        .update({ 
          progress_percentage: progressPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId)

      // Create notification
      const phase = phases.find(p => p.id === phaseId)
      await supabase
        .from('notifications')
        .insert({
          type: 'work_order_phase_updated',
          title: 'Faza ažurirana',
          message: `Faza "${phase?.phase_name}" je promijenjena na ${getStatusLabel(newStatus)}`,
          data: {
            work_order_id: workOrderId,
            phase_id: phaseId,
            phase_name: phase?.phase_name,
            new_status: newStatus
          }
        })

      toast({
        title: 'Faza ažurirana',
        description: `${phase?.phase_name} je sada ${getStatusLabel(newStatus)}`,
      })

      setNotes('')
      setSelectedPhase(null)
      onUpdate()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: error.message || 'Došlo je do greške pri ažuriranju faze',
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'čeka'
      case 'in_progress': return 'u toku'
      case 'completed': return 'završeno'
      case 'skipped': return 'preskočeno'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'skipped': return <SkipForward className="h-5 w-5 text-gray-400" />
      default: return <AlertCircle className="h-5 w-5 text-gray-300" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Završeno</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500">U toku</Badge>
      case 'skipped':
        return <Badge variant="outline">Preskočeno</Badge>
      default:
        return <Badge variant="secondary">Čeka</Badge>
    }
  }

  const canStartPhase = (phase: WorkOrderPhase) => {
    if (isReadOnly) return false
    if (phase.status !== 'pending') return false
    
    // Check if previous phases are completed (except for first phase)
    if (phase.phase_order === 1) return true
    
    const previousPhases = sortedPhases.filter(p => p.phase_order < phase.phase_order)
    return previousPhases.every(p => p.status === 'completed' || p.status === 'skipped')
  }

  const getQuickActions = (phase: WorkOrderPhase) => {
    const actions = []
    
    if (phase.status === 'pending' && canStartPhase(phase)) {
      actions.push(
        <Button
          key="start"
          size="sm"
          variant="outline"
          onClick={() => updatePhaseStatus(phase.id, 'in_progress')}
          disabled={updating}
        >
          <Play className="h-3 w-3 mr-1" />
          Započni
        </Button>
      )
    }
    
    if (phase.status === 'in_progress') {
      actions.push(
        <Button
          key="complete"
          size="sm"
          variant="outline"
          className="text-green-600"
          onClick={() => updatePhaseStatus(phase.id, 'completed')}
          disabled={updating}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Završi
        </Button>
      )
    }
    
    if (phase.status === 'pending' && phase.phase_order > 1) {
      actions.push(
        <Button
          key="skip"
          size="sm"
          variant="outline"
          className="text-gray-500"
          onClick={() => updatePhaseStatus(phase.id, 'skipped')}
          disabled={updating}
        >
          <SkipForward className="h-3 w-3 mr-1" />
          Preskoči
        </Button>
      )
    }
    
    return actions
  }

  return (
    <div className="space-y-4">
      {!isReadOnly && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Kliknite na fazu da je započnete ili završite. Faze se moraju raditi redom.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {sortedPhases.map((phase, index) => {
          const isActive = selectedPhase?.id === phase.id
          const isCompleted = phase.status === 'completed'
          const isInProgress = phase.status === 'in_progress'
          const isSkipped = phase.status === 'skipped'
          
          return (
            <Card 
              key={phase.id} 
              className={`p-4 transition-all ${
                isActive ? 'ring-2 ring-primary' : ''
              } ${
                isCompleted ? 'bg-green-50 border-green-200' :
                isInProgress ? 'bg-blue-50 border-blue-200' :
                isSkipped ? 'bg-gray-50 border-gray-200' :
                ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border-2 border-gray-200 font-semibold">
                    {isCompleted || isInProgress || isSkipped ? (
                      getStatusIcon(phase.status)
                    ) : (
                      <span className="text-sm">{phase.phase_order}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{phase.phase_name}</h4>
                      {getStatusBadge(phase.status)}
                    </div>
                    
                    {phase.started_at && (
                      <p className="text-xs text-muted-foreground">
                        Započeto: {format(new Date(phase.started_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </p>
                    )}
                    
                    {phase.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Završeno: {format(new Date(phase.completed_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </p>
                    )}
                    
                    {phase.notes && (
                      <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded">
                        {phase.notes}
                      </p>
                    )}
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex gap-2">
                    {getQuickActions(phase)}
                  </div>
                )}
              </div>

              {/* Advanced controls when phase is selected */}
              {isActive && !isReadOnly && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Promijeni status</Label>
                      <Select
                        value={phase.status}
                        onValueChange={(value) => {
                          if (value !== phase.status) {
                            updatePhaseStatus(phase.id, value)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Čeka</SelectItem>
                          <SelectItem value="in_progress">U toku</SelectItem>
                          <SelectItem value="completed">Završeno</SelectItem>
                          <SelectItem value="skipped">Preskočeno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Napomena (opciono)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Dodajte napomenu o ovoj fazi..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {updating && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}