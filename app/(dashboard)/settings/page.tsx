import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Building } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  // Essai avec les colonnes IA (requiert migration SQL)
  const { data: fullSettings, error: schemaErr } = await supabase
    .from('school_settings')
    .select('id, school_name, logo_url, tva_rate, address, phone, email, siret, taux_horaire_salarie, taux_horaire_independant, cout_carburant_heure, assurance_vehicule_heure, cout_secretariat_heure, loyer_charges_heure, frais_divers_ajustement, ai_software_name, ai_custom_instructions, ai_system_prompt')
    .limit(1)
    .maybeSingle()

  // Fallback si les colonnes IA n'existent pas encore en base
  let settings = fullSettings as typeof fullSettings & {
    ai_software_name?: string | null
    ai_custom_instructions?: string | null
    ai_system_prompt?: string | null
  } | null
  if (schemaErr) {
    const { data: baseSettings } = await supabase
      .from('school_settings')
      .select('id, school_name, logo_url, tva_rate, address, phone, email, siret, taux_horaire_salarie, taux_horaire_independant, cout_carburant_heure, assurance_vehicule_heure, cout_secretariat_heure, loyer_charges_heure, frais_divers_ajustement')
      .limit(1)
      .maybeSingle()
    settings = baseSettings ? { ...baseSettings, ai_software_name: null, ai_custom_instructions: null, ai_system_prompt: null } : null
  }

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
