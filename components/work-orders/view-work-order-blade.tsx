'use client'

import { useState, useEffect } from 'react'
import { X, Edit2, Trash2, Send, Eye, Link, Clock, CheckCircle, Package, AlertCircle, MessageSquare, User, Calendar, TrendingUp, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, differenceInDays } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { WorkOrder, WorkOrderComment } from '@/types/work-orders'
import { useToast } from '@/hooks/use-toast'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

interface ViewWorkOrderBladeProps {
  workOrder: WorkOrder
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewWorkOrderBlade({ workOrder, onClose, onEdit, onDelete }: ViewWorkOrderBladeProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [comments, setComments] = useState<WorkOrderComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [currentWorkOrder, setCurrentWorkOrder] = useState(workOrder)
  const { toast } = useToast()
  const { hasPermission } = usePermissionContext()
  const supabase = createClient()

  useEffect(() => {
    fetchComments()
    fetchShareLink()
  }, [currentWorkOrder.id])

  useEffect(() => {
    setCurrentWorkOrder(workOrder)
  }, [workOrder])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('work_order_comments')
      .select('*')
      .eq('work_order_id', currentWorkOrder.id)
      .order('created_at', { ascending: false })

    if (data) {
      setComments(data)
    }
  }

  const fetchShareLink = async () => {
    const { data } = await supabase
      .from('work_order_share_links')
      .select('token')
      .eq('work_order_id', currentWorkOrder.id)
      .eq('is_active', true)
      .single()

    if (data) {
      const baseUrl = window.location.origin
      setShareLink(`${baseUrl}/track/work-order/${data.token}`)
    }
  }

