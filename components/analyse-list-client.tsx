'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertCircle, Search, X, FileSearch } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AnalyseDeleteButton } from '@/components/analyse-delete-button'

const STATUS_LABELS = {
  VERIFIED:    { label: 'Conforme',  className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  DISCREPANCY: { label: 'Anomalie',  className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  UNCERTAIN:   { label: 'Incertain', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
}

type AnalyseListRow = {
  id: string
  student_name_input: string | null
  ai_extracted_name: string | null
  file_name: string
  report_status: string
  remaining_due: number | null
  total_hours_recorded: number | null
  agency: string | null
  created_at: string
  is_validated: boolean
  status: string
  profiles: { email: string; full_name: string } | null
}

type Props = {
  analyses: AnalyseListRow[]
  isAdmin: boolean
}

export function AnalyseListClient({ analyses, isAdmin }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [agencyFilter, setAgencyFilter] = useState('all')

  const agencies = useMemo(
    () => [...new Set(analyses.map(a => a.agency).filter(Boolean))] as string[],
    [analyses]
  )

  const filtered = useMemo(() => {
    return analyses.filter(a => {
      const name = (a.ai_extracted_name || a.student_name_input || a.file_name || '').toLowerCase()
      const matchesSearch = !search || name.includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'processing' ? a.status === 'processing' :
        statusFilter === 'error'      ? a.status === 'error' :
        a.status === 'done' && a.report_status === statusFilter

      const matchesAgency =
        agencyFilter === 'all' ? true : a.agency === agencyFilter

      return matchesSearch && matchesStatus && matchesAgency
    })
  }, [analyses, search, statusFilter, agencyFilter])

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || agencyFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setStatusFilter('all')
    setAgencyFilter('all')
  }

  return (
    <div className="space-y-4">
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un élève…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="VERIFIED">Conforme</SelectItem>
            <SelectItem value="DISCREPANCY">Anomalie</SelectItem>
            <SelectItem value="UNCERTAIN">Incertain</SelectItem>
            <SelectItem value="processing">En cours</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
          </SelectContent>
        </Select>

        {agencies.length > 0 && (
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map(ag => (
                <SelectItem key={ag} value={ag}>{ag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="text-sm text-slate-500 ml-auto">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500 gap-1">
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <FileSearch className="mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-500">Aucun résultat pour ces filtres</p>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3">
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Élève</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Agence</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Heures</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Reste à payer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Créé par</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => {
                const name = a.ai_extracted_name || a.student_name_input || a.file_name
                const isDone = a.status === 'done'
                const isProcessing = a.status === 'processing'
                const isError = a.status === 'error'
                const s = isDone
                  ? (STATUS_LABELS[a.report_status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.UNCERTAIN)
                  : null
                const creator = a.profiles?.full_name
                  || a.profiles?.email?.split('@')[0]
                  || '—'

                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {name}
                      {a.is_validated && (
                        <span className="ml-2 text-xs text-green-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.agency ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {isDone && a.total_hours_recorded != null ? `${a.total_hours_recorded.toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isDone ? (
                        <span className={a.remaining_due != null && a.remaining_due > 0 ? 'font-semibold text-red-600' : 'text-slate-700'}>
                          {a.remaining_due != null ? formatCurrency(a.remaining_due) : '—'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isProcessing && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 flex items-center gap-1 w-fit">
                          <Loader2 className="h-3 w-3 animate-spin" /> En cours…
                        </Badge>
                      )}
                      {isError && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" /> Erreur
                        </Badge>
                      )}
                      {s && <Badge className={s.className}>{s.label}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{creator}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/analyse/${a.id}`}>Voir</Link>
                        </Button>
                        {isAdmin && (
                          <AnalyseDeleteButton id={a.id} name={name} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
