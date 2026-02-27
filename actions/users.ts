'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return user
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
  const me = await assertAdmin()
  if (!me) return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  if (error) return { error: error.message }
  revalidatePath('/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const me = await assertAdmin()
  if (!me) return { error: 'Non autorisé' }
  if (me.id === userId) return { error: 'Vous ne pouvez pas supprimer votre propre compte' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) return { error: error.message }
  revalidatePath('/users')
  return { success: true }
}
