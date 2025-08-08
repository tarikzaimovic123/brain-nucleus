"use client"

import { useState } from "react"
import { X, Users, Mail, Phone, Building2, Edit, Trash2, Download, Share2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import type { ContactPerson } from "@/types/contacts"

interface ViewContactBladeProps {
  contact: ContactPerson
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewContactBlade({ contact, onClose, onEdit, onDelete }: ViewContactBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{contact.first_name} {contact.last_name}</h2>
            <p className="text-sm text-muted-foreground">
              {contact.position || "Kontakt osoba"}
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
            {contact.is_primary && (
              <Badge className="bg-green-100 text-green-800">
                <Star className="h-3 w-3 mr-1" />
                Primarni kontakt
              </Badge>
            )}
            {contact.company && (
              <Badge variant="outline">
                <Building2 className="h-3 w-3 mr-1" />
                {contact.company.name}
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Pregled</TabsTrigger>
              <TabsTrigger value="communication">Komunikacija</TabsTrigger>
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
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ime i prezime</p>
                      <p className="text-sm text-muted-foreground">{contact.first_name} {contact.last_name}</p>
                    </div>
                  </div>
                  
                  {contact.position && (
                    <div className="flex items-start gap-3">
                      <Star className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Pozicija</p>
                        <p className="text-sm text-muted-foreground">{contact.position}</p>
                      </div>
                    </div>
                  )}

                  {contact.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Firma</p>
                        <p className="text-sm text-muted-foreground">{contact.company.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Kontakt informacije</h3>
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Email</p>
                        <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Telefon</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    </div>
                  )}

                  {contact.mobile && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Mobilni</p>
                        <p className="text-sm text-muted-foreground">{contact.mobile}</p>
                      </div>
                    </div>
                  )}

                  {!contact.email && !contact.phone && !contact.mobile && (
                    <p className="text-sm text-muted-foreground">Nema kontakt informacija</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Meta Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Dodatne informacije</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.is_primary ? 'Primarni kontakt' : 'Dodatni kontakt'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Datum kreiranja</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.created_at ? format(new Date(contact.created_at), 'dd.MM.yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  {contact.updated_at && (
                    <div>
                      <p className="text-sm font-medium">Poslednja izmena</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(contact.updated_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-6 mt-0">
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nema istorije komunikacije</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Pošalji email
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 mt-0">
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nema skorašnje aktivnosti</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}