export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileSearch, Plus, AlertTriangle, TrendingDown, GraduationCap } from 'lucide-react'

const STATUS_LABELS = {
  VERIFIED: { label: 'Conforme', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  DISCREPANCY: { label: 'Anomalie', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  UNCERTAIN: { label: 'Incertain', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
}

export default async function CollaborateurPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createAdminClient()
  const { data: analyses } = await adminClient
    .from('ai_analyses')
    .select('id, student_name_input, ai_extracted_name, file_name, agency, report_status, remaining_due, exams_passed, created_at')
    .eq('created_by', user!.id)
    .eq('status', 'done')
    .order('created_at', { ascending: false })

  const all = analyses ?? []
  const nbAnalyses = all.length
  const nbAnomalies = all.filter(a => a.report_status === 'DISCREPANCY').length
  const totalReste = all.reduce((s, a) => s + ((a.remaining_due as number) ?? 0), 0)
  const totalExams = all.reduce((s, a) => s + ((a.exams_passed as number) ?? 0), 0)
  const recent = all.slice(0, 10)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500">Vos analyses personnelles</p>
        </div>
        <Button asChild>
          <Link href="/analyse/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle analyse
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSearch className="h-4 w-4 text-blue-500" />
              <p className="text-xs uppercase text-slate-500">Mes analyses</p>
            </div>
            <p className="text-2xl font-bold">{nbAnalyses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs uppercase text-slate-500">Anomalies</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{nbAnomalies}</p>
            <p className="text-xs text-slate-400">
              {nbAnalyses > 0 ? Math.round(nbAnomalies / nbAnalyses * 100) : 0}% des analyses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-xs uppercase text-slate-500">Reste à encaisser</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalReste)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-violet-500" />
              <p className="text-xs uppercase text-slate-500">Examens passés</p>
            </div>
            <p className="text-2xl font-bold text-violet-700">{totalExams}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dernières analyses */}
      {!recent.length ? (
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
          <div className="border-b bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">Dernières analyses</p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Élève</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Examens</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Reste dû</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((a) => {
                const s = STATUS_LABELS[(a.report_status as keyof typeof STATUS_LABELS)] ?? STATUS_LABELS.UNCERTAIN
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {(a.ai_extracted_name as string) || (a.student_name_input as string) || (a.file_name as string)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{(a.agency as string) ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{(a.exams_passed as number) ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={(a.remaining_due as number) > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
                        {(a.remaining_due as number) != null ? formatCurrency(a.remaining_due as number) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={s.className}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at as string)}</td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/analyse/${a.id}`}>Voir</Link>
                      </Button>
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
