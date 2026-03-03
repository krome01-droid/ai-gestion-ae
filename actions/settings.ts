'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function updateSchoolSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const { data: existing } = await supabase.from('school_settings').select('id').limit(1).single()

  const baseUpdates = {
    school_name: formData.get('school_name') as string,
    address: (formData.get('address') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    siret: (formData.get('siret') as string) || null,
    tva_rate: parseFloat((formData.get('tva_rate') as string) || '0'),
    taux_horaire_salarie:     parseFloat((formData.get('taux_horaire_salarie')     as string) || '22.39'),
    taux_horaire_independant: parseFloat((formData.get('taux_horaire_independant') as string) || '33.25'),
    cout_carburant_heure:     parseFloat((formData.get('cout_carburant_heure')     as string) || '2'),
    assurance_vehicule_heure: parseFloat((formData.get('assurance_vehicule_heure') as string) || '2'),
    cout_secretariat_heure:   parseFloat((formData.get('cout_secretariat_heure')   as string) || '4.66'),
    loyer_charges_heure:      parseFloat((formData.get('loyer_charges_heure')      as string) || '9.61'),
    frais_divers_ajustement:  parseFloat((formData.get('frais_divers_ajustement')  as string) || '0'),
    updated_at: new Date().toISOString(),
  }

  const aiUpdates = {
    ai_software_name:       (formData.get('ai_software_name')       as string) || null,
    ai_custom_instructions: (formData.get('ai_custom_instructions') as string) || null,
    ai_system_prompt:       (formData.get('ai_system_prompt')       as string) || null,
  }

  if (existing) {
    const { error } = await supabase.from('school_settings').update(baseUpdates).eq('id', existing.id)
    if (error) return { error: error.message }
    // Sauvegarde des champs IA (silencieuse si colonnes pas encore créées)
    await supabase.from('school_settings').update(aiUpdates).eq('id', existing.id)
  } else {
    const { error } = await supabase.from('school_settings').insert(baseUpdates)
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
