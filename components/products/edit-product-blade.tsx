"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Save, Loader2, Package, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Product, ProductFormData, ProductCategory } from "@/types/products"
import { usePermissionContext } from "@/lib/contexts/permission-context"

const productSchema = z.object({
  code: z.string()
    .min(1, "Šifra je obavezna")
    .min(2, "Šifra mora imati najmanje 2 karaktera")
    .max(50, "Šifra ne može imati više od 50 karaktera"),
  name: z.string()
    .min(1, "Naziv je obavezan")
    .min(2, "Naziv mora imati najmanje 2 karaktera")
    .max(100, "Naziv ne može imati više od 100 karaktera"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit_of_measure: z.string()
    .min(1, "Jedinica mere je obavezna"),
  purchase_price: z.number()
    .min(0, "Nabavna cena ne može biti negativna")
    .optional()
    .nullable(),
  selling_price: z.number()
    .min(0, "Prodajna cena ne može biti negativna")
    .optional()
    .nullable(),
  vat_rate: z.number()
    .min(0, "PDV stopa ne može biti negativna")
    .max(100, "PDV stopa ne može biti veća od 100%"),
  stock_quantity: z.number()
    .min(0, "Količina ne može biti negativna"),
  minimum_stock: z.number()
    .min(0, "Minimalna količina ne može biti negativna"),
  is_service: z.boolean(),
  is_active: z.boolean(),
  paper_type: z.string().optional(),
  paper_weight: z.number().optional().nullable(),
  paper_format: z.string().optional(),
})

interface EditProductBladeProps {
  product: Product | null
  onClose: () => void
  onSuccess: () => void
}

export function EditProductBlade({ product, onClose, onSuccess }: EditProductBladeProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const { toast } = useToast()
  const { checkPermissionWithToast } = usePermissionContext()
  const isEditMode = !!product

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: product?.code || "",
      name: product?.name || "",
      description: product?.description || "",
      category_id: product?.category_id || "",
      unit_of_measure: product?.unit_of_measure || "kom",
      purchase_price: product?.purchase_price || 0,
      selling_price: product?.selling_price || 0,
      vat_rate: product?.vat_rate || 21,
      stock_quantity: product?.stock_quantity || 0,
      minimum_stock: product?.minimum_stock || 0,
      is_service: product?.is_service || false,
      is_active: product?.is_active ?? true,
      paper_type: product?.paper_type || "",
      paper_weight: product?.paper_weight || undefined,
      paper_format: product?.paper_format || "",
    }
  })

  const watchIsService = watch("is_service")
  const watchCategoryId = watch("category_id")
  const watchIsActive = watch("is_active")

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('display_order')

    if (!error && data) {
      setCategories(data)
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    // Check permissions before proceeding
    const requiredAction = isEditMode ? 'update' : 'create'
    const actionName = isEditMode ? 'ažuriranje artikla' : 'kreiranje artikla'
    
    if (!checkPermissionWithToast('products', requiredAction, actionName)) {
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Clean up data
    const cleanData = {
      ...data,
      category_id: data.category_id || null,
      description: data.description || null,
      purchase_price: data.purchase_price || null,
      selling_price: data.selling_price || null,
      paper_type: data.paper_type || null,
      paper_weight: data.paper_weight || null,
      paper_format: data.paper_format || null,
    }

    try {
      if (isEditMode && product) {
        const { error } = await supabase
          .from('products')
          .update(cleanData)
          .eq('id', product.id)

        if (error) throw error

        toast({
          title: "Uspeh",
          description: "Artikal je uspešno ažuriran",
        })
      } else {
        const { error } = await supabase
          .from('products')
          .insert(cleanData)

        if (error) throw error

        toast({
          title: "Uspeh",
          description: "Artikal je uspešno kreiran",
        })
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving product:', error)
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom čuvanja artikla",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const unitOptions = [
    { value: "kom", label: "Komad (kom)" },
    { value: "kg", label: "Kilogram (kg)" },
    { value: "g", label: "Gram (g)" },
    { value: "l", label: "Litar (l)" },
    { value: "m", label: "Metar (m)" },
    { value: "m2", label: "Kvadratni metar (m²)" },
    { value: "m3", label: "Kubni metar (m³)" },
    { value: "h", label: "Sat (h)" },
    { value: "dan", label: "Dan" },
  ]

  const paperFormats = [
    "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5",
    "SRA3", "320x450", "350x500", "500x700", "700x1000"
  ]

  const paperTypes = [
    "Offset", "Kunzdruk", "Natron", "Karton", "Samoljepljivi", 
    "Fluo", "Reciklirani", "Novinski", "Sjajni", "Mat"
  ]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditMode ? "Izmeni artikal" : "Novi artikal"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? "Izmeni podatke o artiklu" : "Dodaj novi artikal"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
        <div className="space-y-6 p-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Osnovne informacije</h3>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="code" className="text-sm font-medium">
                    Šifra *
                  </Label>
                  <Input
                    id="code"
                    {...register("code")}
                    placeholder="npr. ART-001"
                    className="mt-1.5 font-mono"
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Naziv *
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="npr. Offset štampa A4"
                    className="mt-1.5"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Opis
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Detaljni opis artikla..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category_id" className="text-sm font-medium">
                    Kategorija
                  </Label>
                  <Select
                    value={watchCategoryId || "none"}
                    onValueChange={(value) => setValue("category_id", value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Izaberite kategoriju" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez kategorije</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unit_of_measure" className="text-sm font-medium">
                    Jedinica mere *
                  </Label>
                  <Select
                    value={watch("unit_of_measure")}
                    onValueChange={(value) => setValue("unit_of_measure", value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unit_of_measure && (
                    <p className="mt-1 text-xs text-red-500">{errors.unit_of_measure.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Cene i porezi</h3>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="purchase_price" className="text-sm font-medium">
                    Nabavna cena (€)
                  </Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    {...register("purchase_price", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                  {errors.purchase_price && (
                    <p className="mt-1 text-xs text-red-500">{errors.purchase_price.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="selling_price" className="text-sm font-medium">
                    Prodajna cena (€)
                  </Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    {...register("selling_price", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                  {errors.selling_price && (
                    <p className="mt-1 text-xs text-red-500">{errors.selling_price.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vat_rate" className="text-sm font-medium">
                    PDV stopa (%) *
                  </Label>
                  <Input
                    id="vat_rate"
                    type="number"
                    step="0.01"
                    {...register("vat_rate", { valueAsNumber: true })}
                    placeholder="21"
                    className="mt-1.5"
                  />
                  {errors.vat_rate && (
                    <p className="mt-1 text-xs text-red-500">{errors.vat_rate.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Inventory */}
          {!watchIsService && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Zalihe</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="stock_quantity" className="text-sm font-medium">
                      Trenutno stanje *
                    </Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      step="0.01"
                      {...register("stock_quantity", { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1.5"
                    />
                    {errors.stock_quantity && (
                      <p className="mt-1 text-xs text-red-500">{errors.stock_quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="minimum_stock" className="text-sm font-medium">
                      Minimalno stanje *
                    </Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      step="0.01"
                      {...register("minimum_stock", { valueAsNumber: true })}
                      placeholder="0"
                      className="mt-1.5"
                    />
                    {errors.minimum_stock && (
                      <p className="mt-1 text-xs text-red-500">{errors.minimum_stock.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Paper Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Informacije o papiru (opciono)</h3>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="paper_type" className="text-sm font-medium">
                    Tip papira
                  </Label>
                  <Select
                    value={watch("paper_type") || "none"}
                    onValueChange={(value) => setValue("paper_type", value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Izaberite tip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez tipa</SelectItem>
                      {paperTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paper_weight" className="text-sm font-medium">
                    Gramatura (g/m²)
                  </Label>
                  <Input
                    id="paper_weight"
                    type="number"
                    {...register("paper_weight", { valueAsNumber: true })}
                    placeholder="npr. 80"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="paper_format" className="text-sm font-medium">
                    Format
                  </Label>
                  <Select
                    value={watch("paper_format") || "none"}
                    onValueChange={(value) => setValue("paper_format", value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Izaberite format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez formata</SelectItem>
                      {paperFormats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Podešavanja</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_service" className="text-sm font-medium">
                    Usluga
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Označiti ako je artikal usluga (nema zalihe)
                  </p>
                </div>
                <Switch
                  id="is_service"
                  checked={watchIsService}
                  onCheckedChange={(checked) => {
                    setValue("is_service", checked)
                    if (checked) {
                      setValue("stock_quantity", 0)
                      setValue("minimum_stock", 0)
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="text-sm font-medium">
                    Aktivan
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Neaktivni artikli se ne prikazuju u prodaji
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={watchIsActive}
                  onCheckedChange={(checked) => setValue("is_active", checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
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
                  {isEditMode ? "Sačuvaj izmene" : "Kreiraj artikal"}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}