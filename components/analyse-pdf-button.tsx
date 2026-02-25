'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { generatePDF } from '@/lib/pdf/generate-report'
import type { AnalysisRecord } from '@/lib/types/analyse'

interface AnalysePdfButtonProps {
  analysis: AnalysisRecord
}

export function AnalysePdfButton({ analysis }: AnalysePdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await generatePDF(analysis)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1 h-4 w-4" />
      )}
      PDF
    </Button>
  )
}
