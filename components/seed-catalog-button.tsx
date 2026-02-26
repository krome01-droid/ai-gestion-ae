'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { seedDefaultCatalog } from '@/actions/catalog'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'

export function SeedCatalogButton() {
  const [loading, setLoading] = useState(false)
  const [asked, setAsked] = useState(false)

  const handleSeed = async () => {
    if (!asked) {
      setAsked(true)
      setTimeout(() => setAsked(false), 4000)
      return
    }
    setAsked(false)
    setLoading(true)
    const result = await seedDefaultCatalog()
    if (result.error) toast.error(result.error)
    else toast.success(`${result.count} prestations importées`)
    setLoading(false)
  }

  return (
    <Button size="sm" variant={asked ? 'destructive' : 'outline'} onClick={handleSeed} disabled={loading}>
      <Database className="mr-1 h-4 w-4" />
      {loading ? 'Import...' : asked ? 'Confirmer ?' : 'Importer catalogue'}
    </Button>
  )
}
