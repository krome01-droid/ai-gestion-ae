export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, FileSearch } from 'lucide-react'

type AnalyseRow = {
  agency: string | null
  total_expected_amount: number | null
  total_amount_paid: number | null
  remaining_due: number | null
  revenue_gap: number | null
  calculated_unit_price: number | null
  report_status: string
}

type AgencyStat = {
  agence: string
  nbAnalyses: number
  nbAnomalies: number
  totalFacture: number
  totalPaye: number
  totalReste: number
  totalManque: number
  tauxMoyen: number
}

export default async function RentabilitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('ai_analyses')
    .select('agency, total_expected_amount, total_amount_paid, remaining_due, revenue_gap, calculated_unit_price, report_status')
    .eq('status', 'done')

  const rows = (data ?? []) as AnalyseRow[]

  // ── Agrégation par agence ───────────────────────────────────────────────
  const agenceMap = new Map<string, AgencyStat>()

  for (const row of rows) {
    const key = row.agency?.trim() || 'Non définie'
    const existing = agenceMap.get(key) ?? {
      agence: key,
      nbAnalyses: 0,
      nbAnomalies: 0,
      totalFacture: 0,
      totalPaye: 0,
      totalReste: 0,
      totalManque: 0,
      tauxMoyen: 0,
    }
    existing.nbAnalyses++
    if (row.report_status === 'DISCREPANCY') existing.nbAnomalies++
    existing.totalFacture += row.total_expected_amount ?? 0
    existing.totalPaye += row.total_amount_paid ?? 0
    existing.totalReste += row.remaining_due ?? 0
    existing.totalManque += row.revenue_gap ?? 0
    existing.tauxMoyen += row.calculated_unit_price ?? 0
    agenceMap.set(key, existing)
  }

  const stats: AgencyStat[] = Array.from(agenceMap.values())
    .map(s => ({ ...s, tauxMoyen: s.nbAnalyses > 0 ? s.tauxMoyen / s.nbAnalyses : 0 }))
    .sort((a, b) => b.totalManque - a.totalManque)

  // ── KPIs globaux ────────────────────────────────────────────────────────
  const totalAnalyses = rows.length
  const totalFacture = rows.reduce((s, r) => s + (r.total_expected_amount ?? 0), 0)
  const totalManque = rows.reduce((s, r) => s + (r.revenue_gap ?? 0), 0)
  const totalAnomalies = rows.filter(r => r.report_status === 'DISCREPANCY').length
  const pctAnomalies = totalAnalyses > 0 ? Math.round(totalAnomalies / totalAnalyses * 100) : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rentabilité</h1>
        <p className="text-sm text-slate-500">Synthèse financière par agence</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSearch className="h-4 w-4 text-blue-500" />
              <p className="text-xs uppercase text-slate-500">Analyses</p>
            </div>
            <p className="text-2xl font-bold">{totalAnalyses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs uppercase text-slate-500">Total facturé</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalFacture)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-xs uppercase text-slate-500">Manque à gagner</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalManque)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs uppercase text-slate-500">Anomalies</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{totalAnomalies}</p>
            <p className="text-xs text-slate-400">{pctAnomalies}% des analyses</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau par agence */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucune donnée disponible</p>
          <p className="mt-1 text-sm text-slate-400">Lancez des analyses pour voir la rentabilité.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Analyses</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Anomalies</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Facturé</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Payé</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Reste dû</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Manque</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Taux/h moy.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.map((s) => (
                <tr key={s.agence} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.agence}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{s.nbAnalyses}</td>
                  <td className="px-4 py-3 text-right">
                    {s.nbAnomalies > 0
                      ? <span className="font-medium text-red-600">{s.nbAnomalies}</span>
                      : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(s.totalFacture)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(s.totalPaye)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.totalReste > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
                      {formatCurrency(s.totalReste)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.totalManque > 0 ? 'font-semibold text-orange-600' : 'text-slate-500'}>
                      {formatCurrency(s.totalManque)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {s.tauxMoyen > 0 ? formatCurrency(s.tauxMoyen) : '—'}
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
