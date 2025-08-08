"use client"

import { useState, useEffect } from "react"
import { X, FileText, Edit, Trash2, Download, Share2, Calendar, User, Building, Euro, Clock, CheckCircle, Loader2, MessageSquare, ExternalLink, XCircle, AlertCircle, Printer, CheckSquare, FileCheck, Send, Mail } from "lucide-react"
import { generateQuotePDF } from './quote-pdf-generator'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, isAfter, parseISO } from "date-fns"
import { sr } from "date-fns/locale"
import type { Quote } from "@/types/quotes"

interface ViewQuoteBladeProps {
  quote: Quote
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

interface QuoteResponse {
  id: string
  response_type: 'accepted' | 'rejected' | 'revision_requested'
  respondent_name: string
  respondent_email: string
  response_note?: string
  created_at: string
}

interface QuoteComment {
  id: string
  author_name?: string
  author_email?: string
  comment_text: string
  is_internal: boolean
  created_at: string
}

interface ShareLinkInfo {
  id: string
  token: string
  viewed_count: number
  created_at: string
  expires_at: string
  is_active: boolean
}

export function ViewQuoteBlade({ quote, onClose, onEdit, onDelete }: ViewQuoteBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [sendingQuote, setSendingQuote] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [responses, setResponses] = useState<QuoteResponse[]>([])
  const [comments, setComments] = useState<QuoteComment[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLinkInfo[]>([])
  const [loadingInteractions, setLoadingInteractions] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  const isExpired = quote.valid_until && isAfter(new Date(), parseISO(quote.valid_until)) && quote.status === 'pending'

  const { toast } = useToast()
  
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (activeTab === 'interactions') {
      fetchInteractions()
    }
  }, [activeTab, quote.id])
  
  const fetchInteractions = async () => {
    setLoadingInteractions(true)
    const supabase = createClient()
    
    try {
      // Fetch responses
      const { data: responsesData } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
      
      if (responsesData) setResponses(responsesData)
      
      // Fetch comments
      const { data: commentsData } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
      
      if (commentsData) setComments(commentsData)
      
      // Fetch share links
      const { data: linksData } = await supabase
        .from('quote_share_links')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
      
      if (linksData) setShareLinks(linksData)
    } catch (error) {
      console.error('Error fetching interactions:', error)
    } finally {
      setLoadingInteractions(false)
    }
  }

