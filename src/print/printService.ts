import { store } from '@/data/store'
import type { PrintPurpose, PrinterProfile, Settings } from '@/domain/types'
import { printHtml, savePdf } from '@/infra/platform'

export function profileFor(purpose: PrintPurpose, settings: Settings = store.getSettings()): PrinterProfile {
  const id = settings.assignments[purpose]
  const found = settings.printers.find((p) => p.id === id)
  if (found) return found
  // fallback: primeiro perfil do tipo adequado
  const kind = purpose === 'a4' ? 'a4' : 'termica'
  return settings.printers.find((p) => p.kind === kind) ?? settings.printers[0]
}

/** Envia o HTML para a impressora configurada no perfil */
export function printWithProfile(html: string, profile: PrinterProfile): Promise<PrintResult> {
  const isA4 = profile.kind === 'a4'
  return printHtml({
    html,
    printerName: profile.printerName || undefined,
    silent: profile.silent,
    copies: profile.copies,
    widthMm: profile.paperWidthMm,
    heightMm: isA4 || profile.kind === 'etiqueta' ? profile.paperHeightMm : 0,
    margins: isA4 ? 'default' : 'none',
  })
}

export function exportPdf(html: string, fileName: string): Promise<PrintResult> {
  return savePdf(html, fileName)
}
