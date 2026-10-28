import { execFile } from 'node:child_process'
import { ipcMain, type WebContents } from 'electron'

/**
 * Integração com o ADB (Android Debug Bridge) para limpeza de adware/bloatware.
 *
 * Tudo aqui opera sobre um aparelho fisicamente conectado por USB, com a
 * Depuração USB autorizada pelo dono do aparelho. São comandos padrão de
 * administração do Android (pm, appops, dumpsys) — a mesma base usada por
 * ferramentas conhecidas de "debloat". Nada é removido sem a confirmação do
 * técnico: o app apenas lista, classifica e executa a ação escolhida.
 */

interface AdbConfig {
  adbPath: string
}

interface RunResult {
  ok: boolean
  code: number | null
  stdout: string
  stderr: string
  notFound?: boolean
}

const DEFAULT_TIMEOUT = 20_000

function adbBin(cfg: AdbConfig): string {
  return cfg.adbPath?.trim() || 'adb'
}

function run(cfg: AdbConfig, args: string[], timeout = DEFAULT_TIMEOUT): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(adbBin(cfg), args, { timeout, maxBuffer: 20 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        resolve({ ok: false, code: null, stdout: '', stderr: 'adb não encontrado', notFound: true })
        return
      }
      const code = error && typeof (error as { code?: number }).code === 'number' ? (error as { code: number }).code : error ? 1 : 0
      resolve({ ok: !error, code, stdout: stdout ?? '', stderr: stderr ?? '' })
    })
  })
}

/** Executa um comando no shell do aparelho conectado */
function shell(cfg: AdbConfig, serial: string, command: string, timeout = DEFAULT_TIMEOUT): Promise<RunResult> {
  return run(cfg, ['-s', serial, 'shell', command], timeout)
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function parseProps(text: string): Record<string, string> {
  const props: Record<string, string> = {}
  for (const m of text.matchAll(/\[([^\]]+)\]:\s*\[([^\]]*)\]/g)) props[m[1]] = m[2]
  return props
}

function parsePackages(text: string): { pkg: string; installer: string }[] {
  const out: { pkg: string; installer: string }[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/package:(\S+)/)
    if (!m) continue
    const installer = line.match(/installer=(\S+)/)
    out.push({ pkg: m[1], installer: installer ? installer[1] : 'null' })
  }
  return out
}

function parseLauncherPackages(text: string): Set<string> {
  const set = new Set<string>()
  for (const m of text.matchAll(/packageName=([\w.]+)/g)) set.add(m[1])
  // formato alternativo: com.pkg/.Activity
  for (const m of text.matchAll(/^\s*([\w.]+)\/[\w.$]+/gm)) set.add(m[1])
  return set
}

