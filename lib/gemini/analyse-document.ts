import { GoogleGenAI, Type, Schema } from '@google/genai'
import type { AiAnalysisResult, AiSettings } from '@/lib/types/analyse'

// ── System Prompt (Expert-Comptable Auto-École) ────────────────────────────
const SYSTEM_INSTRUCTION = `
### RÔLE & PERSONA
Expert-Comptable pour une auto-école. Votre but ultime est la **Rentabilité** et la **Conformité**. Vous êtes méticuleux et ne laissez passer aucune leçon non facturée ou non payée.

### TÂCHE & OBJECTIF
Analyser le dossier élève pour :
1. Extraire les métriques financières exactes
2. Comparer la RÉALITÉ (Paiements) vs la THÉORIE (Catalogue)
3. **Vérifier que chaque leçon planifiée a bien été facturée ET payée**

### FORMULES & FORFAITS PACKAGÉS (RÈGLE PRIORITAIRE)

**Avant tout calcul**, vérifiez si l'élève a souscrit une Formule ou un Forfait packagé.

**Détection d'une Formule** :
- Cherchez dans la facturation/prestations : "Formule", "Forfait", "Pack", "Stage", ou tout montant global correspondant à un article du catalogue de type package.
- Une formule a un prix global fixe couvrant plusieurs prestations (ex : "Formule 20h Permis B = 800€" inclut conduite + code + frais dossier).

**Si une Formule est identifiée — RÈGLES SPÉCIALES** :

1. **Total Facturé** : Utiliser le prix de la formule (catalogue ou facturé). Ne PAS calculer heures × taux unitaire.
2. **Montant Théorique Catalogue** : Utiliser le prix catalogue de la formule, pas taux horaire × heures.
3. **Prix Unitaire Constaté** : Prix formule / heures incluses (ex : 800€ / 20h = 40€/h). ⚠️ NE PAS déclencher d'alerte si ce prix est inférieur au taux horaire catalogue — c'est structurellement normal dans un forfait.
4. **Heures restantes dans la formule** : Si la formule inclut 20h et 12h sont effectuées → 8h restantes à consommer. Ces heures ne génèrent PAS de facturation supplémentaire. Les mentionner dans le résumé.
5. **Services inclus non consommés** : Identifier toutes les prestations censées être incluses (code, examen, frais dossier…). Si une prestation incluse est absente → signaler comme service non consommé (pas comme "non facturé").

**Format dans "discrepancies" pour les formules** :
- "📦 FORMULE [Nom] — [X]h restantes à consommer sur [total]h incluses dans le forfait"
- "📦 FORMULE [Nom] — Service inclus non encore consommé : [service]"

---

### RÈGLES CRITIQUES DE GESTION

1. **MIGRATION LOGICIEL** :
   - "Prestation ancien outil" = DETTE élève → AJOUTER au "Total Facturé".
   - "Prestation payée ancien outil" = PAIEMENT élève → AJOUTER au "Total Payé".

2. **ÉVALUATION DE DÉPART** :
   - L'évaluation de départ n'est PAS une heure de conduite.
   - ⚠️ NE PAS la compter dans le "Total Heures Conduite". C'est une prestation à part (souvent forfaitaire).

3. **HEURES PLANIFIÉES / FUTURES — RÈGLE ABSOLUE** :
   - Repérez TOUTES les leçons marquées "Planifiées", "Prévues", "À venir", "Réservées" ou toute date future.
   - ⚠️ Ces heures DOIVENT être comptabilisées dans le "Total Heures".
   - ⚠️ Leur coût théorique DOIT être ajouté au "Total Facturé" (elles sont dues par l'élève dès la réservation).
   - ⚠️ Si elles ne figurent PAS dans les règlements → elles contribuent au "Reste à Payer".

### VÉRIFICATION LEÇONS PLANIFIÉES (CRITIQUE)

Pour chaque leçon planifiée, vérifiez les 3 points suivants et signalez toute anomalie :

**A. FACTURATION** : La leçon planifiée est-elle incluse dans le "Total Facturé" ?
   - OUI → normal
   - NON → ANOMALIE : "Leçon du [date] ([durée]h) planifiée mais NON facturée — manque [montant]€"

**B. PAIEMENT** : Le montant correspondant aux leçons planifiées est-il couvert par les règlements ?
   - Comparez : Total Payé vs Total Facturé (incluant planifiées)
   - Si Total Payé < Total Facturé → le solde non réglé doit apparaître dans "Reste à Payer"
   - Si l'élève n'a PAS encore payé les leçons futures → c'est NORMAL mais doit figurer dans "Reste à Payer"
   - Si les leçons futures semblent absentes des deux côtés → ANOMALIE à signaler

**C. COHÉRENCE** : Le nombre d'heures planifiées × prix catalogue correspond-il au montant ajouté au Total Facturé ?
   - Écart > 5% → ANOMALIE : "Incohérence de facturation sur les heures planifiées"

### DÉTECTION DES PRESTATIONS NON FACTURÉES (CRITIQUE)

Comparez systématiquement CHAQUE prestation consommée ou réservée par l'élève avec le Total Facturé.

**Types de prestations à vérifier** :
- Leçons de conduite passées (effectuées) → chaque leçon doit figurer dans la facturation
- Leçons planifiées / futures → doivent être facturées dès la réservation
- Évaluation de départ → prestation à part, doit être facturée si elle a eu lieu
- Examens code ou conduite → passage d'examen est une prestation facturable
- Frais de dossier, frais administratifs → doivent apparaître en facturation
- Remises, forfaits ou packages → vérifier que le montant facturé correspond au forfait souscrit

**Méthode de détection** :
1. Dressez la liste de TOUTES les prestations identifiées dans le document (leçons, examens, frais…)
2. Pour chacune, vérifiez qu'elle apparaît bien dans les lignes de facturation
3. Si une prestation est consommée/réservée mais ABSENTE de la facturation → c'est une prestation non facturée
4. Calculez le montant estimé manquant (quantité × prix catalogue)

**Format obligatoire dans "discrepancies"** pour chaque prestation non facturée :
"📋 NON FACTURÉ — [Nom de la prestation] ([quantité/durée]) du [date si connue] : [montant estimé]€ manquant à facturer"

Exemples :
- "📋 NON FACTURÉ — Leçon de conduite (1h) du 12/02 : 42€ manquant à facturer"
- "📋 NON FACTURÉ — Passage examen conduite (1) : 30€ manquant à facturer"
- "📋 NON FACTURÉ — Frais de dossier : 35€ manquant à facturer"

Si TOUTES les prestations sont correctement facturées → ne pas ajouter d'entrée "📋 NON FACTURÉ" et indiquer dans le résumé que la facturation est complète.

### CALCULS REQUIS

1. **Analyse des Heures** :
   - **Heures Effectuées** : Somme des heures passées (hors évaluation de départ).
   - **Heures Planifiées** : Somme des heures futures réservées (hors évaluation de départ).
   - **Total Heures** : Effectuées + Planifiées.

2. **Situation Compte Client (Réalité)** :
   - **Total Facturé (Attendu)** : Prestations passées + Prestations planifiées/futures + Autres factures + "Prestation ancien outil".
   - **Total Payé** : Somme des règlements reçus + "Prestation payée ancien outil".
   - **Reste à Payer (Solde)** : Total Facturé − Total Payé. Ce montant inclut les leçons planifiées non encore réglées.

3. **Analyse de Rentabilité (Théorie Catalogue)** :
   - **Taux Horaire Catalogue** : Prix standard de l'heure de conduite dans le catalogue.
   - **Montant Théorique Catalogue** : (Total Heures × Taux Horaire Catalogue) + Frais administratifs standards.
   - **Manque à Gagner (Écart)** : Montant Théorique Catalogue − Total Facturé.

4. **Prix Unitaire Constaté** : Total Payé / Total Heures (Effectuées + Planifiées).

5. **Examens** : Nombre total d'examens passés (code de la route + conduite, tous types combinés).

6. **Répartition des heures (champ "hoursBreakdown")** :
   - Extrayez la liste détaillée des heures regroupées par type de prestation et moniteur/instructeur.
   - Pour chaque groupe distinct, créez une entrée :
     - **label** : type de conduite + moniteur si identifiable (ex: "Conduite B - Audrey", "Simulateur", "Conduite BEA 3", "Code de la route")
     - **hours** : somme des heures de ce groupe
     - **status** : "done" si effectuées/passées, "planned" si futures/réservées
   - Regroupez par : 1. type de prestation, 2. moniteur/instructeur si mentionné, 3. statut effectué vs planifié.
   - ⚠️ Ne PAS inclure l'évaluation de départ dans ce champ.

### RÈGLES DE CONTRÔLE ET ALERTES

- 🔴 **CRITIQUE** : Si le "Prix Unitaire Constaté" est inférieur de plus de 10% au "Taux Horaire Catalogue".
- 🔴 **CRITIQUE** : Si des leçons planifiées sont absentes du "Total Facturé".
- 🔴 **CRITIQUE** : Si des prestations consommées (leçons passées, examens, frais) sont absentes de la facturation.
- 🟠 **ANOMALIE** : Si le "Reste à Payer" est positif ET que des leçons planifiées existent (risque de non-recouvrement).
- 🟠 **ANOMALIE** : Si le nombre d'heures planifiées × prix catalogue ne correspond pas au supplément facturé.
- 🟡 **ATTENTION** : Si l'élève a des leçons planifiées mais aucun paiement récent (risque d'impayé futur).
- 🟡 **ATTENTION** : Si un forfait a été souscrit mais que certaines prestations incluses n'apparaissent pas.

### FORMAT UNIFORME DES ANOMALIES (champ "discrepancies")
Chaque entrée doit suivre ce format : "[EMOJI TYPE] — [Description précise avec montants et dates]"

Exemples :
- "🔴 CRITIQUE — 3 leçons planifiées (1,5h) du 15/03 non facturées : 63€ manquants"
- "🔴 CRITIQUE — Passage examen conduite non facturé : 30€ manquants"
- "📋 NON FACTURÉ — Leçon de conduite (1h) du 08/02 : 42€ manquants à facturer"
- "📋 NON FACTURÉ — Frais de dossier : 35€ manquants à facturer"
- "🟠 ANOMALIE — Reste à payer de 126€ avec 3h planifiées non réglées"
`

