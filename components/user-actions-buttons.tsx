'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateUserRole, deleteUser } from '@/actions/users'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  currentRole: string
  isSelf: boolean
}

export function UserActionsButtons({ userId, currentRole, isSelf }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRoleToggle = async () => {
    setLoading('role')
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const result = await updateUserRole(userId, newRole)
    if (result.error) toast.error(result.error)
    else toast.success(newRole === 'admin' ? 'Promu administrateur' : 'Rétrogradé utilisateur')
    setLoading(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    setConfirmDelete(false)
    setLoading('delete')
    const result = await deleteUser(userId)
    if (result.error) toast.error(result.error)
    else toast.success('Utilisateur supprimé')
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={!!loading || isSelf}
        onClick={handleRoleToggle}
        className="text-xs"
      >
        {loading === 'role'
          ? '...'
          : currentRole === 'admin'
            ? 'Rétrograder'
            : 'Promouvoir admin'}
      </Button>
      <Button
        size="sm"
        variant={confirmDelete ? 'destructive' : 'ghost'}
        disabled={!!loading || isSelf}
        onClick={handleDelete}
        className="text-xs"
      >
        {loading === 'delete' ? '...' : confirmDelete ? 'Confirmer ?' : 'Supprimer'}
      </Button>
    </div>
  )
}