  const submitComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite komentar",
        variant: "destructive",
      })
      return
    }

    setSubmittingComment(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('quote_comments')
        .insert({
          quote_id: quote.id,
          comment_text: newComment,
          is_internal: isInternalComment,
          created_by: user?.id,
          author_name: user?.email?.split('@')[0] || 'Tim',
          author_email: user?.email
        })

      if (error) throw error

      // Refresh comments
      const { data: commentsData } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: false })
      
      if (commentsData) setComments(commentsData)
      
      setNewComment('')
      toast({
        title: "Uspješno!",
        description: isInternalComment ? "Interni komentar je dodat" : "Komentar je poslat klijentu",
      })
    } catch (error) {
      console.error('Error submitting comment:', error)
      toast({
        title: "Greška",
        description: "Nije moguće poslati komentar",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDownloadPDF = () => {
    setDownloadingPDF(true)
    try {
      generateQuotePDF({ quote })
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setTimeout(() => setDownloadingPDF(false), 1000)
    }
  }

  const handleSendQuote = async () => {
    setSendingQuote(true)
    const supabase = createClient()

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // First check if there's an existing active link
      const { data: existingLinks } = await supabase
        .from('quote_share_links')
        .select('*')
        .eq('quote_id', quote.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      let linkData
      const now = new Date()
      
      if (existingLinks && existingLinks.length > 0) {
        const existingLink = existingLinks[0]
        const expiresAt = new Date(existingLink.expires_at)
        
        // Check if existing link is still valid (not expired)
        if (expiresAt > now) {
          // Use existing link
          linkData = existingLink
          
          toast({
            title: "Postojeći link",
            description: "Koristi se postojeći aktivni link za dijeljenje.",
          })
        } else {
          // Deactivate expired link and create new one
          await supabase
            .from('quote_share_links')
            .update({ is_active: false })
            .eq('id', existingLink.id)
          
          // Create new link
          const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
          const newExpiresAt = new Date()
          newExpiresAt.setDate(newExpiresAt.getDate() + 30)
          
          const { data, error } = await supabase
            .from('quote_share_links')
            .insert({
              quote_id: quote.id,
              token: token,
              expires_at: newExpiresAt.toISOString(),
              is_active: true,
              created_by: user?.id
            })
            .select()
            .single()

          if (error) throw error
          linkData = data
          
          toast({
            title: "Novi link kreiran!",
            description: "Prethodni link je istekao, kreiran je novi.",
          })
        }
      } else {
        // No existing link, create new one
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)
        
        const { data, error } = await supabase
          .from('quote_share_links')
          .insert({
            quote_id: quote.id,
            token: token,
            expires_at: expiresAt.toISOString(),
            is_active: true,
            created_by: user?.id
          })
          .select()
          .single()

        if (error) throw error
        linkData = data
        
        toast({
          title: "Link kreiran!",
          description: "Novi link za dijeljenje je uspješno kreiran.",
        })
      }

      // Generate full URL
      const baseUrl = window.location.origin
      const fullLink = `${baseUrl}/share/quote/${linkData.token}`
      
      setShareLink(fullLink)
      setShowShareDialog(true)
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullLink)
      
      toast({
        title: "Link kopiran!",
        description: "Link je kopiran u clipboard. Možete ga poslati klijentu.",
      })
    } catch (error) {
      console.error('Error creating share link:', error)
      toast({
        title: "Greška",
        description: "Nije moguće kreirati link za dijeljenje.",
        variant: "destructive",
      })
    } finally {
      setSendingQuote(false)
    }
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Istekla</Badge>
    }
    
    switch (quote.status) {
      case 'draft':
        return <Badge variant="secondary">Nacrt</Badge>
      case 'sent':
        return <Badge variant="outline">Poslata</Badge>
      case 'accepted':
        return <Badge variant="default">Prihvaćena</Badge>
      case 'rejected':
        return <Badge variant="destructive">Odbijena</Badge>
      case 'expired':
        return <Badge variant="secondary">Istekla</Badge>
      default:
        return <Badge variant="outline">Nepoznato</Badge>
    }
  }

  const calculateItemsTotal = () => {
    if (!quote.quote_items) return 0
    return quote.quote_items.reduce((sum, item) => sum + item.line_total, 0)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ponuda {quote.quote_number}</h2>
            <p className="text-sm text-muted-foreground">
              {quote.company?.name || 'Nepoznata firma'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusBadge()}
            {isExpired && (
              <Badge className="bg-red-100 text-red-800">
                <Clock className="h-3 w-3 mr-1" />
                Istekla
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
            >
              {downloadingPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSendQuote}
              disabled={sendingQuote}
            >
              {sendingQuote ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Pošalji
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
            <TabsTrigger value="overview">Pregled</TabsTrigger>
            <TabsTrigger value="items">Stavke</TabsTrigger>
            <TabsTrigger value="interactions">Interakcije</TabsTrigger>
            <TabsTrigger value="notes">Napomene</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <Card className="p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Osnovni podaci
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broj ponude:</span>
                      <span className="font-mono font-medium">{quote.quote_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Datum:</span>
                      <span>{format(parseISO(quote.quote_date), 'dd.MM.yyyy', { locale: sr })}</span>
                    </div>
                    {quote.valid_until && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Važi do:</span>
                        <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                          {format(parseISO(quote.valid_until), 'dd.MM.yyyy', { locale: sr })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge()}
                    </div>
                  </div>
                </Card>

                {/* Company Info */}
                <Card className="p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Podaci o firmi
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-muted-foreground">Firma:</span>
                      <div className="font-medium">{quote.company?.name || 'N/A'}</div>
                    </div>
                    {(quote.company as any)?.tax_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PIB:</span>
                        <span className="font-mono">{(quote.company as any).tax_number}</span>
                      </div>
                    )}
                    {quote.contact_person && (
                      <div>
                        <span className="text-muted-foreground">Kontakt:</span>
                        <div className="font-medium">
                          {quote.contact_person.first_name} {quote.contact_person.last_name}
                        </div>
                        {quote.contact_person.email && (
                          <div className="text-sm text-muted-foreground">{quote.contact_person.email}</div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Financial Summary */}
              <Card className="p-4">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Finansijski pregled
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      €{quote.subtotal?.toLocaleString('sr-RS', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      }) || '0,00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Osnova</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      €{quote.vat_amount?.toLocaleString('sr-RS', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      }) || '0,00'}
                    </div>
                    <div className="text-sm text-muted-foreground">PDV</div>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      €{quote.total_amount?.toLocaleString('sr-RS', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      }) || '0,00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Ukupno</div>
                  </div>
                </div>
                {quote.discount_percentage && quote.discount_percentage > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-800">Popust ({quote.discount_percentage}%)</span>
                      <span className="font-medium text-green-800">
                        -€{quote.discount_amount?.toLocaleString('sr-RS', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || '0,00'}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="items" className="mt-0">
              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-medium">Stavke ponude</h3>
                  <p className="text-sm text-muted-foreground">
                    Ukupno {quote.quote_items?.length || 0} stavki
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Opis</TableHead>
                        <TableHead className="text-center">Količina</TableHead>
                        <TableHead className="text-right">Cena</TableHead>
                        <TableHead className="text-center">PDV</TableHead>
                        <TableHead className="text-center">Popust</TableHead>
                        <TableHead className="text-right">Ukupno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote.quote_items?.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.description}</div>
                              {item.product && (
                                <div className="text-xs text-muted-foreground">
                                  Šifra: {item.product.code}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            €{item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.vat_rate ? `${item.vat_rate}%` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.discount_percentage ? `${item.discount_percentage}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            €{item.line_total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nema stavki
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="interactions" className="mt-0">
              <div className="space-y-4">
                {/* Workflow Status Card */}
                <Card className="p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Status Workflow-a
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {/* Quote Status */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        quote.status === 'accepted' ? 'bg-green-100' : 
                        quote.status === 'rejected' ? 'bg-red-100' : 
                        'bg-gray-100'
                      }`}>
                        {quote.status === 'accepted' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : quote.status === 'rejected' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status ponude</p>
                        <p className="font-medium capitalize">{quote.status || 'Pending'}</p>
                      </div>
                    </div>

                    {/* Client Response */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        responses.some(r => r.response_type === 'accepted') ? 'bg-green-100' : 
                        responses.length > 0 ? 'bg-yellow-100' : 
                        'bg-gray-100'
                      }`}>
                        {responses.some(r => r.response_type === 'accepted') ? (
                          <CheckSquare className="h-5 w-5 text-green-600" />
                        ) : responses.length > 0 ? (
                          <MessageSquare className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Odgovor klijenta</p>
                        <p className="font-medium">
                          {responses.some(r => r.response_type === 'accepted') ? 'Prihvaćeno' :
                           responses.some(r => r.response_type === 'rejected') ? 'Odbijeno' :
                           responses.some(r => r.response_type === 'revision_requested') ? 'Traži izmjene' :
                           'Čeka odgovor'}
                        </p>
                      </div>
                    </div>

                    {/* Share Status */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        shareLinks.some(l => l.viewed_count > 0) ? 'bg-blue-100' : 
                        shareLinks.length > 0 ? 'bg-yellow-100' : 
                        'bg-gray-100'
                      }`}>
                        <ExternalLink className={`h-5 w-5 ${
                          shareLinks.some(l => l.viewed_count > 0) ? 'text-blue-600' :
                          shareLinks.length > 0 ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dijeljenje</p>
                        <p className="font-medium">
                          {shareLinks.length > 0 ? 
                            `Pregledano ${shareLinks.reduce((acc, l) => acc + l.viewed_count, 0)}x` : 
                            'Nije podijeljeno'}
                        </p>
                      </div>
                    </div>

                    {/* Print Ready Status */}
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        quote.status === 'accepted' && quote.quote_items?.length > 0 ? 'bg-green-100' :
                        'bg-gray-100'
                      }`}>
                        <Printer className={`h-5 w-5 ${
                          quote.status === 'accepted' && quote.quote_items?.length > 0 ? 'text-green-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Priprema za štampu</p>
                        <p className="font-medium">
                          {quote.status === 'accepted' && quote.quote_items?.length > 0 ? 
                            'Spremno' : 'Čeka odobrenje'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Client Responses */}
                {responses.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Odgovori klijenta
                    </h3>
                    <div className="space-y-3">
                      {responses.map((response) => (
                        <div key={response.id} className="border-l-4 border-primary pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                response.response_type === 'accepted' ? 'default' :
                                response.response_type === 'rejected' ? 'destructive' :
                                'secondary'
                              }>
                                {response.response_type === 'accepted' ? 'Prihvaćeno' :
                                 response.response_type === 'rejected' ? 'Odbijeno' :
                                 'Traži izmjene'}
                              </Badge>
                              <span className="text-sm font-medium">{response.respondent_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(response.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{response.respondent_email}</p>
                          {response.response_note && (
                            <p className="text-sm mt-2 p-2 bg-muted/50 rounded">
                              {response.response_note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Comments */}
                <Card className="p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Komentari i diskusija
                  </h3>
                  
                  {/* Comment Form */}
                  <div className="space-y-3 mb-4 p-4 bg-muted/30 rounded-lg">
                    <Textarea
                      placeholder="Unesite komentar..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="internal-comment"
                          checked={isInternalComment}
                          onCheckedChange={setIsInternalComment}
                        />
                        <Label htmlFor="internal-comment" className="text-sm cursor-pointer">
                          Interni komentar (klijent neće vidjeti)
                        </Label>
                      </div>
                      <Button
                        onClick={submitComment}
                        disabled={submittingComment || !newComment.trim()}
                        size="sm"
                      >
                        {submittingComment ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Pošalji
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className={`border-l-2 pl-4 py-2 ${
                          comment.is_internal ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {comment.author_name || 'Nepoznat'}
                              </span>
                              {comment.is_internal && (
                                <Badge variant="outline" className="text-xs">
                                  Interno
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                            </span>
                          </div>
                          {comment.author_email && (
                            <p className="text-xs text-muted-foreground mb-1">{comment.author_email}</p>
                          )}
                          <p className="text-sm">{comment.comment_text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nema komentara za sada
                    </p>
                  )}
                </Card>

                {/* Share Links History */}
                {shareLinks.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Istorija dijeljenja
                    </h3>
                    <div className="space-y-2">
                      {shareLinks.map((link) => {
                        const linkUrl = `${window.location.origin}/share/quote/${link.token}`
                        const isExpiredLink = link.expires_at && isAfter(new Date(), parseISO(link.expires_at))
                        
                        return (
                          <div key={link.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={link.is_active && !isExpiredLink ? "default" : "secondary"}>
                                  {link.is_active && !isExpiredLink ? 'Aktivan' : 'Istekao'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Pregledano {link.viewed_count || 0} puta
                                </span>
                              </div>
                              <p className="text-xs font-mono text-muted-foreground truncate">
                                {linkUrl}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Kreiran: {format(parseISO(link.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                                {link.expires_at && ` | Ističe: ${format(parseISO(link.expires_at), 'dd.MM.yyyy', { locale: sr })}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(linkUrl)
                                toast({
                                  title: "Kopirano!",
                                  description: "Link je kopiran u clipboard.",
                                })
                              }}
                            >
                              Kopiraj
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* Empty State */}
                {responses.length === 0 && comments.length === 0 && shareLinks.length === 0 && (
                  <Card className="p-8">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Nema interakcija</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ova ponuda još nije podijeljena sa klijentom
                      </p>
                      <Button onClick={handleSendQuote} size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Pošalji ponudu
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Javne napomene</h3>
                  <div className="text-sm">
                    {quote.notes ? (
                      <div className="whitespace-pre-wrap">{quote.notes}</div>
                    ) : (
                      <span className="text-muted-foreground">Nema javnih napomena</span>
                    )}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Interne napomene</h3>
                  <div className="text-sm">
                    {quote.internal_notes ? (
                      <div className="whitespace-pre-wrap">{quote.internal_notes}</div>
                    ) : (
                      <span className="text-muted-foreground">Nema internih napomena</span>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 bg-muted/30">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Kreirana: {format(parseISO(quote.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}</span>
          <span>Poslednja izmena: {format(parseISO(quote.updated_at), 'dd.MM.yyyy HH:mm', { locale: sr })}</span>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-2xl z-[2000]">
          <DialogHeader>
            <DialogTitle>Pošaljite ponudu klijentu</DialogTitle>
            <DialogDescription>
              Dijelite ponudu putem linka ili direktno emailom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Link Section */}
            <div className="space-y-2">
              <Label htmlFor="share-link">Link za dijeljenje</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareLink || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => {
                    if (shareLink) {
                      navigator.clipboard.writeText(shareLink)
                      toast({
                        title: "Kopirano!",
                        description: "Link je kopiran u clipboard.",
                      })
                    }
                  }}
                  size="sm"
                >
                  Kopiraj
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link važi 30 dana od kreiranja
              </p>
            </div>

            {/* Email Options */}
            <div className="space-y-3 border-t pt-4">
              <Label>Brze opcije dijeljenja</Label>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const subject = encodeURIComponent(`Ponuda #${quote.quote_number}`)
                    const body = encodeURIComponent(
                      `Poštovani,\n\nŠaljemo vam ponudu #${quote.quote_number}.\n\nMožete je pregledati na sljedećem linku:\n${shareLink}\n\nNa linku možete:\n- Pregledati detalje ponude\n- Prihvatiti ili odbiti ponudu\n- Zatražiti izmjene\n- Ostaviti komentare\n- Preuzeti PDF dokument\n\nSrdačan pozdrav,\n${user?.email || 'Vaš tim'}`
                    )
                    window.location.href = `mailto:${quote.contact_person?.email || ''}?subject=${subject}&body=${body}`
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Pošalji email klijentu
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Ponuda #${quote.quote_number}\n\nPregledajte ponudu: ${shareLink}`
                    )
                    window.open(`https://wa.me/?text=${text}`, '_blank')
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Pošalji putem WhatsApp
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="border-t pt-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  ℹ️ Šta klijent može da uradi:
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Pregleda kompletan sadržaj ponude</li>
                  <li>✓ Prihvati, odbije ili zatraži izmjene</li>
                  <li>✓ Ostavi komentare i pitanja</li>
                  <li>✓ Preuzme PDF verziju ponude</li>
                  <li>✓ Dobije potvrdu o svojoj odluci</li>
                </ul>
              </div>
            </div>

            {/* Link Status */}
            {shareLinks.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  📊 Statistika linka: Pregledan {shareLinks[0]?.viewed_count || 0} puta
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}