function parseDeviceAdmins(text: string): Set<string> {
  const set = new Set<string>()
  for (const m of text.matchAll(/ComponentInfo\{([\w.]+)\//g)) set.add(m[1])
  return set
}

/* ------------------------------------------------------------------ */
/* Operações                                                          */
/* ------------------------------------------------------------------ */

interface ScannedAppRaw {
  packageName: string
  label: string
  installer: string
  system: boolean
  hidden: boolean
  unknownSource: boolean
  overlay: boolean
  accessibility: boolean
  deviceAdmin: boolean
  knownAdware: boolean
  adwareLabel: string
  reasons: string[]
  severity: 'alta' | 'media' | 'baixa'
  flagged: boolean
}

interface ScanConfig extends AdbConfig {
  serial: string
  flagHidden: boolean
  flagUnknownSource: boolean
  flagOverlay: boolean
  trustedInstallers: string[]
  blocklist: { pattern: string; label: string }[]
  maxDeepScan: number
}

async function deviceInfo(cfg: AdbConfig, serial: string) {
  const res = await shell(cfg, serial, 'getprop')
  const p = parseProps(res.stdout)
  return {
    serial,
    model: p['ro.product.model'] || 'Desconhecido',
    brand: p['ro.product.brand'] || p['ro.product.manufacturer'] || '',
    name: p['ro.product.model'] || serial,
    android: p['ro.build.version.release'] || '?',
    sdk: p['ro.build.version.sdk'] || '?',
  }
}

async function scan(cfg: ScanConfig, sender: WebContents) {
  const info = await deviceInfo(cfg, cfg.serial)

  const [pkgRes, a11yRes, adminRes, launcherRes] = await Promise.all([
    shell(cfg, cfg.serial, 'pm list packages -3 -i'),
    shell(cfg, cfg.serial, 'settings get secure enabled_accessibility_services'),
    shell(cfg, cfg.serial, 'dumpsys device_policy'),
    shell(cfg, cfg.serial, 'cmd package query-activities -a android.intent.action.MAIN -c android.intent.category.LAUNCHER'),
  ])

  const packages = parsePackages(pkgRes.stdout)
  const a11y = (a11yRes.stdout || '').trim()
  const admins = parseDeviceAdmins(adminRes.stdout)
  const launchers = parseLauncherPackages(launcherRes.stdout)
  const launcherDetection = launchers.size > 3 // só confia na detecção de ocultos se a consulta retornou algo coerente

  const apps: ScannedAppRaw[] = packages.map(({ pkg, installer }) => {
    const trusted = cfg.trustedInstallers.some((t) => installer.startsWith(t.replace(/\.\.\.$/, '')))
    const hidden = launcherDetection && !launchers.has(pkg)
    const unknownSource = installer === 'null' || !trusted
    const adwareRule = cfg.blocklist.find((r) => r.pattern && pkg.toLowerCase().includes(r.pattern.toLowerCase()))
    const accessibility = a11y !== 'null' && a11y.includes(pkg)
    const deviceAdmin = admins.has(pkg)
    return {
      packageName: pkg,
      label: pkg,
      installer,
      system: false,
      hidden,
      unknownSource,
      overlay: false,
      accessibility,
      deviceAdmin,
      knownAdware: Boolean(adwareRule),
      adwareLabel: adwareRule?.label ?? '',
      reasons: [],
      severity: 'baixa',
      flagged: false,
    }
  })

  // Candidatos a verificação profunda (sobreposição)
  const candidates = apps.filter(
    (a) => a.knownAdware || (cfg.flagHidden && a.hidden) || (cfg.flagUnknownSource && a.unknownSource) || a.accessibility || a.deviceAdmin,
  )
  const deep = candidates.slice(0, Math.max(0, cfg.maxDeepScan))

  let done = 0
  for (const app of deep) {
    if (cfg.flagOverlay) {
      const res = await shell(cfg, cfg.serial, `appops get ${app.packageName} SYSTEM_ALERT_WINDOW`, 8000)
      app.overlay = /:\s*allow/i.test(res.stdout)
    }
    done++
    sender.send('adb:progress', { done, total: deep.length, current: app.packageName })
  }

  // Classificação final
  for (const app of apps) {
    const reasons: string[] = []
    if (app.knownAdware) reasons.push(app.adwareLabel || 'Pacote reconhecido como adware')
    if (cfg.flagHidden && app.hidden) reasons.push('App sem ícone na tela (oculto)')
    if (cfg.flagUnknownSource && app.unknownSource) reasons.push(app.installer === 'null' ? 'Origem desconhecida (instalado fora da loja)' : `Instalado por ${app.installer}`)
    if (app.overlay) reasons.push('Pode desenhar sobre outros apps (sobreposição/anúncios)')
    if (app.accessibility) reasons.push('Usa serviço de acessibilidade (acesso sensível)')
    if (app.deviceAdmin) reasons.push('Registrado como administrador do dispositivo')
    app.reasons = reasons
    app.flagged = reasons.length > 0

    if (app.knownAdware || app.deviceAdmin || (app.hidden && app.overlay)) app.severity = 'alta'
    else if (app.hidden || app.accessibility || (app.unknownSource && app.overlay)) app.severity = 'media'
    else app.severity = 'baixa'
  }

  apps.sort((a, b) => Number(b.flagged) - Number(a.flagged) || ({ alta: 0, media: 1, baixa: 2 }[a.severity] - { alta: 0, media: 1, baixa: 2 }[b.severity]))

  return {
    info,
    apps,
    total: apps.length,
    flaggedCount: apps.filter((a) => a.flagged).length,
    scannedAt: new Date().toISOString(),
    simulated: false,
  }
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

export function registerAdbHandlers(): void {
  ipcMain.handle('adb:check', async (_e, cfg: AdbConfig) => {
    const res = await run(cfg, ['version'], 8000)
    if (res.notFound) return { available: false, version: '', path: adbBin(cfg) }
    const version = (res.stdout.match(/version\s+([\d.]+)/i)?.[1]) || ''
    return { available: res.ok, version, path: adbBin(cfg) }
  })

  ipcMain.handle('adb:devices', async (_e, cfg: AdbConfig) => {
    const res = await run(cfg, ['devices', '-l'], 8000)
    if (res.notFound) return { available: false, devices: [] }
    const devices = res.stdout
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [serial, state] = line.split(/\s+/)
        const model = line.match(/model:(\S+)/)?.[1]?.replace(/_/g, ' ') ?? ''
        return { serial, state: state ?? 'unknown', model, description: line }
      })
      .filter((d) => d.serial && d.serial !== 'List')
    return { available: true, devices }
  })

  ipcMain.handle('adb:scan', async (event, cfg: ScanConfig) => {
    try {
      return { ok: true, result: await scan(cfg, event.sender) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // Ações sobre um pacote: remover (para o usuário), desativar, reativar ou blindar
  ipcMain.handle('adb:action', async (_e, cfg: AdbConfig & { serial: string; packageName: string; action: string }) => {
    const { serial, packageName: pkg, action } = cfg
    const commands: Record<string, string> = {
      uninstall: `pm uninstall --user 0 ${pkg}`,
      disable: `pm disable-user --user 0 ${pkg}`,
      enable: `cmd package install-existing ${pkg}`,
      harden: `appops set ${pkg} SYSTEM_ALERT_WINDOW ignore && appops set ${pkg} RUN_IN_BACKGROUND ignore`,
    }
    const cmd = commands[action]
    if (!cmd) return { ok: false, error: 'Ação inválida' }
    const res = await shell(cfg, serial, cmd)
    const ok = res.ok && !/Failure|Error|Exception/i.test(res.stdout + res.stderr)
    return { ok, output: (res.stdout || res.stderr || '').trim() }
  })

  // Blindagem global (best-effort — alguns itens dependem da versão do Android)
  ipcMain.handle('adb:shield', async (_e, cfg: AdbConfig & { serial: string }) => {
    const steps = [
      { label: 'Bloquear instalação de fontes desconhecidas', cmd: 'settings put secure install_non_market_apps 0' },
      { label: 'Bloquear instalação via Play Protect desligado', cmd: 'settings put global package_verifier_enable 1' },
    ]
    const results = []
    for (const s of steps) {
      const res = await shell(cfg, cfg.serial, s.cmd, 8000)
      results.push({ label: s.label, ok: res.ok })
    }
    return { ok: results.every((r) => r.ok), results }
  })
}
