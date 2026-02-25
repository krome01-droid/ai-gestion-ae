export type ReportStatus = 'VERIFIED' | 'DISCREPANCY' | 'UNCERTAIN'

export interface AiAnalysisResult {
  aiExtractedName?: string
  totalHoursRecorded: number
  drivenHours?: number
  plannedHours?: number
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
}
