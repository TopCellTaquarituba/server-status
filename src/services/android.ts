import { store } from '@/data/store'
import type { AdbDevice, CleanupSettings, ScanResult, ScannedApp } from '@/domain/types'
import { isDesktop } from '@/infra/platform'

const adb = () => window.api?.adb

function config(extra: Record<string, unknown> = {}) {
  const c = store.getSettings().cleanup
  return { adbPath: c.adbPath, ...extra }
}

export interface AdbStatus {
  available: boolean
  version: string
  path: string
}

export async function checkAdb(): Promise<AdbStatus> {
  if (!isDesktop || !adb()) return { available: false, version: '', path: 'adb' }
  return adb()!.check(config())
}

export async function listDevices(): Promise<AdbDevice[]> {
  if (!isDesktop || !adb()) return []
  const res = await adb()!.devices(config())
  return res.devices.filter((d) => d.state === 'device')
}

export function scanConfig(serial: string, cleanup: CleanupSettings = store.getSettings().cleanup) {
  return {
    adbPath: cleanup.adbPath,
    serial,
    flagHidden: cleanup.flagHidden,
    flagUnknownSource: cleanup.flagUnknownSource,
    flagOverlay: cleanup.flagOverlay,
    trustedInstallers: cleanup.trustedInstallers,
    blocklist: cleanup.blocklist,
    maxDeepScan: cleanup.maxDeepScan,
  }
}

export async function scanDevice(serial: string): Promise<ScanResult> {
  const res = await adb()!.scan(scanConfig(serial))
  if (!res.ok || !res.result) throw new Error(res.error || 'Falha ao escanear o aparelho')
  return res.result
}

export type AppAction = 'uninstall' | 'disable' | 'enable' | 'harden'

export async function applyAction(serial: string, packageName: string, action: AppAction) {
  const res = await adb()!.action({ ...config(), serial, packageName, action })
  if (!res.ok) throw new Error(res.output || res.error || 'Falha ao executar a ação')
  return res
}

export async function shieldDevice(serial: string) {
  return adb()!.shield({ adbPath: store.getSettings().cleanup.adbPath, serial })
}

export function onScanProgress(cb: (data: { done: number; total: number; current: string }) => void): () => void {
  return adb()?.onProgress(cb) ?? (() => undefined)
}

/* ------------------------------------------------------------------ */
/* Modo demonstração — sem aparelho conectado                          */
/* Dados fictícios e claramente rotulados, só para visualizar a tela.  */
/* ------------------------------------------------------------------ */

const app = (p: Partial<ScannedApp> & { packageName: string; label: string }): ScannedApp => ({
  installer: 'com.android.vending',
  system: false,
  hidden: false,
  unknownSource: false,
  overlay: false,
  accessibility: false,
  deviceAdmin: false,
  knownAdware: false,
  adwareLabel: '',
  reasons: [],
  severity: 'baixa',
  flagged: false,
  ...p,
})

export function simulatedScan(): ScanResult {
  const apps: ScannedApp[] = [
    app({ packageName: 'com.hiddenads.cleanmaster', label: 'com.hiddenads.cleanmaster', installer: 'null', hidden: true, unknownSource: true, overlay: true, knownAdware: true, adwareLabel: 'Adware conhecido', severity: 'alta', flagged: true, reasons: ['Pacote reconhecido como adware', 'App sem ícone na tela (oculto)', 'Pode desenhar sobre outros apps (sobreposição/anúncios)'] }),
    app({ packageName: 'com.mobi.booster', label: 'com.mobi.booster', installer: 'null', hidden: true, unknownSource: true, overlay: true, severity: 'alta', flagged: true, reasons: ['App sem ícone na tela (oculto)', 'Origem desconhecida (instalado fora da loja)', 'Pode desenhar sobre outros apps (sobreposição/anúncios)'] }),
    app({ packageName: 'br.com.appremoto.acesso', label: 'br.com.appremoto.acesso', unknownSource: true, accessibility: true, severity: 'media', flagged: true, reasons: ['Usa serviço de acessibilidade (acesso sensível)', 'Origem desconhecida (instalado fora da loja)'] }),
    app({ packageName: 'com.promo.ofertas', label: 'com.promo.ofertas', installer: 'null', unknownSource: true, overlay: true, severity: 'media', flagged: true, reasons: ['Origem desconhecida (instalado fora da loja)', 'Pode desenhar sobre outros apps (sobreposição/anúncios)'] }),
    app({ packageName: 'com.deviceadmin.lock', label: 'com.deviceadmin.lock', unknownSource: true, deviceAdmin: true, severity: 'alta', flagged: true, reasons: ['Registrado como administrador do dispositivo', 'Origem desconhecida (instalado fora da loja)'] }),
    app({ packageName: 'com.whatsapp', label: 'com.whatsapp' }),
    app({ packageName: 'com.instagram.android', label: 'com.instagram.android' }),
    app({ packageName: 'com.google.android.youtube', label: 'com.google.android.youtube' }),
    app({ packageName: 'com.nubank.app', label: 'com.nubank.app' }),
    app({ packageName: 'com.spotify.music', label: 'com.spotify.music' }),
  ]
  return {
    info: { serial: 'DEMO123456', model: 'Galaxy A14 (demonstração)', brand: 'Samsung', name: 'Galaxy A14', android: '14', sdk: '34' },
    apps,
    total: apps.length,
    flaggedCount: apps.filter((a) => a.flagged).length,
    scannedAt: new Date().toISOString(),
    simulated: true,
  }
}
