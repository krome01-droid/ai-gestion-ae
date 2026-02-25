'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addCatalogPrice } from '@/actions/catalog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function CatalogAddDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const result = await addCatalogPrice(new FormData(e.currentTarget))
    if (result.error) toast.error(result.error)
    else { toast.success('Prestation ajoutée'); setOpen(false) }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une prestation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nom de la prestation</Label>
            <Input name="service_name" required placeholder="ex: Leçon conduite B (1h)" />
          </div>
          <div className="space-y-1.5">
            <Label>Prix HT (€)</Label>
            <Input name="price_ht" type="number" step="0.01" required placeholder="65.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valide depuis</Label>
              <Input name="valid_from" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>Valide jusqu&apos;au (optionnel)</Label>
              <Input name="valid_to" type="date" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ajout...' : 'Ajouter'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
