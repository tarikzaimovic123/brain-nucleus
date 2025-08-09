"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Save, Loader2, Users, Shield, Mail, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { usePermissionContext } from "@/lib/contexts/permission-context"

const createUserSchema = (isEditMode: boolean) => z.object({
  email: z.string().email("Email nije valjan"),
  full_name: z.string().min(1, "Ime je obavezno"),
  phone: z.string().optional(),
  is_active: z.boolean(),
  password: isEditMode 
    ? z.string()
        .refine((val) => !val || val.length >= 6, {
          message: "Lozinka mora imati najmanje 6 karaktera"
        })
        .optional()
    : z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  roles: z.array(z.string()).min(1, "Mora biti dodeljena najmanje jedna uloga")
})

type UserFormData = z.infer<ReturnType<typeof createUserSchema>>

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

interface EditUserBladeProps {
  user: UserProfile | null
  onClose: () => void
  onSave: () => void
}

export function EditUserBlade({ user, onClose, onSave }: EditUserBladeProps) {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const { toast } = useToast()
  const { checkPermissionWithToast } = usePermissionContext()

  const isEditMode = user !== null

  const userSchema = createUserSchema(isEditMode)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || "",
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      is_active: user?.is_active ?? true,
      password: "",
      roles: user?.roles?.map(r => r.id) || []
    }
  })

  const watchedRoles = watch("roles")

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (!error && data) {
      setRoles(data)
    }
  }

  const onSubmit = async (data: UserFormData) => {
    // Check permission before processing
    const action = isEditMode ? 'update' : 'create'
    const actionName = isEditMode ? 'ažuriranje korisnika' : 'kreiranje korisnika'
    
    if (!checkPermissionWithToast('users', action, actionName)) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      if (isEditMode && user) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: data.full_name,
            phone: data.phone || null,
            is_active: data.is_active,
            email: data.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (profileError) throw profileError

        // Update roles - first delete existing
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)

        // Then insert new roles
        if (data.roles.length > 0) {
          const roleInserts = data.roles.map(roleId => ({
            user_id: user.id,
            role_id: roleId
          }))

          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(roleInserts)

          if (rolesError) throw rolesError
        }

        // Update password if provided (and not empty)
        if (data.password && data.password.trim().length > 0) {
          console.log('Updating password for user:', user.id)
          
          // Get current session for auth
          const { data: { session } } = await supabase.auth.getSession()
          
          // Use API route that has service role access
          const response = await fetch(`/api/users/${user.id}/update-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({ password: data.password })
          })

          const result = await response.json()
          console.log('Password update response:', result)

          if (!response.ok) {
            console.error('Error updating password:', result)
            toast({
              title: "Greška pri promeni lozinke",
              description: result.error || "Lozinka nije ažurirana",
              variant: "destructive"
            })
            throw new Error('Password update failed')
          } else {
            console.log('Password updated successfully')
          }
        }

        toast({
          title: "Uspeh",
          description: "Korisnik je uspešno ažuriran"
        })
      } else {
        // Save current session before creating new user
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        // Create new user using sign up (since admin API requires service role)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password || Math.random().toString(36).slice(-8),
          options: {
            data: {
              full_name: data.full_name,
              phone: data.phone
            }
          }
        })

        if (authError) throw authError
        
        // Restore original session to prevent auto-login as new user
        if (currentSession) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
          })
        }

        if (authData.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email: data.email,
              full_name: data.full_name,
              phone: data.phone || null,
              is_active: data.is_active
            })

          if (profileError) {
            // Profile might be created by trigger, so update instead
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                email: data.email,
                full_name: data.full_name,
                phone: data.phone || null,
                is_active: data.is_active
              })
              .eq('id', authData.user.id)
            
            if (updateError) throw updateError
          }

          // Assign roles
          if (data.roles.length > 0) {
            const roleInserts = data.roles.map(roleId => ({
              user_id: authData.user!.id,
              role_id: roleId
            }))

            const { error: rolesError } = await supabase
              .from('user_roles')
              .insert(roleInserts)

            if (rolesError) throw rolesError
          }

          // Send invitation email
          toast({
            title: "Uspeh",
            description: `Korisnik je kreiran. Email za potvrdu je poslat na ${data.email}`
          })
        }

        toast({
          title: "Uspeh",
          description: "Korisnik je uspešno kreiran"
        })
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving user:', error)
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške prilikom čuvanja korisnika",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId: string) => {
    const currentRoles = watchedRoles || []
    if (currentRoles.includes(roleId)) {
      setValue('roles', currentRoles.filter(r => r !== roleId))
    } else {
      setValue('roles', [...currentRoles, roleId])
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin': return 'text-red-600'
      case 'admin': return 'text-purple-600'
      case 'manager': return 'text-blue-600'
      case 'employee': return 'text-green-600'
      case 'viewer': return 'text-gray-600'
      default: return 'text-gray-600'
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
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditMode ? `Uredi korisnika` : 'Novi korisnik'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'Ažuriraj podatke korisnika' : 'Kreiraj novog korisnika'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Osnovni podaci
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  disabled={isEditMode}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Ime i prezime <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {isEditMode ? 'Nova lozinka (opciono)' : 'Lozinka'}
                  {!isEditMode && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder={isEditMode ? "Ostavite prazno da zadržite postojeću" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="is_active"
                checked={watch("is_active")}
                onCheckedChange={(checked) => setValue("is_active", checked)}
              />
              <Label htmlFor="is_active">Aktivan korisnik</Label>
            </div>
          </Card>

          {/* Roles */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Uloge <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={watchedRoles?.includes(role.id) || false}
                    onCheckedChange={() => handleRoleToggle(role.id)}
                  />
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getRoleBadgeColor(role.name)}`}>
                        {getRoleDisplayName(role.name)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </Label>
                </div>
              ))}
            </div>
            {errors.roles && (
              <p className="text-sm text-red-600 mt-2">{errors.roles.message}</p>
            )}
          </Card>
        </form>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Otkaži
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? 'Ažuriraj' : 'Kreiraj'}
          </Button>
        </div>
      </div>
    </div>
  )
}