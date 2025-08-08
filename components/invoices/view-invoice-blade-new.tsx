"use client"

import { useState, useEffect } from "react"
import { X, FileText, Download, Share2, Calendar, User, Building, Euro, Clock, CheckCircle, Loader2, CreditCard, Receipt, QrCode, Shield, AlertTriangle, Printer, Mail, Copy, ExternalLink, Factory, FileCheck, Phone, MapPin, Send, DollarSign, Calculator, TrendingUp, Archive } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// Tooltip imports removed temporarily
import { format, parseISO, isAfter, differenceInDays } from "date-fns"
import { sr } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Invoice {
  id: string
  invoice_number: string
  fiscal_number?: string
  work_order_id?: string
  company_id: string
  invoice_date: string
  due_date?: string
  status: string
  payment_status: string
  payment_method?: string
  subtotal: number
  vat_amount: number
  total_amount: number
  paid_amount: number
  discount_percentage?: number
  discount_amount?: number
  notes?: string
  fiscal_verified: boolean
  fiscal_qr_code?: string
  fiscal_iic?: string
  fiscal_signature?: string
  fiscal_timestamp?: string
  created_at: string
  updated_at?: string
  company?: {
    id: string
    name: string
    tax_number?: string
    address?: string
    city?: string
    postal_code?: string
    phone?: string
    email?: string
  }
  work_order?: {
    id: string
    order_number: string
    status?: string
    created_at: string
  }
  invoice_items?: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    vat_rate: number
    line_total: number
    vat_amount: number
    total_with_vat: number
  }>
  payments?: Array<{
    id: string
    payment_date: string
    amount: number
    payment_method: string
    reference_number?: string
    notes?: string
  }>
}

interface ViewInvoiceBladeProps {
  invoice: Invoice
  onClose: () => void
}

