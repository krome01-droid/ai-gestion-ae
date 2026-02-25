'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteCatalogPrice } from '@/actions/catalog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function CatalogDeleteButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Supprimer cette prestation ?')) return
    setLoading(true)
    const result = await deleteCatalogPrice(id)
    if (result.error) toast.error(result.error)
    else toast.success('Prestation supprimée')
    setLoading(false)
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="text-red-500 hover:text-red-700 hover:bg-red-50">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
