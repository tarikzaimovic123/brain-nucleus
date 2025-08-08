"use client"

import { useState, useEffect } from "react"
import { X, Building2, Mail, Phone, MapPin, CreditCard, Calendar, FileText, Edit, Trash2, Download, Share2, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { DataGrid, type DataGridColumn } from "@/components/shared/data-grid"
import { createClient } from "@/lib/supabase/client"
import { useBladeStack } from "@/lib/contexts/blade-stack-context"
import { EditContactBlade } from "@/components/contacts/edit-contact-blade"
import { usePermissionContext, PermissionGuard } from "@/lib/contexts/permission-context"
import type { Company } from "@/types/database"
import type { ContactPerson } from "@/types/contacts"

interface ViewCompanyBladeProps {
  company: Company
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewCompanyBlade({ company, onClose, onEdit, onDelete }: ViewCompanyBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [contacts, setContacts] = useState<ContactPerson[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const { openBlade } = useBladeStack()
  const { withPermissionCheck } = usePermissionContext()

  useEffect(() => {
    if (activeTab === "contacts") {
      fetchContacts()
    }
  }, [activeTab, company.id])

  const fetchContacts = async () => {
    setLoadingContacts(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contact_persons')
      .select('*')
      .eq('company_id', company.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setContacts(data)
    }
    setLoadingContacts(false)
  }

  const handleDeleteContact = async (contact: ContactPerson) => {
    if (!confirm(`Da li ste sigurni da želite obrisati kontakt "${contact.first_name} ${contact.last_name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('contact_persons')
      .delete()
      .eq('id', contact.id)

    if (!error) {
      fetchContacts()
    }
  }

  const handleAddContact = () => {
    // Create a new contact with pre-filled company_id
    const newContact = {
      company_id: company.id,
      first_name: "",
      last_name: "",
      position: "",
      email: "",
      phone: "",
      mobile: "",
      is_primary: false,
    } as any

    openBlade(
      EditContactBlade,
      {
        contact: newContact,
        onClose: () => {}, // Will be handled by blade stack
        onSuccess: () => {
          fetchContacts()
        }
      },
      {
        label: `Novi kontakt za ${company.name}`,
        width: "lg"
      }
    )
  }

  const handleEditContact = (contact: ContactPerson) => {
    openBlade(
      EditContactBlade,
      {
        contact: contact,
        onClose: () => {}, // Will be handled by blade stack
        onSuccess: () => {
          fetchContacts()
        }
      },
      {
        label: `Izmeni kontakt: ${contact.first_name} ${contact.last_name}`,
        width: "lg"
      }
    )
  }

  const contactColumns: DataGridColumn<ContactPerson>[] = [
    {
      key: 'name',
      header: 'Ime i prezime',
      sortable: true,
      accessor: (contact) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{contact.first_name} {contact.last_name}</div>
            {contact.position && (
              <div className="text-xs text-muted-foreground">{contact.position}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      accessor: (contact) => contact.email ? (
        <a href={`mailto:${contact.email}`} className="text-primary hover:underline flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {contact.email}
        </a>
      ) : '-',
    },
    {
      key: 'phone',
      header: 'Telefon',
      accessor: (contact) => {
        const phones = []
        if (contact.phone) phones.push(contact.phone)
        if (contact.mobile) phones.push(contact.mobile)
        return phones.length > 0 ? (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{phones.join(', ')}</span>
          </div>
        ) : '-'
      },
    },
    {
      key: 'is_primary',
      header: 'Status',
      sortable: true,
      align: 'center',
      accessor: (contact) => contact.is_primary ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Primarni kontakt
        </Badge>
      ) : (
        <Badge variant="outline">
          Dodatni kontakt
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{company.name}</h2>
            <p className="text-sm text-muted-foreground">
              {company.city || "Nepoznat grad"}
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
              variant={company.is_active ? "default" : "secondary"}
              className={company.is_active ? "bg-green-100 text-green-800" : ""}
            >
              {company.is_active ? "Aktivna" : "Neaktivna"}
            </Badge>
            {company.vat_number && (
              <Badge variant="outline">PDV obveznik</Badge>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Pregled</TabsTrigger>
              <TabsTrigger value="contacts">Kontakti</TabsTrigger>
              <TabsTrigger value="details">Detalji</TabsTrigger>
              <TabsTrigger value="documents">Dokumenti</TabsTrigger>
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
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Naziv</p>
                      <p className="text-sm text-muted-foreground">{company.name}</p>
                    </div>
                  </div>
                  
                  {company.tax_number && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">PIB</p>
                        <p className="text-sm text-muted-foreground font-mono">{company.tax_number}</p>
                      </div>
                    </div>
                  )}

                  {company.vat_number && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">PDV broj</p>
                        <p className="text-sm text-muted-foreground font-mono">{company.vat_number}</p>
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
                  {company.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Adresa</p>
                        <p className="text-sm text-muted-foreground">{company.address}</p>
                        {company.city && <p className="text-sm text-muted-foreground">{company.city}, {company.country || "Montenegro"}</p>}
                      </div>
                    </div>
                  )}

                  {company.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Telefon</p>
                        <p className="text-sm text-muted-foreground">{company.phone}</p>
                      </div>
                    </div>
                  )}

                  {company.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{company.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Financial Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Finansijske informacije</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Kreditni limit</p>
                        <p className="text-lg font-semibold">
                          €{company.credit_limit?.toLocaleString('sr-RS', { minimumFractionDigits: 2 }) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Rok plaćanja</p>
                        <p className="text-lg font-semibold">{company.payment_terms || 30} dana</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4 mt-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium">Kontakt osobe</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {contacts.length} {contacts.length === 1 ? 'kontakt' : 'kontakata'} za ovu firmu
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddContact}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj kontakt
                </Button>
              </div>
              
              {contacts.length > 0 ? (
                <Card className="p-0">
                  <DataGrid
                    data={contacts}
                    columns={contactColumns}
                    onEdit={handleEditContact}
                    onDelete={handleDeleteContact}
                    selectable={false}
                    searchable={false}
                    pageSize={10}
                    currentPage={1}
                    onPageChange={() => {}}
                    isLoading={loadingContacts}
                    emptyMessage="Nema kontakata za ovu firmu"
                  />
                </Card>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Nema kontakt osoba za ovu firmu</p>
                  <Button size="sm" variant="outline" onClick={handleAddContact}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj prvi kontakt
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-6 mt-0">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Dodatne informacije</h3>
                <div className="space-y-3">
                  {company.bank_account && (
                    <div>
                      <p className="text-sm font-medium">Žiro račun</p>
                      <p className="text-sm text-muted-foreground font-mono">{company.bank_account}</p>
                    </div>
                  )}
                  {company.website && (
                    <div>
                      <p className="text-sm font-medium">Web sajt</p>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" 
                         className="text-sm text-primary hover:underline">
                        {company.website}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Datum kreiranja</p>
                    <p className="text-sm text-muted-foreground">
                      {company.created_at ? format(new Date(company.created_at), 'dd.MM.yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  {company.updated_at && (
                    <div>
                      <p className="text-sm font-medium">Poslednja izmena</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(company.updated_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 mt-0">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nema povezanih dokumenata</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Dodaj dokument
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 mt-0">
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nema skorašnje aktivnosti</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}