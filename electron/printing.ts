import { BrowserWindow, dialog, ipcMain, shell, app } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

interface PrintJob {
  html: string
  printerName?: string
  silent?: boolean
  copies?: number
  /** Largura do papel em mm. Omitido = tamanho padrão do driver. */
  widthMm?: number
  /** Altura do papel em mm. 0 = bobina contínua (altura calculada pelo conteúdo). */
  heightMm?: number
  /** 'none' para cupons/etiquetas, 'default' para A4 (respeita @page do CSS). */
  margins?: 'none' | 'default'
}

interface PdfJob {
  html: string
  fileName: string
}

const MM_TO_PX = 96 / 25.4

/** Renderiza HTML em uma janela oculta (via arquivo temporário, suporta logos grandes em base64). */
async function renderHidden(html: string, widthPx: number): Promise<{ win: BrowserWindow; cleanup: () => void }> {
  const file = path.join(os.tmpdir(), `assistec-print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  fs.writeFileSync(file, html, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    width: Math.max(200, Math.round(widthPx)),
    height: 1200,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  })
  await win.loadFile(file)
  await win.webContents.executeJavaScript(
    `Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), ...Array.from(document.images).map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r }))]).then(() => true)`,
  )

  const cleanup = () => {
    if (!win.isDestroyed()) win.destroy()
    fs.rm(file, { force: true }, () => undefined)
  }
  return { win, cleanup }
}

export function registerPrintingHandlers(): void {
  ipcMain.handle('print:printers', async (event) => {
    const printers = await event.sender.getPrintersAsync()
    return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: Boolean(p.isDefault) }))
  })

  ipcMain.handle('print:html', async (_event, job: PrintJob) => {
    const widthPx = job.widthMm ? job.widthMm * MM_TO_PX : 794
    const { win, cleanup } = await renderHidden(job.html, widthPx)

    try {
      let heightMm = job.heightMm ?? 0
      if (job.widthMm && !heightMm) {
        // altura real do conteúdo (o body não tem altura fixa, ao contrário da janela)
        const contentPx: number = await win.webContents.executeJavaScript('Math.ceil(document.body.getBoundingClientRect().height)')
        heightMm = contentPx / MM_TO_PX + 4
      }

      const options: Electron.WebContentsPrintOptions = {
        silent: Boolean(job.silent && job.printerName),
        deviceName: job.printerName || undefined,
        copies: Math.max(1, job.copies ?? 1),
        printBackground: true,
        margins: { marginType: job.margins === 'default' ? 'default' : 'none' },
      }
      if (job.widthMm) {
        options.pageSize = {
          width: Math.round(job.widthMm * 1000),
          height: Math.max(10_000, Math.round(heightMm * 1000)),
        }
      }

      return await new Promise((resolve) => {
        win.webContents.print(options, (success, failureReason) => {
          resolve(success ? { ok: true } : { ok: false, error: failureReason || 'Impressão cancelada' })
        })
      })
    } finally {
      // pequena espera para o spooler receber o trabalho antes de destruir a janela
      setTimeout(cleanup, 1500)
    }
  })

  ipcMain.handle('pdf:save', async (event, job: PdfJob) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const defaultPath = path.join(app.getPath('documents'), job.fileName.endsWith('.pdf') ? job.fileName : `${job.fileName}.pdf`)
    const result = parent
      ? await dialog.showSaveDialog(parent, { defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
      : await dialog.showSaveDialog({ defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    const { win, cleanup } = await renderHidden(job.html, 794)
    try {
      const data = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      })
      fs.writeFileSync(result.filePath, data)
      void shell.openPath(result.filePath)
      return { ok: true, path: result.filePath }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    } finally {
      cleanup()
    }
  })
}
