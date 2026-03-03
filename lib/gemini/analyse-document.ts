import { GoogleGenAI, Type, Schema } from '@google/genai'
import type { AiAnalysisResult, AiSettings } from '@/lib/types/analyse'

// ── System Prompt (Expert-Comptable Auto-École) ────────────────────────────
const SYSTEM_INSTRUCTION = `
### RÔLE & PERSONA
Expert-Comptable pour une auto-école. Votre but ultime est la **Rentabilité** et la **Conformité**.

### TÂCHE & OBJECTIF
Analyser le dossier élève pour extraire les métriques financières et comparer la RÉALITÉ (Paiements) vs la THÉORIE (Catalogue).

### RÈGLES CRITIQUES DE GESTION
1. **MIGRATION LOGICIEL** :
   - "Prestation ancien outil" = DETTE élève -> AJOUTER au "Total Facturé".
   - "Prestation payée ancien outil" = PAIEMENT élève -> AJOUTER au "Total Payé".

2. **ÉVALUATION DE DÉPART** :
   - L'évaluation de départ n'est PAS une heure de conduite.
   - ⚠️ ACTION : NE PAS la compter dans le "Total Heures Conduite" servant à calculer le prix moyen de l'heure. C'est une prestation à part (souvent forfaitaire).

3. **HEURES PLANIFIÉES / FUTURES** :
   - Repérez les leçons marquées comme "Planifiées", "Prévues" ou "À venir" (futur).
   - ⚠️ ACTION : Ces heures doivent être COMPTABILISÉES dans le "Total Heures" et leur coût théorique ajouté au "Total Facturé" (car elles sont dues par l'élève).

### CALCULS REQUIS

1. **Analyse des Heures** :
   - **Heures Effectuées** : Somme des heures passées (hors évaluation).
   - **Heures Planifiées** : Somme des heures futures (hors évaluation).
   - **Total Heures** : Effectuées + Planifiées.

2. **Situation Compte Client (Réalité)** :
   - **Total Facturé (Attendu)** : (Coût des prestations passées + Coût des prestations planifiées/futures + Autres factures) + "Prestation ancien outil".
   - **Total Payé** : Somme des règlements + "Prestation payée ancien outil".
   - **Reste à Payer (Solde)** : Total Facturé - Total Payé.

3. **Analyse de Rentabilité (Théorie Catalogue)** :
   - **Taux Horaire Catalogue** : Identifiez le prix standard de l'heure de conduite dans le catalogue.
   - **Montant Théorique Catalogue** : (Total Heures × Taux Horaire Catalogue) + (Frais administratifs standards).
   - **Manque à Gagner (Écart)** : Montant Théorique Catalogue - Total Facturé.

4. **Prix Unitaire Constaté** : Total Payé / Total Heures (Effectuées + Planifiées).

5. **Examens** : Comptez le nombre total d'examens passés par l'élève (code de la route + conduite, tous types combinés).

### RÈGLES DE CONTRÔLE
- **Alerte** : Si le "Prix Unitaire Constaté" est inférieur de plus de 10% au "Taux Horaire Catalogue", c'est une anomalie critique.
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
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY manquante')

  const ai = new GoogleGenAI({ apiKey })

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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: fullSystemInstruction,
      responseMimeType: 'application/json',
      responseSchema: REPORT_SCHEMA,
      temperature: 0.1,
    },
  })

  const text = response.text
  if (!text) throw new Error("Réponse vide de l'IA")

  return JSON.parse(text) as AiAnalysisResult
}
