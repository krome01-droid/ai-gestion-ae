'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createUser } from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus } from 'lucide-react'

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const result = await createUser(new FormData(e.currentTarget))
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Utilisateur créé')
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Créer un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="prenom@auto-ecole.fr" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" placeholder="Min. 6 caractères" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Rôle</Label>
            <select
              name="role"
              id="role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            >
              <option value="user">Collaborateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Création...' : 'Créer le compte'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
