import { useState } from 'react'
import { Plus, ShieldCheck, Terminal, X } from 'lucide-react'
import { Button, Card, Field, Input, NumberInput, Switch } from '@/components/ui'
import type { AdwareRule } from '@/domain/types'
import { SectionFooter } from './SectionFooter'
import { useSettingsSection } from './useSettingsSection'

export function CleanupSection() {
  const { draft, patch, save, reset, dirty } = useSettingsSection('cleanup')
  const [pattern, setPattern] = useState('')
  const [label, setLabel] = useState('')
  const [installer, setInstaller] = useState('')

  const addRule = () => {
    const p = pattern.trim()
    if (!p) return
    const rule: AdwareRule = { pattern: p, label: label.trim() || 'Adware' }
    patch({ blocklist: [...draft.blocklist, rule] })
    setPattern('')
    setLabel('')
  }

  const addInstaller = () => {
    const v = installer.trim()
    if (!v || draft.trustedInstallers.includes(v)) return
    patch({ trustedInstallers: [...draft.trustedInstallers, v] })
    setInstaller('')
  }

  return (
    <Card title="Limpeza Android (ADB)" icon={<ShieldCheck />} subtitle="Como o sistema detecta adware e onde encontrar o ADB" flush>
      <div className="card-body stack">
        <div className="form-grid">
          <Field label="Caminho do ADB" span={8} hint="Deixe vazio para usar o adb do PATH do sistema. Ex.: C:\\platform-tools\\adb.exe">
            <div className="input-group">
              <span className="addon"><Terminal size={16} /></span>
              <Input value={draft.adbPath} onChange={(e) => patch({ adbPath: e.target.value })} className="mono" placeholder="adb" style={{ paddingLeft: 36 }} />
            </div>
          </Field>
          <Field label="Máx. de apps na análise profunda" span={4} hint="Limita a verificação de sobreposição">
            <NumberInput value={draft.maxDeepScan} decimals={0} min={10} onChange={(v) => patch({ maxDeepScan: Math.round(v) })} />
          </Field>
        </div>

        <Field label="Critérios de detecção" as="div">
          <div className="grid grid-3" style={{ gap: 12 }}>
            <Switch checked={draft.flagHidden} onChange={(v) => patch({ flagHidden: v })} label="Apps ocultos" description="Sem ícone na tela" />
            <Switch checked={draft.flagUnknownSource} onChange={(v) => patch({ flagUnknownSource: v })} label="Origem desconhecida" description="Fora da loja oficial" />
            <Switch checked={draft.flagOverlay} onChange={(v) => patch({ flagOverlay: v })} label="Sobreposição" description="Pode exibir anúncios" />
          </div>
        </Field>

        <div className="grid grid-2">
          <Field label="Lista de adware conhecido" as="div" hint="Trechos de nome de pacote que serão sinalizados como adware">
            <div className="stack" style={{ gap: 4, maxHeight: 220, overflowY: 'auto', marginBottom: 8 }}>
              {draft.blocklist.map((r, i) => (
                <div key={`${r.pattern}-${i}`} className="row" style={{ padding: '4px 4px 4px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="mono small" style={{ flex: 1 }}>
                    {r.pattern}
                  </span>
                  <span className="small muted truncate" style={{ maxWidth: 140 }}>{r.label}</span>
                  <Button size="sm" variant="ghost" iconOnly icon={<X />} onClick={() => patch({ blocklist: draft.blocklist.filter((_, idx) => idx !== i) })} aria-label="Remover" />
                </div>
              ))}
            </div>
            <div className="row">
              <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="mono" placeholder="com.exemplo.adware" />
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Rótulo" style={{ maxWidth: 130 }} />
              <Button icon={<Plus />} onClick={addRule}>
                Add
              </Button>
            </div>
          </Field>

          <Field label="Instaladores confiáveis" as="div" hint="Apps instalados por estas lojas não são marcados como origem desconhecida">
            <div className="stack" style={{ gap: 4, maxHeight: 220, overflowY: 'auto', marginBottom: 8 }}>
              {draft.trustedInstallers.map((t, i) => (
                <div key={`${t}-${i}`} className="row" style={{ padding: '4px 4px 4px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="mono small" style={{ flex: 1 }}>
                    {t}
                  </span>
                  <Button size="sm" variant="ghost" iconOnly icon={<X />} onClick={() => patch({ trustedInstallers: draft.trustedInstallers.filter((_, idx) => idx !== i) })} aria-label="Remover" />
                </div>
              ))}
            </div>
            <div className="row">
              <Input value={installer} onChange={(e) => setInstaller(e.target.value)} className="mono" placeholder="com.android.vending" onKeyDown={(e) => e.key === 'Enter' && addInstaller()} />
              <Button icon={<Plus />} onClick={addInstaller}>
                Add
              </Button>
            </div>
          </Field>
        </div>
      </div>
      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </Card>
  )
}
