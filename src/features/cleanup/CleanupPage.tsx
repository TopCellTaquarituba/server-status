import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Usb,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Kpi, Modal, PageHeader } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { THREAT_SEVERITY } from '@/domain/defaults'
import type { AdbDevice, ScanResult, ScannedApp, ThreatSeverity } from '@/domain/types'
import { isDesktop } from '@/infra/platform'
import { cx } from '@/lib/utils'
import { applyAction, checkAdb, listDevices, onScanProgress, scanDevice, shieldDevice, simulatedScan, type AdbStatus, type AppAction } from '@/services/android'

type AppState = 'present' | 'removed' | 'disabled'

export function CleanupPage() {
  const { confirm, toast, run } = useFeedback()
  const [adb, setAdb] = useState<AdbStatus | null>(null)
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [serial, setSerial] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })
  const [result, setResult] = useState<ScanResult | null>(null)
  const [states, setStates] = useState<Record<string, AppState>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showClean, setShowClean] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [help, setHelp] = useState(false)
  const unsubRef = useRef<() => void>()

  const refreshDevices = async () => {
    setLoadingDevices(true)
    const status = await checkAdb()
    setAdb(status)
    const list = status.available ? await listDevices() : []
    setDevices(list)
    if (list.length && !list.some((d) => d.serial === serial)) setSerial(list[0].serial)
    setLoadingDevices(false)
  }

  useEffect(() => {
    if (isDesktop) void refreshDevices()
    else setAdb({ available: false, version: '', path: 'adb' })
    unsubRef.current = onScanProgress(setProgress)
    return () => unsubRef.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startScan = async (simulate = false) => {
    setScanning(true)
    setProgress({ done: 0, total: 0, current: '' })
    setResult(null)
    setStates({})
    setSelected(new Set())
    try {
      const res = simulate ? simulatedScan() : await scanDevice(serial)
      setResult(res)
      // pré-seleciona ameaças de alto risco
      setSelected(new Set(res.apps.filter((a) => a.flagged && a.severity === 'alta').map((a) => a.packageName)))
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Falha ao escanear', 'error')
    } finally {
      setScanning(false)
    }
  }

  const flagged = useMemo(() => result?.apps.filter((a) => a.flagged) ?? [], [result])
  const clean = useMemo(() => result?.apps.filter((a) => !a.flagged) ?? [], [result])
  const activeFlagged = flagged.filter((a) => (states[a.packageName] ?? 'present') === 'present')

  const bySeverity = (s: ThreatSeverity) => activeFlagged.filter((a) => a.severity === s).length

  const toggle = (pkg: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(pkg) ? next.delete(pkg) : next.add(pkg)
      return next
    })

  const doAction = async (pkg: string, action: AppAction) => {
    if (result?.simulated) {
      // Demonstração: apenas simula o resultado visual, sem tocar em nada
      setStates((s) => ({ ...s, [pkg]: action === 'uninstall' ? 'removed' : action === 'disable' ? 'disabled' : 'present' }))
      toast('Demonstração: nenhuma alteração foi feita no aparelho', 'info')
      return
    }
    setBusy(pkg)
    const ok = await run(() => applyAction(serial, pkg, action))
    setBusy(null)
    if (ok) {
      if (action === 'uninstall') setStates((s) => ({ ...s, [pkg]: 'removed' }))
      else if (action === 'disable') setStates((s) => ({ ...s, [pkg]: 'disabled' }))
      else if (action === 'enable') setStates((s) => ({ ...s, [pkg]: 'present' }))
      toast(action === 'harden' ? 'App blindado (sobreposição bloqueada)' : 'Ação concluída', 'success')
    }
  }

  const removeSelected = async () => {
    const list = [...selected].filter((p) => (states[p] ?? 'present') === 'present')
    if (list.length === 0) return
    const ok = await confirm({
      title: `Remover ${list.length} app(s)?`,
      message: 'Os apps selecionados serão removidos do perfil do usuário (ação reversível reinstalando pela loja). Confirme que o cliente autorizou a limpeza.',
      confirmLabel: 'Remover',
      danger: true,
    })
    if (!ok) return
    for (const pkg of list) await doAction(pkg, 'uninstall')
    toast(`${list.length} app(s) processado(s)`, 'success')
  }

  const shield = async () => {
    if (result?.simulated) return toast('Demonstração: blindagem não aplicada', 'info')
    const ok = await confirm({ title: 'Blindar o aparelho?', message: 'Serão aplicadas proteções contra instalação de apps de fontes desconhecidas. Alguns itens dependem da versão do Android.', confirmLabel: 'Blindar' })
    if (!ok) return
    setBusy('__shield__')
    const res = await shieldDevice(serial)
    setBusy(null)
    const okCount = res.results.filter((r) => r.ok).length
    toast(`Blindagem aplicada (${okCount}/${res.results.length} proteções)`, okCount ? 'success' : 'warning')
  }

  /* ----------------------------- render ----------------------------- */

  const renderApp = (a: ScannedApp) => {
    const state = states[a.packageName] ?? 'present'
    const sev = THREAT_SEVERITY[a.severity]
    return (
      <div key={a.packageName} className={cx('cleanup-app', state !== 'present' && 'done')}>
        {a.flagged && state === 'present' && (
          <input type="checkbox" checked={selected.has(a.packageName)} onChange={() => toggle(a.packageName)} disabled={busy === a.packageName} />
        )}
        <div className="grow" style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="strong mono truncate">{a.packageName}</span>
            {a.flagged && state === 'present' && <Badge tone={sev.tone}>{sev.label}</Badge>}
            {state === 'removed' && <Badge tone="gray">Removido</Badge>}
            {state === 'disabled' && <Badge tone="gray">Desativado</Badge>}
          </div>
          {a.reasons.length > 0 && state === 'present' && <div className="small muted">{a.reasons.join(' · ')}</div>}
        </div>
        {state === 'present' ? (
          a.flagged ? (
            <div className="row" style={{ gap: 4 }}>
              {busy === a.packageName ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => doAction(a.packageName, 'harden')} title="Bloquear sobreposição/anúncios">
                    <Shield size={14} /> Blindar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => doAction(a.packageName, 'disable')} title="Desativar">
                    <Ban size={14} />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => doAction(a.packageName, 'uninstall')} title="Remover">
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Badge tone="green">
              <CheckCircle2 size={12} /> Confiável
            </Badge>
          )
        ) : (
          <Button size="sm" variant="ghost" onClick={() => doAction(a.packageName, 'enable')} disabled={result?.simulated}>
            Reativar
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Limpeza Android"
        subtitle="Detecta e remove adware/bloatware via cabo USB"
        badge={result?.simulated && <Badge tone="amber">Modo demonstração</Badge>}
        actions={
          <>
            <Button variant="ghost" icon={<HelpCircle />} onClick={() => setHelp(true)}>
              Como conectar
            </Button>
            {result && (
              <Button icon={<ScanLine />} onClick={() => startScan(result.simulated)} loading={scanning}>
                Escanear de novo
              </Button>
            )}
          </>
        }
      />

      <div className="alert tone-blue">
        <Shield />
        <div>
          Esta ferramenta faz uma <b>limpeza de adware e bloatware</b> — lista os apps instalados, destaca os suspeitos com o motivo real e remove apenas os que você confirmar.
          Não é um antivírus que inventa ameaças. Use sempre com o aparelho do cliente conectado por USB e com autorização dele.
        </div>
      </div>

      {!result && (
        <Card title="1. Conectar o aparelho" icon={<Usb />}>
          {!isDesktop ? (
            <div className="stack">
              <div className="alert tone-amber">
                <AlertTriangle />
                <div>A conexão USB só funciona no aplicativo desktop (Windows). No navegador, use o modo demonstração para conhecer a tela.</div>
              </div>
              <div>
                <Button variant="primary" icon={<Sparkles />} onClick={() => startScan(true)}>
                  Ver demonstração
                </Button>
              </div>
            </div>
          ) : adb && !adb.available ? (
            <div className="stack">
              <div className="alert tone-amber">
                <AlertTriangle />
                <div>
                  O <b>ADB</b> não foi encontrado. Instale o “Android Platform Tools” e informe o caminho do <code>adb.exe</code> em Configurações → Limpeza Android. Caminho testado: <span className="mono">{adb.path}</span>
                </div>
              </div>
              <div className="row">
                <Button icon={<RefreshCw />} onClick={refreshDevices} loading={loadingDevices}>
                  Verificar de novo
                </Button>
                <Button variant="ghost" icon={<Sparkles />} onClick={() => startScan(true)}>
                  Ver demonstração
                </Button>
              </div>
            </div>
          ) : (
            <div className="stack">
              <div className="row">
                <Button icon={<RefreshCw />} onClick={refreshDevices} loading={loadingDevices}>
                  Procurar aparelhos
                </Button>
                <span className="small muted">{adb?.available && `ADB ${adb.version} pronto`}</span>
              </div>
              {devices.length === 0 ? (
                <EmptyState
                  icon={<Smartphone />}
                  title="Nenhum aparelho conectado"
                  description="Conecte o celular por USB, ative a Depuração USB e autorize este computador no aparelho. Clique em “Como conectar” para o passo a passo."
                  action={
                    <Button variant="ghost" icon={<Sparkles />} onClick={() => startScan(true)}>
                      Ver demonstração
                    </Button>
                  }
                />
              ) : (
                <div className="stack" style={{ gap: 8 }}>
                  {devices.map((d) => (
                    <div key={d.serial} className={cx('profile-card', d.serial === serial && 'active')} onClick={() => setSerial(d.serial)}>
                      <div className="icon">
                        <Smartphone />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="strong">{d.model || 'Aparelho Android'}</div>
                        <div className="small muted mono truncate">{d.serial}</div>
                      </div>
                      {d.serial === serial && <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />}
                    </div>
                  ))}
                  <div>
                    <Button variant="primary" icon={<ScanLine />} onClick={() => startScan(false)} disabled={!serial} loading={scanning}>
                      Escanear ameaças
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {scanning && (
        <Card>
          <div className="stack" style={{ alignItems: 'center', padding: 16, gap: 12 }}>
            <Loader2 className="spin" size={28} style={{ color: 'var(--primary)' }} />
            <div className="strong">Analisando o aparelho…</div>
            {progress.total > 0 && (
              <>
                <div className="hbar-track" style={{ width: 320 }}>
                  <div className="hbar-fill tone-indigo" style={{ width: `${(progress.done / progress.total) * 100}%`, background: 'var(--primary)' }} />
                </div>
                <div className="small muted mono truncate" style={{ maxWidth: 360 }}>
                  {progress.done}/{progress.total} · {progress.current}
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {result && !scanning && (
        <>
          <Card icon={<Smartphone />} title={`${result.info.brand} ${result.info.model}`.trim()} subtitle={`Android ${result.info.android} · ${result.total} apps instalados`}>
            <div className="grid grid-4">
              <Kpi label="Ameaças encontradas" value={activeFlagged.length} icon={<AlertTriangle />} tone={activeFlagged.length ? 'red' : 'green'} />
              <Kpi label="Alto risco" value={bySeverity('alta')} icon={<Ban />} tone={bySeverity('alta') ? 'red' : 'gray'} />
              <Kpi label="Suspeitos" value={bySeverity('media')} icon={<Eye />} tone={bySeverity('media') ? 'amber' : 'gray'} />
              <Kpi label="Apps confiáveis" value={clean.length + (flagged.length - activeFlagged.length)} icon={<ShieldCheck />} tone="green" />
            </div>
          </Card>

          <Card
            title={`Ameaças detectadas (${activeFlagged.length})`}
            icon={<AlertTriangle />}
            actions={
              activeFlagged.length > 0 && (
                <>
                  <span className="small muted">{selected.size} selecionado(s)</span>
                  <Button variant="danger" size="sm" icon={<Trash2 />} onClick={removeSelected} disabled={selected.size === 0}>
                    Remover selecionados
                  </Button>
                </>
              )
            }
            flush
          >
            <div className="card-body">
              {flagged.length === 0 ? (
                <EmptyState icon={<ShieldCheck />} title="Nenhuma ameaça encontrada" description="Nenhum app suspeito foi detectado neste aparelho." />
              ) : (
                <div className="stack" style={{ gap: 6 }}>{flagged.map(renderApp)}</div>
              )}
            </div>
          </Card>

          <Card
            title="Blindagem do aparelho"
            icon={<ShieldCheck />}
            subtitle="Dificulta a reinfecção após a limpeza"
          >
            <div className="row wrap" style={{ gap: 12 }}>
              <div className="small muted" style={{ flex: 1, minWidth: 220 }}>
                Bloqueia a instalação de apps de fontes desconhecidas e reativa a verificação de segurança. Recomendado após remover as ameaças.
              </div>
              <Button icon={busy === '__shield__' ? <Loader2 className="spin" /> : <Shield />} onClick={shield} disabled={busy === '__shield__'}>
                Blindar aparelho
              </Button>
            </div>
          </Card>

          <Card
            title={`Apps confiáveis (${clean.length})`}
            icon={<CheckCircle2 />}
            actions={
              <Button size="sm" variant="ghost" icon={showClean ? <EyeOff /> : <Eye />} onClick={() => setShowClean((v) => !v)}>
                {showClean ? 'Ocultar' : 'Mostrar'}
              </Button>
            }
            flush
          >
            {showClean && (
              <div className="card-body">
                <div className="stack" style={{ gap: 6 }}>{clean.map(renderApp)}</div>
              </div>
            )}
          </Card>
        </>
      )}

      <HelpModal open={help} onClose={() => setHelp(false)} />
    </div>
  )
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    'No celular, abra Configurações → Sobre o telefone e toque 7 vezes em “Número da versão” para liberar as Opções do desenvolvedor.',
    'Volte em Configurações → Sistema → Opções do desenvolvedor e ative a “Depuração USB”.',
    'Conecte o aparelho ao computador por um cabo USB de dados.',
    'No celular, confirme a janela “Permitir depuração USB?” marcando “Sempre permitir”.',
    'Aqui no app, clique em “Procurar aparelhos”. O aparelho deve aparecer na lista.',
  ]
  return (
    <Modal open={open} onClose={onClose} title="Como conectar o aparelho" description="Ativando a Depuração USB" size="md" footer={<Button variant="primary" onClick={onClose}>Entendi</Button>}>
      <ol className="help-steps">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="alert tone-amber" style={{ marginTop: 14 }}>
        <AlertTriangle />
        <div>Requer o <b>ADB (Android Platform Tools)</b> instalado no computador. O caminho pode ser configurado em Configurações → Limpeza Android.</div>
      </div>
    </Modal>
  )
}
