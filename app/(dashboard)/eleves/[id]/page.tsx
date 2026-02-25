import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, FileSearch } from 'lucide-react'

const STATUS_LABELS = {
  VERIFIED: { label: 'Conforme', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  DISCREPANCY: { label: 'Anomalie', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  UNCERTAIN: { label: 'Incertain', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
}

export default async function EleveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: studentRaw, error } = await supabase
    .from('students')
    .select('id, full_name, license_type, klaxo_id, agency, created_at')
    .eq('id', id)
    .single()

  if (error || !studentRaw) notFound()
  const student = studentRaw

  const { data: analyses } = await supabase
    .from('ai_analyses')
    .select('id, file_name, report_status, remaining_due, total_hours_recorded, created_at, is_validated, ai_extracted_name')
    .eq('student_id', id)
    .eq('status', 'done')
    .order('created_at', { ascending: false })

  // Totaux agrégés
  const totalRemaining = analyses?.reduce((acc, a) => acc + (a.remaining_due ?? 0), 0) ?? 0
  const totalAnalyses = analyses?.length ?? 0
  const anomalies = analyses?.filter(a => a.report_status === 'DISCREPANCY').length ?? 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/eleves">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{student.full_name}</h1>
          <p className="text-xs text-slate-500">
            Permis {student.license_type ?? 'B'}{student.agency ? ` · ${student.agency}` : ''}
            {student.klaxo_id ? ` · ID: ${student.klaxo_id}` : ''}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase">Analyses</p>
            <p className="text-2xl font-bold text-slate-900">{totalAnalyses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase">Anomalies</p>
            <p className="text-2xl font-bold text-red-600">{anomalies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase">Reste à payer (total)</p>
            <p className={`text-2xl font-bold ${totalRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalRemaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historique analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" />
            Historique des analyses
          </CardTitle>
          <Button asChild size="sm">
            <Link href={`/analyse/new`}>Nouvelle analyse</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!analyses?.length ? (
            <p className="text-center text-sm text-slate-400 py-6">Aucune analyse pour cet élève.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="pb-2 text-left font-medium text-slate-500">Fichier</th>
                  <th className="pb-2 text-left font-medium text-slate-500">Heures</th>
                  <th className="pb-2 text-left font-medium text-slate-500">Reste à payer</th>
                  <th className="pb-2 text-left font-medium text-slate-500">Statut</th>
                  <th className="pb-2 text-left font-medium text-slate-500">Date</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {analyses.map(a => {
                  const s = STATUS_LABELS[a.report_status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.UNCERTAIN
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium">{a.ai_extracted_name || a.file_name}</td>
                      <td className="py-2 text-slate-600">{a.total_hours_recorded?.toFixed(1)}h</td>
                      <td className="py-2">
                        <span className={a.remaining_due && a.remaining_due > 0 ? 'font-semibold text-red-600' : ''}>
                          {formatCurrency(a.remaining_due)}
                        </span>
                      </td>
                      <td className="py-2"><Badge className={s.className}>{s.label}</Badge></td>
                      <td className="py-2 text-slate-500">{formatDate(a.created_at)}</td>
                      <td className="py-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/analyse/${a.id}`}>Voir</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
