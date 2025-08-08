"use client"

import { useState, useEffect } from "react"
import { X, Building2, Save, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { Company } from "@/types/database"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/components/ui/use-toast"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const companySchema = z.object({
  name: z.string()
    .min(1, "Naziv firme je obavezan")
    .min(2, "Naziv mora imati najmanje 2 karaktera")
    .max(100, "Naziv ne može biti duži od 100 karaktera"),
  tax_number: z.string()
    .optional()
    .refine((val) => !val || /^\d{8}$/.test(val), {
      message: "PIB mora imati tačno 8 cifara"
    }),
  vat_number: z.string()
    .optional()
    .refine((val) => !val || /^[A-Z]{2}\d{8}$/.test(val), {
      message: "PDV broj mora biti u formatu ME12345678 (2 slova + 8 cifara)"
    }),
  address: z.string()
    .optional()
    .refine((val) => !val || val.length >= 5, {
      message: "Adresa mora imati najmanje 5 karaktera"
    }),
  city: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: "Naziv grada mora imati najmanje 2 karaktera"
    }),
  postal_code: z.string()
    .optional()
    .refine((val) => !val || /^\d{5}$/.test(val), {
      message: "Poštanski broj mora imati tačno 5 cifara"
    }),
  country: z.string()
    .optional(),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\d\s\+\-\(\)]+$/.test(val), {
      message: "Telefon može sadržati samo brojeve, +, -, (, ) i razmake"
    }),
  email: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(val)
    }, {
      message: "Neispravna email adresa"
    }),
  website: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true
      try {
        new URL(val)
        return true
      } catch {
        return false
      }
    }, {
      message: "Neispravan URL (mora počinjati sa http:// ili https://)"
    }),
  bank_account: z.string()
    .optional()
    .refine((val) => !val || /^[\d\-]+$/.test(val), {
      message: "Žiro račun može sadržati samo brojeve i crtice"
    }),
  payment_terms: z.number()
    .min(0, "Rok plaćanja ne može biti negativan")
    .max(365, "Rok plaćanja ne može biti duži od 365 dana")
    .optional(),
  credit_limit: z.number()
    .min(0, "Kreditni limit ne može biti negativan")
    .max(999999999, "Kreditni limit je previsok")
    .optional(),
  is_active: z.boolean(),
})

type CompanyFormValues = z.infer<typeof companySchema>

interface EditCompanyBladeProps {
  company: Company | null
  onClose: () => void
  onSuccess: () => void
}

export function EditCompanyBlade({ company, onClose, onSuccess }: EditCompanyBladeProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      tax_number: "",
      vat_number: "",
      address: "",
      city: "",
      postal_code: "",
      country: "Montenegro",
      phone: "",
      email: "",
      website: "",
      bank_account: "",
      payment_terms: 30,
      credit_limit: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        tax_number: company.tax_number || "",
        vat_number: company.vat_number || "",
        address: company.address || "",
        city: company.city || "",
        postal_code: company.postal_code || "",
        country: company.country || "Montenegro",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        bank_account: company.bank_account || "",
        payment_terms: company.payment_terms || 30,
        credit_limit: company.credit_limit || 0,
        is_active: company.is_active ?? true,
      })
    }
  }, [company, form])

  const onSubmit = async (values: CompanyFormValues) => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      // Clean up empty strings
      const cleanedValues = Object.entries(values).reduce((acc, [key, value]) => {
        if (value === "" || value === null) {
          acc[key] = null
        } else {
          acc[key] = value
        }
        return acc
      }, {} as any)

      if (company?.id) {
        // Update existing company
        const { data, error } = await supabase
          .from("companies")
          .update({
            ...cleanedValues,
            updated_at: new Date().toISOString(),
          })
          .eq("id", company.id)
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('tax_number')) {
              throw new Error("Firma sa ovim PIB brojem već postoji")
            } else if (error.message.includes('vat_number')) {
              throw new Error("Firma sa ovim PDV brojem već postoji")
            }
          }
          throw error
        }
        
        if (!data) {
          throw new Error("Greška pri ažuriranju firme")
        }
      } else {
        // Create new company
        const { data, error } = await supabase
          .from("companies")
          .insert([cleanedValues])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('tax_number')) {
              throw new Error("Firma sa ovim PIB brojem već postoji")
            } else if (error.message.includes('vat_number')) {
              throw new Error("Firma sa ovim PDV brojem već postoji")
            }
          }
          throw error
        }
        
        if (!data) {
          throw new Error("Greška pri dodavanju firme")
        }
      }

      toast({
        title: company?.id ? "Firma ažurirana" : "Firma dodana",
        description: company?.id 
          ? `Firma "${cleanedValues.name}" je uspešno ažurirana.`
          : `Nova firma "${cleanedValues.name}" je uspešno dodana.`,
      })
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error saving company:", error)
      const errorMessage = error.message || "Greška pri čuvanju podataka. Molim vas pokušajte ponovo."
      setError(errorMessage)
      
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {company ? "Izmeni firmu" : "Nova firma"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {company ? "Ažuriraj podatke o firmi" : "Dodaj novu firmu u sistem"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium mb-4">Osnovne informacije</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naziv firme *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Unesite naziv firme" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tax_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIB</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="12345678" 
                            maxLength={8}
                          />
                        </FormControl>
                        <FormDescription>
                          Poreski identifikacioni broj (8 cifara)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vat_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PDV broj</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="ME12345678"
                            maxLength={10}
                            style={{ textTransform: 'uppercase' }}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          PDV broj (ME + 8 cifara)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Aktivna firma</FormLabel>
                        <FormDescription>
                          Označite ako je firma trenutno aktivna
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-medium mb-4">Kontakt informacije</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Unesite adresu firme"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Podgorica" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poštanski broj</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="81000"
                            maxLength={5}
                          />
                        </FormControl>
                        <FormDescription>5 cifara</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Država</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberite državu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Montenegro">Crna Gora</SelectItem>
                          <SelectItem value="Serbia">Srbija</SelectItem>
                          <SelectItem value="Bosnia">Bosna i Hercegovina</SelectItem>
                          <SelectItem value="Croatia">Hrvatska</SelectItem>
                          <SelectItem value="Slovenia">Slovenija</SelectItem>
                          <SelectItem value="Macedonia">Makedonija</SelectItem>
                          <SelectItem value="Albania">Albanija</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+382 20 123 456" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="info@firma.me" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Web sajt</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.firma.me" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            <div>
              <h3 className="text-sm font-medium mb-4">Finansijske informacije</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Žiro račun</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123-456789-00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payment_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rok plaćanja (dana)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Broj dana za plaćanje</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kreditni limit (€)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Maksimalni iznos kredita</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Otkaži
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {company ? "Sačuvaj izmene" : "Dodaj firmu"}
          </Button>
        </div>
      </div>
    </div>
  )
}