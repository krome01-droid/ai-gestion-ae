export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileSearch } from 'lucide-react'
import { ResetAllButton } from '@/components/reset-all-button'
import { AnalyseListClient } from '@/components/analyse-list-client'

type AnalyseListRow = {
  id: string
  student_name_input: string | null
  ai_extracted_name: string | null
  file_name: string
  report_status: string
  remaining_due: number | null
  total_hours_recorded: number | null
  agency: string | null
  created_at: string
  is_validated: boolean
  status: string
  profiles: { email: string; full_name: string } | null
}

export default async function AnalyseListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  const adminClient = createAdminClient()

  const { data: raw } = await adminClient
    .from('ai_analyses')
    .select('id, student_name_input, ai_extracted_name, file_name, report_status, remaining_due, total_hours_recorded, agency, created_at, is_validated, status, profiles!created_by(email, full_name)')
    .order('created_at', { ascending: false })

  const analyses = (raw ?? []) as unknown as AnalyseListRow[]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyses IA</h1>
          <p className="text-sm text-slate-500">{analyses.length} analyse(s) enregistrée(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && analyses.some(a => a.status === 'processing') && (
            <ResetAllButton />
          )}
          <Button asChild>
            <Link href="/analyse/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle analyse
            </Link>
          </Button>
        </div>
      </div>

      {!analyses.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <FileSearch className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucune analyse pour l&apos;instant</p>
          <p className="mt-1 text-sm text-slate-400">Commencez par uploader un dossier élève.</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/analyse/new">Lancer une analyse</Link>
          </Button>
        </div>
      ) : (
        <AnalyseListClient analyses={analyses} isAdmin={isAdmin} />
      )}
    </div>
  )
}
