import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'

export default async function ElevesPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, license_type, agency, created_at')
    .order('full_name')

  // Compte les analyses par élève
  const { data: analysesCounts } = await supabase
    .from('ai_analyses')
    .select('student_id')
    .eq('status', 'done')
    .not('student_id', 'is', null)

  const countMap: Record<string, number> = {}
  for (const a of analysesCounts ?? []) {
    if (a.student_id) countMap[a.student_id] = (countMap[a.student_id] ?? 0) + 1
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Élèves</h1>
          <p className="text-sm text-slate-500">{students?.length ?? 0} élève(s) enregistré(s)</p>
        </div>
      </div>

      {!students?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <Users className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucun élève pour l&apos;instant</p>
          <p className="mt-1 text-sm text-slate-400">Les élèves sont créés automatiquement lors d&apos;une analyse IA.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Permis</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Analyses</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Créé le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {s.license_type ?? 'B'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.agency ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{countMap[s.id] ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/eleves/${s.id}`}>Voir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
