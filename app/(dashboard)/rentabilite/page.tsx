export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, FileSearch, Clock, GraduationCap, Banknote, Receipt, Percent, Calculator } from 'lucide-react'

type AnalyseRow = {
  agency: string | null
  total_expected_amount: number | null
  total_amount_paid: number | null
  remaining_due: number | null
  revenue_gap: number | null
  calculated_unit_price: number | null
  driven_hours: number | null
  exams_passed: number | null
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
  totalDrivenHours: number
  totalExams: number
}

export default async function RentabilitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const [{ data }, { data: settingsData }] = await Promise.all([
    adminClient
      .from('ai_analyses')
      .select('agency, total_expected_amount, total_amount_paid, remaining_due, revenue_gap, calculated_unit_price, driven_hours, exams_passed, report_status')
      .eq('status', 'done'),
    adminClient
      .from('school_settings')
      .select('taux_horaire_salarie, cout_carburant_heure, assurance_vehicule_heure, cout_secretariat_heure, loyer_charges_heure, frais_divers_ajustement')
      .limit(1)
      .single(),
  ])

  const rows = (data ?? []) as AnalyseRow[]

  // ── Coût horaire total configuré ────────────────────────────────────────────
  const s = settingsData as {
    taux_horaire_salarie: number | null
    cout_carburant_heure: number | null
    assurance_vehicule_heure: number | null
    cout_secretariat_heure: number | null
    loyer_charges_heure: number | null
    frais_divers_ajustement: number | null
  } | null

  const coutHoraire =
    (s?.taux_horaire_salarie ?? 22.39) +
    (s?.cout_carburant_heure ?? 2) +
    (s?.assurance_vehicule_heure ?? 2) +
    (s?.cout_secretariat_heure ?? 4.66) +
    (s?.loyer_charges_heure ?? 9.61) +
    (s?.frais_divers_ajustement ?? 0)

  // ── Agrégation par agence ───────────────────────────────────────────────────
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
      totalDrivenHours: 0,
      totalExams: 0,
    }
    existing.nbAnalyses++
    if (row.report_status === 'DISCREPANCY') existing.nbAnomalies++
    existing.totalFacture += row.total_expected_amount ?? 0
    existing.totalPaye += row.total_amount_paid ?? 0
    existing.totalReste += row.remaining_due ?? 0
    existing.totalManque += row.revenue_gap ?? 0
    existing.tauxMoyen += row.calculated_unit_price ?? 0
    existing.totalDrivenHours += row.driven_hours ?? 0
    existing.totalExams += row.exams_passed ?? 0
    agenceMap.set(key, existing)
  }

  const stats: AgencyStat[] = Array.from(agenceMap.values())
    .map(s => ({ ...s, tauxMoyen: s.nbAnalyses > 0 ? s.tauxMoyen / s.nbAnalyses : 0 }))
    .sort((a, b) => b.totalManque - a.totalManque)

  // ── KPIs globaux ─────────────────────────────────────────────────────────────
  const totalAnalyses = rows.length
  const totalFacture = rows.reduce((s, r) => s + (r.total_expected_amount ?? 0), 0)
  const totalPaye = rows.reduce((s, r) => s + (r.total_amount_paid ?? 0), 0)
  const totalManque = rows.reduce((s, r) => s + (r.revenue_gap ?? 0), 0)
  const totalAnomalies = rows.filter(r => r.report_status === 'DISCREPANCY').length
  const pctAnomalies = totalAnalyses > 0 ? Math.round(totalAnomalies / totalAnalyses * 100) : 0
  const totalDrivenHours = rows.reduce((s, r) => s + (r.driven_hours ?? 0), 0)
  const totalExams = rows.reduce((s, r) => s + (r.exams_passed ?? 0), 0)

  // ── Calculs rentabilité globaux ───────────────────────────────────────────────
  const prixDeRevientGlobal = totalDrivenHours * coutHoraire
  const margeGlobale = totalPaye - prixDeRevientGlobal
  const tauxMarge = totalPaye > 0 ? (margeGlobale / totalPaye) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rentabilité</h1>
        <p className="text-sm text-slate-500">Synthèse financière par agence</p>
      </div>

      {/* KPIs — Ligne 1 : Activité */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
              <Banknote className="h-4 w-4 text-emerald-500" />
              <p className="text-xs uppercase text-slate-500">Total encaissé</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPaye)}</p>
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
              <Clock className="h-4 w-4 text-indigo-500" />
              <p className="text-xs uppercase text-slate-500">Heures conduites</p>
            </div>
            <p className="text-2xl font-bold text-indigo-700">{totalDrivenHours.toFixed(1)}h</p>
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

      {/* KPIs — Ligne 2 : Rentabilité */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-slate-500" />
              <p className="text-xs uppercase text-slate-500">Prix de revient global</p>
            </div>
            <p className="text-2xl font-bold text-slate-700">{formatCurrency(prixDeRevientGlobal)}</p>
            <p className="text-xs text-slate-400">{totalDrivenHours.toFixed(1)}h × {formatCurrency(coutHoraire)}/h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="h-4 w-4 text-slate-500" />
              <p className="text-xs uppercase text-slate-500">Prix de revient/h</p>
            </div>
            <p className="text-2xl font-bold text-slate-700">{formatCurrency(coutHoraire)}</p>
            <p className="text-xs text-slate-400">
              <a href="/settings" className="text-blue-600 underline underline-offset-2">Modifier</a>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-teal-500" />
              <p className="text-xs uppercase text-slate-500">Marge globale</p>
            </div>
            <p className={`text-2xl font-bold ${margeGlobale >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              {formatCurrency(margeGlobale)}
            </p>
            <p className="text-xs text-slate-400">Encaissé − Prix de revient</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-teal-500" />
              <p className="text-xs uppercase text-slate-500">Taux de marge</p>
            </div>
            <p className={`text-2xl font-bold ${tauxMarge >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
              {tauxMarge.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Marge / Encaissé</p>
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

      {/* Tableau par agence */}
      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <TrendingUp className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucune donnée disponible</p>
          <p className="mt-1 text-sm text-slate-400">Lancez des analyses pour voir la rentabilité.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Analyses</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Anomalies</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Heures</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Examens</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Facturé</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Encaissé</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Reste dû</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Manque</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Prix de revient</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Marge</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">Taux marge</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.map((s) => {
                const prixRevient = s.totalDrivenHours * coutHoraire
                const marge = s.totalPaye - prixRevient
                const taux = s.totalPaye > 0 ? (marge / s.totalPaye) * 100 : 0
                return (
                  <tr key={s.agence} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.agence}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{s.nbAnalyses}</td>
                    <td className="px-4 py-3 text-right">
                      {s.nbAnomalies > 0
                        ? <span className="font-medium text-red-600">{s.nbAnomalies}</span>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-indigo-700 font-medium">{s.totalDrivenHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right text-violet-700">{s.totalExams}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(s.totalFacture)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">{formatCurrency(s.totalPaye)}</td>
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
                    <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(prixRevient)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={marge >= 0 ? 'font-semibold text-teal-700' : 'font-semibold text-red-600'}>
                        {formatCurrency(marge)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={taux >= 0 ? 'font-semibold text-teal-700' : 'font-semibold text-red-600'}>
                        {taux.toFixed(1)}%
                      </span>
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
