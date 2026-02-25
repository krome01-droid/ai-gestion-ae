import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Building } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const { data: settings } = await supabase
    .from('school_settings')
    .select('id, school_name, logo_url, tva_rate, address, phone, email, siret')
    .limit(1)
    .maybeSingle()

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500">Configuration de votre auto-école</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-4 w-4" />
            Informations auto-école
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
