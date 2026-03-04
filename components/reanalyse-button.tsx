'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { reAnalyseExisting } from '@/actions/analyse'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, X } from 'lucide-react'

export function ReAnalyseButton({ analysisId }: { analysisId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await reAnalyseExisting(analysisId, fd)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('Re-analyse lancée')
      setOpen(false)
      router.refresh()
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Re-analyser
      </Button>
    )
  }

  return (
    <div className="w-full mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-800">Corriger l&apos;interprétation de l&apos;IA</p>
        <button type="button" onClick={() => setOpen(false)} className="text-amber-600 hover:text-amber-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          name="correction_comment"
          rows={3}
          placeholder="Ex : L'élève a souscrit une Formule 20h + code à 800€. Ne pas comparer au taux horaire unitaire."
          className="text-sm bg-white"
        />
        <div className="space-y-1">
          <p className="text-xs text-amber-700 font-medium">Re-uploader le document</p>
          <input
            name="files"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls"
            multiple
            required
            className="text-xs text-slate-600"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading} className="w-full">
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Re-analyse en cours...' : 'Lancer la re-analyse'}
        </Button>
      </form>
    </div>
  )
}
