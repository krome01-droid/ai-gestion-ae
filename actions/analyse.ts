'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { analyseDocument } from '@/lib/gemini/analyse-document'
import { findOrCreateStudent } from '@/actions/student'
import type { CatalogSnapshot } from '@/lib/types/analyse'

const today = () => new Date().toISOString().split('T')[0]

// Construit le texte du catalogue depuis Supabase (service_role — bypass RLS)
async function buildCatalogContext(): Promise<{
  text: string
  snapshot: CatalogSnapshot[]
}> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('catalog_prices')
    .select('service_name, price_ht')
    .or(`valid_to.is.null,valid_to.gte.${today()}`)
    .order('service_name')

  const rows = (data ?? []) as Array<{ service_name: string; price_ht: number }>
  const text = rows.map(r => `- ${r.service_name} : ${r.price_ht}€`).join('\n')
  return { text, snapshot: rows }
}

// ── Action principale : upload → Gemini → Supabase ─────────────────────────
export async function uploadAndAnalyseFile(formData: FormData): Promise<{
  analysisId?: string
  error?: string
}> {
  // Auth check avec client SSR (anon key + cookie)
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Non authentifié' }

  const files = formData.getAll('files') as File[]
  if (!files.length) return { error: 'Aucun fichier fourni' }

  const studentNameInput = (formData.get('student_name') as string) || null
  const agency = (formData.get('agency') as string) || null
  const instructorType = (formData.get('instructor_type') as string) || 'salarie'
  const userComments = (formData.get('user_comments') as string) || null

  const primaryFile = files[0]
  const fileType = primaryFile.type.includes('pdf')
    ? 'pdf'
    : primaryFile.type.includes('image')
      ? 'image'
      : 'csv'

  // Toutes les opérations DB via adminClient (service_role, bypass RLS)
  const adminClient = createAdminClient()

  // 1. Insérer l'enregistrement en status 'processing'
  const { data: inserted, error: insertErr } = await adminClient
    .from('ai_analyses')
    .insert({
      created_by: user.id,
      file_name: primaryFile.name,
      file_type: fileType,
      student_name_input: studentNameInput,
      agency,
      instructor_type: instructorType,
      user_comments: userComments,
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertErr || !inserted) return { error: `Erreur création: ${insertErr?.message ?? 'inconnue'}` }
  const analysisId = inserted.id

  try {
    // 2. Récupérer le catalogue actuel
    const { text: catalogContext, snapshot: catalogSnapshot } = await buildCatalogContext()

    // 3. Récupérer les réglages IA
    const { data: aiSettingsData } = await adminClient
      .from('school_settings')
      .select('ai_software_name, ai_custom_instructions, ai_system_prompt')
      .limit(1)
      .single()

    const aiSettings = aiSettingsData ? {
      softwareName: aiSettingsData.ai_software_name,
      customInstructions: aiSettingsData.ai_custom_instructions,
      systemPrompt: aiSettingsData.ai_system_prompt,
    } : undefined

    // 4. Appeler Gemini
    const result = await analyseDocument(files, {
      studentName: studentNameInput ?? undefined,
      userComments: userComments ?? undefined,
      catalogContext,
    }, aiSettings)

    // 5. Trouver ou créer l'élève
    const studentName = result.aiExtractedName || studentNameInput
    let studentId: string | null = null
    if (studentName) {
      studentId = await findOrCreateStudent(studentName)
    }

    // 6. Mettre à jour l'analyse avec les résultats
    await adminClient
      .from('ai_analyses')
      .update({
        student_id: studentId,
        ai_extracted_name: result.aiExtractedName ?? null,
        total_hours_recorded: result.totalHoursRecorded,
        driven_hours: result.drivenHours ?? null,
        planned_hours: result.plannedHours ?? null,
        exams_passed: result.examsPassed ?? 0,
        total_expected_amount: result.totalExpectedAmount,
        total_amount_paid: result.totalAmountPaid,
        remaining_due: result.remainingDue,
        calculated_unit_price: result.calculatedUnitPrice,
        theoretical_catalog_total: result.theoreticalCatalogTotal,
        revenue_gap: result.revenueGap,
        report_status: result.reportStatus,
        summary: result.summary,
        discrepancies: result.discrepancies,
        recommendations: result.recommendations,
        catalog_snapshot: catalogSnapshot as unknown as import('@/lib/types/database').Json,
        status: 'done',
      })
      .eq('id', analysisId)

    revalidatePath('/analyse')
    revalidatePath('/dashboard')
    return { analysisId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    await adminClient
      .from('ai_analyses')
      .update({ status: 'error', error_message: message })
      .eq('id', analysisId)
    return { error: message }
  }
}

// ── Valider une analyse ──────────────────────────────────────────────────────
export async function validateAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('ai_analyses')
    .update({ is_validated: true, validated_at: new Date().toISOString(), validated_by: user.id })
    .eq('id', analysisId)

  if (error) return { error: error.message }
  revalidatePath(`/analyse/${analysisId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

// ── Supprimer une analyse ────────────────────────────────────────────────────
export async function deleteAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('ai_analyses').delete().eq('id', analysisId)
  if (error) return { error: error.message }
  revalidatePath('/analyse')
  return { success: true }
}
