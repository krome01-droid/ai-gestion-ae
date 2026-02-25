import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.app_metadata?.role ?? 'user'
  redirect(role === 'admin' ? '/dashboard' : '/collaborateur')
}
