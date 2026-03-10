'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { analyseDocument } from '@/lib/gemini/analyse-document'
import { findOrCreateStudent } from '@/actions/student'
import type { CatalogSnapshot } from '@/lib/types/analyse'
import type { Json } from '@/lib/types/database'

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

async function fetchAiSettings(adminClient: ReturnType<typeof createAdminClient>) {
  const { data } = await adminClient
    .from('school_settings')
    .select('ai_software_name, ai_custom_instructions, ai_system_prompt, ai_model')
    .limit(1)
    .single()
  if (!data) return undefined
  return {
    softwareName: data.ai_software_name,
    customInstructions: data.ai_custom_instructions,
    systemPrompt: data.ai_system_prompt,
    aiModel: data.ai_model,
  }
}

// ── Action principale : upload → Gemini → Supabase (synchrone) ─────────────
export async function uploadAndAnalyseFile(formData: FormData): Promise<{
  analysisId?: string
  error?: string
}> {
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

  const adminClient = createAdminClient()

  // 1. Créer l'enregistrement
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

  // 2. Gemini (synchrone — les File objects sont encore valides)
  try {
    const { text: catalogContext, snapshot: catalogSnapshot } = await buildCatalogContext()
    const aiSettings = await fetchAiSettings(adminClient)

    const result = await analyseDocument(files, {
      studentName: studentNameInput ?? undefined,
      userComments: userComments ?? undefined,
      catalogContext,
    }, aiSettings)

    const studentName = result.aiExtractedName || studentNameInput
    let studentId: string | null = null
    if (studentName) studentId = await findOrCreateStudent(studentName)

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
        catalog_snapshot: catalogSnapshot as unknown as Json,
        status: 'done',
      })
      .eq('id', analysisId)

    revalidatePath('/analyse')
    revalidatePath('/dashboard')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error(`[AI Analysis] uploadAndAnalyse error for ${analysisId}:`, message)
    try {
      await adminClient
        .from('ai_analyses')
        .update({ status: 'error', error_message: message })
        .eq('id', analysisId)
    } catch (dbErr) {
      console.error(`[AI Analysis] Failed to save error status for ${analysisId}:`, dbErr)
    }
  }

  return { analysisId }
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

// ── Re-analyser un dossier existant (synchrone) ──────────────────────────────
export async function reAnalyseExisting(
  analysisId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Non authentifié' }

  const files = formData.getAll('files') as File[]
  if (!files.length) return { error: 'Aucun fichier fourni' }

  const correctionComment = (formData.get('correction_comment') as string) || ''
  const adminClient = createAdminClient()

  // 1. Contexte original
  const { data: original, error: fetchErr } = await adminClient
    .from('ai_analyses')
    .select('student_name_input, agency, instructor_type, user_comments')
    .eq('id', analysisId)
    .single()

  if (fetchErr || !original) return { error: 'Analyse introuvable' }

  // 2. Commentaire fusionné
  const mergedComment = [
    correctionComment ? `⚠️ CORRECTION COLLABORATEUR :\n${correctionComment}` : null,
    original.user_comments ? `Note initiale :\n${original.user_comments}` : null,
  ].filter(Boolean).join('\n\n') || null

  // 3. Passer en processing
  await adminClient
    .from('ai_analyses')
    .update({ status: 'processing', error_message: null })
    .eq('id', analysisId)

  // 4. Gemini (synchrone)
  try {
    const { text: catalogContext, snapshot: catalogSnapshot } = await buildCatalogContext()
    const aiSettings = await fetchAiSettings(adminClient)

    const result = await analyseDocument(files, {
      studentName: original.student_name_input ?? undefined,
      userComments: mergedComment ?? undefined,
      catalogContext,
    }, aiSettings)

    const studentName = result.aiExtractedName || original.student_name_input
    let studentId: string | null = null
    if (studentName) studentId = await findOrCreateStudent(studentName)

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
        catalog_snapshot: catalogSnapshot as unknown as Json,
        user_comments: mergedComment,
        is_validated: false,
        validated_at: null,
        validated_by: null,
        status: 'done',
      })
      .eq('id', analysisId)

    revalidatePath(`/analyse/${analysisId}`)
    revalidatePath('/dashboard')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error(`[AI Analysis] reAnalyse error for ${analysisId}:`, message)
    try {
      await adminClient
        .from('ai_analyses')
        .update({ status: 'error', error_message: message })
        .eq('id', analysisId)
    } catch (dbErr) {
      console.error(`[AI Analysis] Failed to save error status for ${analysisId}:`, dbErr)
    }
  }

  return { success: true }
}

// ── Réinitialiser une analyse bloquée en processing ─────────────────────────
export async function resetAnalysis(analysisId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('ai_analyses')
    .update({ status: 'error', error_message: 'Analyse interrompue — veuillez re-analyser le document' })
    .eq('id', analysisId)

  if (error) return { error: error.message }
  revalidatePath(`/analyse/${analysisId}`)
  return { success: true }
}

// ── Réinitialiser toutes les analyses bloquées en processing ─────────────────
export async function resetAllStuckAnalyses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const { error, data } = await adminClient
    .from('ai_analyses')
    .update({ status: 'error', error_message: 'Analyse interrompue — veuillez re-analyser le document' })
    .eq('status', 'processing')
    .select('id')

  if (error) return { error: error.message }
  revalidatePath('/analyse')
  return { success: true, count: data?.length ?? 0 }
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
