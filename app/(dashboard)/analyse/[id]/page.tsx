export const maxDuration = 300

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyseReportDisplay } from '@/components/analyse-report-display'
import type { AnalysisRecord, CatalogSnapshot, HoursBreakdownItem } from '@/lib/types/analyse'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Json } from '@/lib/types/database'
import { ProcessingPoller } from '@/components/processing-poller'
import { ReAnalyseButton } from '@/components/reanalyse-button'
import { ResetAnalysisButton } from '@/components/reset-analysis-button'

type AnalyseRow = {
  id: string
  student_id: string | null
  created_by: string | null
  file_name: string
  file_type: string
  student_name_input: string | null
  agency: string | null
  instructor_type: string
  user_comments: string | null
  ai_extracted_name: string | null
  total_hours_recorded: number | null
  driven_hours: number | null
  planned_hours: number | null
  exams_passed: number | null
  total_expected_amount: number | null
  total_amount_paid: number | null
  remaining_due: number | null
  calculated_unit_price: number | null
  theoretical_catalog_total: number | null
  revenue_gap: number | null
  report_status: string
  summary: string | null
  discrepancies: Json
  recommendations: Json
  catalog_snapshot: Json | null
  status: string
  is_validated: boolean
  error_message: string | null
  created_at: string
  students: { full_name: string } | null
}

export default async function AnalyseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: row, error }, { data: schoolSettings }, { data: hoursData }] = await Promise.all([
    supabase
      .from('ai_analyses')
      .select('id, student_id, created_by, file_name, file_type, student_name_input, agency, instructor_type, user_comments, ai_extracted_name, total_hours_recorded, driven_hours, planned_hours, exams_passed, total_expected_amount, total_amount_paid, remaining_due, calculated_unit_price, theoretical_catalog_total, revenue_gap, report_status, summary, discrepancies, recommendations, catalog_snapshot, status, is_validated, error_message, created_at, students(full_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('school_settings')
      .select('taux_horaire_salarie, cout_carburant_heure, assurance_vehicule_heure, cout_secretariat_heure, loyer_charges_heure, frais_divers_ajustement')
      .limit(1)
      .maybeSingle(),
    // Fetch hours_breakdown séparément — fallback silencieux si la colonne n'existe pas encore
    supabase
      .from('ai_analyses')
      .select('hours_breakdown')
      .eq('id', id)
      .maybeSingle()
      .then(r => r.error ? { data: null } : r),
  ])

  if (error || !row) notFound()

  const isAdmin = user?.app_metadata?.role === 'admin'

  const coutHoraire = schoolSettings
    ? (schoolSettings.taux_horaire_salarie ?? 22.39)
      + (schoolSettings.cout_carburant_heure ?? 2)
      + (schoolSettings.assurance_vehicule_heure ?? 2)
      + (schoolSettings.cout_secretariat_heure ?? 4.66)
      + (schoolSettings.loyer_charges_heure ?? 9.61)
      + (schoolSettings.frais_divers_ajustement ?? 0)
    : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedRow = row as unknown as AnalyseRow

  if (typedRow.status === 'processing') {
    return (
      <div className="p-6 space-y-4">
        <ProcessingPoller createdAt={typedRow.created_at} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50 p-10 text-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div>
            <p className="font-medium text-slate-700">Analyse en cours...</p>
            <p className="mt-1 text-sm text-slate-500">L&apos;IA traite le document. La page se met à jour automatiquement.</p>
          </div>
          {isAdmin && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-xs text-slate-400">Bloqué depuis longtemps ?</p>
              <div className="flex gap-2">
                <ResetAnalysisButton analysisId={typedRow.id} />
                <ReAnalyseButton analysisId={typedRow.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (typedRow.status === 'error') {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-bold text-red-700">Erreur d&apos;analyse</p>
          <p className="mt-2 text-sm text-red-600">{typedRow.error_message ?? 'Une erreur est survenue.'}</p>
        </div>
        {isAdmin && (
          <div className="flex justify-center">
            <ReAnalyseButton analysisId={typedRow.id} />
          </div>
        )}
      </div>
    )
  }

  const analysis: AnalysisRecord = {
    id: typedRow.id,
    studentId: typedRow.student_id,
    studentName: typedRow.students?.full_name ?? null,
    createdBy: typedRow.created_by,
    creatorName: null,
    fileName: typedRow.file_name,
    fileType: typedRow.file_type,
    agence: typedRow.agency,
    instructorType: typedRow.instructor_type,
    userComments: typedRow.user_comments,
    catalogSnapshot: typedRow.catalog_snapshot as CatalogSnapshot[] | null,
    status: typedRow.status as AnalysisRecord['status'],
    isValidated: typedRow.is_validated,
    createdAt: typedRow.created_at,
    aiExtractedName: typedRow.ai_extracted_name ?? undefined,
    totalHoursRecorded: typedRow.total_hours_recorded ?? 0,
    drivenHours: typedRow.driven_hours ?? undefined,
    plannedHours: typedRow.planned_hours ?? undefined,
    examsPassed: typedRow.exams_passed ?? 0,
    hoursBreakdown: (hoursData?.hours_breakdown as HoursBreakdownItem[] | null) ?? undefined,
    totalExpectedAmount: typedRow.total_expected_amount ?? 0,
    totalAmountPaid: typedRow.total_amount_paid ?? 0,
    remainingDue: typedRow.remaining_due ?? 0,
    calculatedUnitPrice: typedRow.calculated_unit_price ?? 0,
    theoreticalCatalogTotal: typedRow.theoretical_catalog_total ?? 0,
    revenueGap: typedRow.revenue_gap ?? 0,
    reportStatus: typedRow.report_status as AnalysisRecord['reportStatus'],
    summary: typedRow.summary ?? '',
    discrepancies: (typedRow.discrepancies as string[]) ?? [],
    recommendations: (typedRow.recommendations as string[]) ?? [],
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/analyse">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {analysis.aiExtractedName || analysis.studentName || analysis.fileName}
          </h1>
          <p className="text-xs text-slate-500">
            Analysé le {new Date(analysis.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      <AnalyseReportDisplay analysis={analysis} isAdmin={isAdmin} coutHoraire={coutHoraire} />
    </div>
  )
}
