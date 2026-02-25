import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileSearch, TrendingDown, AlertTriangle, Users, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // KPIs globaux
  const { data: analyses } = await supabase
    .from('ai_analyses')
    .select('id, report_status, remaining_due, revenue_gap, is_validated, created_at, ai_extracted_name, student_name_input, file_name')
    .eq('status', 'done')
    .order('created_at', { ascending: false })

  const all = analyses ?? []
  const totalAnalyses = all.length
  const validated = all.filter(a => a.is_validated).length
  const anomalies = all.filter(a => a.report_status === 'DISCREPANCY').length
  const totalRemaining = all.reduce((acc, a) => acc + (a.remaining_due ?? 0), 0)
  const totalGap = all.filter(a => (a.revenue_gap ?? 0) > 0).reduce((acc, a) => acc + (a.revenue_gap ?? 0), 0)

  const { count: studentsCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  const recent = all.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
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
              <p className="text-xs uppercase text-slate-500">Analyses</p>
            </div>
            <p className="text-2xl font-bold">{totalAnalyses}</p>
            <p className="text-xs text-slate-400">{validated} validée(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <p className="text-xs uppercase text-slate-500">Élèves</p>
            </div>
            <p className="text-2xl font-bold">{studentsCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs uppercase text-slate-500">Anomalies</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{anomalies}</p>
            <p className="text-xs text-slate-400">{totalAnalyses > 0 ? Math.round(anomalies / totalAnalyses * 100) : 0}% des analyses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-xs uppercase text-slate-500">Manque à gagner</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalGap)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reste à payer global */}
      {totalRemaining > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-700">Reste à encaisser (total)</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{formatCurrency(totalRemaining)}</p>
          </CardContent>
        </Card>
      )}

      {/* Analyses récentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dernières analyses</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/analyse">Tout voir</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recent.length ? (
            <p className="text-center text-sm text-slate-400 py-4">Aucune analyse pour l&apos;instant.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(a => (
                <Link
                  key={a.id}
                  href={`/analyse/${a.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-sm text-slate-900">
                    {a.ai_extracted_name || a.student_name_input || a.file_name}
                  </span>
                  <div className="flex items-center gap-3">
                    {a.remaining_due != null && a.remaining_due > 0 && (
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(a.remaining_due)}</span>
                    )}
                    <Badge className={
                      a.report_status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      a.report_status === 'DISCREPANCY' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {a.report_status === 'VERIFIED' ? 'Conforme' : a.report_status === 'DISCREPANCY' ? 'Anomalie' : 'Incertain'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