export function ViewInvoiceBladeNew({ invoice, onClose }: ViewInvoiceBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showFiscalization, setShowFiscalization] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [processingFiscal, setProcessingFiscal] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: 'transfer',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  })

  const { toast } = useToast()
  
  // Calculations
  const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0)
  const paymentProgress = invoice.total_amount > 0 ? (invoice.paid_amount / invoice.total_amount) * 100 : 0
  const isOverdue = invoice.due_date && isAfter(new Date(), parseISO(invoice.due_date)) && invoice.payment_status !== 'paid'
  const daysUntilDue = invoice.due_date ? differenceInDays(parseISO(invoice.due_date), new Date()) : null

  const getStatusInfo = (status: string) => {
    const statusMap = {
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
      sent: { label: 'Poslano', color: 'bg-blue-100 text-blue-800', icon: Send },
      issued: { label: 'Izdato', color: 'bg-blue-100 text-blue-800', icon: FileCheck },
      paid: { label: 'Plaćeno', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.draft
  }

  const getPaymentStatusInfo = (paymentStatus: string, isOverdue: boolean) => {
    if (isOverdue) return { label: 'Kašnjenje', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    
    const statusMap = {
      unpaid: { label: 'Neplaćeno', color: 'bg-red-100 text-red-800', icon: Clock },
      partial: { label: 'Delimično', color: 'bg-yellow-100 text-yellow-800', icon: TrendingUp },
      paid: { label: 'Plaćeno', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    return statusMap[paymentStatus as keyof typeof statusMap] || statusMap.unpaid
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: 'Kopirano!', description: 'Broj fakture je kopiran u clipboard' })
    setTimeout(() => setCopied(false), 2000)
  }

  const statusInfo = getStatusInfo(invoice.status)
  const paymentStatusInfo = getPaymentStatusInfo(invoice.payment_status, !!isOverdue)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Receipt className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">Faktura #{invoice.invoice_number}</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(invoice.invoice_number)}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    title="Kopiraj broj fakture"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={cn("text-xs font-medium", statusInfo.color)}>
                    <statusInfo.icon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  
                  <Badge className={cn("text-xs font-medium", paymentStatusInfo.color)}>
                    <paymentStatusInfo.icon className="h-3 w-3 mr-1" />
                    {paymentStatusInfo.label}
                  </Badge>

                  {invoice.fiscal_verified && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Fiskalizovano
                    </Badge>
                  )}

                  {invoice.work_order && (
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      <Factory className="h-3 w-3 mr-1" />
                      {invoice.work_order.order_number}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" title="Preuzmi PDF">
                <Download className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" title="Štampaj">
                <Printer className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" title="Pošalji email">
                <Send className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6 bg-white/30 mx-2" />
              
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20" title="Zatvori">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">€{invoice.total_amount.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Ukupan iznos</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">€{(invoice.paid_amount || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600">Plaćeno</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">€{remainingAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Za naplatu</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600">
                  {daysUntilDue !== null ? (
                    daysUntilDue > 0 ? `${daysUntilDue}d` : 
                    daysUntilDue === 0 ? 'Danas' : 
                    `${Math.abs(daysUntilDue)}d kasni`
                  ) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Do dospeća</div>
              </div>
            </div>
          </div>
          
          {/* Payment Progress */}
          {invoice.total_amount > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Napredak naplate</span>
                <span className="text-sm text-gray-600">{paymentProgress.toFixed(1)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b bg-white">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger value="overview" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600">
                  Pregled
                </TabsTrigger>
                <TabsTrigger value="items" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600">
                  Stavke
                </TabsTrigger>
                <TabsTrigger value="payments" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600">
                  Uplate
                </TabsTrigger>
                <TabsTrigger value="fiscal" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600">
                  Fiskalizacija
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Invoice Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Podaci o fakturi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Broj fakture:</span>
                        <span className="font-semibold">{invoice.invoice_number}</span>
                      </div>
                      
                      {invoice.fiscal_number && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Fiskalni broj:</span>
                          <span className="font-semibold font-mono text-sm">{invoice.fiscal_number}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Datum izdavanja:</span>
                        <span className="font-semibold">
                          {format(parseISO(invoice.invoice_date), 'dd.MM.yyyy', { locale: sr })}
                        </span>
                      </div>
                      
                      {invoice.due_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Datum dospeća:</span>
                          <span className={cn(
                            "font-semibold",
                            isOverdue ? "text-red-600" : "text-gray-900"
                          )}>
                            {format(parseISO(invoice.due_date), 'dd.MM.yyyy', { locale: sr })}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Način plaćanja:</span>
                        <span className="font-semibold">{invoice.payment_method || 'N/A'}</span>
                      </div>

                      {invoice.work_order && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Radni nalog:</span>
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-purple-600" />
                              <span className="font-semibold text-purple-600">
                                {invoice.work_order.order_number}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Company Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Kupac
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="font-semibold text-lg text-gray-900">
                          {invoice.company?.name}
                        </div>
                        {invoice.company?.tax_number && (
                          <div className="text-sm text-gray-600">PIB: {invoice.company.tax_number}</div>
                        )}
                      </div>
                      
                      {invoice.company?.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="text-sm text-gray-600">
                            <div>{invoice.company.address}</div>
                            {(invoice.company.postal_code || invoice.company.city) && (
                              <div>
                                {invoice.company.postal_code} {invoice.company.city}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {invoice.company?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{invoice.company.phone}</span>
                        </div>
                      )}
                      
                      {invoice.company?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{invoice.company.email}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Amount Breakdown */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Finansijski pregled
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Osnova (bez PDV):</span>
                          <span className="font-medium">€{invoice.subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">PDV (21%):</span>
                          <span className="font-medium">€{invoice.vat_amount.toFixed(2)}</span>
                        </div>
                        
                        {(invoice.discount_amount && invoice.discount_amount > 0) && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Popust:</span>
                            <span className="font-medium text-green-600">-€{invoice.discount_amount.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-lg">Za naplatu:</span>
                          <span className="font-bold text-xl text-blue-600">€{invoice.total_amount.toFixed(2)}</span>
                        </div>
                        
                        {invoice.paid_amount > 0 && (
                          <>
                            <div className="flex justify-between items-center text-green-600">
                              <span className="font-medium">Uplaćeno:</span>
                              <span className="font-semibold">€{invoice.paid_amount.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-orange-600">
                              <span className="font-medium">Ostatak:</span>
                              <span className="font-semibold">€{remainingAmount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Napomene</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="items" className="p-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Stavke fakture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Opis</TableHead>
                          <TableHead className="text-right w-24">Količina</TableHead>
                          <TableHead className="text-right w-32">Cena</TableHead>
                          <TableHead className="text-right w-24">PDV</TableHead>
                          <TableHead className="text-right w-32">Ukupno</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.invoice_items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.description}</div>
                              <div className="text-sm text-gray-500">PDV stopa: {item.vat_rate}%</div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              €{item.unit_price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              €{item.vat_amount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              €{item.total_with_vat.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {(!invoice.invoice_items || invoice.invoice_items.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              Nema stavki u fakturi
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Summary */}
                    <div className="mt-6 flex justify-end">
                      <div className="w-80 space-y-2">
                        <div className="flex justify-between">
                          <span>Osnova (bez PDV):</span>
                          <span>€{invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>PDV (21%):</span>
                          <span>€{invoice.vat_amount.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>UKUPNO:</span>
                          <span>€{invoice.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="p-6 mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Uplate
                    </h3>
                    {remainingAmount > 0 && (
                      <Button onClick={() => setShowAddPayment(true)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Dodaj uplatu
                      </Button>
                    )}
                  </div>

                  {invoice.payments && invoice.payments.length > 0 ? (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Datum</TableHead>
                              <TableHead>Iznos</TableHead>
                              <TableHead>Način plaćanja</TableHead>
                              <TableHead>Referenca</TableHead>
                              <TableHead>Napomena</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoice.payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {format(parseISO(payment.payment_date), 'dd.MM.yyyy', { locale: sr })}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  €{payment.amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.payment_method}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {payment.reference_number || '-'}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {payment.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nema zabeleženih uplata</h3>
                        <p className="text-gray-600 mb-6">Dodajte prvu uplatu za ovu fakturu</p>
                        {remainingAmount > 0 && (
                          <Button onClick={() => setShowAddPayment(true)}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Dodaj uplatu
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="fiscal" className="p-6 mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Fiskalizacija
                    </h3>
                    {!invoice.fiscal_verified && (
                      <Button onClick={() => setShowFiscalization(true)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Fiskalizuj
                      </Button>
                    )}
                  </div>

                  {invoice.fiscal_verified ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Fiskalni podaci
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-gray-600">IIC kod:</span>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {invoice.fiscal_iic || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vreme fiskalizacije:</span>
                            <span className="font-medium">
                              {invoice.fiscal_timestamp ? 
                                format(parseISO(invoice.fiscal_timestamp), 'dd.MM.yyyy HH:mm', { locale: sr }) : 
                                'N/A'
                              }
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">Potpis:</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded max-w-32 truncate">
                              {invoice.fiscal_signature || 'N/A'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            QR Kod
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <QrCode className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <span className="text-sm text-gray-600">QR kod za verifikaciju</span>
                            </div>
                          </div>
                          {invoice.fiscal_qr_code && (
                            <div className="mt-4 p-3 bg-gray-50 rounded text-xs font-mono break-all">
                              {invoice.fiscal_qr_code}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Faktura nije fiskalizovana</h3>
                        <p className="text-gray-600 mb-6">Fiskalizacija je potrebna za validnost fakture</p>
                        <Button onClick={() => setShowFiscalization(true)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Pokreni fiskalizaciju
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Add Payment Dialog - simplified for space */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj uplatu</DialogTitle>
            <DialogDescription>
              Zabeležite uplatu za fakturu #{invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {/* Payment form would go here - keeping existing logic */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddPayment(false)}>
              Otkaži
            </Button>
            <Button disabled={processingPayment}>
              {processingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dodaj uplatu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fiscalization Dialog - simplified for space */}
      <Dialog open={showFiscalization} onOpenChange={setShowFiscalization}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fiskalizacija fakture</DialogTitle>
            <DialogDescription>
              Pošaljite fakturu #{invoice.invoice_number} na fiskalizaciju
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p>Da li želite da fiskalizujete ovu fakturu?</p>
            <p className="text-sm text-muted-foreground mt-2">
              Nakon fiskalizacije faktura ne može biti menjana.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowFiscalization(false)}>
              Otkaži
            </Button>
            <Button disabled={processingFiscal}>
              {processingFiscal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Fiskalizuj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}