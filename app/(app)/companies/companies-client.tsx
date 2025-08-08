'use client'

import { useState, useEffect } from 'react'
import { Plus, Building2, FileText, Download, Upload, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ViewCompanyBlade } from '@/components/companies/view-company-blade'
import { EditCompanyBlade } from '@/components/companies/edit-company-blade'
import { DataGrid, type DataGridColumn } from '@/components/shared/data-grid'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types/database'
import { format } from 'date-fns'
import { useBladeStack } from '@/lib/contexts/blade-stack-context'
import { usePermissionContext, PermissionGuard } from '@/lib/contexts/permission-context'

export function CompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const { openBlade } = useBladeStack()
  const { withPermissionCheck, loading: permissionsLoading } = usePermissionContext()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCompanies(data)
    }
    setLoading(false)
  }

  const handleEdit = withPermissionCheck('companies', 'update', (company: Company) => {
    openBlade(EditCompanyBlade, {
      company: company,
      onClose: () => {},
      onSuccess: () => {
        fetchCompanies()
      }
    }, { width: 'lg' })
  }, 'ažuriranje firme')

  const handleDelete = withPermissionCheck('companies', 'delete', async (company: Company) => {
    if (!confirm(`Da li ste sigurni da želite obrisati kompaniju "${company.name}"?`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', company.id)

    if (!error) {
      fetchCompanies()
    }
  }, 'brisanje firme')

  const handleView = (company: Company) => {
    openBlade(ViewCompanyBlade, {
      company: company,
      onClose: () => {},
      onEdit: () => {
        openBlade(EditCompanyBlade, {
          company: company,
          onClose: () => {},
          onSuccess: () => {
            fetchCompanies()
          }
        }, { width: 'lg' })
      },
      onDelete: async () => {
        await handleDelete(company)
      }
    }, { width: 'lg' })
  }

  const columns: DataGridColumn<Company>[] = [
    {
      key: 'name',
      header: 'Naziv kompanije',
      sortable: true,
      accessor: (company) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{company.name}</div>
            {company.email && (
              <div className="text-xs text-muted-foreground">{company.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'tax_number',
      header: 'PIB',
      sortable: true,
      accessor: (company) => (
        <span className="font-mono text-sm">{company.tax_number || '-'}</span>
      ),
    },
    {
      key: 'vat_number',
      header: 'PDV broj',
      sortable: true,
      accessor: (company) => (
        <span className="font-mono text-sm">{company.vat_number || '-'}</span>
      ),
    },
    {
      key: 'city',
      header: 'Grad',
      sortable: true,
      accessor: (company) => company.city || '-',
    },
    {
      key: 'phone',
      header: 'Telefon',
      accessor: (company) => company.phone || '-',
    },
    {
      key: 'credit_limit',
      header: 'Kreditni limit',
      sortable: true,
      align: 'right',
      accessor: (company) => (
        <span className="font-medium">
          {company.credit_limit 
            ? `€${company.credit_limit.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '-'
          }
        </span>
      ),
    },
    {
      key: 'payment_terms',
      header: 'Rok plaćanja',
      sortable: true,
      align: 'center',
      accessor: (company) => (
        <Badge variant="outline" className="font-mono">
          {company.payment_terms || 30} dana
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      align: 'center',
      accessor: (company) => (
        <Badge 
          variant={company.is_active ? 'default' : 'secondary'}
          className={company.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
        >
          {company.is_active ? 'Aktivna' : 'Neaktivna'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Datum kreiranja',
      sortable: true,
      accessor: (company) => (
        <span className="text-sm text-muted-foreground">
          {company.created_at ? format(new Date(company.created_at), 'dd.MM.yyyy') : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Firme</h1>
          <p className="text-sm text-muted-foreground">
            Upravljanje kompanijama i poslovnim partnerima
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
          <PermissionGuard resource="companies" action="create">
            <Button 
              onClick={withPermissionCheck('companies', 'create', () => {
                openBlade(EditCompanyBlade, {
                  company: null,
                  onClose: () => {},
                  onSuccess: () => {
                    fetchCompanies()
                  }
                }, { width: 'lg' })
              }, 'kreiranje firme')}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova firma
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ukupno firmi</p>
              <p className="text-2xl font-semibold">{companies.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktivne</p>
              <p className="text-2xl font-semibold">
                {companies.filter(c => c.is_active).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sa PDV brojem</p>
              <p className="text-2xl font-semibold">
                {companies.filter(c => c.vat_number).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Iz Podgorice</p>
              <p className="text-2xl font-semibold">
                {companies.filter(c => c.city === 'Podgorica').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Grid */}
      <Card className="p-0">
        <DataGrid
          data={companies}
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
          emptyMessage="Nema pronađenih firmi"
        />
      </Card>
    </div>
  )
}