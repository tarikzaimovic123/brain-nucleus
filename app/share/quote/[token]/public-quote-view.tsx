'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, XCircle, MessageSquare, Download, Calendar, Euro, Building, User, Send, Loader2, Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { generateQuotePDF } from '@/components/quotes/quote-pdf-generator'
import { format, parseISO, isAfter } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { Quote } from '@/types/quotes'

interface PublicQuoteViewProps {
  token: string
}

interface QuoteComment {
  id: string
  author_name?: string
  author_email?: string
  comment_text: string
  created_at: string
}

export function PublicQuoteView({ token }: PublicQuoteViewProps) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<QuoteComment[]>([])
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responseType, setResponseType] = useState<'accepted' | 'rejected' | 'revision_requested' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasResponded, setHasResponded] = useState(false)
  const [lastResponseType, setLastResponseType] = useState<string | null>(null)
  const [shareLinkId, setShareLinkId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmationType, setConfirmationType] = useState<'accepted' | 'rejected' | null>(null)
  const [responseSuccess, setResponseSuccess] = useState(false)
  const [responses, setResponses] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    comment: ''
  })

  useEffect(() => {
    fetchQuote()
  }, [token])

  const fetchQuote = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // First, verify the share link
      const { data: shareLink, error: linkError } = await supabase
        .from('quote_share_links')
        .select('id, quote_id, expires_at, viewed_count')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      if (linkError || !shareLink) {
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
        .from('quote_share_links')
        .update({ viewed_count: (shareLink.viewed_count || 0) + 1 })
        .eq('id', shareLink.id)

      // Fetch the quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!company_id (
            id,
            name,
            tax_number
          ),
          contact_person:contact_persons!contact_person_id (
            id,
            first_name,
            last_name,
            email
          ),
          quote_items (
            id,
            description,
            quantity,
            unit_price,
            vat_rate,
            discount_percentage,
            line_total,
            product:products!product_id (
              id,
              name,
              code
            )
          )
        `)
        .eq('id', shareLink.quote_id)
        .single()

      if (quoteError || !quoteData) {
        setError('Ponuda nije pronađena.')
        setLoading(false)
        return
      }

      setQuote(quoteData as any)

      // Check if already responded
      const { data: responsesData } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', shareLink.quote_id)
        .order('responded_at', { ascending: false })

      if (responsesData && responsesData.length > 0) {
        setResponses(responsesData)
        const lastResponse = responsesData[0]
        setLastResponseType(lastResponse.response_type)
        setResponseType(lastResponse.response_type as any)
        // Only mark as fully responded if accepted or rejected (not for revision requests)
        if (lastResponse.response_type === 'accepted' || lastResponse.response_type === 'rejected') {
          setHasResponded(true)
          setResponseSuccess(true)
        }
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', shareLink.quote_id)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })

      if (commentsData) {
        setComments(commentsData)
      }
    } catch (err) {
      console.error('Error fetching quote:', err)
      setError('Došlo je do greške pri učitavanju ponude.')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (type: 'accepted' | 'rejected' | 'revision_requested') => {
    if (type === 'accepted' || type === 'rejected') {
      // Show confirmation dialog for final decisions
      setConfirmationType(type)
      setShowConfirmDialog(true)
    } else {
      // For revision requests, go straight to form
      setResponseType(type)
      setShowResponseForm(true)
    }
  }

  const confirmFinalDecision = () => {
    setShowConfirmDialog(false)
    setResponseType(confirmationType!)
    setShowResponseForm(true)
  }

  const submitResponse = async () => {
    if (!formData.name || !formData.email) {
      alert('Molimo unesite ime i email.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Submit response
      const { error: responseError } = await supabase
        .from('quote_responses')
        .insert({
          quote_id: quote!.id,
          share_link_id: shareLinkId,
          response_type: responseType,
          respondent_name: formData.name,
          respondent_email: formData.email,
          response_note: formData.comment || null
        })

      if (responseError) throw responseError

      // Add comment if provided
      if (formData.comment) {
        await supabase
          .from('quote_comments')
          .insert({
            quote_id: quote!.id,
            share_link_id: shareLinkId,
            author_name: formData.name,
            author_email: formData.email,
            comment_text: formData.comment,
            is_internal: false
          })
      }

      // Status will be updated by database trigger
      // Just update local state
      if (responseType === 'accepted') {
        setHasResponded(true)
        setResponseSuccess(true)
        // Refresh quote to get updated status
        await fetchQuote()
      } else if (responseType === 'rejected') {
        setHasResponded(true)
        setResponseSuccess(true)
        // Refresh quote to get updated status
        await fetchQuote()
      } else if (responseType === 'revision_requested') {
        // For revision requests, don't mark as fully responded
        // This allows the client to continue interacting
        setLastResponseType('revision_requested')
      }

      setShowResponseForm(false)
      
      // Refresh comments after successful submission
      const { data: commentsData } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', quote!.id)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })
      
      if (commentsData) {
        setComments(commentsData)
      }
      
      // Clear form
      setFormData({ name: '', email: '', comment: '' })
    } catch (err) {
      console.error('Error submitting response:', err)
      alert('Došlo je do greške. Molimo pokušajte ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitComment = async () => {
    if (!formData.comment || !formData.name || !formData.email) {
      alert('Molimo popunite sva polja.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('quote_comments')
        .insert({
          quote_id: quote!.id,
          share_link_id: shareLinkId,
          author_name: formData.name,
          author_email: formData.email,
          comment_text: formData.comment,
          is_internal: false
        })

      if (error) throw error

      // Refresh comments
      const { data: commentsData } = await supabase
        .from('quote_comments')
        .select('*')
        .eq('quote_id', quote!.id)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })

      if (commentsData) {
        setComments(commentsData)
      }

      setFormData({ ...formData, comment: '' })
    } catch (err) {
      console.error('Error submitting comment:', err)
      alert('Došlo je do greške. Molimo pokušajte ponovo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPDF = () => {
    if (quote) {
      generateQuotePDF({ quote })
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
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Greška</p>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!quote) return null

  const isExpired = quote.valid_until && isAfter(new Date(), parseISO(quote.valid_until))

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Ponuda #{quote.quote_number}</h1>
                <p className="text-muted-foreground">
                  {(quote.company as any)?.name || 'N/A'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Preuzmi PDF
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(parseISO(quote.quote_date), 'dd.MM.yyyy', { locale: sr })}
            </div>
            {quote.valid_until && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Važi do: {format(parseISO(quote.valid_until), 'dd.MM.yyyy', { locale: sr })}
              </div>
            )}
            {isExpired && (
              <Badge variant="destructive">Istekla</Badge>
            )}
          </div>
        </div>

        {/* Final Response Status Card */}
        {hasResponded && (
          <Card className={`mb-6 ${
            lastResponseType === 'accepted' || responseType === 'accepted' 
              ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50' 
              : 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50'
          }`}>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  lastResponseType === 'accepted' || responseType === 'accepted'
                    ? 'bg-green-100 ring-4 ring-green-200'
                    : 'bg-red-100 ring-4 ring-red-200'
                }`}>
                  {lastResponseType === 'accepted' || responseType === 'accepted' ? (
                    <CheckCircle className="h-7 w-7 text-green-600" />
                  ) : (
                    <XCircle className="h-7 w-7 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-3 ${
                    lastResponseType === 'accepted' || responseType === 'accepted'
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}>
                    {lastResponseType === 'accepted' || responseType === 'accepted' 
                      ? '✅ Ponuda je uspješno prihvaćena!' 
                      : '❌ Ponuda je odbijena'}
                  </h3>
                  
                  {/* Response Details */}
                  <div className={`p-4 rounded-lg mb-4 ${
                    lastResponseType === 'accepted' || responseType === 'accepted'
                      ? 'bg-white/80 border border-green-200'
                      : 'bg-white/80 border border-red-200'
                  }`}>
                    <h4 className="font-semibold mb-2 text-gray-900">Detalji odgovora:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Odgovorio/la:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {responses[0]?.respondent_name || 'Nepoznato'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {responses[0]?.respondent_email || 'Nepoznato'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Datum i vrijeme:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {responses[0]?.responded_at 
                            ? format(parseISO(responses[0].responded_at), 'dd.MM.yyyy HH:mm', { locale: sr })
                            : 'Nepoznato'}
                        </span>
                      </div>
                      {responses[0]?.response_note && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-600 mb-1">Napomena:</p>
                          <p className="text-sm font-medium text-gray-900 italic">
                            "{responses[0].response_note}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Steps for Accepted */}
                  {(lastResponseType === 'accepted' || responseType === 'accepted') && (
                    <div className="space-y-3 border-t border-green-200 pt-4">
                      <p className="text-sm font-semibold text-green-900">
                        📋 Šta slijedi:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                        <li>Kontaktiraćemo vas u roku od 24 sata radi potvrde detalja</li>
                        <li>Pripremićemo ugovor na osnovu ove ponude</li>
                        <li>Dogovorićemo termine i način realizacije</li>
                        <li>Možete preuzeti PDF ponude za vašu evidenciju</li>
                      </ol>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className={`mt-4 p-3 rounded-lg ${
                    lastResponseType === 'accepted' || responseType === 'accepted'
                      ? 'bg-green-100/50'
                      : 'bg-red-100/50'
                  }`}>
                    <p className="text-sm font-medium text-gray-700">
                      💬 Za dodatna pitanja kontaktirajte nas na:
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      📧 info@vasa-kompanija.me | 📞 +382 20 123 456
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Standard Response Alert */}
        {hasResponded && !responseSuccess && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Vaš odgovor je već zabeležen. Kontaktiraćemo vas uskoro.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Previous Response Status for Revision Requests */}
        {lastResponseType === 'revision_requested' && !hasResponded && (
          <Alert className="mb-6" variant="default">
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              Prethodno ste zatražili izmjene na ovoj ponudi. Možete nastaviti komunikaciju ispod ili promijeniti vašu odluku.
            </AlertDescription>
          </Alert>
        )}

        {/* Quote Items */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Stavke ponude</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opis</TableHead>
                  <TableHead className="text-center">Količina</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead className="text-center">PDV</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.quote_items?.map((item) => (
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
                    <TableCell className="text-right font-medium">
                      €{item.line_total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Osnova:</span>
                <span>€{quote.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              {quote.discount_amount && quote.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Popust ({quote.discount_percentage}%):</span>
                  <span>-€{quote.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>PDV:</span>
                <span>€{quote.vat_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>UKUPNO:</span>
                <span>€{quote.total_amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Napomene</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          </Card>
        )}

        {/* Response Actions - Hide if already accepted/rejected */}
        {!hasResponded && !isExpired && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Vaš odgovor</h2>
              
              {!showResponseForm ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1"
                    onClick={() => handleResponse('accepted')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Prihvatam ponudu
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleResponse('revision_requested')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Zahtevam izmene
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleResponse('rejected')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Odbijam ponudu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className={
                    responseType === 'accepted' ? 'border-green-200 bg-green-50' :
                    responseType === 'rejected' ? 'border-red-200 bg-red-50' :
                    'border-yellow-200 bg-yellow-50'
                  }>
                    <AlertDescription className={
                      responseType === 'accepted' ? 'text-green-800' :
                      responseType === 'rejected' ? 'text-red-800' :
                      'text-yellow-800'
                    }>
                      {responseType === 'accepted' && '✓ Hvala što ste prihvatili našu ponudu! Molimo potvrdite vaše podatke.'}
                      {responseType === 'rejected' && 'Žao nam je što ponuda ne odgovara vašim potrebama. Molimo navedite razlog.'}
                      {responseType === 'revision_requested' && 'Molimo detaljno opišite koje izmjene su potrebne.'}
                    </AlertDescription>
                  </Alert>

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
                    <Label htmlFor="comment">
                      {responseType === 'revision_requested' ? 'Potrebne izmene *' : 'Komentar (opciono)'}
                    </Label>
                    <Textarea
                      id="comment"
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder={
                        responseType === 'revision_requested' 
                          ? 'Molimo opišite koje izmene su potrebne...'
                          : 'Dodatni komentar...'
                      }
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={submitResponse}
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="mr-2 h-4 w-4" />
                      Pošalji odgovor
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowResponseForm(false)}
                      disabled={submitting}
                    >
                      Otkaži
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Komentari i pitanja</h2>
            
            {/* Add Comment Form - Allow comments unless fully responded (accepted/rejected) */}
            {!hasResponded && (
              <div className="space-y-4 mb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="comment-name">Ime *</Label>
                    <Input
                      id="comment-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Vaše ime"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment-email">Email *</Label>
                    <Input
                      id="comment-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="vas@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-comment">Komentar *</Label>
                  <Textarea
                    id="new-comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    placeholder="Vaše pitanje ili komentar..."
                    rows={3}
                  />
                </div>
                <Button onClick={submitComment} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Pošalji komentar
                </Button>
              </div>
            )}

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
                  Nema komentara za sada
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmationType === 'accepted' ? 'Prihvatite ponudu' : 'Odbijte ponudu'}
            </DialogTitle>
            <DialogDescription>
              {confirmationType === 'accepted' ? (
                <>
                  <p className="mb-3">Potvrdite da prihvatate ovu ponudu u iznosu od <strong>€{quote?.total_amount?.toFixed(2) || '0.00'}</strong>.</p>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ Prihvatanjem ponude, slažete se sa uslovima i cijenama<br/>
                      ✓ Kontaktiraćemo vas radi dogovora o realizaciji<br/>
                      ✓ Možete preuzeti PDF dokument za evidenciju
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3">Da li ste sigurni da želite odbiti ovu ponudu?</p>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      Možete navesti razlog odbijanja u komentaru koji slijedi.
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Otkaži
            </Button>
            <Button
              variant={confirmationType === 'accepted' ? 'default' : 'destructive'}
              onClick={confirmFinalDecision}
            >
              {confirmationType === 'accepted' ? 'Da, prihvatam' : 'Da, odbijam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}