  const submitComment = async () => {
    if (!newComment.trim()) return

    setSubmittingComment(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('work_order_comments')
      .insert({
        work_order_id: currentWorkOrder.id,
        comment_text: newComment,
        is_internal: isInternalComment,
        created_by: user?.id,
        author_name: user?.email?.split('@')[0] || 'Tim',
        author_email: user?.email
      })

    if (!error) {
      setNewComment('')
      fetchComments()
      toast({
        title: 'Komentar dodat',
        description: 'Vaš komentar je uspešno dodat.',
      })
    }
    setSubmittingComment(false)
  }

  const generateShareLink = async () => {
    setGeneratingLink(true)
    
    // Check if link already exists
    const { data: existing } = await supabase
      .from('work_order_share_links')
      .select('token')
      .eq('work_order_id', currentWorkOrder.id)
      .eq('is_active', true)
      .single()

    if (existing) {
      const baseUrl = window.location.origin
      setShareLink(`${baseUrl}/track/work-order/${existing.token}`)
      toast({
        title: 'Link već postoji',
        description: 'Koristite postojeći link za deljenje.',
      })
    } else {
      // Generate new link
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      const { error } = await supabase
        .from('work_order_share_links')
        .insert({
          work_order_id: currentWorkOrder.id,
          token,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })

      if (!error) {
        const baseUrl = window.location.origin
        setShareLink(`${baseUrl}/track/work-order/${token}`)
        toast({
          title: 'Link kreiran',
          description: 'Link za praćenje je uspešno kreiran.',
        })
      }
    }
    setGeneratingLink(false)
  }

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      toast({
        title: 'Link kopiran',
        description: 'Link je kopiran u clipboard.',
      })
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Čeka</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">U toku</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Završen</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Otkazan</Badge>
      case 'on_hold':
        return <Badge variant="outline">Pauziran</Badge>
      default:
        return <Badge variant="outline">Nepoznato</Badge>
    }
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Hitno</Badge>
      case 'high':
        return <Badge variant="default" className="bg-orange-500">Visok</Badge>
      case 'normal':
        return <Badge variant="secondary">Normalan</Badge>
      case 'low':
        return <Badge variant="outline">Nizak</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      case 'skipped': return 'bg-gray-400'
      default: return 'bg-gray-200'
    }
  }

  const daysLeft = currentWorkOrder.due_date ? differenceInDays(parseISO(currentWorkOrder.due_date), new Date()) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && currentWorkOrder.status !== 'completed'

  // Calculate completion stats
  const totalItems = currentWorkOrder.work_order_items?.length || 0
  const completedItems = currentWorkOrder.work_order_items?.filter(item => item.is_completed).length || 0
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Phase management functions - moved outside render
  const handleStartPhase = async (phaseId: string, phaseName: string) => {
    try {
      console.log('Starting phase:', phaseId, phaseName)
      
      const { error } = await supabase
        .from('work_order_phases')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', phaseId)
      
      if (error) {
        console.error('Error starting phase:', error)
        toast({
          variant: 'destructive',
          title: 'Greška pri pokretanju faze',
          description: error.message || 'Nepoznata greška',
        })
        return
      }
      
      // Update local state
      const updatedPhases = currentWorkOrder.work_order_phases?.map(p => 
        p.id === phaseId 
          ? { ...p, status: 'in_progress' as const, started_at: new Date().toISOString() }
          : p
      )
      
      setCurrentWorkOrder({
        ...currentWorkOrder,
        work_order_phases: updatedPhases,
        status: 'in_progress'
      })
      
      toast({
        title: 'Faza započeta',
        description: `${phaseName} je sada u toku`,
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        variant: 'destructive',
        title: 'Neočekivana greška',
        description: 'Molimo pokušajte ponovo',
      })
    }
  }

  const handleCompletePhase = async (phaseId: string, phaseName: string, phaseOrder: number) => {
    try {
      const { error } = await supabase
        .from('work_order_phases')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', phaseId)
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Greška',
          description: error.message,
        })
        return
      }
      
      // Update local state for phases
      const updatedPhases = currentWorkOrder.work_order_phases?.map(p => 
        p.id === phaseId 
          ? { ...p, status: 'completed' as const, completed_at: new Date().toISOString() }
          : p
      )
      
      // Calculate progress and determine status
      const totalPhases = updatedPhases?.length || 6
      const completedPhases = updatedPhases?.filter(p => p.status === 'completed').length || 0
      const skippedPhases = updatedPhases?.filter(p => p.status === 'skipped').length || 0
      const progress = Math.round(((completedPhases + skippedPhases) / totalPhases) * 100)
      
      // Determine if all phases are done
      const allPhasesDone = (completedPhases + skippedPhases) === totalPhases
      const nextPhase = updatedPhases?.find(p => p.phase_order === phaseOrder + 1)?.phase_name || null
      
      // Status će biti automatski ažuriran preko triggera
      // ali ažuriramo lokalni state da bi korisnik odmah video promenu
      const newStatus = allPhasesDone ? 'completed' : 'in_progress'
      
      // Update local state
      setCurrentWorkOrder({
        ...currentWorkOrder,
        work_order_phases: updatedPhases,
        progress_percentage: progress,
        current_phase: allPhasesDone ? 'Završeno' : (nextPhase || 'isporuka'),
        status: newStatus
      })
      
      toast({
        title: allPhasesDone ? '🎉 Radni nalog završen!' : 'Faza završena',
        description: allPhasesDone 
          ? 'Sve faze su završene! Radni nalog je automatski označen kao završen.'
          : `${phaseName} je završena. Progress: ${progress}%`,
        variant: allPhasesDone ? 'default' : undefined
      })
    } catch (err) {
      console.error('Error completing phase:', err)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Neočekivana greška pri završavanju faze',
      })
    }
  }

  const handleSkipPhase = async (phaseId: string, phaseName: string) => {
    try {
      const { error } = await supabase
        .from('work_order_phases')
        .update({ status: 'skipped' })
        .eq('id', phaseId)
        
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Greška',
          description: error.message,
        })
        return
      }
      
      const updatedPhases = currentWorkOrder.work_order_phases?.map(p => 
        p.id === phaseId ? { ...p, status: 'skipped' as const } : p
      )
      setCurrentWorkOrder({
        ...currentWorkOrder,
        work_order_phases: updatedPhases
      })
      toast({
        title: 'Faza preskočena',
        description: `${phaseName} je označena kao preskočena`
      })
    } catch (err) {
      console.error('Error skipping phase:', err)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Neočekivana greška pri preskakanju faze',
      })
    }
  }

  const handleResetPhase = async (phaseId: string, phaseName: string) => {
    try {
      const { error } = await supabase
        .from('work_order_phases')
        .update({ 
          status: 'pending',
          started_at: null,
          completed_at: null
        })
        .eq('id', phaseId)
        
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Greška',
          description: error.message,
        })
        return
      }
      
      const updatedPhases = currentWorkOrder.work_order_phases?.map(p => 
        p.id === phaseId 
          ? { ...p, status: 'pending' as const, started_at: null, completed_at: null }
          : p
      )
      
      // Preračunaj progres
      const totalPhases = updatedPhases?.length || 6
      const completedPhases = updatedPhases?.filter(p => p.status === 'completed').length || 0
      const skippedPhases = updatedPhases?.filter(p => p.status === 'skipped').length || 0
      const progress = Math.round(((completedPhases + skippedPhases) / totalPhases) * 100)
      
      setCurrentWorkOrder({
        ...currentWorkOrder,
        work_order_phases: updatedPhases,
        progress_percentage: progress,
        status: 'in_progress' // Vrati na in_progress jer ima posla
      })
      
      toast({
        title: 'Faza resetovana',
        description: `${phaseName} je vraćena na čekanje`,
        variant: 'default'
      })
    } catch (err) {
      console.error('Error resetting phase:', err)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Neočekivana greška pri resetovanju faze',
      })
    }
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
            <h2 className="text-lg font-semibold">Radni nalog #{currentWorkOrder.order_number}</h2>
            <p className="text-sm text-muted-foreground">{currentWorkOrder.company?.name || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard resource="work_orders" action="update">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="mr-2 h-4 w-4" />
              Izmeni
            </Button>
          </PermissionGuard>
          <PermissionGuard resource="work_orders" action="delete">
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Obriši
            </Button>
          </PermissionGuard>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusBadge(currentWorkOrder.status)}
            {getPriorityBadge(currentWorkOrder.priority)}
            {currentWorkOrder.is_visible_to_client && (
              <Badge variant="outline" className="text-green-600">
                <Eye className="h-3 w-3 mr-1" />
                Vidljivo klijentu
              </Badge>
            )}
          </div>
          {isOverdue && (
            <Alert className="py-1 px-3 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-600 ml-2">
                Kasni {Math.abs(daysLeft!)} dana!
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-6">
          <TabsTrigger value="overview">Pregled</TabsTrigger>
          <TabsTrigger value="phases">Faze proizvodnje</TabsTrigger>
          <TabsTrigger value="items">Stavke</TabsTrigger>
          <TabsTrigger value="tracking">Praćenje</TabsTrigger>
          <TabsTrigger value="history">Istorija</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="overview" className="p-6 space-y-6">
            {/* Progress Overview */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Napredak proizvodnje</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ukupni napredak</span>
                  <span className="text-sm font-bold">{currentWorkOrder.progress_percentage || 0}%</span>
                </div>
                <Progress value={currentWorkOrder.progress_percentage || 0} className="h-3" />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Trenutna faza: {currentWorkOrder.current_phase || 'Početak'}</span>
                  <span>{completedItems} od {totalItems} stavki završeno</span>
                </div>
              </div>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Osnovni podaci</h3>
                <div className="space-y-2">
                  {currentWorkOrder.quote && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ponuda:</span>
                      <span className="font-medium">#{currentWorkOrder.quote.quote_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Firma:</span>
                    <span className="font-medium">{currentWorkOrder.company?.name || 'N/A'}</span>
                  </div>
                  {currentWorkOrder.assigned_to && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dodeljeno:</span>
                      <span className="font-medium">
                        <User className="inline h-3 w-3 mr-1" />
                        {currentWorkOrder.assigned_to}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Rokovi</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Početak:</span>
                    <span className="font-medium">
                      {currentWorkOrder.start_date 
                        ? format(parseISO(currentWorkOrder.start_date), 'dd.MM.yyyy', { locale: sr })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rok završetka:</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {currentWorkOrder.due_date 
                        ? format(parseISO(currentWorkOrder.due_date), 'dd.MM.yyyy', { locale: sr })
                        : '-'}
                    </span>
                  </div>
                  {daysLeft !== null && currentWorkOrder.status !== 'completed' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preostalo:</span>
                      <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                        {isOverdue ? `Kasni ${Math.abs(daysLeft)} dana` : `${daysLeft} dana`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Description */}
            {currentWorkOrder.description && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Opis</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentWorkOrder.description}
                </p>
              </Card>
            )}

            {/* Internal Notes */}
            {currentWorkOrder.internal_notes && (
              <Card className="p-4 border-orange-200 bg-orange-50">
                <h3 className="font-semibold mb-3 text-orange-900">Interne napomene</h3>
                <p className="text-sm text-orange-800 whitespace-pre-wrap">
                  {currentWorkOrder.internal_notes}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="phases" className="p-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Faze proizvodnje - Interaktivni Manager</h3>
              
              {currentWorkOrder.status === 'completed' ? (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>✅ Sve faze su završene!</strong> Radni nalog je automatski označen kao završen.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Kliknite na dugmiće pored svake faze da mijenjate status. Kada se sve faze završe, radni nalog će automatski biti označen kao završen.
                  </AlertDescription>
                </Alert>
              )}

              {!currentWorkOrder.work_order_phases || currentWorkOrder.work_order_phases.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nema definisanih faza za ovaj radni nalog.
                  </AlertDescription>
                </Alert>
              ) : (
              <div className="space-y-3">
                {currentWorkOrder.work_order_phases?.sort((a, b) => a.phase_order - b.phase_order).map((phase, index) => {
                  const isCompleted = phase.status === 'completed'
                  const isInProgress = phase.status === 'in_progress'
                  const isPending = phase.status === 'pending'
                  const isSkipped = phase.status === 'skipped'
                  const isFirst = index === 0
                  const previousCompleted = index === 0 || currentWorkOrder.work_order_phases?.find(p => p.phase_order === phase.phase_order - 1)?.status === 'completed'
                  
                  return (
                    <div key={phase.id} className={`flex items-center gap-3 p-3 border rounded-lg ${
                      isCompleted ? 'bg-green-50 border-green-200' :
                      isInProgress ? 'bg-blue-50 border-blue-200' :
                      isSkipped ? 'bg-gray-50 border-gray-200' :
                      'bg-gray-50'
                    }`}>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' :
                        isInProgress ? 'bg-blue-500 animate-pulse' :
                        isSkipped ? 'bg-gray-400' :
                        'bg-gray-200'
                      } text-white font-semibold`}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : isInProgress ? (
                          <Clock className="h-5 w-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{phase.phase_name}</h4>
                          <Badge variant={
                            isCompleted ? 'default' :
                            isInProgress ? 'secondary' :
                            isSkipped ? 'outline' :
                            'outline'
                          } className={
                            isCompleted ? 'bg-green-500' :
                            isInProgress ? 'bg-blue-500' :
                            isSkipped ? 'bg-gray-400' :
                            ''
                          }>
                            {isCompleted ? 'Završeno' :
                             isInProgress ? 'U toku' :
                             isSkipped ? 'Preskočeno' :
                             'Čeka'}
                          </Badge>
                        </div>
                        
                        {phase.started_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Započeto: {format(parseISO(phase.started_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                          </p>
                        )}
                        {phase.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Završeno: {format(parseISO(phase.completed_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {isPending && (isFirst || previousCompleted) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartPhase(phase.id, phase.phase_name)}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                            disabled={currentWorkOrder.status === 'completed' || currentWorkOrder.status === 'cancelled'}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Započni
                          </Button>
                        )}
                        
                        {isInProgress && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompletePhase(phase.id, phase.phase_name, phase.phase_order)}
                              className="bg-green-500 text-white hover:bg-green-600"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Završi
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSkipPhase(phase.id, phase.phase_name)}
                              className="bg-gray-400 text-white hover:bg-gray-500"
                            >
                              Preskoči
                            </Button>
                          </>
                        )}
                        
                        {isPending && !isFirst && !previousCompleted && (
                          <span className="text-xs text-muted-foreground">
                            Završite prethodnu fazu
                          </span>
                        )}
                        
                        {(isCompleted || isSkipped) && currentWorkOrder.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPhase(phase.id, phase.phase_name)}
                            className="bg-orange-500 text-white hover:bg-orange-600"
                          >
                            ↩ Resetuj
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="items" className="p-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Stavke radnog naloga</h3>
              <div className="space-y-3">
                {currentWorkOrder.work_order_items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        item.is_completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {item.is_completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Package className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.product && (
                          <p className="text-xs text-muted-foreground">
                            Šifra: {item.product.code} - {item.product.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity} kom</p>
                      <p className="text-sm text-muted-foreground">
                        €{item.line_total?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="p-6 space-y-6">
            {/* Share Link Section */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Link za praćenje</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Podelite ovaj link sa klijentom kako bi mogao da prati napredak radnog naloga.
              </p>
              
              {shareLink ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50"
                    />
                    <Button size="sm" onClick={copyShareLink}>
                      <Link className="mr-2 h-4 w-4" />
                      Kopiraj
                    </Button>
                  </div>
                  <Alert>
                    <AlertDescription className="text-sm">
                      Link je aktivan 30 dana. Klijent može preko njega pratiti status i ostavljati komentare.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Button onClick={generateShareLink} disabled={generatingLink}>
                  {generatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Link className="mr-2 h-4 w-4" />
                  Generiši link za praćenje
                </Button>
              )}
            </Card>

            {/* Comments Section */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Komentari</h3>
              
              {/* Add Comment Form */}
              <div className="space-y-3 mb-6">
                <Textarea
                  placeholder="Dodajte komentar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-comment"
                      checked={isInternalComment}
                      onCheckedChange={setIsInternalComment}
                    />
                    <Label htmlFor="internal-comment" className="text-sm">
                      Interni komentar (nevidljiv klijentu)
                    </Label>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={submitComment} 
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Dodaj komentar
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className={`p-3 rounded-lg ${
                      comment.is_internal ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.author_name || 'Nepoznat'}
                          </span>
                          {comment.is_internal && (
                            <Badge variant="outline" className="text-orange-600 text-xs">
                              Interno
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment_text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nema komentara za sada
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="p-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Istorija promena statusa</h3>
              <div className="space-y-3">
                {currentWorkOrder.work_order_status_history?.sort((a, b) => 
                  new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
                ).map((history, index) => (
                  <div key={history.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mt-1">
                      <TrendingUp className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Status promenjen na:</span>
                        {getStatusBadge(history.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(history.changed_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </p>
                      {history.notes && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                          {history.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}