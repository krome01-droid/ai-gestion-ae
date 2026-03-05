'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resetAnalysis } from '@/actions/analyse'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function ResetAnalysisButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    setLoading(true)
    const result = await resetAnalysis(analysisId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('Analyse réinitialisée')
      router.refresh()
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleReset} disabled={loading}>
      <RotateCcw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Réinitialiser
    </Button>
  )
}
