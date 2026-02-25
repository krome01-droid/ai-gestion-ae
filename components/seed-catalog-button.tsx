'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { seedDefaultCatalog } from '@/actions/catalog'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'

export function SeedCatalogButton() {
  const [loading, setLoading] = useState(false)

  const handleSeed = async () => {
    if (!confirm('Importer les 80+ prestations par défaut ? (Ne supprime pas les existantes)')) return
    setLoading(true)
    const result = await seedDefaultCatalog()
    if (result.error) toast.error(result.error)
    else toast.success(`${result.count} prestations importées`)
    setLoading(false)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSeed} disabled={loading}>
      <Database className="mr-1 h-4 w-4" />
      {loading ? 'Import...' : 'Importer catalogue'}
    </Button>
  )
}
