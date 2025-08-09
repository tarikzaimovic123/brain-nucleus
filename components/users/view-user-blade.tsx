"use client"

import { useState } from "react"
import { X, Edit, Trash2, Shield, Users, Mail, Phone, Calendar, CheckCircle, XCircle, Key, Clock, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { format, parseISO } from "date-fns"
import { sr } from "date-fns/locale"
import { usePermissionContext, PermissionGuard } from "@/lib/contexts/permission-context"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  roles?: Role[]
}

interface Role {
  id: string
  name: string
  description: string | null
}

interface ViewUserBladeProps {
  user: UserProfile
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewUserBlade({ user, onClose, onEdit, onDelete }: ViewUserBladeProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const { withPermissionCheck } = usePermissionContext()

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'employee': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'manager': return 'Menadžer'
      case 'employee': return 'Zaposleni'
      case 'viewer': return 'Pregledač'
      default: return roleName
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
            <h2 className="text-lg font-semibold">{user.full_name || 'Nepoznat korisnik'}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard resource="users" action="update">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={withPermissionCheck('users', 'update', onEdit, 'ažuriranje korisnika')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Uredi
            </Button>
          </PermissionGuard>
          <PermissionGuard resource="users" action="delete">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={withPermissionCheck('users', 'delete', onDelete, 'brisanje korisnika')}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Obriši
            </Button>
          </PermissionGuard>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b px-6">
            <TabsList className="h-12 bg-transparent p-0 rounded-none">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Pregled
              </TabsTrigger>
              <TabsTrigger 
                value="permissions" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Dozvole
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                Aktivnost
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6">
            {/* User Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Status korisnika</h3>
                <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  <div className="flex items-center gap-1">
                    {user.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {user.is_active ? 'Aktivan' : 'Neaktivan'}
                  </div>
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Kreiran: {format(parseISO(user.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Ažuriran: {format(parseISO(user.updated_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                  </span>
                </div>
              </div>
            </Card>

            {/* User Roles */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Dodeljene uloge
                </h3>
              </div>
              {user.roles && user.roles.length > 0 ? (
                <div className="space-y-3">
                  {user.roles.map((role, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(role.name)}>
                          {getRoleDisplayName(role.name)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {role.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nema dodeljenih uloga</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="p-6 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Key className="h-5 w-5" />
                Dozvole korisnika
              </h3>
              <div className="space-y-4">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role, idx) => (
                    <div key={idx}>
                      <div className="font-medium mb-2">
                        {getRoleDisplayName(role.name)}
                      </div>
                      <div className="text-sm text-muted-foreground pl-4">
                        {role.name === 'super_admin' && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Puna kontrola sistema</li>
                            <li>Upravljanje korisnicima</li>
                            <li>Pristup svim modulima</li>
                            <li>Konfiguracija sistema</li>
                          </ul>
                        )}
                        {role.name === 'admin' && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Upravljanje korisnicima</li>
                            <li>Pristup svim modulima</li>
                            <li>Kreiranje i brisanje podataka</li>
                          </ul>
                        )}
                        {role.name === 'manager' && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Upravljanje timom</li>
                            <li>Pregled izveštaja</li>
                            <li>Odobravanje dokumenata</li>
                          </ul>
                        )}
                        {role.name === 'employee' && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Kreiranje dokumenata</li>
                            <li>Ažuriranje podataka</li>
                            <li>Pregled dodeljenih zadataka</li>
                          </ul>
                        )}
                        {role.name === 'viewer' && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Pregled podataka</li>
                            <li>Izvoz izveštaja</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Korisnik nema dodeljene uloge</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="p-6 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktivnost korisnika
              </h3>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Praćenje aktivnosti će biti dostupno uskoro</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}