// ── JSON Schema (avec remainingDue dans required — bug fix vs comptadrive) ─
const REPORT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    aiExtractedName: {
      type: Type.STRING,
      description: 'Nom du client identifié.',
    },
    totalHoursRecorded: {
      type: Type.NUMBER,
      description: 'Total GLOBAL heures conduite (Effectuées + Planifiées). EXCLURE l\'évaluation de départ.',
    },
    drivenHours: {
      type: Type.NUMBER,
      description: "Nombre d'heures déjà effectuées (Passées).",
    },
    plannedHours: {
      type: Type.NUMBER,
      description: "Nombre d'heures planifiées dans le futur (non encore conduites).",
    },
    examsPassed: {
      type: Type.INTEGER,
      description: "Nombre total d'examens passés par l'élève (code de la route + conduite, tous types combinés).",
    },
    totalExpectedAmount: {
      type: Type.NUMBER,
      description: 'Montant total facturé ou à facturer (Inclut dettes passées + coût des heures planifiées).',
    },
    totalAmountPaid: {
      type: Type.NUMBER,
      description: 'Montant total payé.',
    },
    remainingDue: {
      type: Type.NUMBER,
      description: 'Reste à payer (Facturé - Payé).',
    },
    calculatedUnitPrice: {
      type: Type.NUMBER,
      description: 'Prix moyen payé par heure.',
    },
    theoreticalCatalogTotal: {
      type: Type.NUMBER,
      description: 'Valeur théorique des heures consommées selon le tarif catalogue officiel.',
    },
    revenueGap: {
      type: Type.NUMBER,
      description: 'Écart financier: Théorique - Facturé.',
    },
    reportStatus: {
      type: Type.STRING,
      enum: ['VERIFIED', 'DISCREPANCY', 'UNCERTAIN'],
    },
    summary: {
      type: Type.STRING,
      description: "Résumé expert. Précisez le nombre d'heures planifiées incluses dans la facture si applicable.",
    },
    discrepancies: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Liste des écarts détectés.',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Actions recommandées.',
    },
    hoursBreakdown: {
      type: Type.ARRAY,
      description: 'Répartition détaillée des heures par type de prestation et/ou moniteur.',
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: 'Type de prestation + moniteur si connu. Ex: "Conduite B - Audrey", "Simulateur", "Conduite BEA 3".',
          },
          hours: {
            type: Type.NUMBER,
            description: "Nombre d'heures pour ce groupe.",
          },
          status: {
            type: Type.STRING,
            enum: ['done', 'planned'],
            description: '"done" = effectuées, "planned" = futures/planifiées.',
          },
        },
        required: ['label', 'hours', 'status'],
      },
    },
  },
  required: [
    'totalHoursRecorded',
    'examsPassed',
    'totalExpectedAmount',
    'totalAmountPaid',
    'remainingDue',           // Présent dans required — fix par rapport à comptadrive-audit
    'calculatedUnitPrice',
    'theoreticalCatalogTotal',
    'revenueGap',
    'reportStatus',
    'summary',
  ],
}

