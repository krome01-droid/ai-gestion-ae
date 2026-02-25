'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateSchoolSettings, uploadSchoolLogo } from '@/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface SettingsData {
  school_name?: string | null
  logo_url?: string | null
  tva_rate?: number | null
  address?: string | null
  phone?: string | null
  email?: string | null
  siret?: string | null
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
        <Button type="submit" disabled={settingsLoading}>
          {settingsLoading ? 'Enregistrement...' : 'Enregistrer'}
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
