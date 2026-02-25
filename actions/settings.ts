'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function updateSchoolSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const { data: existing } = await supabase.from('school_settings').select('id').limit(1).single()

  const updates = {
    school_name: formData.get('school_name') as string,
    address: (formData.get('address') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    siret: (formData.get('siret') as string) || null,
    tva_rate: parseFloat((formData.get('tva_rate') as string) || '0'),
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase.from('school_settings').update(updates).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('school_settings').insert(updates)
    if (error) return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadSchoolLogo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const file = formData.get('logo') as File
  if (!file || !file.size) return { error: 'Aucun fichier' }

  const ext = file.name.split('.').pop()
  const path = `logos/school-logo.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('school-assets')
    .upload(path, file, { upsert: true })

  if (uploadErr) return { error: uploadErr.message }

  const { data: { publicUrl } } = supabase.storage.from('school-assets').getPublicUrl(path)

  const { data: existing } = await supabase.from('school_settings').select('id').limit(1).single()
  if (existing) {
    await supabase.from('school_settings').update({ logo_url: publicUrl }).eq('id', existing.id)
  } else {
    await supabase.from('school_settings').insert({ school_name: 'Mon Auto-École', logo_url: publicUrl })
  }

  revalidatePath('/settings')
  return { logoUrl: publicUrl }
}
