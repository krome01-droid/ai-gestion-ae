'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=Identifiants+invalides')
  }

  const role = data.user?.app_metadata?.role ?? 'user'
  redirect(role === 'admin' ? '/dashboard' : '/collaborateur')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
