import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CatalogAddDialog } from '@/components/catalog-add-dialog'
import { CatalogDeleteButton } from '@/components/catalog-delete-button'
import { SeedCatalogButton } from '@/components/seed-catalog-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  const today = new Date().toISOString().split('T')[0]
  const { data: items } = await supabase
    .from('catalog_prices')
    .select('id, service_name, price_ht, valid_from, valid_to')
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order('service_name')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogue</h1>
          <p className="text-sm text-slate-500">{items?.length ?? 0} prestation(s) active(s)</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <SeedCatalogButton />
            <CatalogAddDialog />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Tarifs en vigueur
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!items?.length ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Aucun tarif configuré. Utilisez &ldquo;Importer catalogue&rdquo; pour charger les 80+ prestations par défaut.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Prestation</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Prix HT</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Valide depuis</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Valide jusqu&apos;au</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-900">{item.service_name}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{formatCurrency(item.price_ht)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(item.valid_from)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{item.valid_to ? formatDate(item.valid_to) : '∞'}</td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        <CatalogDeleteButton id={item.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
