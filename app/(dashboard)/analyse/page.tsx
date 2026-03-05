export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileSearch, Loader2, AlertCircle } from 'lucide-react'
import { AnalyseDeleteButton } from '@/components/analyse-delete-button'

const STATUS_LABELS = {
  VERIFIED: { label: 'Conforme', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  DISCREPANCY: { label: 'Anomalie', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  UNCERTAIN: { label: 'Incertain', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
}

export default async function AnalyseListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  const adminClient = createAdminClient()

  const { data: analyses } = await adminClient
    .from('ai_analyses')
    .select('id, student_name_input, ai_extracted_name, file_name, report_status, remaining_due, total_hours_recorded, agency, created_at, is_validated, status')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyses IA</h1>
          <p className="text-sm text-slate-500">{analyses?.length ?? 0} analyse(s) enregistrée(s)</p>
        </div>
        <Button asChild>
          <Link href="/analyse/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle analyse
          </Link>
        </Button>
      </div>

      {!analyses?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <FileSearch className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucune analyse pour l&apos;instant</p>
          <p className="mt-1 text-sm text-slate-400">Commencez par uploader un dossier élève.</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/analyse/new">Lancer une analyse</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Élève</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Heures</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Reste à payer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {analyses.map((a) => {
                const name = a.ai_extracted_name || a.student_name_input || a.file_name
                const isDone = a.status === 'done'
                const isProcessing = a.status === 'processing'
                const isError = a.status === 'error'
                const s = isDone
                  ? (STATUS_LABELS[a.report_status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.UNCERTAIN)
                  : null
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {name}
                      {a.is_validated && (
                        <span className="ml-2 text-xs text-green-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.agency ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {isDone && a.total_hours_recorded != null ? `${a.total_hours_recorded.toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isDone ? (
                        <span className={a.remaining_due != null && a.remaining_due > 0 ? 'font-semibold text-red-600' : 'text-slate-700'}>
                          {a.remaining_due != null ? formatCurrency(a.remaining_due) : '—'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isProcessing && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 flex items-center gap-1 w-fit">
                          <Loader2 className="h-3 w-3 animate-spin" /> En cours…
                        </Badge>
                      )}
                      {isError && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" /> Erreur
                        </Badge>
                      )}
                      {s && <Badge className={s.className}>{s.label}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/analyse/${a.id}`}>Voir</Link>
                        </Button>
                        {isAdmin && (
                          <AnalyseDeleteButton id={a.id} name={name} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
