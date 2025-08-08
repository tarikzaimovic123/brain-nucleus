"use client"

import { useState } from "react"
import { X, Package, Edit, Trash2, Download, Share2, BarChart3, AlertCircle, Euro, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import type { Product } from "@/types/products"

interface ViewProductBladeProps {
  product: Product
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewProductBlade({ product, onClose, onEdit, onDelete }: ViewProductBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const isLowStock = !product.is_service && product.stock_quantity <= product.minimum_stock

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              Šifra: {product.code}
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
            <Badge 
              variant={product.is_active ? "default" : "secondary"}
              className={product.is_active ? "bg-green-100 text-green-800" : ""}
            >
              {product.is_active ? "Aktivan" : "Neaktivan"}
            </Badge>
            <Badge variant={product.is_service ? "secondary" : "outline"}>
              {product.is_service ? "Usluga" : "Proizvod"}
            </Badge>
            {isLowStock && (
              <Badge className="bg-orange-100 text-orange-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Niska zaliha
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline">
                {product.category.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
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
              <TabsTrigger value="pricing">Cene</TabsTrigger>
              <TabsTrigger value="inventory">Zalihe</TabsTrigger>
              <TabsTrigger value="activity">Aktivnost</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-4">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Osnovne informacije</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Naziv</p>
                      <p className="text-sm text-muted-foreground">{product.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Šifra</p>
                      <p className="text-sm text-muted-foreground font-mono">{product.code}</p>
                    </div>
                  </div>

                  {product.description && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Opis</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Jedinica mere</p>
                      <p className="text-sm text-muted-foreground">{product.unit_of_measure}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Paper Information (for printing products) */}
              {(product.paper_type || product.paper_weight || product.paper_format) && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Informacije o papiru</h3>
                    <div className="space-y-3">
                      {product.paper_type && (
                        <div>
                          <p className="text-sm font-medium">Tip papira</p>
                          <p className="text-sm text-muted-foreground">{product.paper_type}</p>
                        </div>
                      )}
                      {product.paper_weight && (
                        <div>
                          <p className="text-sm font-medium">Gramatura</p>
                          <p className="text-sm text-muted-foreground">{product.paper_weight} g/m²</p>
                        </div>
                      )}
                      {product.paper_format && (
                        <div>
                          <p className="text-sm font-medium">Format</p>
                          <p className="text-sm text-muted-foreground">{product.paper_format}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Meta Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Dodatne informacije</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Tip artikla</p>
                    <p className="text-sm text-muted-foreground">
                      {product.is_service ? 'Usluga' : 'Proizvod'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {product.is_active ? 'Aktivan' : 'Neaktivan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Datum kreiranja</p>
                    <p className="text-sm text-muted-foreground">
                      {product.created_at ? format(new Date(product.created_at), 'dd.MM.yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  {product.updated_at && (
                    <div>
                      <p className="text-sm font-medium">Poslednja izmena</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(product.updated_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6 mt-0">
              {/* Pricing Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Cene</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nabavna cena</p>
                        <p className="text-lg font-semibold">
                          {product.purchase_price ? `€${product.purchase_price.toFixed(2)}` : '-'}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prodajna cena</p>
                        <p className="text-lg font-semibold">
                          {product.selling_price ? `€${product.selling_price.toFixed(2)}` : '-'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Tax Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Porezi</h3>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">PDV stopa</p>
                      <p className="text-lg font-semibold">{product.vat_rate}%</p>
                    </div>
                    {product.selling_price && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">PDV iznos po jedinici</p>
                        <p className="text-lg font-semibold">
                          €{((product.selling_price * product.vat_rate) / (100 + product.vat_rate)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Margin */}
              {product.purchase_price && product.selling_price && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Marža</h3>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Apsolutna marža</p>
                          <p className="text-lg font-semibold">
                            €{(product.selling_price - product.purchase_price).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Procentualna marža</p>
                          <p className="text-lg font-semibold">
                            {(((product.selling_price - product.purchase_price) / product.purchase_price) * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6 mt-0">
              {product.is_service ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Usluge nemaju zalihe</p>
                </div>
              ) : (
                <>
                  {/* Stock Information */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Stanje zaliha</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Trenutno stanje</p>
                            <p className="text-lg font-semibold">
                              {product.stock_quantity.toFixed(2)} {product.unit_of_measure}
                            </p>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Minimalno stanje</p>
                            <p className="text-lg font-semibold">
                              {product.minimum_stock.toFixed(2)} {product.unit_of_measure}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Stock Value */}
                  {product.selling_price && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Vrednost zaliha</h3>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Po nabavnoj ceni</p>
                              <p className="text-lg font-semibold">
                                €{((product.purchase_price || 0) * product.stock_quantity).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Po prodajnoj ceni</p>
                              <p className="text-lg font-semibold">
                                €{(product.selling_price * product.stock_quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Stock Status */}
                  {isLowStock && (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-orange-50 p-4">
                        <div className="flex gap-3">
                          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-orange-800">Niska zaliha</p>
                            <p className="text-sm text-orange-700 mt-1">
                              Trenutno stanje je ispod minimalnog. Preporučuje se naručivanje.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 mt-0">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nema skorašnje aktivnosti</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}