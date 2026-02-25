'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const TODAY = new Date().toISOString().split('T')[0]

const DEFAULT_CATALOG = [
  // Heures supplémentaires & Packs (Agence Centrale)
  { service_name: "Agence Centrale - 10h B heures supplémentaires", price_ht: 650 },
  { service_name: "Agence Centrale - 10h BEA heures supplémentaires", price_ht: 690 },
  { service_name: "Agence Centrale - 4h B heures supplémentaires", price_ht: 260 },
  { service_name: "Agence Centrale - 4h BEA heures supplémentaires", price_ht: 276 },
  { service_name: "Agence Centrale - 6h B heures supplémentaires", price_ht: 390 },
  { service_name: "Agence Centrale - 6h BEA heures supplémentaires", price_ht: 414 },
  // Modules spécifiques
  { service_name: "Agence Centrale - Annulation de permis B 10h", price_ht: 659 },
  { service_name: "Agence Centrale - Annulation de permis BEA 8h", price_ht: 569 },
  { service_name: "Agence Centrale - Module repassage permis B 10h", price_ht: 759 },
  { service_name: "Agence Centrale - Module repassage permis BEA 8h", price_ht: 669 },
  { service_name: "Melun - B annulation de permis 10h (14L)", price_ht: 950 },
  { service_name: "Melun - Stage Repassage Permis B", price_ht: 790 },
  { service_name: "Melun - Stage Repassage Permis BEA", price_ht: 890 },
  // Stages accélérés (Agence Centrale)
  { service_name: "Agence Centrale - Stage accéléré B 20h (27L)", price_ht: 1409 },
  { service_name: "Agence Centrale - Stage accéléré B 25h (34L)", price_ht: 1739 },
  { service_name: "Agence Centrale - Stage accéléré B 30h (40L)", price_ht: 2069 },
  { service_name: "Agence Centrale - Stage accéléré B 40h", price_ht: 2809 },
  { service_name: "Agence Centrale - Stage accéléré BEA 13h (18L)", price_ht: 1089 },
  { service_name: "Agence Centrale - Stage accéléré BEA 20h (27L)", price_ht: 1509 },
  { service_name: "Agence Centrale - Stage accéléré BEA 25h (34L)", price_ht: 1869 },
  { service_name: "Agence Centrale - Stage accéléré BEA 30h (40L)", price_ht: 2219 },
  { service_name: "Agence Centrale - Stage accéléré BEA 40h", price_ht: 3009 },
  // Moto & 2 roues
  { service_name: "Agence Centrale - Stage accéléré moto A1/A2 3j (21h)", price_ht: 1039 },
  { service_name: "Agence Centrale - Stage initiation 125cc 1j (7h)", price_ht: 319 },
  { service_name: "Agence Centrale - Stage passerelle A2 vers A 1j (7h)", price_ht: 319 },
  { service_name: "Agence Centrale - Stage passerelle BEA vers B (7h)", price_ht: 419 },
  { service_name: "Agence Centrale - Stage permis AM 50cc 2j (8h)", price_ht: 359 },
  // CPF Agence Centrale
  { service_name: "CPF - B 10 leçons (8h)", price_ht: 630 },
  { service_name: "CPF - B Module examen (6L/5h)", price_ht: 390 },
  { service_name: "CPF - BEA 10 leçons (8h)", price_ht: 650 },
  { service_name: "CPF - BEA Module examen (6L/5h)", price_ht: 420 },
  { service_name: "CPF - Moto A2 Forfait 21h", price_ht: 1290 },
  { service_name: "CPF - Moto A2 Forfait 24h", price_ht: 1390 },
  { service_name: "CPF - Stage Code Live accéléré 1 jour", price_ht: 199 },
  { service_name: "CPF agence centrale - B 10h (14L)", price_ht: 804 },
  { service_name: "CPF agence centrale - B 20h (27L)", price_ht: 1499 },
  { service_name: "CPF agence centrale - B 25h (34L)", price_ht: 1879 },
  { service_name: "CPF agence centrale - B 30h (40L)", price_ht: 2229 },
  { service_name: "CPF agence centrale - BEA 10h (14L)", price_ht: 864 },
  { service_name: "CPF agence centrale - BEA 13h (18L)", price_ht: 1199 },
  { service_name: "CPF agence centrale - BEA 20h (27L)", price_ht: 1669 },
  { service_name: "CPF agence centrale - BEA 25h (34L)", price_ht: 2049 },
  { service_name: "CPF agence centrale - BEA 30h (40L)", price_ht: 2402 },
  // Melun
  { service_name: "Melun - B 10 leçons (8h)", price_ht: 480 },
  { service_name: "Melun - B 20h (27L)", price_ht: 1340 },
  { service_name: "Melun - B 30h (39L)", price_ht: 1990 },
  { service_name: "Melun - B AAC 25h (27L)", price_ht: 1990 },
  { service_name: "Melun - BEA AAC 25h (27L)", price_ht: 2150 },
  { service_name: "Melun - BEA 10 leçons (8h)", price_ht: 500 },
  { service_name: "Melun - BEA 13h (18L)", price_ht: 1040 },
  { service_name: "Melun - BEA 20h (27L)", price_ht: 1440 },
  { service_name: "Melun - BEA 30h (39L)", price_ht: 2160 },
  { service_name: "Melun - Module conduite supervisée", price_ht: 410 },
  { service_name: "Melun - Module examen B", price_ht: 390 },
  { service_name: "Melun - Module examen BEA", price_ht: 420 },
  { service_name: "Melun - Moto perfectionnement circuit", price_ht: 99 },
  { service_name: "Melun - Permis Moto INRI'S Expérience 2025 - A1/A2", price_ht: 990 },
  { service_name: "Melun - Stage accéléré 30h 5j - A1/A2", price_ht: 1200 },
  { service_name: "Melun - Stage accéléré B 5j 20h (27L)", price_ht: 1309 },
  { service_name: "Melun - Stage accéléré BEA 3j 13h (18L)", price_ht: 989 },
  { service_name: "Melun - Stage accéléré BEA 5j 20h (27L)", price_ht: 1409 },
  { service_name: "Melun - Stage passerelle A2 vers A (7h)", price_ht: 319 },
  { service_name: "Melun - Stage passerelle BEA vers B (7h)", price_ht: 419 },
  { service_name: "Melun - Stage permis AM (8h)", price_ht: 359 },
  // CPF Melun
  { service_name: "Melun CPF - B 20h (27L)", price_ht: 1499 },
  { service_name: "Melun CPF - B 25h (35L)", price_ht: 1879 },
  { service_name: "Melun CPF - B 30h (39L)", price_ht: 2229 },
  { service_name: "Melun CPF - BEA 13h (18L)", price_ht: 1199 },
  { service_name: "Melun CPF - BEA 20h (27L)", price_ht: 1669 },
  { service_name: "Melun CPF - BEA 25h (35L)", price_ht: 2049 },
  { service_name: "Melun CPF - BEA 30h (39L)", price_ht: 2402 },
  // Autres forfaits & partenariats
  { service_name: "FORFAIT CODE", price_ht: 270 },
  { service_name: "Forfait Privilège - 20h B", price_ht: 1200 },
  { service_name: "France Travail Stage accéléré B 30h (40L)", price_ht: 1729 },
  { service_name: "France Travail Stage accéléré BEA 20h (27) + Passerelle BEA - B", price_ht: 1828 },
  { service_name: "Lycée Gabriel Stage accéléré 16h BEA", price_ht: 1160 },
  // Divers
  { service_name: "Module conduite supervisée B", price_ht: 190 },
  { service_name: "Module conduite supervisée BEA", price_ht: 200 },
  { service_name: "Pack 16 Leçons Plateau moto (12h)", price_ht: 600 },
  { service_name: "Pass Priority", price_ht: 390 },
  { service_name: "Reprise de guidon (perfectionnement)", price_ht: 449 },
  // Leçon unitaire
  { service_name: "Leçon conduite unitaire B (1h)", price_ht: 65 },
  { service_name: "Leçon conduite unitaire BEA (1h)", price_ht: 69 },
  // Migration logiciel
  { service_name: "Prestation ancien outil", price_ht: 0 },
  { service_name: "Prestation payée ancien outil", price_ht: 0 },
]

export async function addCatalogPrice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase.from('catalog_prices').insert({
    service_name: formData.get('service_name') as string,
    price_ht: parseFloat(formData.get('price_ht') as string),
    valid_from: (formData.get('valid_from') as string) || TODAY,
    valid_to: (formData.get('valid_to') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/catalog')
  return { success: true }
}

export async function updateCatalogPrice(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase
    .from('catalog_prices')
    .update({
      service_name: formData.get('service_name') as string,
      price_ht: parseFloat(formData.get('price_ht') as string),
      valid_from: (formData.get('valid_from') as string) || TODAY,
      valid_to: (formData.get('valid_to') as string) || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/catalog')
  return { success: true }
}

export async function deleteCatalogPrice(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase.from('catalog_prices').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/catalog')
  return { success: true }
}

export async function seedDefaultCatalog() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Non autorisé' }
  }

  const rows = DEFAULT_CATALOG.map(item => ({
    service_name: item.service_name,
    price_ht: item.price_ht,
    valid_from: TODAY,
    valid_to: null,
  }))

  const { error } = await supabase.from('catalog_prices').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/catalog')
  return { success: true, count: rows.length }
}
