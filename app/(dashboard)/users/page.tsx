export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { UserActionsButtons } from '@/components/user-actions-buttons'
import { CreateUserDialog } from '@/components/create-user-dialog'
import { Badge } from '@/components/ui/badge'
import { UserCog } from 'lucide-react'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me || me.app_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: { users }, error } = await adminClient.auth.admin.listUsers()

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Erreur chargement utilisateurs : {error.message}</p>
      </div>
    )
  }

  const sorted = [...users].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-sm text-slate-500">{sorted.length} compte(s) enregistré(s)</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Rôle</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Créé le</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Dernière connexion</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((u) => {
              const role = (u.app_metadata?.role as string) ?? 'user'
              const isMe = u.id === me.id
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.email}
                    {isMe && <span className="ml-2 text-xs text-slate-400">(vous)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={role === 'admin'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                    }>
                      {role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <UserActionsButtons
                      userId={u.id}
                      currentRole={role}
                      isSelf={isMe}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        <UserCog className="h-4 w-4 shrink-0" />
        <span>
          Les changements de rôle prennent effet à la prochaine connexion de l&apos;utilisateur.
        </span>
      </div>
    </div>
  )
}
