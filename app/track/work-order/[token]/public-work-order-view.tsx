'use client'

import { useState, useEffect } from 'react'
import { Package, CheckCircle, Clock, MessageSquare, User, Calendar, TrendingUp, Loader2, AlertCircle, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO, differenceInDays, isAfter } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { WorkOrder, WorkOrderComment } from '@/types/work-orders'

interface PublicWorkOrderViewProps {
  token: string
}

export function PublicWorkOrderView({ token }: PublicWorkOrderViewProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<WorkOrderComment[]>([])
  const [submittingComment, setSubmittingComment] = useState(false)
  const [shareLinkId, setShareLinkId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; timestamp: Date }>>([])
  const [updatedPhaseId, setUpdatedPhaseId] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState(1)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    comment: ''
  })

  const addNotification = (message: string) => {
    const id = Math.random().toString(36).substring(7)
    setNotifications(prev => [...prev, { id, message, timestamp: new Date() }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Čeka početak'
      case 'in_progress': return 'U proizvodnji'
      case 'completed': return 'Završen'
      case 'cancelled': return 'Otkazan'
      case 'on_hold': return 'Pauziran'
      default: return status
    }
  }

  useEffect(() => {
    fetchWorkOrder()
  }, [token])
  
  // Polling fallback - proverava promene svakih 5 sekundi
  useEffect(() => {
    if (!workOrder?.id) return
    
    const interval = setInterval(() => {
      console.log('Polling for updates...')
      fetchWorkOrderById(workOrder.id)
    }, 5000) // Svakih 5 sekundi
    
    return () => clearInterval(interval)
  }, [workOrder?.id])

  useEffect(() => {
    if (!workOrder?.id) return
    
    // Set up real-time subscriptions
    const supabase = createClient()
    console.log('Setting up subscriptions for work order:', workOrder.id)
    
    // Subscribe to work order changes
    const workOrderChannel = supabase
      .channel(`work-order-${workOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
          filter: `id=eq.${workOrder.id}`
        },
        (payload: any) => {
          console.log('Work order updated:', payload)
          if (payload.eventType === 'UPDATE') {
            // Ažuriraj samo osnovne podatke, ali zadrži postojeće faze
            setWorkOrder(prev => {
              if (!prev) return null
              
              // Proveri šta se promenilo pre ažuriranja
              const oldStatus = prev.status
              const newStatus = payload.new.status
              const oldProgress = prev.progress_percentage
              const newProgress = payload.new.progress_percentage
              
              if (oldStatus !== newStatus) {
                addNotification(`📊 Status promenjen na: ${getStatusLabel(newStatus)}`)
              } else if (oldProgress !== newProgress) {
                addNotification(`📈 Progress ažuriran: ${newProgress}%`)
              } else {
                addNotification('📊 Radni nalog je ažuriran')
              }
              
              return {
                ...prev,
                ...payload.new,
                // Zadrži postojeće relacione podatke koji se ne menjaju kroz UPDATE
                work_order_phases: prev.work_order_phases,
                work_order_items: prev.work_order_items,
                company: prev.company,
                quote: prev.quote
              }
            })
          }
        }
      )
    
    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`comments-${workOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_comments',
          filter: `work_order_id=eq.${workOrder.id}`
        },
        (payload: any) => {
          console.log('New comment:', payload)
          const newComment = payload.new as WorkOrderComment
          if (!newComment.is_internal) {
            setComments(prev => [newComment, ...prev])
            addNotification(`💬 Novi komentar od ${newComment.author_name || 'administratora'}`)
            // Show notification
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          }
        }
      )
    
    // Subscribe to phase changes - BEZ FILTERA da vidimo da li eventi dolaze
    const phasesChannel = supabase
      .channel(`phases-${workOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Slusaj sve evente (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'work_order_phases'
          // Privremeno uklonjam filter da vidim da li eventi uopšte dolaze
          // filter: `work_order_id=eq.${workOrder.id}`
        },
        (payload: any) => {
          console.log('🔴 PHASE EVENT RECEIVED!', payload.eventType)
          console.log('Phase payload:', payload)
          console.log('Phase work_order_id:', payload.new?.work_order_id)
          console.log('Our work_order_id:', workOrder.id)
          
          // Proveri da li je ova faza za naš work order
          if (payload.new?.work_order_id !== workOrder.id) {
            console.log('Ignoring phase update for different work order')
            return
          }
          
          if (payload.eventType === 'UPDATE') {
            console.log('✅ Processing UPDATE for our phase:', payload.new.id)
            
            // Opcija 1: Ponovo učitaj ceo work order da dobiješ sve podatke
            fetchWorkOrderById(workOrder.id)
            
            const phaseName = payload.new.phase_name || 'Nepoznata faza'
            const status = payload.new.status === 'completed' ? 'završena' : 
                          payload.new.status === 'in_progress' ? 'započeta' : 'ažurirana'
            addNotification(`🔄 Faza "${phaseName}" je ${status}`)
            setUpdatedPhaseId(payload.new.id)
            setTimeout(() => {
              setUpdatedPhaseId(null)
            }, 3000)
          }
        }
      )
    
    // Presence channel for online users
    const presenceChannel = supabase.channel(`presence-${workOrder.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setOnlineUsers(Object.keys(state).length || 1)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key)
      })
    
    // Subscribe to all channels
    workOrderChannel.subscribe((status) => {
      console.log('Work order channel status:', status)
    })
    commentsChannel.subscribe((status) => {
      console.log('Comments channel status:', status)
    })
    phasesChannel.subscribe((status) => {
      console.log('Phases channel status:', status)
    })
    presenceChannel.subscribe(async (status) => {
      console.log('Presence channel status:', status)
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
          user_agent: navigator.userAgent
        })
      }
    })
    
    // Cleanup
    return () => {
      console.log('Cleaning up subscriptions')
      supabase.removeChannel(workOrderChannel)
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(phasesChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [workOrder?.id])

  const fetchWorkOrderById = async (id: string) => {
    const supabase = createClient()
    console.log('Refetching work order:', id)
    
    const { data: workOrderData, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        company:companies!company_id (
          id,
          name,
          tax_number
        ),
        quote:quotes!quote_id (
          id,
          quote_number,
          total_amount
        ),
        work_order_items (
          id,
          description,
          quantity,
          unit_price,
          line_total,
          is_completed,
          product:products!product_id (
            id,
            name,
            code
          )
        ),
        work_order_phases (
          id,
          phase_name,
          phase_order,
          status,
          started_at,
          completed_at,
          notes
        ),
        work_order_status_history (
          id,
          old_status,
          new_status,
          changed_at,
          notes
        )
      `)
      .eq('id', id)
      .single()
    
    if (!orderError && workOrderData) {
      console.log('Work order refetched successfully')
      setWorkOrder(workOrderData as any)
    }
  }

  const fetchWorkOrder = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      console.log('Fetching work order with token:', token)
      
      // First, verify the share link
      const { data: shareLink, error: linkError } = await supabase
        .from('work_order_share_links')
        .select('id, work_order_id, expires_at, viewed_count')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      console.log('Share link result:', { shareLink, linkError })

      if (linkError || !shareLink) {
        console.error('Share link error:', linkError)
        setError('Link nije valjan ili je istekao.')
        setLoading(false)
        return
      }

      // Check if link is expired
      if (shareLink.expires_at && isAfter(new Date(), parseISO(shareLink.expires_at))) {
        setError('Ovaj link je istekao.')
        setLoading(false)
        return
      }

      setShareLinkId(shareLink.id)

      // Update view count
      await supabase
        .from('work_order_share_links')
        .update({ viewed_count: (shareLink.viewed_count || 0) + 1 })
        .eq('id', shareLink.id)

      // Fetch the work order
      const { data: workOrderData, error: orderError } = await supabase
        .from('work_orders')
        .select(`
          *,
          company:companies!company_id (
            id,
            name,
            tax_number
          ),
          quote:quotes!quote_id (
            id,
            quote_number,
            total_amount
          ),
          work_order_items (
            id,
            description,
            quantity,
            unit_price,
            line_total,
            is_completed,
            product:products!product_id (
              id,
              name,
              code
            )
          ),
          work_order_phases (
            id,
            phase_name,
            phase_order,
            status,
            started_at,
            completed_at
          ),
          work_order_status_history (
            id,
            old_status,
            new_status,
            changed_at,
            notes
          )
        `)
        .eq('id', shareLink.work_order_id)
        .eq('is_visible_to_client', true)
        .single()

      console.log('Work order result:', { workOrderData, orderError })

      if (orderError || !workOrderData) {
        console.error('Work order error:', orderError)
        setError('Radni nalog nije pronađen ili nije dostupan.')
        setLoading(false)
        return
      }

      setWorkOrder(workOrderData as any)

      // Fetch comments (only non-internal)
      const { data: commentsData } = await supabase
        .from('work_order_comments')
        .select('*')
        .eq('work_order_id', shareLink.work_order_id)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })

      if (commentsData) {
        setComments(commentsData)
      }
    } catch (err) {
      console.error('Error fetching work order:', err)
      setError('Došlo je do greške pri učitavanju radnog naloga.')
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async () => {
    if (!formData.comment || !formData.name || !formData.email) {
      alert('Molimo popunite sva polja.')
      return
    }

    setSubmittingComment(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('work_order_comments')
        .insert({
          work_order_id: workOrder!.id,
          comment_text: formData.comment,
          is_internal: false,
          author_name: formData.name,
          author_email: formData.email
        })

      if (error) throw error

      // Create notification for staff
      await supabase
        .from('notifications')
        .insert({
          type: 'work_order_comment',
          title: 'Novi komentar na radnom nalogu',
          message: `${formData.name} je ostavio komentar na radnom nalogu ${workOrder!.order_number}`,
          data: {
            work_order_id: workOrder!.id,
            order_number: workOrder!.order_number,
            comment: formData.comment
          }
        })

      // Refresh comments
      const { data: commentsData } = await supabase
        .from('work_order_comments')
        .select('*')
        .eq('work_order_id', workOrder!.id)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })

      if (commentsData) {
        setComments(commentsData)
      }

      setFormData({ ...formData, comment: '' })
      alert('Komentar je uspešno poslat!')
    } catch (err) {
      console.error('Error submitting comment:', err)
      alert('Došlo je do greške. Molimo pokušajte ponovo.')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Alert className="max-w-md">
          <AlertDescription className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Greška</p>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!workOrder) return null

  const daysLeft = workOrder.due_date ? differenceInDays(parseISO(workOrder.due_date), new Date()) : null
  const isOverdue = daysLeft !== null && daysLeft < 0 && workOrder.status !== 'completed'

  const getStatusBadge = () => {
    // Ako je radni nalog završen ili otkazan, prikaži to
    if (workOrder.status === 'completed') {
      const allPhasesCompleted = workOrder.work_order_phases?.every(p => 
        p.status === 'completed' || p.status === 'skipped'
      )
      return (
        <Badge variant="default" className="bg-green-500 text-lg px-3 py-1">
          <CheckCircle className="h-4 w-4 mr-1 inline" />
          {allPhasesCompleted ? '✅ Potpuno završen' : '✓ Završen'}
        </Badge>
      )
    }
    if (workOrder.status === 'cancelled') {
      return <Badge variant="destructive" className="text-lg px-3 py-1">Otkazan</Badge>
    }
    if (workOrder.status === 'on_hold') {
      return <Badge variant="outline" className="text-lg px-3 py-1">Pauziran</Badge>
    }
    
    // Inače prikaži trenutnu fazu
    const currentPhase = workOrder.work_order_phases?.find(p => p.status === 'in_progress')
    if (currentPhase) {
      return (
        <Badge variant="default" className="bg-blue-500 text-lg px-3 py-1 animate-pulse">
          <Clock className="h-4 w-4 mr-1 inline" />
          Faza: {currentPhase.phase_name}
        </Badge>
      )
    }
    
    // Ako nijedna faza nije započeta
    const nextPhase = workOrder.work_order_phases?.find(p => p.status === 'pending')
    if (nextPhase) {
      return (
        <Badge variant="secondary" className="text-lg px-3 py-1">
          Čeka fazu: {nextPhase.phase_name}
        </Badge>
      )
    }
    
    return <Badge variant="outline" className="text-lg px-3 py-1">Nepoznato</Badge>
  }

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500 animate-pulse'
      case 'skipped': return 'bg-gray-400'
      default: return 'bg-gray-200'
    }
  }

  // Calculate completion stats for phases and items
  const totalPhases = workOrder.work_order_phases?.length || 0
  const completedPhases = workOrder.work_order_phases?.filter(p => p.status === 'completed').length || 0
  const phasesProgress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0
  
  // Calculate items stats
  const totalItems = workOrder.work_order_items?.length || 0
  const completedItems = workOrder.work_order_items?.filter(item => item.is_completed).length || 0
  const itemsProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Notification Stack */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {notifications.length > 3 && (
            <div className="text-right mb-2">
              <Badge variant="destructive" className="animate-pulse">
                {notifications.length} aktivnih notifikacija
              </Badge>
            </div>
          )}
          {notifications.slice(-5).map((notification, index) => (
            <div
              key={notification.id}
              className="animate-in slide-in-from-top duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-xl hover:shadow-2xl transition-all duration-300 relative pr-10 hover:scale-[1.02]">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <AlertDescription className="text-green-800 font-medium ml-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-red-600 font-bold mr-2">🔴 LIVE:</span>
                      {notification.message}
                      <div className="text-xs text-gray-500 mt-1">
                        {format(notification.timestamp, 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Zatvori notifikaciju"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          ))}
        </div>
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Radni nalog #{workOrder.order_number}</h1>
                  <Badge variant="outline" className="bg-red-50 text-red-600 animate-pulse">
                    <span className="mr-1">🔴</span> LIVE
                  </Badge>
                  {onlineUsers > 1 && (
                    <Badge variant="outline" className="bg-green-50 text-green-600">
                      <span className="mr-1">👥</span> {onlineUsers} gledalaca
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {workOrder.company?.name || 'N/A'}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {workOrder.start_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Početak: {format(parseISO(workOrder.start_date), 'dd.MM.yyyy', { locale: sr })}
              </div>
            )}
            {workOrder.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-600' : ''}`} />
                Rok: {format(parseISO(workOrder.due_date), 'dd.MM.yyyy', { locale: sr })}
              </div>
            )}
          </div>
        </div>

        {/* Status Alert */}
        {workOrder.status === 'completed' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>🎉 Radni nalog je završen!</strong> 
              {workOrder.work_order_phases?.every(p => p.status === 'completed') 
                ? ' Sve faze proizvodnje su uspešno završene. '
                : ' Proizvodnja je završena sa nekim preskočenim fazama. '
              }
              Vaša narudžba je spremna. Kontaktiraćemo vas u vezi isporuke.
            </AlertDescription>
          </Alert>
        )}

        {isOverdue && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Radni nalog kasni {Math.abs(daysLeft!)} dana. Molimo kontaktirajte nas za više informacija.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Overview */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Napredak proizvodnje</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Ukupni napredak</span>
                  <span className="text-2xl font-bold text-primary">{workOrder.progress_percentage || 0}%</span>
                </div>
                <Progress value={workOrder.progress_percentage || 0} className="h-4" />
              </div>
              
              {(() => {
                const currentPhase = workOrder.work_order_phases?.find(p => p.status === 'in_progress')
                const nextPhase = workOrder.work_order_phases?.find(p => p.status === 'pending')
                
                if (currentPhase) {
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-primary animate-pulse" />
                      <span className="font-medium">Trenutna faza:</span>
                      <span className="text-primary font-semibold">{currentPhase.phase_name}</span>
                    </div>
                  )
                } else if (nextPhase && workOrder.status !== 'completed') {
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Sledeća faza:</span>
                      <span className="text-muted-foreground font-semibold">{nextPhase.phase_name}</span>
                    </div>
                  )
                }
                return null
              })()}

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>{completedPhases} od {totalPhases} faza završeno</span>
                </div>
                {totalItems > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{completedItems} od {totalItems} stavki završeno</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Production Phases */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Faze proizvodnje</h2>
            <div className="space-y-3">
              {workOrder?.work_order_phases?.sort((a, b) => a.phase_order - b.phase_order).map((phase, index) => {
                const isCompleted = phase.status === 'completed'
                const isInProgress = phase.status === 'in_progress'
                const isSkipped = phase.status === 'skipped'
                
                return (
                  <div key={phase.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                    updatedPhaseId === phase.id ? 'ring-2 ring-green-500 ring-offset-2 animate-pulse' : ''
                  } ${
                    isCompleted ? 'bg-green-50' :
                    isInProgress ? 'bg-blue-50 animate-pulse' :
                    isSkipped ? 'bg-gray-50' :
                    'bg-gray-50'
                  }`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-500' :
                      isInProgress ? 'bg-blue-500' :
                      isSkipped ? 'bg-gray-400' :
                      'bg-gray-200'
                    } text-white font-semibold`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isInProgress ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <span className="text-sm">{phase.phase_order}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{phase.phase_name}</h4>
                        <Badge variant={
                          isCompleted ? 'default' :
                          isInProgress ? 'secondary' :
                          isSkipped ? 'outline' :
                          'secondary'
                        } className={
                          isCompleted ? 'bg-green-500' :
                          isInProgress ? 'bg-blue-500' :
                          ''
                        }>
                          {isCompleted ? '✓ Završeno' :
                           isInProgress ? '⏳ U toku' :
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
                      {phase.notes && (
                        <p className="text-sm text-gray-600 mt-2 p-2 bg-white/70 rounded">
                          📝 {phase.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Work Order Items */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Stavke radnog naloga</h2>
            <div className="space-y-3">
              {workOrder.work_order_items?.map((item) => (
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
                          Šifra: {item.product.code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.quantity} kom</p>
                    {item.is_completed && (
                      <p className="text-xs text-green-600">✓ Završeno</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Komunikacija</h2>
            
            {/* Add Comment Form */}
            <div className="space-y-4 mb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Ime i prezime *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Vaše ime"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vas@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Poruka *</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Vaše pitanje ili komentar..."
                  rows={3}
                />
              </div>
              <Button onClick={submitComment} disabled={submittingComment}>
                {submittingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <MessageSquare className="mr-2 h-4 w-4" />
                Pošaljite poruku
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.author_name || 'Nepoznat'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment_text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nema poruka za sada
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Contact Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Za hitne informacije kontaktirajte nas na:</p>
          <p className="font-medium mt-1">📧 info@vasa-kompanija.me | 📞 +382 20 123 456</p>
        </div>
      </div>
    </div>
  )
}