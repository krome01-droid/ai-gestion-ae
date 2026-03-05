export const maxDuration = 300

import { createClient } from '@/lib/supabase/server'
import { AnalyseUploadForm } from '@/components/analyse-upload-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSearch } from 'lucide-react'

export default async function NewAnalysePage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .order('full_name')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle analyse IA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Uploadez le dossier comptable de l&apos;élève. L&apos;IA extraira toutes les métriques financières.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" />
            Document(s) à analyser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyseUploadForm students={students ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
