import { jsPDF } from 'jspdf'
import type { AnalysisRecord, SchoolSettings } from '@/lib/types/analyse'

// Formatage montant compatible jsPDF (remplace les espaces insécables fr-FR par espace simple)
function formatPdfAmount(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount).replace(/[\u00A0\u202F]/g, ' ')
}

// Nettoyage emojis — Helvetica jsPDF ne supporte pas Unicode hors Latin-1
function cleanText(text: string): string {
  return text
    .replace(/📦/g, '[FORFAIT]')
    .replace(/🔴/g, '[CRITIQUE]')
    .replace(/🟠/g, '[ANOMALIE]')
    .replace(/🟡/g, '[ATTENTION]')
    .replace(/📋/g, '[NON FACTURE]')
    .replace(/[^\x00-\xFF]/g, '')
    .trim()
}

const DARK_BLUE = '#1e293b'
const BLUE = '#2563eb'
const GRAY = '#64748b'
const GREEN = '#16a34a'
type RGB = [number, number, number]

const SOFT_RED: RGB = [239, 68, 68]

export async function generatePDF(
  report: AnalysisRecord,
  schoolSettings?: SchoolSettings
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const schoolName = schoolSettings?.schoolName ?? 'Auto-École'
  const siret = schoolSettings?.siret ? `SIRET : ${schoolSettings.siret}` : ''

  // Compteur de pages (sera mis à jour en fin)
  let totalPages = 1

  const addFooter = (pageNum: number) => {
    doc.setFontSize(7)
    doc.setTextColor(GRAY)
    const footerText = [schoolName, siret].filter(Boolean).join(' · ')
    doc.text(footerText, 14, pageHeight - 8)
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 8, { align: 'right' })
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Fond bleu foncé header
  doc.setFillColor(30, 41, 59) // DARK_BLUE
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Logo si disponible
  let headerX = 14
  if (schoolSettings?.logoUrl) {
    try {
      const img = await loadImageAsBase64(schoolSettings.logoUrl)
      if (img) {
        doc.addImage(img.data, img.format, 14, 5, 25, 25)
        headerX = 44
      }
    } catch { /* logo non disponible */ }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(schoolName, headerX, 16)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Rapport d\'Audit Comptable IA', headerX, 24)

  // Date à droite
  doc.setTextColor(203, 213, 225)
  doc.setFontSize(8)
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 16, { align: 'right' })

  // Status badge (top right)
  let statusText = 'INCERTAIN'
  let statusRGB: RGB = [245, 158, 11]
  if (report.reportStatus === 'VERIFIED') {
    statusText = 'CONFORME'; statusRGB = [16, 185, 129]
  } else if (report.reportStatus === 'DISCREPANCY') {
    statusText = 'ANOMALIE'; statusRGB = [239, 68, 68]
  }
  doc.setFillColor(...statusRGB)
  doc.roundedRect(pageWidth - 55, 19, 41, 10, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(statusText, pageWidth - 34, 25, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  // ── DOSSIER CLIENT ────────────────────────────────────────────────────────
  let currentY = 45

  doc.setFontSize(11)
  doc.setTextColor(BLUE)
  doc.setFont('helvetica', 'bold')
  doc.text('Dossier Client', 14, currentY)
  doc.setFont('helvetica', 'normal')

  currentY += 6
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  const clientName = report.aiExtractedName || report.studentName || '—'
  doc.text(`Élève : ${clientName}`, 14, currentY)
  if (report.agence) doc.text(`Agence : ${report.agence}`, 80, currentY)
  doc.text(`Moniteur : ${report.instructorType === 'independant' ? 'Indépendant' : 'Salarié'}`, 140, currentY)

  // Ligne séparatrice
  currentY += 5
  doc.setDrawColor(220, 220, 220)
  doc.line(14, currentY, pageWidth - 14, currentY)

  // ── KPI ROW 1 ─────────────────────────────────────────────────────────────
  currentY += 7
  const gap = 3
  const boxWidth = (pageWidth - 28 - gap * 3) / 4
  const boxH = 26

  const drawBox = (
    x: number, y: number, w: number, h: number,
    title: string, value: string, sub: string = '',
    textRGB: RGB = [30, 41, 59],
    bgRGB: RGB = [248, 250, 252]
  ) => {
    doc.setFillColor(...bgRGB)
    doc.roundedRect(x, y, w, h, 1, 1, 'F')
    doc.setFontSize(6)
    doc.setTextColor(GRAY)
    doc.text(title, x + 3, y + 8)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textRGB)
    doc.text(value, x + 3, y + 17)
    doc.setFont('helvetica', 'normal')
    if (sub) {
      doc.setFontSize(5)
      doc.setTextColor(GRAY)
      doc.text(sub, x + 3, y + 23)
    }
  }

  const drivenH = report.drivenHours ?? 0
  const plannedH = report.plannedHours ?? 0
  const hoursSubtext = plannedH > 0
    ? `${drivenH.toFixed(1)}h conduites + ${plannedH.toFixed(1)}h planifiées`
    : `${drivenH.toFixed(1)}h conduites`

  drawBox(14, currentY, boxWidth, boxH, 'TOTAL HEURES', `${(report.totalHoursRecorded ?? 0).toFixed(1)} h`, hoursSubtext, [37, 99, 235], [239, 246, 255])
  drawBox(14 + (boxWidth + gap), currentY, boxWidth, boxH, 'MONTANT FACTURÉ', formatPdfAmount(report.totalExpectedAmount), plannedH > 0 ? 'Inclut planifiées' : '')
  drawBox(14 + (boxWidth + gap) * 2, currentY, boxWidth, boxH, 'TOTAL RÉGLÉ', formatPdfAmount(report.totalAmountPaid))

  const balance = report.remainingDue ?? 0
  const balanceColor: RGB = balance > 0.5 ? SOFT_RED : [22, 163, 74]
  const balanceBg: RGB = balance > 0.5 ? [254, 242, 242] : [240, 253, 244]
  const balanceTitle = balance > 0.5 ? 'RESTE À PAYER' : balance < -0.5 ? 'TROP PERÇU' : 'COMPTE SOLDÉ'
  drawBox(14 + (boxWidth + gap) * 3, currentY, boxWidth, boxH, balanceTitle, formatPdfAmount(Math.abs(balance)), '', balanceColor, balanceBg)

  // ── KPI ROW 2 ─────────────────────────────────────────────────────────────
  currentY += boxH + gap

  const gapAmount = report.revenueGap ?? 0
  const hasLoss = gapAmount > 10
  const gapTextColor: RGB = hasLoss ? [255, 255, 255] : [22, 163, 74]
  const gapBgColor: RGB = hasLoss ? SOFT_RED : [240, 253, 244]

  drawBox(14, currentY, boxWidth, boxH, 'TAUX HORAIRE PAYÉ', `${(report.calculatedUnitPrice ?? 0).toFixed(2)}€/h`)
  drawBox(14 + (boxWidth + gap), currentY, boxWidth, boxH, 'VALEUR THÉORIQUE', formatPdfAmount(report.theoreticalCatalogTotal))
  drawBox(14 + (boxWidth + gap) * 2, currentY, boxWidth, boxH, 'MANQUE À GAGNER', formatPdfAmount(gapAmount > 0 ? gapAmount : 0), hasLoss ? 'Perte potentielle' : 'OK', gapTextColor, gapBgColor)
  drawBox(14 + (boxWidth + gap) * 3, currentY, boxWidth, boxH, 'VALIDÉ', report.isValidated ? 'Oui' : 'Non', report.fileName.slice(0, 20))

  currentY += boxH + 8

  // ── SÉPARATEUR ────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220)
  doc.line(14, currentY, pageWidth - 14, currentY)
  currentY += 5

  // ── NOTES COLLABORATEUR ───────────────────────────────────────────────────
  if (report.userComments) {
    doc.setFontSize(10)
    doc.setTextColor(BLUE)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes du Collaborateur', 14, currentY)
    doc.setFont('helvetica', 'normal')
    currentY += 6

    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'italic')
    const splitComments = doc.splitTextToSize(`"${report.userComments}"`, pageWidth - 28)
    doc.text(splitComments, 14, currentY)
    doc.setFont('helvetica', 'normal')
    currentY += splitComments.length * 5 + 8
  }

  // ── RÉSUMÉ ─────────────────────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setTextColor(BLUE)
  doc.setFont('helvetica', 'bold')
  doc.text('Analyse Expert-Comptable IA', 14, currentY)
  doc.setFont('helvetica', 'normal')
  currentY += 6

  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  const splitSummary = doc.splitTextToSize(cleanText(report.summary || ''), pageWidth - 28)
  doc.text(splitSummary, 14, currentY)
  currentY += splitSummary.length * 5 + 8

  // ── ANOMALIES ─────────────────────────────────────────────────────────────
  if (report.discrepancies?.length > 0) {
    if (currentY + 20 > pageHeight - 20) { doc.addPage(); totalPages++; addFooter(totalPages - 1); currentY = 20 }

    doc.setFontSize(10)
    doc.setTextColor(185, 28, 28)
    doc.setFont('helvetica', 'bold')
    doc.text('Points de Vigilance', 14, currentY)
    doc.setFont('helvetica', 'normal')
    currentY += 6

    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)
    for (const item of report.discrepancies) {
      const lines = doc.splitTextToSize(`• ${cleanText(item)}`, pageWidth - 28)
      if (currentY + lines.length * 5 > pageHeight - 20) {
        doc.addPage(); totalPages++; addFooter(totalPages - 1); currentY = 20
      }
      doc.text(lines, 14, currentY)
      currentY += lines.length * 5 + 2
    }
    currentY += 5
  }

  // ── RECOMMANDATIONS ───────────────────────────────────────────────────────
  if (report.recommendations?.length > 0) {
    if (currentY + 20 > pageHeight - 20) { doc.addPage(); totalPages++; addFooter(totalPages - 1); currentY = 20 }

    doc.setFontSize(10)
    doc.setTextColor(BLUE)
    doc.setFont('helvetica', 'bold')
    doc.text('Actions Requises', 14, currentY)
    doc.setFont('helvetica', 'normal')
    currentY += 6

    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)
    for (const item of report.recommendations) {
      const lines = doc.splitTextToSize(`• ${cleanText(item)}`, pageWidth - 28)
      if (currentY + lines.length * 5 > pageHeight - 20) {
        doc.addPage(); totalPages++; addFooter(totalPages - 1); currentY = 20
      }
      doc.text(lines, 14, currentY)
      currentY += lines.length * 5 + 2
    }
  }

  // Footer sur toutes les pages
  const totalPagesVal = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages?.() ?? totalPages
  for (let p = 1; p <= totalPagesVal; p++) {
    doc.setPage(p)
    addFooter(p)
  }

  const name = report.aiExtractedName || report.studentName || 'Eleve'
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`Audit_${name.replace(/\s+/g, '_')}_${dateStr}.pdf`)
}

// ── Helper : charger image en base64 ─────────────────────────────────────
async function loadImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const format = blob.type.includes('png') ? 'PNG' : 'JPEG'
      const base64 = result.split(',')[1]
      resolve({ data: base64, format })
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}
