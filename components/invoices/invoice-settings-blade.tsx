"use client"

import { useState, useEffect } from "react"
import { X, Settings, FileText, Euro, Shield, Mail, Save, Loader2, Hash, Calendar, CreditCard, Globe } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useBladeStack } from '@/lib/contexts/blade-stack-context'

interface InvoiceSetting {
  id: string
  setting_key: string
  setting_value: any
  description?: string
  category: string
}

interface InvoiceSettingsBladeProps {
  onClose?: () => void
}

export function InvoiceSettingsBlade({ onClose }: InvoiceSettingsBladeProps) {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("numbering")
  
  const { toast } = useToast()
  const { closeTopBlade } = useBladeStack()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')

      if (error) throw error

      // Convert array to object keyed by setting_key
      const settingsObj: Record<string, any> = {}
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value
      })

      setSettings(settingsObj)
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri učitavanju postavki'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      
      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('invoice_settings')
          .update({ setting_value: value })
          .eq('setting_key', key)

        if (error) throw error
      }

      toast({
        title: 'Uspeh',
        description: 'Postavke su sačuvane'
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Greška pri čuvanju postavki'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      closeTopBlade()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Postavke fakturisanja</h2>
              <p className="text-purple-100">Konfigurisanje sistema fakturisanja</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b bg-gray-50 px-6">
            <TabsList className="h-12 bg-transparent p-0 rounded-none">
              <TabsTrigger 
                value="numbering" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Hash className="h-4 w-4 mr-2" />
                Numerisanje
              </TabsTrigger>
              <TabsTrigger 
                value="defaults" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="h-4 w-4 mr-2" />
                Podrazumevano
              </TabsTrigger>
              <TabsTrigger 
                value="fiscal" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Shield className="h-4 w-4 mr-2" />
                Fiskalizacija
              </TabsTrigger>
              <TabsTrigger 
                value="pdf" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="numbering" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Format numerisanja</CardTitle>
                  <CardDescription>
                    Definiše kako se generišu brojevi faktura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="numbering-format">Format broja</Label>
                    <Input
                      id="numbering-format"
                      value={settings.numbering_format || 'FAK-{YYYY}-{NNNN}'}
                      onChange={(e) => updateSetting('numbering_format', e.target.value)}
                      placeholder="FAK-{YYYY}-{NNNN}"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Dostupne varijable: {'{YYYY}'} (godina), {'{MM}'} (mesec), {'{DD}'} (dan), {'{NNNN}'} (broj)
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="reset-yearly">Resetuj brojač svake godine</Label>
                      <p className="text-sm text-muted-foreground">
                        Brojač se vraća na 1 početkom svake godine
                      </p>
                    </div>
                    <Switch
                      id="reset-yearly"
                      checked={settings.numbering_reset_yearly || false}
                      onCheckedChange={(checked) => updateSetting('numbering_reset_yearly', checked)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="next-number">Sledeći broj</Label>
                    <Input
                      id="next-number"
                      type="number"
                      min="1"
                      value={settings.numbering_next_number || 1}
                      onChange={(e) => updateSetting('numbering_next_number', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Sledeći broj koji će biti dodeljen fakturi
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="defaults" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Podrazumevane vrednosti</CardTitle>
                  <CardDescription>
                    Vrednosti koje se automatski popunjavaju pri kreiranju fakture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="payment-terms">Rok plaćanja (dana)</Label>
                    <Input
                      id="payment-terms"
                      type="number"
                      min="0"
                      value={settings.payment_terms_default || 30}
                      onChange={(e) => updateSetting('payment_terms_default', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment-method">Način plaćanja</Label>
                    <Select 
                      value={settings.payment_method_default || 'transfer'}
                      onValueChange={(value) => updateSetting('payment_method_default', value)}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transfer">Bančni transfer</SelectItem>
                        <SelectItem value="cash">Gotovina</SelectItem>
                        <SelectItem value="card">Kartica</SelectItem>
                        <SelectItem value="check">Ček</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">Valuta</Label>
                    <Select 
                      value={settings.currency_default || 'EUR'}
                      onValueChange={(value) => updateSetting('currency_default', value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="RSD">RSD - Srpski dinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vat-rate">PDV stopa (%)</Label>
                    <Input
                      id="vat-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.vat_rate_default || 21}
                      onChange={(e) => updateSetting('vat_rate_default', parseFloat(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Fiskalizacija</CardTitle>
                  <CardDescription>
                    Postavke za elektronsku fiskalizaciju faktura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="fiscal-enabled">Fiskalizacija omogućena</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatski fiskalizuj sve fakture
                      </p>
                    </div>
                    <Switch
                      id="fiscal-enabled"
                      checked={settings.fiscal_enabled || false}
                      onCheckedChange={(checked) => updateSetting('fiscal_enabled', checked)}
                    />
                  </div>

                  {settings.fiscal_enabled && (
                    <>
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="fiscal-test">Test mod</Label>
                          <p className="text-sm text-muted-foreground">
                            Koristi test okruženje za fiskalizaciju
                          </p>
                        </div>
                        <Switch
                          id="fiscal-test"
                          checked={settings.fiscal_test_mode || false}
                          onCheckedChange={(checked) => updateSetting('fiscal_test_mode', checked)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="fiscal-cert">Putanja do sertifikata</Label>
                        <Input
                          id="fiscal-cert"
                          value={settings.fiscal_certificate_path || ''}
                          onChange={(e) => updateSetting('fiscal_certificate_path', e.target.value)}
                          placeholder="/certs/fiscal.p12"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Putanja do P12 sertifikata za fiskalizaciju
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="fiscal-password">Lozinka sertifikata</Label>
                        <Input
                          id="fiscal-password"
                          type="password"
                          value={settings.fiscal_certificate_password || ''}
                          onChange={(e) => updateSetting('fiscal_certificate_password', e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>PDF postavke</CardTitle>
                  <CardDescription>
                    Prilagođavanje izgleda PDF faktura
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pdf-logo">URL logotipa</Label>
                    <Input
                      id="pdf-logo"
                      type="url"
                      value={settings.pdf_logo_url || ''}
                      onChange={(e) => updateSetting('pdf_logo_url', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      URL slike logotipa koji će se prikazati na fakturi
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pdf-footer">Tekst u futeru</Label>
                    <Textarea
                      id="pdf-footer"
                      value={settings.pdf_footer_text || ''}
                      onChange={(e) => updateSetting('pdf_footer_text', e.target.value)}
                      placeholder="Hvala na poverenju!"
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Tekst koji će se prikazati na dnu svake stranice
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pdf-notes">Podrazumevane napomene</Label>
                    <Textarea
                      id="pdf-notes"
                      value={settings.pdf_default_notes || ''}
                      onChange={(e) => updateSetting('pdf_default_notes', e.target.value)}
                      placeholder="Molimo izvršite uplatu na naš račun..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Email postavke</CardTitle>
                  <CardDescription>
                    Konfiguracija slanja faktura putem emaila
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-enabled">Email omogućen</Label>
                      <p className="text-sm text-muted-foreground">
                        Omogući slanje faktura putem emaila
                      </p>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={settings.email_enabled || false}
                      onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
                    />
                  </div>

                  {settings.email_enabled && (
                    <>
                      <Separator />
                      
                      <div>
                        <Label htmlFor="email-from">Email adresa pošiljaoca</Label>
                        <Input
                          id="email-from"
                          type="email"
                          value={settings.email_from_address || ''}
                          onChange={(e) => updateSetting('email_from_address', e.target.value)}
                          placeholder="fakture@example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email-from-name">Ime pošiljaoca</Label>
                        <Input
                          id="email-from-name"
                          value={settings.email_from_name || ''}
                          onChange={(e) => updateSetting('email_from_name', e.target.value)}
                          placeholder="Vaša firma d.o.o."
                        />
                      </div>

                      <div>
                        <Label htmlFor="email-subject">Predmet emaila</Label>
                        <Input
                          id="email-subject"
                          value={settings.email_subject_template || 'Faktura {INVOICE_NUMBER}'}
                          onChange={(e) => updateSetting('email_subject_template', e.target.value)}
                          placeholder="Faktura {INVOICE_NUMBER}"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Dostupne varijable: {'{INVOICE_NUMBER}'}, {'{COMPANY_NAME}'}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="email-body">Sadržaj emaila</Label>
                        <Textarea
                          id="email-body"
                          value={settings.email_body_template || ''}
                          onChange={(e) => updateSetting('email_body_template', e.target.value)}
                          placeholder="Poštovani,&#10;&#10;U prilogu se nalazi faktura broj {INVOICE_NUMBER}.&#10;&#10;S poštovanjem"
                          rows={6}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Dostupne varijable: {'{INVOICE_NUMBER}'}, {'{COMPANY_NAME}'}, {'{DUE_DATE}'}, {'{TOTAL_AMOUNT}'}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Izmene će biti primenjene na sve buduće fakture
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              Otkaži
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Čuvanje...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sačuvaj postavke
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}