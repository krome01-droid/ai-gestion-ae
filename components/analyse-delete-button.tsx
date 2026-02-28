'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteAnalysis } from '@/actions/analyse'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function AnalyseDeleteButton({ id, name }: { id: string; name: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Supprimer l'audit "${name}" ? Cette action est irréversible.`)) return
    setLoading(true)
    const result = await deleteAnalysis(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Audit supprimé')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
