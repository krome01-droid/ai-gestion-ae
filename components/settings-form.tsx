'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateSchoolSettings, uploadSchoolLogo } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Bot } from 'lucide-react'

interface SettingsData {
  school_name?: string | null
  logo_url?: string | null
  tva_rate?: number | null
  address?: string | null
  phone?: string | null
  email?: string | null
  siret?: string | null
  taux_horaire_salarie?: number | null
  taux_horaire_independant?: number | null
  cout_carburant_heure?: number | null
  assurance_vehicule_heure?: number | null
  cout_secretariat_heure?: number | null
  loyer_charges_heure?: number | null
  frais_divers_ajustement?: number | null
  ai_model?: string | null
  ai_software_name?: string | null
  ai_custom_instructions?: string | null
  ai_system_prompt?: string | null
}

export function SettingsForm({ settings }: { settings: SettingsData | null }) {
  const [logoLoading, setLogoLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? null)

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSettingsLoading(true)
    const result = await updateSchoolSettings(new FormData(e.currentTarget))
    if (result.error) toast.error(result.error)
    else toast.success('Paramètres enregistrés')
    setSettingsLoading(false)
  }

  const handleLogoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLogoLoading(true)
    const result = await uploadSchoolLogo(new FormData(e.currentTarget))
    if (result.error) toast.error(result.error)
    else {
      toast.success('Logo mis à jour')
      if (result.logoUrl) setLogoUrl(result.logoUrl)
    }
    setLogoLoading(false)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSettingsSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nom de l&apos;auto-école</Label>
          <Input name="school_name" defaultValue={settings?.school_name ?? ''} required />
        </div>
        <div className="space-y-1.5">
          <Label>SIRET</Label>
          <Input name="siret" defaultValue={settings?.siret ?? ''} placeholder="xxx xxx xxx xxxxx" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input name="phone" defaultValue={settings?.phone ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={settings?.email ?? ''} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Adresse</Label>
          <Input name="address" defaultValue={settings?.address ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label>Taux TVA (%)</Label>
          <Input name="tva_rate" type="number" step="0.1" defaultValue={settings?.tva_rate ?? 0} />
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-slate-800 mb-3">Configuration des Coûts &amp; Rentabilité</p>
          <p className="text-xs text-slate-500 mb-4">Ces valeurs servent à calculer la marge estimée par heure de conduite dans la page Rentabilité.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Taux Horaire Salarié (€/h)</Label>
              <Input name="taux_horaire_salarie" type="number" step="0.01" defaultValue={settings?.taux_horaire_salarie ?? 22.39} />
            </div>
            <div className="space-y-1.5">
              <Label>Taux Horaire Indépendant (€/h)</Label>
              <Input name="taux_horaire_independant" type="number" step="0.01" defaultValue={settings?.taux_horaire_independant ?? 33.25} />
            </div>
            <div className="space-y-1.5">
              <Label>Coût Carburant/Heure (€)</Label>
              <Input name="cout_carburant_heure" type="number" step="0.01" defaultValue={settings?.cout_carburant_heure ?? 2} />
            </div>
            <div className="space-y-1.5">
              <Label>Assurance Véhicule/Heure (€)</Label>
              <Input name="assurance_vehicule_heure" type="number" step="0.01" defaultValue={settings?.assurance_vehicule_heure ?? 2} />
            </div>
            <div className="space-y-1.5">
              <Label>Coût Secrétariat/Heure (€)</Label>
              <Input name="cout_secretariat_heure" type="number" step="0.01" defaultValue={settings?.cout_secretariat_heure ?? 4.66} />
            </div>
            <div className="space-y-1.5">
              <Label>Loyer &amp; Charges/Heure (€)</Label>
              <Input name="loyer_charges_heure" type="number" step="0.01" defaultValue={settings?.loyer_charges_heure ?? 9.61} />
            </div>
            <div className="space-y-1.5">
              <Label>Frais Divers Ajustement (€)</Label>
              <Input name="frais_divers_ajustement" type="number" step="0.01" defaultValue={settings?.frais_divers_ajustement ?? 0} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Bot className="h-4 w-4" /> Configuration IA d&apos;Analyse
            </p>
            <p className="text-xs text-slate-500">Personnalisez l&apos;IA pour améliorer la précision des rapports.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Modèle IA</Label>
            <select
              name="ai_model"
              defaultValue={settings?.ai_model || 'gemini-2.5-flash'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rapide — recommandé)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Précis — plus lent)</option>
            </select>
            <p className="text-xs text-slate-400">Modèle utilisé pour l&apos;analyse des dossiers élèves.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Logiciel de gestion utilisé</Label>
            <Input
              name="ai_software_name"
              placeholder="Ex: Klaxo, EDIFER, iCar..."
              defaultValue={settings?.ai_software_name ?? ''}
            />
            <p className="text-xs text-slate-400">Aide l&apos;IA à interpréter le format de vos documents.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Instructions personnalisées</Label>
            <Textarea
              name="ai_custom_instructions"
              rows={5}
              placeholder="Ex: Dans notre auto-école, les leçons de 45 min comptent comme 1h. Les forfaits CPF ne génèrent pas de reste à payer..."
              defaultValue={settings?.ai_custom_instructions ?? ''}
            />
            <p className="text-xs text-slate-400">Règles ajoutées au prompt par défaut.</p>
          </div>

          <details className="space-y-1">
            <summary className="text-xs font-medium text-slate-600 cursor-pointer select-none">
              ⚙️ Prompt système complet (avancé — remplace tout)
            </summary>
            <div className="mt-2 space-y-1.5">
              <Textarea
                name="ai_system_prompt"
                rows={12}
                className="font-mono text-xs"
                placeholder="Laisser vide pour utiliser le prompt par défaut..."
                defaultValue={settings?.ai_system_prompt ?? ''}
              />
              <p className="text-xs text-orange-500">⚠️ Si renseigné, remplace entièrement le prompt par défaut.</p>
            </div>
          </details>
        </div>

        <Button type="submit" disabled={settingsLoading}>
          {settingsLoading ? 'Enregistrement...' : 'Enregistrer la configuration'}
        </Button>
      </form>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Logo de l&apos;auto-école</p>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo école" className="h-16 object-contain rounded border p-1" />
        )}
        <form onSubmit={handleLogoSubmit} className="flex items-center gap-3">
          <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="max-w-xs" />
          <Button type="submit" variant="outline" disabled={logoLoading}>
            {logoLoading ? 'Upload...' : 'Uploader'}
          </Button>
        </form>
      </div>
    </div>
  )
}
