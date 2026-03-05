'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { resetAllStuckAnalyses } from '@/actions/analyse'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export function ResetAllButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handle = async () => {
    setLoading(true)
    const result = await resetAllStuckAnalyses()
    if (result.error) toast.error(result.error)
    else toast.success(`${result.count ?? 0} analyse(s) réinitialisée(s) — utilisez "Re-analyser" pour chacune`)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button size="sm" variant="outline" onClick={handle} disabled={loading}>
      <RotateCcw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Réinitialiser tout
    </Button>
  )
}
