import type { AdbDevice, ScanResult } from '@/domain/types'

export {}

declare global {
  interface PrintJob {
    html: string
    printerName?: string
    silent?: boolean
    copies?: number
    widthMm?: number
    heightMm?: number
    margins?: 'none' | 'default'
  }

  interface PrintResult {
    ok: boolean
    error?: string
    canceled?: boolean
    path?: string
  }

  interface SystemPrinter {
    name: string
    displayName: string
    isDefault: boolean
  }

  /** API exposta pelo preload do Electron (ausente quando roda no navegador) */
  interface DesktopApi {
    storage: {
      get(key: string): Promise<unknown>
      set(key: string, value: unknown): Promise<void>
    }
    printing: {
      printers(): Promise<SystemPrinter[]>
      print(job: PrintJob): Promise<PrintResult>
      savePdf(job: { html: string; fileName: string }): Promise<PrintResult>
    }
    app: {
      dataDir(): Promise<string>
      openDataDir(): Promise<string>
      version(): Promise<string>
    }
    adb: {
      check(cfg: { adbPath: string }): Promise<{ available: boolean; version: string; path: string }>
      devices(cfg: { adbPath: string }): Promise<{ available: boolean; devices: AdbDevice[] }>
      scan(cfg: Record<string, unknown>): Promise<{ ok: boolean; result?: ScanResult; error?: string }>
      action(cfg: { adbPath: string; serial: string; packageName: string; action: string }): Promise<{ ok: boolean; output?: string; error?: string }>
      shield(cfg: { adbPath: string; serial: string }): Promise<{ ok: boolean; results: { label: string; ok: boolean }[] }>
      onProgress(cb: (data: { done: number; total: number; current: string }) => void): () => void
    }
  }

  interface Window {
    api?: DesktopApi
  }
}
