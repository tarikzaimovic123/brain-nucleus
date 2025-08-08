"use client"

import { useState } from "react"
import { X, FileText, Download, Share2, Calendar, Building, Euro, Clock, CheckCircle, Printer, Mail, Edit, Trash2, CreditCard, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { format, parseISO, differenceInDays } from "date-fns"
import { sr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

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
  created_at: string
  company?: {
    id: string
    name: string
    tax_number?: string
    address?: string
    city?: string
    email?: string
    phone?: string
  }
  work_order?: {
    id: string
    order_number: string
  }
}

interface ViewInvoiceBladeProps {
  invoice: Invoice
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewInvoiceBlade({ invoice, onClose, onEdit, onDelete }: ViewInvoiceBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      draft: { variant: "secondary", className: "" },
      sent: { variant: "default", className: "bg-blue-100 text-blue-800" },
      paid: { variant: "default", className: "bg-green-100 text-green-800" },
      overdue: { variant: "destructive", className: "" },
      cancelled: { variant: "destructive", className: "" }
    }
    
    const labels: Record<string, string> = {
      draft: "Nacrt",
      sent: "Poslata",
      paid: "Plaćena",
      overdue: "Kasni",
      cancelled: "Otkazana"
    }
    
    return (
      <Badge 
        variant={variants[status]?.variant || "outline"}
        className={variants[status]?.className}
      >
        {labels[status] || status}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pending: { variant: "secondary", className: "" },
      partial: { variant: "default", className: "bg-yellow-100 text-yellow-800" },
      paid: { variant: "default", className: "bg-green-100 text-green-800" },
      overdue: { variant: "destructive", className: "" }
    }
    
    const labels: Record<string, string> = {
      pending: "Čeka plaćanje",
      partial: "Delimično plaćeno",
      paid: "Plaćeno",
      overdue: "Kasni"
    }
    
    return (
      <Badge 
        variant={variants[status]?.variant || "outline"}
        className={variants[status]?.className}
      >
        {labels[status] || status}
      </Badge>
    )
  }

  const handlePrint = () => {
    toast({
      title: "Info",
      description: "Štampanje fakture je u izradi"
    })
  }

  const handleSendEmail = () => {
    toast({
      title: "Info",
      description: "Slanje fakture emailom je u izradi"
    })
  }

  const handleExport = () => {
    toast({
      title: "Info",
      description: "Eksportovanje fakture je u izradi"
    })
  }

  const handleVerifyFiscal = () => {
    toast({
      title: "Info",
      description: "Fiskalna verifikacija je u izradi"
    })
  }

  const daysUntilDue = invoice.due_date 
    ? differenceInDays(parseISO(invoice.due_date), new Date())
    : null

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{invoice.invoice_number}</h2>
            <p className="text-sm text-muted-foreground">
              {invoice.company?.name || "Nepoznata firma"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSendEmail}>
            <Mail className="h-4 w-4" />
          </Button>
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

      {/* Status Bar */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusBadge(invoice.status)}
            {getPaymentStatusBadge(invoice.payment_status)}
            {invoice.fiscal_verified && (
              <Badge variant="outline" className="bg-green-50">
                <Shield className="mr-1 h-3 w-3" />
                Fiskalizovano
              </Badge>
            )}
            {daysUntilDue !== null && daysUntilDue < 0 && (
              <Badge variant="destructive">
                Kasni {Math.abs(daysUntilDue)} dana
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!invoice.fiscal_verified && (
              <Button variant="outline" size="sm" onClick={handleVerifyFiscal}>
                <Shield className="mr-2 h-4 w-4" />
                Fiskalizuj
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Izvezi
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Podeli
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Pregled</TabsTrigger>
              <TabsTrigger value="items">Stavke</TabsTrigger>
              <TabsTrigger value="payments">Plaćanja</TabsTrigger>
              <TabsTrigger value="fiscal">Fiskalni podaci</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-4">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Osnovne informacije</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Broj fakture</p>
                      <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
                    </div>
                  </div>
                  
                  {invoice.fiscal_number && (
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Fiskalni broj</p>
                        <p className="text-sm text-muted-foreground">{invoice.fiscal_number}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Datum izdavanja</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(invoice.invoice_date), "d. MMMM yyyy.", { locale: sr })}
                      </p>
                    </div>
                  </div>

                  {invoice.due_date && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Rok plaćanja</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(invoice.due_date), "d. MMMM yyyy.", { locale: sr })}
                          {daysUntilDue !== null && (
                            <span className={daysUntilDue < 0 ? "text-red-600" : "text-muted-foreground"}>
                              {" "}({daysUntilDue < 0 ? `kasni ${Math.abs(daysUntilDue)} dana` : `za ${daysUntilDue} dana`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Company Information */}
              {invoice.company && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Podaci o kupcu</h3>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{invoice.company.name}</p>
                        {invoice.company.tax_number && (
                          <p className="text-sm text-muted-foreground">PIB: {invoice.company.tax_number}</p>
                        )}
                        {invoice.company.address && (
                          <p className="text-sm text-muted-foreground">{invoice.company.address}</p>
                        )}
                        {(invoice.company.city) && (
                          <p className="text-sm text-muted-foreground">{invoice.company.city}</p>
                        )}
                        {invoice.company.email && (
                          <p className="text-sm text-muted-foreground">{invoice.company.email}</p>
                        )}
                        {invoice.company.phone && (
                          <p className="text-sm text-muted-foreground">{invoice.company.phone}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <Separator />

              {/* Financial Summary */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Finansijski pregled</h3>
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Osnovica</span>
                      <span className="text-sm font-medium">€{invoice.subtotal.toFixed(2)}</span>
                    </div>
                    {invoice.discount_amount && invoice.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">Popust ({invoice.discount_percentage}%)</span>
                        <span className="text-sm font-medium">-€{invoice.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm">PDV (21%)</span>
                      <span className="text-sm font-medium">€{invoice.vat_amount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Ukupno</span>
                      <span className="font-medium text-lg">€{invoice.total_amount.toFixed(2)}</span>
                    </div>
                    {invoice.paid_amount > 0 && (
                      <>
                        <div className="flex justify-between text-green-600">
                          <span className="text-sm">Plaćeno</span>
                          <span className="text-sm font-medium">€{invoice.paid_amount.toFixed(2)}</span>
                        </div>
                        {invoice.total_amount - invoice.paid_amount > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span className="text-sm">Preostalo</span>
                            <span className="text-sm font-medium">
                              €{(invoice.total_amount - invoice.paid_amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Napomene</h3>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="items" className="space-y-6 mt-0">
              <Card>
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">Lista stavki fakture će biti prikazana ovde</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6 mt-0">
              <Card>
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">Istorija plaćanja će biti prikazana ovde</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-6 mt-0">
              <Card>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Status fiskalizacije</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.fiscal_verified ? "Fiskalizovano" : "Nije fiskalizovano"}
                        </p>
                      </div>
                    </div>
                    {invoice.fiscal_number && (
                      <div>
                        <p className="text-sm font-medium">Fiskalni broj</p>
                        <p className="text-sm text-muted-foreground font-mono">{invoice.fiscal_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}