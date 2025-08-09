"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Save, Loader2, Users, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SimpleCombobox } from "@/components/ui/simple-combobox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { usePermissionContext } from "@/lib/contexts/permission-context"
import type { ContactPerson, ContactPersonFormData } from "@/types/contacts"

const contactSchema = z.object({
  company_id: z.string()
    .min(1, "Firma je obavezna - kontakt mora biti vezan za firmu"),
  first_name: z.string()
    .min(1, "Ime je obavezno")
    .min(2, "Ime mora imati najmanje 2 karaktera")
    .max(50, "Ime ne može imati više od 50 karaktera"),
  last_name: z.string()
    .min(1, "Prezime je obavezno")
    .min(2, "Prezime mora imati najmanje 2 karaktera")
    .max(50, "Prezime ne može imati više od 50 karaktera"),
  position: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, {
      message: "Pozicija mora imati najmanje 2 karaktera"
    }),
  email: z.string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Email adresa nije validna"
    }),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
      message: "Telefon može sadržati samo brojeve, razmake i specijalne karaktere (+ - ( ))"
    }),
  mobile: z.string()
    .optional()
    .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
      message: "Mobilni telefon može sadržati samo brojeve, razmake i specijalne karaktere (+ - ( ))"
    }),
  is_primary: z.boolean()
})

interface EditContactBladeProps {
  contact: ContactPerson | null | any // any for new contact with pre-filled company_id
  onClose: () => void
  onSuccess: () => void
}

interface Company {
  id: string
  name: string
  tax_number?: string
}

export function EditContactBlade({ contact, onClose, onSuccess }: EditContactBladeProps) {
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const { toast } = useToast()
  const { checkPermissionWithToast } = usePermissionContext()
  const isEditMode = !!contact?.id // Check for id to determine if editing

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ContactPersonFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      company_id: contact?.company_id || "",
      first_name: contact?.first_name || "",
      last_name: contact?.last_name || "",
      position: contact?.position || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      mobile: contact?.mobile || "",
      is_primary: contact?.is_primary || false,
    }
  })

  const watchCompanyId = watch("company_id")
  const watchIsPrimary = watch("is_primary")

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (!error && data) {
      setCompanies(data)
    }
  }

  const onSubmit = async (data: ContactPersonFormData) => {
    // Check permission before processing
    const action = isEditMode ? 'update' : 'create'
    const actionName = isEditMode ? 'ažuriranje kontakta' : 'kreiranje kontakta'
    
    if (!checkPermissionWithToast('contacts', action, actionName)) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Check if making this contact primary when there's already a primary contact
    if (data.is_primary && (!isEditMode || !contact?.is_primary)) {
      const { data: existingPrimary } = await supabase
        .from('contact_persons')
        .select('id')
        .eq('company_id', data.company_id)
        .eq('is_primary', true)
        .single()

      if (existingPrimary) {
        // Update existing primary contact to not be primary
        await supabase
          .from('contact_persons')
          .update({ is_primary: false })
          .eq('id', existingPrimary.id)
      }
    }

    try {
      if (isEditMode && contact) {
        const { error } = await supabase
          .from('contact_persons')
          .update({
            company_id: data.company_id,
            first_name: data.first_name,
            last_name: data.last_name,
            position: data.position || null,
            email: data.email || null,
            phone: data.phone || null,
            mobile: data.mobile || null,
            is_primary: data.is_primary,
          })
          .eq('id', contact.id)

        if (error) throw error

        toast({
          title: "Uspeh",
          description: "Kontakt je uspešno ažuriran",
        })
      } else {
        const { error } = await supabase
          .from('contact_persons')
          .insert({
            company_id: data.company_id,
            first_name: data.first_name,
            last_name: data.last_name,
            position: data.position || null,
            email: data.email || null,
            phone: data.phone || null,
            mobile: data.mobile || null,
            is_primary: data.is_primary,
          })

        if (error) throw error

        toast({
          title: "Uspeh",
          description: "Kontakt je uspešno kreiran",
        })
      }

      onSuccess()
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom čuvanja kontakta",
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
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditMode ? "Izmeni kontakt" : "Novi kontakt"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? "Izmeni podatke o kontakt osobi" : "Dodaj novu kontakt osobu"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <div className="flex-1">
          <div className="space-y-6 p-6">
          {/* Company Selection */}
          <div>
            <Label htmlFor="company_id" className="text-sm font-medium">
              Firma *
            </Label>
            <SimpleCombobox
              options={companies.map((company) => ({
                value: company.id,
                label: company.name,
                sublabel: company.tax_number ? `PIB: ${company.tax_number}` : undefined
              }))}
              value={watchCompanyId}
              onValueChange={(value) => setValue("company_id", value)}
              placeholder="Izaberite firmu"
              searchPlaceholder="Pretražite firme..."
              emptyText="Nema pronađenih firmi"
              className="mt-1.5"
            />
            {errors.company_id && (
              <p className="mt-1 text-xs text-red-500">{errors.company_id.message}</p>
            )}
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Lični podaci</h3>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name" className="text-sm font-medium">
                    Ime *
                  </Label>
                  <Input
                    id="first_name"
                    {...register("first_name")}
                    placeholder="npr. Marko"
                    className="mt-1.5"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name" className="text-sm font-medium">
                    Prezime *
                  </Label>
                  <Input
                    id="last_name"
                    {...register("last_name")}
                    placeholder="npr. Marković"
                    className="mt-1.5"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="position" className="text-sm font-medium">
                  Pozicija
                </Label>
                <Input
                  id="position"
                  {...register("position")}
                  placeholder="npr. Direktor prodaje"
                  className="mt-1.5"
                />
                {errors.position && (
                  <p className="mt-1 text-xs text-red-500">{errors.position.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Kontakt informacije</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email adresa
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="npr. marko@firma.com"
                  className="mt-1.5"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="npr. 020 123 456"
                    className="mt-1.5"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="mobile" className="text-sm font-medium">
                    Mobilni telefon
                  </Label>
                  <Input
                    id="mobile"
                    {...register("mobile")}
                    placeholder="npr. 069 123 456"
                    className="mt-1.5"
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-xs text-red-500">{errors.mobile.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Podešavanja</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_primary" className="text-sm font-medium">
                  Primarni kontakt
                </Label>
                <p className="text-xs text-muted-foreground">
                  Označiti kao glavnu kontakt osobu za ovu firmu
                </p>
              </div>
              <Switch
                id="is_primary"
                checked={watchIsPrimary}
                onCheckedChange={(checked) => setValue("is_primary", checked)}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Otkaži
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Čuvanje...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? "Sačuvaj izmene" : "Kreiraj kontakt"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}