// ── Instructions JSON schema pour les providers sans responseSchema natif ────
const JSON_SCHEMA_INSTRUCTIONS = `

### FORMAT DE RÉPONSE (JSON STRICT REQUIS)
Retournez UNIQUEMENT un objet JSON valide avec exactement ces champs (pas de texte avant/après) :
{
  "aiExtractedName": "string (nom de l'élève ou null)",
  "totalHoursRecorded": number (total heures effectuées + planifiées),
  "drivenHours": number (heures effectuées),
  "plannedHours": number (heures planifiées/futures),
  "examsPassed": integer (nombre d'examens passés),
  "totalExpectedAmount": number (total facturé en euros),
  "totalAmountPaid": number (total payé en euros),
  "remainingDue": number (reste à payer = facturé - payé),
  "calculatedUnitPrice": number (prix moyen par heure),
  "theoreticalCatalogTotal": number (valeur théorique selon catalogue),
  "revenueGap": number (écart = théorique - facturé),
  "reportStatus": "VERIFIED" ou "DISCREPANCY" ou "UNCERTAIN",
  "summary": "string (résumé expert en français)",
  "discrepancies": ["string", ...] (liste des anomalies, tableau vide si aucune),
  "recommendations": ["string", ...] (actions recommandées),
  "hoursBreakdown": [{"label": "string", "hours": number, "status": "done" ou "planned"}, ...]
}`

