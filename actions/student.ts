'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase.from('students').insert({
    full_name: formData.get('full_name') as string,
    license_type: (formData.get('license_type') as string) || 'B',
    klaxo_id: (formData.get('klaxo_id') as string) || null,
    agency: (formData.get('agency') as string) || null,
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/eleves')
  return { id: data.id }
}

export async function updateStudent(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('students').update({
    full_name: formData.get('full_name') as string,
    license_type: (formData.get('license_type') as string) || 'B',
    klaxo_id: (formData.get('klaxo_id') as string) || null,
    agency: (formData.get('agency') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/eleves/${id}`)
  revalidatePath('/eleves')
  return { success: true }
}

export async function deleteStudent(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/eleves')
  return { success: true }
}

// Trouve ou crée un élève par son nom — utilisé après l'analyse IA (service_role)
export async function findOrCreateStudent(
  fullName: string,
  licenseType: string = 'B'
): Promise<string | null> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('students')
    .select('id')
    .ilike('full_name', fullName.trim())
    .limit(1)
    .single()

  if (existing) return existing.id

  const { data: created } = await adminClient
    .from('students')
    .insert({ full_name: fullName.trim(), license_type: licenseType })
    .select('id')
    .single()

  return created?.id ?? null
}
