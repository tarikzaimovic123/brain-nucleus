"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Save, Loader2, FileText, Plus, Trash2, Building, User, Calendar, Euro, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Quote, QuoteFormData } from "@/types/quotes"
import type { Company } from "@/types/companies"
import type { Contact } from "@/types/contacts"
import type { Product } from "@/types/products"
import { format } from "date-fns"

const quoteItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  description: z.string().min(1, "Opis je obavezan"),
  quantity: z.number().min(0.01, "Količina mora biti veća od 0"),
  unit_price: z.number().min(0, "Cena ne može biti negativna"),
  vat_rate: z.number().min(0).max(100).optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
})

const quoteSchema = z.object({
  company_id: z.string().min(1, "Firma je obavezna"),
  contact_person_id: z.string().optional(),
  quote_date: z.string().min(1, "Datum ponude je obavezan"),
  valid_until: z.string().optional(),
  status: z.string().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  quote_items: z.array(quoteItemSchema).min(1, "Mora postojati najmanje jedna stavka"),
})

interface EditQuoteBladeProps {
  quote: Quote | null
  onClose: () => void
  onSave: () => void
}

export function EditQuoteBlade({ quote, onClose, onSave }: EditQuoteBladeProps) {
  const [companies, setCompanies] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isEditMode = quote !== null
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      company_id: quote?.company_id || "",
      contact_person_id: quote?.contact_person_id || "",
      quote_date: quote?.quote_date || format(new Date(), 'yyyy-MM-dd'),
      valid_until: quote?.valid_until || "",
      status: quote?.status || "draft",
      discount_percentage: quote?.discount_percentage || 0,
      notes: quote?.notes || "",
      internal_notes: quote?.internal_notes || "",
      quote_items: quote?.quote_items?.map(item => ({
        id: item.id,
        product_id: item.product_id || "",
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate || 21,
        discount_percentage: item.discount_percentage || 0,
      })) || [{
        description: "",
        quantity: 1,
        unit_price: 0,
        vat_rate: 21,
        discount_percentage: 0,
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "quote_items",
  })

  const watchCompanyId = watch("company_id")
  const watchQuoteItems = watch("quote_items")

  useEffect(() => {
    fetchCompanies()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (watchCompanyId) {
      console.log('Company selected:', watchCompanyId)
      fetchContactsForCompany(watchCompanyId)
    } else {
      setContacts([])
    }
  }, [watchCompanyId])

  const fetchCompanies = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, tax_number')
      .eq('is_active', true)
      .order('name')

    if (!error && data) {
      setCompanies(data)
      console.log('Loaded companies:', data)
    } else if (error) {
      console.error('Error loading companies:', error)
    }
  }

  const fetchContactsForCompany = async (companyId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contact_persons')
      .select('id, first_name, last_name, email, is_primary')
      .eq('company_id', companyId)
      .order('is_primary', { ascending: false })
      .order('first_name')

    if (!error && data) {
      setContacts(data)
      console.log('Loaded contacts for company:', data)
    } else if (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const fetchProducts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, code, name, selling_price, vat_rate')
      .eq('is_active', true)
      .order('name')

    if (!error && data) {
      setProducts(data)
    }
  }

  const generateQuoteNumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PON-${year}${month}-${random}`
  }

  const calculateLineTotal = (quantity: number, unitPrice: number, discountPercentage: number = 0) => {
    const subtotal = quantity * unitPrice
    const discount = subtotal * (discountPercentage / 100)
    return subtotal - discount
  }

  const calculateQuoteTotals = () => {
    let subtotal = 0
    let vatAmount = 0
    
    watchQuoteItems.forEach(item => {
      const lineTotal = calculateLineTotal(item.quantity, item.unit_price, item.discount_percentage)
      subtotal += lineTotal
      
      if (item.vat_rate) {
        vatAmount += lineTotal * (item.vat_rate / 100)
      }
    })

    const discountPercentage = watch("discount_percentage") || 0
    const discountAmount = subtotal * (discountPercentage / 100)
    const finalSubtotal = subtotal - discountAmount
    const finalVatAmount = vatAmount * (1 - discountPercentage / 100)
    const totalAmount = finalSubtotal + finalVatAmount

    return {
      subtotal: finalSubtotal,
      vatAmount: finalVatAmount,
      discountAmount,
      totalAmount
    }
  }

  const onProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setValue(`quote_items.${index}.product_id`, productId)
      setValue(`quote_items.${index}.description`, product.name)
      setValue(`quote_items.${index}.unit_price`, product.selling_price || 0)
      setValue(`quote_items.${index}.vat_rate`, product.vat_rate)
    }
  }

  const addItem = () => {
    append({
      description: "",
      quantity: 1,
      unit_price: 0,
      vat_rate: 21,
      discount_percentage: 0,
    })
  }

  const onSubmit = async (data: QuoteFormData) => {
    setLoading(true)
    const supabase = createClient()

    const totals = calculateQuoteTotals()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni za kreiranje ponude",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const quoteData: any = {
        quote_number: isEditMode ? quote!.quote_number : generateQuoteNumber(),
        company_id: data.company_id || null,
        contact_person_id: data.contact_person_id || null,
        quote_date: data.quote_date,
        valid_until: data.valid_until || null,
        status: data.status || 'draft',
        subtotal: totals.subtotal,
        vat_amount: totals.vatAmount,
        total_amount: totals.totalAmount,
        discount_percentage: data.discount_percentage || null,
        discount_amount: totals.discountAmount || null,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
      }

      // Add created_by only for new quotes
      if (!isEditMode) {
        quoteData.created_by = user.id
      }

      let quoteId: string

      if (isEditMode && quote) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quote.id)

        if (error) throw error

        quoteId = quote.id

        // Delete existing items
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quote.id)
      } else {
        const { data: newQuote, error } = await supabase
          .from('quotes')
          .insert(quoteData)
          .select('id')
          .single()

        if (error) throw error
        quoteId = newQuote.id
      }

      // Insert quote items
      const quoteItems = data.quote_items.map((item, index) => ({
        quote_id: quoteId,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate || null,
        discount_percentage: item.discount_percentage || null,
        line_total: calculateLineTotal(item.quantity, item.unit_price, item.discount_percentage),
        display_order: index + 1,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) throw itemsError

      toast({
        title: "Uspeh",
        description: isEditMode ? "Ponuda je uspešno ažurirana" : "Ponuda je uspešno kreirana",
      })

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving quote:', error)
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom čuvanja ponude",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateQuoteTotals()

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditMode ? `Uredi ponudu ${quote.quote_number}` : 'Nova ponuda'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'Ažuriraj postojeću ponudu' : 'Kreiraj novu ponudu'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Osnovni podaci
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_id">
                  Firma <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                    sublabel: company.tax_number ? `PIB: ${company.tax_number}` : undefined,
                  }))}
                  value={watch("company_id")}
                  onValueChange={(value) => {
                    setValue("company_id", value)
                    setValue("contact_person_id", "") // Reset contact when company changes
                  }}
                  placeholder="Pretraži i izaberi firmu..."
                  searchPlaceholder="Ukucaj naziv firme..."
                  emptyText="Nema pronađenih firmi"
                />
                {errors.company_id && (
                  <p className="text-sm text-red-600">{errors.company_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person_id">Kontakt osoba</Label>
                <Combobox
                  options={[
                    { value: "", label: "Bez kontakta" },
                    ...contacts.map((contact) => ({
                      value: contact.id,
                      label: `${contact.first_name} ${contact.last_name}`,
                      sublabel: contact.email || (contact.is_primary ? "Primarni kontakt" : undefined),
                    }))
                  ]}
                  value={watch("contact_person_id")}
                  onValueChange={(value) => setValue("contact_person_id", value)}
                  placeholder={!watchCompanyId ? "Prvo izaberi firmu" : "Pretraži kontakt..."}
                  searchPlaceholder="Ukucaj ime kontakta..."
                  emptyText="Nema pronađenih kontakata"
                  disabled={!watchCompanyId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote_date">
                  Datum ponude <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quote_date"
                  type="date"
                  {...register("quote_date")}
                />
                {errors.quote_date && (
                  <p className="text-sm text-red-600">{errors.quote_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Važi do</Label>
                <Input
                  id="valid_until"
                  type="date"
                  {...register("valid_until")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberi status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nacrt</SelectItem>
                    <SelectItem value="pending">Na čekanju</SelectItem>
                    <SelectItem value="approved">Odobrena</SelectItem>
                    <SelectItem value="rejected">Odbijena</SelectItem>
                    <SelectItem value="cancelled">Otkazana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Popust (%)</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("discount_percentage", { valueAsNumber: true })}
                />
              </div>
            </div>
          </Card>

          {/* Quote Items */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stavke ponude
              </h3>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj stavku
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proizvod/Opis</TableHead>
                    <TableHead className="w-24">Količina</TableHead>
                    <TableHead className="w-32">Cena</TableHead>
                    <TableHead className="w-24">PDV %</TableHead>
                    <TableHead className="w-24">Popust %</TableHead>
                    <TableHead className="w-32">Ukupno</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const item = watchQuoteItems[index]
                    const lineTotal = item ? calculateLineTotal(item.quantity, item.unit_price, item.discount_percentage) : 0
                    
                    return (
                      <TableRow key={field.id}>
                        <TableCell className="space-y-2">
                          <Combobox
                            options={[
                              { value: "", label: "Bez proizvoda" },
                              ...products.map((product) => ({
                                value: product.id,
                                label: product.name,
                                sublabel: `Šifra: ${product.code} • €${product.selling_price?.toFixed(2) || '0.00'}`
                              }))
                            ]}
                            value={watch(`quote_items.${index}.product_id`) || ""}
                            onValueChange={(value) => {
                              if (value === "") {
                                setValue(`quote_items.${index}.product_id`, "")
                              } else {
                                onProductSelect(index, value)
                              }
                            }}
                            placeholder="Pretraži proizvod..."
                            searchPlaceholder="Ukucaj naziv ili šifru..."
                            emptyText="Nema pronađenih proizvoda"
                            className="w-full"
                          />
                          <Input
                            placeholder="Opis stavke"
                            {...register(`quote_items.${index}.description`)}
                          />
                          {errors.quote_items?.[index]?.description && (
                            <p className="text-sm text-red-600">
                              {errors.quote_items[index]?.description?.message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...register(`quote_items.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`quote_items.${index}.unit_price`, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register(`quote_items.${index}.vat_rate`, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register(`quote_items.${index}.discount_percentage`, { valueAsNumber: true })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            €{lineTotal.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {errors.quote_items && (
              <p className="text-sm text-red-600 mt-2">
                {errors.quote_items.message}
              </p>
            )}
          </Card>

          {/* Totals */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Ukupno
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Osnova:</span>
                <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>PDV:</span>
                <span className="font-medium">€{totals.vatAmount.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Popust:</span>
                  <span className="font-medium">-€{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>UKUPNO:</span>
                <span>€{totals.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Napomene</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notes">Javne napomene</Label>
                <Textarea
                  id="notes"
                  placeholder="Napomene vidljive klijentu..."
                  rows={4}
                  {...register("notes")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal_notes">Interne napomene</Label>
                <Textarea
                  id="internal_notes"
                  placeholder="Interne napomene (nisu vidljive klijentu)..."
                  rows={4}
                  {...register("internal_notes")}
                />
              </div>
            </div>
          </Card>

        </form>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Otkaži
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? 'Ažuriraj ponudu' : 'Kreiraj ponudu'}
          </Button>
        </div>
      </div>
    </div>
  )
}