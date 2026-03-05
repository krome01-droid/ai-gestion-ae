'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadAndAnalyseFile } from '@/actions/analyse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, Loader2, X } from 'lucide-react'

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

export function AnalyseUploadForm({ students }: { students: Array<{ id: string; full_name: string }> }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const valid = Array.from(newFiles).filter(f => ACCEPTED_TYPES.includes(f.type))
    setFiles(prev => [...prev, ...valid])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!files.length) {
      toast.error('Veuillez ajouter au moins un fichier')
      return
    }

    setIsLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    files.forEach(f => formData.append('files', f))

    const result = await uploadAndAnalyseFile(formData)

    if (result.error) {
      toast.error(`Erreur : ${result.error}`)
      setIsLoading(false)
      return
    }

    toast.info('Analyse lancée, résultat dans quelques instants…')
    router.push(`/analyse/${result.analysisId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="font-medium text-slate-700">Déposez vos fichiers ici</p>
        <p className="mt-1 text-sm text-slate-500">PDF, image (PNG/JPG/WEBP), CSV, Excel</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <Card key={i} className="py-0">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} Ko)</span>
                </div>
                <button type="button" onClick={() => removeFile(i)}>
                  <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contexte élève */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="student_name">Nom de l&apos;élève</Label>
          <Input id="student_name" name="student_name" placeholder="ex: DUPONT Thomas" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agency">Agence</Label>
          <Input id="agency" name="agency" placeholder="ex: Centrale, Melun..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instructor_type">Type de moniteur</Label>
          <Select name="instructor_type" defaultValue="salarie">
            <SelectTrigger id="instructor_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salarie">Salarié</SelectItem>
              <SelectItem value="independant">Indépendant</SelectItem>
              <SelectItem value="mixte">Mixte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {students.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="student_id">Lier à un élève existant (optionnel)</Label>
            <Select name="student_id">
              <SelectTrigger id="student_id">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="user_comments">Instructions pour l&apos;IA (optionnel)</Label>
        <Textarea
          id="user_comments"
          name="user_comments"
          placeholder="ex: Cet élève a bénéficié d'une remise exceptionnelle de 50€..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isLoading || files.length === 0} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyse en cours...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Lancer l&apos;analyse IA
          </>
        )}
      </Button>
    </form>
  )
}
