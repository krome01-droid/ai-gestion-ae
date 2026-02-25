import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileSearch, Plus } from 'lucide-react'

export default async function CollaborateurPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recentAnalyses } = await supabase
    .from('ai_analyses')
    .select('id, student_name_input, ai_extracted_name, report_status, created_at, file_name')
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon espace</h1>
          <p className="text-slate-500 text-sm">Vos analyses récentes</p>
        </div>
        <Button asChild>
          <Link href="/analyse/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle analyse
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4" />
            Analyses récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentAnalyses?.length ? (
            <p className="text-center text-slate-400 py-8">Aucune analyse pour l&apos;instant.</p>
          ) : (
            <div className="space-y-2">
              {recentAnalyses.map((a) => (
                <Link
                  key={a.id}
                  href={`/analyse/${a.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-sm">
                    {a.ai_extracted_name || a.student_name_input || a.file_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.report_status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                    a.report_status === 'DISCREPANCY' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {a.report_status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
