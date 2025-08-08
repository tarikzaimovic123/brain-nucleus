'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Building2, Phone, Mail, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ViewContactBlade } from '@/components/contacts/view-contact-blade'
import { EditContactBlade } from '@/components/contacts/edit-contact-blade'
import { DataGrid, type DataGridColumn } from '@/components/shared/data-grid'
import { createClient } from '@/lib/supabase/client'
import type { ContactPerson } from '@/types/contacts'
import { format } from 'date-fns'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

export function ContactsClient() {
  const [contacts, setContacts] = useState<ContactPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, loading: permissionsLoading } = usePermissionContext()

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contact_persons')
      .select(`
        *,
        company:companies!company_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setContacts(data as any)
    }
    setLoading(false)
  }

  const handleEdit = withPermissionCheck('contacts', 'update', (contact: ContactPerson) => {
    openBlade(EditContactBlade, {
      contact: contact,
      onClose: () => {},
      onSuccess: () => {
        fetchContacts()
      }
    }, { width: 'lg' })
  }, 'ažuriranje kontakta')

  const handleDelete = withPermissionCheck('contacts', 'delete', async (contact: ContactPerson) => {
    if (!confirm(`Da li ste sigurni da želite obrisati kontakt "${contact.first_name} ${contact.last_name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('contact_persons')
      .delete()
      .eq('id', contact.id)

    if (!error) {
      fetchContacts()
    }
  }, 'brisanje kontakta')

  const handleView = (contact: ContactPerson) => {
    openBlade(ViewContactBlade, {
      contact: contact,
      onClose: () => {},
      onEdit: () => {
        openBlade(EditContactBlade, {
          contact: contact,
          onClose: () => {},
          onSuccess: () => {
            fetchContacts()
          }
        }, { width: 'lg' })
      },
      onDelete: async () => {
        await handleDelete(contact)
      }
    }, { width: 'lg' })
  }

  const columns: DataGridColumn<ContactPerson>[] = [
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
      key: 'company',
      header: 'Firma',
      sortable: true,
      accessor: (contact) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{contact.company?.name || '-'}</span>
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
      key: 'position',
      header: 'Pozicija',
      sortable: true,
      accessor: (contact) => contact.position || '-',
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
    {
      key: 'created_at',
      header: 'Datum kreiranja',
      sortable: true,
      accessor: (contact) => (
        <span className="text-sm text-muted-foreground">
          {contact.created_at ? format(new Date(contact.created_at), 'dd.MM.yyyy') : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kontakti</h1>
          <p className="text-sm text-muted-foreground">
            Upravljanje kontakt osobama klijenata
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Uvezi
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Izvezi
          </Button>
          <PermissionGuard resource="contacts" action="create">
            <Button 
              onClick={withPermissionCheck('contacts', 'create', () => {
                openBlade(EditContactBlade, {
                  contact: null,
                  onClose: () => {},
                  onSuccess: () => {
                    fetchContacts()
                  }
                }, { width: 'lg' })
              }, 'kreiranje kontakta')}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novi kontakt
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ukupno kontakata</p>
              <p className="text-2xl font-semibold">{contacts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primarni kontakti</p>
              <p className="text-2xl font-semibold">
                {contacts.filter(c => c.is_primary).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sa email adresom</p>
              <p className="text-2xl font-semibold">
                {contacts.filter(c => c.email).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sa telefonom</p>
              <p className="text-2xl font-semibold">
                {contacts.filter(c => c.phone || c.mobile).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Grid */}
      <Card className="p-0">
        <DataGrid
          data={contacts}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          selectable={true}
          searchable={true}
          pageSize={25}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isLoading={loading || permissionsLoading}
          emptyMessage="Nema pronađenih kontakata"
        />
      </Card>
    </div>
  )
}