'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { validateAnalysis } from '@/actions/analyse'
import { formatCurrency, formatHours } from '@/lib/utils'
import type { AnalysisRecord } from '@/lib/types/analyse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Euro,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react'
import { AnalysePdfButton } from './analyse-pdf-button'
import { ReAnalyseButton } from './reanalyse-button'

const STATUS_CONFIG = {
  VERIFIED: {
    label: 'Vérifié',
    icon: CheckCircle2,
    className: 'bg-green-50 border-green-200 text-green-700',
    badgeVariant: 'default' as const,
  },
  DISCREPANCY: {
    label: 'Anomalie détectée',
    icon: AlertTriangle,
    className: 'bg-red-50 border-red-200 text-red-700',
    badgeVariant: 'destructive' as const,
  },
  UNCERTAIN: {
    label: 'Incertain',
    icon: HelpCircle,
    className: 'bg-amber-50 border-amber-200 text-amber-700',
    badgeVariant: 'secondary' as const,
  },
}

interface KpiBoxProps {
  label: string
  value: string
  sub?: string
  icon?: React.ElementType
  highlight?: boolean
  danger?: boolean
}

function KpiBox({ label, value, sub, icon: Icon, highlight, danger }: KpiBoxProps) {
  return (
    <div className={`rounded-xl border p-4 ${danger ? 'border-red-200 bg-red-50' : highlight ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      {Icon && <Icon className={`mb-2 h-4 w-4 ${danger ? 'text-red-500' : highlight ? 'text-blue-500' : 'text-slate-400'}`} />}
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${danger ? 'text-red-700' : highlight ? 'text-blue-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

interface AnalyseReportDisplayProps {
  analysis: AnalysisRecord
  isAdmin?: boolean
  coutHoraire?: number
}

export function AnalyseReportDisplay({ analysis, isAdmin, coutHoraire }: AnalyseReportDisplayProps) {
  const [validating, setValidating] = useState(false)
  const status = STATUS_CONFIG[analysis.reportStatus] ?? STATUS_CONFIG.UNCERTAIN
  const StatusIcon = status.icon

  const handleValidate = async () => {
    setValidating(true)
    const result = await validateAnalysis(analysis.id)
    if (result.error) toast.error(result.error)
    else toast.success('Analyse validée')
    setValidating(false)
  }

  const drivenHours = analysis.drivenHours ?? 0
  const plannedHours = analysis.plannedHours ?? 0
  const totalHours = analysis.totalHoursRecorded

  const prixDeRevient = coutHoraire !== undefined ? totalHours * coutHoraire : null
  const marge = prixDeRevient !== null ? analysis.totalAmountPaid - prixDeRevient : null
  const tauxMarge = marge !== null && analysis.totalAmountPaid > 0
    ? (marge / analysis.totalAmountPaid) * 100
    : null

  return (
    <div className="space-y-6">
      {/* Bannière de statut */}
      <div className={`flex items-center justify-between rounded-xl border-2 p-4 ${status.className}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className="h-6 w-6" />
          <div>
            <p className="font-bold text-lg">{status.label}</p>
            {analysis.aiExtractedName && (
              <p className="text-sm opacity-80">Élève : {analysis.aiExtractedName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.isValidated && (
            <Badge variant="secondary" className="bg-white/70">
              <ShieldCheck className="mr-1 h-3 w-3" /> Validé
            </Badge>
          )}
          {isAdmin && <ReAnalyseButton analysisId={analysis.id} />}
          <AnalysePdfButton analysis={analysis} />
          {isAdmin && !analysis.isValidated && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleValidate}
              disabled={validating}
            >
              <ShieldCheck className="mr-1 h-4 w-4" />
              Valider
            </Button>
          )}
        </div>
      </div>

      {/* Rangée 1 — Heures & Financier */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiBox
          label="Total Heures"
          value={formatHours(totalHours)}
          sub={plannedHours > 0 ? `${formatHours(drivenHours)} conduites + ${formatHours(plannedHours)} planifiées` : `${formatHours(drivenHours)} conduites`}
          icon={Clock}
          highlight
        />
        <KpiBox
          label="Total Facturé"
          value={formatCurrency(analysis.totalExpectedAmount)}
          icon={Euro}
        />
        <KpiBox
          label="Total Réglé"
          value={formatCurrency(analysis.totalAmountPaid)}
          icon={Euro}
        />
        <KpiBox
          label="Reste à Payer"
          value={formatCurrency(analysis.remainingDue)}
          icon={Euro}
          danger={analysis.remainingDue > 0}
        />
      </div>

      {/* Rangée 2 — Rentabilité */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiBox
          label="Prix Moyen/Heure"
          value={analysis.calculatedUnitPrice ? `${analysis.calculatedUnitPrice.toFixed(2)}€/h` : '—'}
          icon={TrendingUp}
        />
        <KpiBox
          label="Valeur Théorique Catalogue"
          value={formatCurrency(analysis.theoreticalCatalogTotal)}
          icon={TrendingUp}
        />
        <KpiBox
          label="Manque à Gagner"
          value={formatCurrency(analysis.revenueGap)}
          icon={analysis.revenueGap > 0 ? TrendingDown : TrendingUp}
          danger={analysis.revenueGap > 100}
        />
        <KpiBox
          label="Examens passés"
          value={String(analysis.examsPassed ?? 0)}
          sub="examen(s) code + conduite"
          icon={GraduationCap}
        />
      </div>

      {/* Rangée 3 — Marge */}
      {marge !== null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiBox
            label="Marge Estimée"
            value={formatCurrency(marge)}
            sub={`PR estimé : ${formatCurrency(prixDeRevient!)} (${formatHours(totalHours)} heures total)`}
            icon={marge >= 0 ? TrendingUp : TrendingDown}
            danger={marge < 0}
          />
          <KpiBox
            label="Taux de Marge"
            value={tauxMarge !== null ? `${tauxMarge.toFixed(1)}%` : '—'}
            sub="sur total réglé"
            icon={TrendingUp}
            danger={tauxMarge !== null && tauxMarge < 20}
          />
        </div>
      )}

      {/* Résumé IA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analyse Expert-Comptable IA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            {analysis.summary}
          </p>
        </CardContent>
      </Card>

      {/* Anomalies */}
      {analysis.discrepancies?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Points de vigilance ({analysis.discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.discrepancies.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommandations */}
      {analysis.recommendations?.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              Actions recommandées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes collaborateur */}
      {analysis.userComments && (
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Notes du collaborateur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm italic text-slate-600">&ldquo;{analysis.userComments}&rdquo;</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
