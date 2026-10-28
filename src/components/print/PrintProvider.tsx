import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { Button, Field, Modal, Select } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useSettings } from '@/data/store'
import { PRINT_PURPOSES } from '@/domain/defaults'
import type { PrintPurpose, PrinterProfile } from '@/domain/types'
import { isDesktop } from '@/infra/platform'
import { exportPdf, printWithProfile, profileFor } from '@/print/printService'

export interface PreviewRequest {
  title: string
  purpose: PrintPurpose
  /** Gera o HTML para o perfil escolhido (permite trocar o perfil na pré-visualização) */
  build: (profile: PrinterProfile) => string
  /** Nome do arquivo ao salvar PDF (habilita o botão) */
  pdfName?: string
}

interface PrintApi {
  openPreview: (req: PreviewRequest) => void
  printNow: (req: PreviewRequest) => Promise<void>
  /** Imprime vários documentos como trabalhos independentes (um corte por via) */
  printJobs: (reqs: PreviewRequest[]) => Promise<void>
}

const PrintContext = createContext<PrintApi | null>(null)
const MM_TO_PX = 96 / 25.4

export function PrintProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const { toast } = useFeedback()
  const [request, setRequest] = useState<PreviewRequest | null>(null)
  const [profileId, setProfileId] = useState('')
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null)
  const [frameHeight, setFrameHeight] = useState(400)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const profile = settings.printers.find((p) => p.id === profileId) ?? (request ? profileFor(request.purpose, settings) : undefined)
  const html = useMemo(() => (request && profile ? request.build(profile) : ''), [request, profile])

  const doPrint = async (req: PreviewRequest, p: PrinterProfile) => {
    const result = await printWithProfile(req.build(p), p)
    if (result.ok) toast(isDesktop ? `Enviado para ${p.printerName || 'a impressora'}` : 'Janela de impressão aberta', 'success')
    else if (!result.canceled) toast(`Falha ao imprimir: ${result.error ?? 'erro desconhecido'}`, 'error')
    return result.ok
  }

  const api: PrintApi = {
    openPreview: (req) => {
      setProfileId(profileFor(req.purpose, settings).id)
      setRequest(req)
    },
    printNow: async (req) => {
      await doPrint(req, profileFor(req.purpose, settings))
    },
    printJobs: async (reqs) => {
      for (const req of reqs) {
        const prof = profileFor(req.purpose, settings)
        // eslint-disable-next-line no-await-in-loop
        await doPrint(req, prof)
      }
    },
  }

  const handlePrint = async () => {
    if (!request || !profile) return
    setBusy('print')
    const ok = await doPrint(request, profile)
    setBusy(null)
    if (ok) setRequest(null)
  }

  const handlePdf = async () => {
    if (!request?.pdfName || !profile) return
    setBusy('pdf')
    const result = await exportPdf(html, request.pdfName)
    setBusy(null)
    if (result.ok && result.path) toast('PDF salvo e aberto')
    else if (!result.ok && !result.canceled) toast(`Falha ao gerar PDF: ${result.error}`, 'error')
  }

  const widthPx = profile ? Math.round(profile.paperWidthMm * MM_TO_PX) : 400
  const scale = widthPx > 700 ? 0.82 : 1

  return (
    <PrintContext.Provider value={api}>
      {children}
      <Modal
        open={Boolean(request)}
        onClose={() => setRequest(null)}
        size="xl"
        title={request?.title ?? ''}
        description={request ? PRINT_PURPOSES[request.purpose].description : ''}
        footer={
          <>
            <div className="spacer muted small">
              {profile && `${profile.printerName || 'Impressora padrão do sistema'} · papel ${profile.paperWidthMm}mm${profile.silent ? ' · impressão direta' : ''}`}
            </div>
            <Button variant="ghost" onClick={() => setRequest(null)}>
              Fechar
            </Button>
            {request?.pdfName && (
              <Button icon={<FileDown />} onClick={handlePdf} loading={busy === 'pdf'}>
                Salvar PDF
              </Button>
            )}
            <Button variant="primary" icon={<Printer />} onClick={handlePrint} loading={busy === 'print'}>
              Imprimir
            </Button>
          </>
        }
      >
        <div className="stack">
          <div className="row">
            <Field label="Perfil de impressão" className="span-6">
              <Select value={profile?.id ?? ''} onChange={(e) => setProfileId(e.target.value)} style={{ minWidth: 320 }}>
                {settings.printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.paperWidthMm}mm
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="preview-stage">
            <div style={{ width: widthPx * scale, height: frameHeight * scale }}>
              <iframe
                ref={frameRef}
                title="Pré-visualização"
                className="preview-paper"
                srcDoc={html}
                style={{ width: widthPx, height: frameHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                onLoad={() => {
                  const doc = frameRef.current?.contentDocument
                  if (doc?.body) setFrameHeight(Math.max(120, Math.ceil(doc.body.getBoundingClientRect().height) + 8))
                }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </PrintContext.Provider>
  )
}

export function usePrint(): PrintApi {
  const ctx = useContext(PrintContext)
  if (!ctx) throw new Error('usePrint deve ser usado dentro de PrintProvider')
  return ctx
}
