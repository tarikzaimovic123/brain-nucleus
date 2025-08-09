"use client"

import { useState } from "react"
import { X, ScrollText, Calendar, User, Activity, Database, Globe, Clock, FileJson, GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
import { sr } from "date-fns/locale"

interface AuditLog {
  id: string
  table_name: string
  record_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
  new_data: any
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface ViewAuditBladeProps {
  audit: AuditLog
  onClose: () => void
}

export function ViewAuditBlade({ audit, onClose }: ViewAuditBladeProps) {
  const [activeTab, setActiveTab] = useState("changes")

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      'companies': 'Firme',
      'contacts': 'Kontakti',
      'products': 'Artikli',
      'quotes': 'Ponude',
      'work_orders': 'Radni nalozi',
      'invoices': 'Fakture',
      'users': 'Korisnici',
      'work_order_items': 'Stavke radnog naloga',
      'quote_items': 'Stavke ponude',
      'invoice_items': 'Stavke fakture'
    }
    return tableNames[tableName] || tableName
  }

  const getActionDisplayName = (action: string) => {
    const actions: Record<string, string> = {
      'INSERT': 'Kreiranje',
      'UPDATE': 'Izmena',
      'DELETE': 'Brisanje'
    }
    return actions[action] || action
  }

  const renderFieldChange = (fieldName: string, oldValue: any, newValue: any) => {
    const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue)
    
    // Format dates
    if (fieldName.includes('_at') || fieldName.includes('date')) {
      if (oldValue) oldValue = format(parseISO(oldValue), 'dd.MM.yyyy HH:mm:ss', { locale: sr })
      if (newValue) newValue = format(parseISO(newValue), 'dd.MM.yyyy HH:mm:ss', { locale: sr })
    }
    
    // Format booleans
    if (typeof oldValue === 'boolean') oldValue = oldValue ? 'Da' : 'Ne'
    if (typeof newValue === 'boolean') newValue = newValue ? 'Da' : 'Ne'
    
    // Format null values
    if (oldValue === null) oldValue = '-'
    if (newValue === null) newValue = '-'
    
    return (
      <div className={cn("p-3 rounded-lg border", hasChanged && "bg-yellow-50 border-yellow-200")}>
        <div className="font-medium text-sm mb-1">{fieldName}</div>
        {audit.action === 'UPDATE' && hasChanged ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-600">Staro:</span>
              <span className="text-red-600 font-mono">{JSON.stringify(oldValue)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">Novo:</span>
              <span className="text-green-600 font-mono">{JSON.stringify(newValue)}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground font-mono">
            {JSON.stringify(oldValue || newValue)}
          </div>
        )}
      </div>
    )
  }

  const renderChanges = () => {
    const oldData = audit.old_data || {}
    const newData = audit.new_data || {}
    
    // Get all unique keys
    const allKeys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])]
    
    // Filter out system fields
    const filteredKeys = allKeys.filter(key => 
      !['id', 'created_at', 'updated_at'].includes(key)
    )
    
    // Separate changed and unchanged fields
    const changedFields = filteredKeys.filter(key => 
      JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
    )
    const unchangedFields = filteredKeys.filter(key => 
      JSON.stringify(oldData[key]) === JSON.stringify(newData[key])
    )
    
    if (audit.action === 'INSERT') {
      return (
        <div className="space-y-3">
          <h3 className="font-medium text-green-600 mb-2">Novi zapis kreiran:</h3>
          {filteredKeys.map(key => (
            <div key={key} className="p-3 rounded-lg border bg-green-50 border-green-200">
              <div className="font-medium text-sm mb-1">{key}</div>
              <div className="text-sm font-mono">{JSON.stringify(newData[key])}</div>
            </div>
          ))}
        </div>
      )
    }
    
    if (audit.action === 'DELETE') {
      return (
        <div className="space-y-3">
          <h3 className="font-medium text-red-600 mb-2">Obrisan zapis:</h3>
          {filteredKeys.map(key => (
            <div key={key} className="p-3 rounded-lg border bg-red-50 border-red-200">
              <div className="font-medium text-sm mb-1">{key}</div>
              <div className="text-sm font-mono">{JSON.stringify(oldData[key])}</div>
            </div>
          ))}
        </div>
      )
    }
    
    return (
      <div className="space-y-4">
        {changedFields.length > 0 && (
          <div>
            <h3 className="font-medium text-blue-600 mb-3">Izmenjeni podaci:</h3>
            <div className="space-y-3">
              {changedFields.map(key => 
                renderFieldChange(key, oldData[key], newData[key])
              )}
            </div>
          </div>
        )}
        
        {unchangedFields.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-600 mb-3">Neizmenjeni podaci:</h3>
            <div className="space-y-3">
              {unchangedFields.map(key => 
                renderFieldChange(key, oldData[key], newData[key])
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ScrollText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Audit Log Detalji</h2>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {audit.id.substring(0, 8)}...
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium mb-4">Osnovne informacije</h3>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Datum i vreme</span>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">
                    {format(parseISO(audit.created_at), 'dd.MM.yyyy', { locale: sr })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(audit.created_at), 'HH:mm:ss')}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Korisnik</span>
                </div>
                <div className="font-medium">
                  {audit.user_email || 'Sistem'}
                </div>
                {audit.user_id && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ID: {audit.user_id.substring(0, 8)}...
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Akcija</span>
                </div>
                <Badge className={cn("mt-1", getActionColor(audit.action))}>
                  {getActionDisplayName(audit.action)}
                </Badge>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tabela</span>
                </div>
                <div className="font-medium">
                  {getTableDisplayName(audit.table_name)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {audit.table_name}
                </div>
              </Card>
            </div>
          </div>

          {/* Additional Info */}
          {(audit.record_id || audit.ip_address || audit.user_agent) && (
            <div>
              <h3 className="text-sm font-medium mb-4">Dodatne informacije</h3>
              <Card className="p-4 space-y-3">
                {audit.record_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID Zapisa:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {audit.record_id}
                    </code>
                  </div>
                )}
                {audit.ip_address && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">IP Adresa:</span>
                    <span className="text-sm font-medium">{audit.ip_address}</span>
                  </div>
                )}
                {audit.user_agent && (
                  <div>
                    <span className="text-sm text-muted-foreground">User Agent:</span>
                    <div className="text-xs mt-1 p-2 bg-muted rounded font-mono break-all">
                      {audit.user_agent}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          <Separator />

          {/* Data Changes Tabs */}
          <div>
            <h3 className="text-sm font-medium mb-4">Promene podataka</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="changes" className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Promene
                </TabsTrigger>
                <TabsTrigger value="old" className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Stari podaci
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  Novi podaci
                </TabsTrigger>
              </TabsList>

              <TabsContent value="changes" className="mt-4">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {renderChanges()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="old" className="mt-4">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {audit.old_data ? (
                    <pre className="text-xs font-mono">
                      {JSON.stringify(audit.old_data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      Nema starih podataka
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="new" className="mt-4">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {audit.new_data ? (
                    <pre className="text-xs font-mono">
                      {JSON.stringify(audit.new_data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      Nema novih podataka
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}