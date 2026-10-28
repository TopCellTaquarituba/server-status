/**
 * Adaptadores de plataforma (padrão Adapter).
 * No app desktop usa o Electron; no navegador cai para localStorage e window.print().
 * O resto do código não sabe — nem precisa saber — onde está rodando.
 */

export const isDesktop = typeof window !== 'undefined' && Boolean(window.api)

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
}

const PREFIX = 'assistec:'

const browserStorage: StorageAdapter = {
  async get<T>(key: string) {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  },
  async set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
}

const desktopStorage: StorageAdapter = {
  async get<T>(key: string) {
    return ((await window.api!.storage.get(key)) as T | null) ?? null
  },
  set: (key, value) => window.api!.storage.set(key, value),
}

export const storage: StorageAdapter = isDesktop ? desktopStorage : browserStorage

/* ------------------------------------------------------------------ */
/* Impressão                                                           */
/* ------------------------------------------------------------------ */

export async function listPrinters(): Promise<SystemPrinter[]> {
  return isDesktop ? window.api!.printing.printers() : []
}

export async function printHtml(job: PrintJob): Promise<PrintResult> {
  if (isDesktop) return window.api!.printing.print(job)
  return browserPrint(job.html)
}

export async function savePdf(html: string, fileName: string): Promise<PrintResult> {
  if (isDesktop) return window.api!.printing.savePdf({ html, fileName })
  // No navegador o usuário escolhe "Salvar como PDF" na janela de impressão
  return browserPrint(html)
}

function browserPrint(html: string): Promise<PrintResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    iframe.srcdoc = html
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => iframe.remove(), 2000)
        resolve({ ok: true })
      }, 200)
    }
    document.body.appendChild(iframe)
  })
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export async function getDataDir(): Promise<string | null> {
  return isDesktop ? window.api!.app.dataDir() : null
}

export async function openDataDir(): Promise<void> {
  if (isDesktop) await window.api!.app.openDataDir()
}

export async function lookupCep(cep: string): Promise<{
  street: string
  district: string
  city: string
  state: string
} | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return { street: data.logradouro ?? '', district: data.bairro ?? '', city: data.localidade ?? '', state: data.uf ?? '' }
  } catch {
    return null
  }
}
