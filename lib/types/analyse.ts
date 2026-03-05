export type ReportStatus = 'VERIFIED' | 'DISCREPANCY' | 'UNCERTAIN'

export interface HoursBreakdownItem {
  label: string    // "Conduite B - Audrey", "Simulateur", "Conduite BEA"
  hours: number
  status: 'done' | 'planned'
}

export interface AiAnalysisResult {
  aiExtractedName?: string
  totalHoursRecorded: number
  drivenHours?: number
  plannedHours?: number
  examsPassed?: number
  totalExpectedAmount: number
  totalAmountPaid: number
  remainingDue: number
  calculatedUnitPrice: number
  theoreticalCatalogTotal: number
  revenueGap: number
  reportStatus: ReportStatus
  summary: string
  discrepancies: string[]
  recommendations: string[]
  hoursBreakdown?: HoursBreakdownItem[]
}

export interface CatalogSnapshot {
  service_name: string
  price_ht: number
}

export interface AnalysisRecord extends AiAnalysisResult {
  id: string
  studentId: string | null
  studentName: string | null
  createdBy: string | null
  creatorName: string | null
  fileName: string
  fileType: string
  agence: string | null
  instructorType: string
  userComments: string | null
  catalogSnapshot: CatalogSnapshot[] | null
  status: 'processing' | 'done' | 'error'
  isValidated: boolean
  createdAt: string
  examsPassed?: number
}

export interface SchoolSettings {
  id: string
  schoolName: string
  logoUrl: string | null
  tvaRate: number
  address: string | null
  phone: string | null
  email: string | null
  siret: string | null
  tauxHoraireSalarie: number | null
  tauxHoraireIndependant: number | null
  coutCarburantHeure: number | null
  assuranceVehiculeHeure: number | null
  coutSecretariatHeure: number | null
  loyerChargesHeure: number | null
  fraisDiversAjustement: number | null
  aiSoftwareName: string | null
  aiCustomInstructions: string | null
  aiSystemPrompt: string | null
}

export interface AiSettings {
  softwareName?: string | null
  customInstructions?: string | null
  systemPrompt?: string | null
}