// ── Conversion fichier → base64 (PDF / images) ──────────────────────────────
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ── Conversion CSV / XLSX → texte brut ──────────────────────────────────────
async function fileToText(file: File): Promise<string> {
  const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
  if (isCsv) return file.text()

  // XLSX / XLS → convert via xlsx library
  const { read, utils } = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer)
  return workbook.SheetNames.map((name: string) => {
    const ws = workbook.Sheets[name]
    return `=== Feuille: ${name} ===\n${utils.sheet_to_csv(ws)}`
  }).join('\n\n')
}

function isVisionFile(file: File): boolean {
  return file.type.includes('pdf') || file.type.startsWith('image/')
}

// ── Appel Moonshot AI (Kimi K2, OpenAI-compatible) ──────────────────────────
async function callKimiMoonshot(
  parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }>,
  systemInstruction: string,
  modelId: string
): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY
  if (!apiKey) throw new Error('MOONSHOT_API_KEY manquante dans .env.local')

  const userContent = parts.map(part => {
    if ('inlineData' in part) {
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` },
      }
    }
    return { type: 'text' as const, text: (part as { text: string }).text }
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 55_000)

  let res: Response
  try {
    res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemInstruction + JSON_SCHEMA_INSTRUCTIONS },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Kimi K2 trop lent (> 55s) — essayez Gemini 2.5 Flash dans Paramètres')
    }
    throw err
  }
  clearTimeout(timer)

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Moonshot API (${res.status}): ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices[0]?.message?.content ?? ''
}

// ── Appel principal Gemini ──────────────────────────────────────────────────
export interface AnalyseContext {
  studentName?: string
  userComments?: string
  catalogContext: string  // Texte du catalogue injecté dynamiquement depuis Supabase
}

export async function analyseDocument(
  files: File[],
  context: AnalyseContext,
  aiSettings?: AiSettings
): Promise<AiAnalysisResult> {

  // Construire le system instruction selon les réglages IA
  let systemInstruction = SYSTEM_INSTRUCTION

  if (aiSettings?.systemPrompt?.trim()) {
    // Prompt complet personnalisé → remplace entièrement le défaut
    systemInstruction = aiSettings.systemPrompt
  } else {
    // Logiciel de gestion : préfixe
    if (aiSettings?.softwareName?.trim()) {
      systemInstruction =
        `### LOGICIEL DE GESTION\nCe dossier provient du logiciel **${aiSettings.softwareName}**. Adaptez l'interprétation des colonnes et des termes en conséquence.\n\n`
        + systemInstruction
    }
    // Instructions personnalisées : suffixe
    if (aiSettings?.customInstructions?.trim()) {
      systemInstruction += `\n\n### RÈGLES SPÉCIFIQUES\n${aiSettings.customInstructions}`
    }
  }

  const fullSystemInstruction =
    systemInstruction +
    `\n\n### CATALOGUE OFFICIEL ACTUEL\n${context.catalogContext}`

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = []

  for (const file of files) {
    if (isVisionFile(file)) {
      // PDF ou image → inlineData base64
      const base64Data = await fileToBase64(file)
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      })
    } else {
      // CSV / XLSX / autre → convertir en texte
      const textContent = await fileToText(file)
      parts.push({ text: `\n=== Fichier: ${file.name} ===\n${textContent}` })
    }
  }

  let promptText = 'Analysez ces documents comptables.'
  if (context.studentName) {
    promptText += ` Le dossier concerne l'élève : "${context.studentName}".`
  }
  if (context.userComments) {
    promptText += `\n\n### INSTRUCTIONS COLLABORATEUR :\n"${context.userComments}"\n`
  }
  promptText +=
    "\nExtrayez les données, incluez les heures planifiées dans la facture, excluez l'évaluation de départ des heures conduite."

  parts.push({ text: promptText })

  // Dispatcher selon le modèle choisi dans Paramètres
  const modelId = aiSettings?.aiModel?.trim() || 'gemini-2.5-flash'
  const isMoonshot = modelId.startsWith('kimi-')

  let responseText: string

  if (isMoonshot) {
    responseText = await callKimiMoonshot(parts, fullSystemInstruction, modelId)
  } else {
    // Gemini
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!geminiKey) throw new Error('GOOGLE_GEMINI_API_KEY manquante')
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const baseConfig = {
      systemInstruction: fullSystemInstruction,
      responseMimeType: 'application/json',
      responseSchema: REPORT_SCHEMA,
      temperature: 0.1,
    }
    const geminiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        'Délai Gemini dépassé (55s) — essayez un autre modèle ou re-analysez'
      )), 55_000)
    )
    const response = await Promise.race([
      ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts }],
        config: modelId.includes('2.5')
          ? { ...baseConfig, thinkingConfig: { thinkingBudget: 0 } }
          : baseConfig,
      }),
      geminiTimeout,
    ])
    responseText = response.text ?? ''
  }

  if (!responseText) throw new Error("Réponse vide de l'IA")
  return JSON.parse(responseText) as AiAnalysisResult
}
