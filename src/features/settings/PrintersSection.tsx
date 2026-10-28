import { useEffect, useState } from 'react'
import { FileText, Plus, Printer, Receipt, RefreshCw, Tag, TestTube2, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Field, Input, NumberInput, Select, Switch } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { usePrint } from '@/components/print/PrintProvider'
import { store, useSettings } from '@/data/store'
import { PRINT_PURPOSES, PRINTER_KINDS, PRINTER_PRESETS } from '@/domain/defaults'
import type { PrintPurpose, PrinterKind, PrinterProfile, Settings } from '@/domain/types'
import { isDesktop, listPrinters } from '@/infra/platform'
import { testPageHtml } from '@/print/templates'
import { cx, uid } from '@/lib/utils'
import { SectionFooter } from './SectionFooter'

const KIND_ICON: Record<PrinterKind, JSX.Element> = { termica: <Receipt />, a4: <FileText />, etiqueta: <Tag /> }

type Draft = Pick<Settings, 'printers' | 'assignments'>

export function PrintersSection() {
  const settings = useSettings()
  const { toast, confirm } = useFeedback()
  const { openPreview } = usePrint()
  const [draft, setDraft] = useState<Draft>({ printers: settings.printers, assignments: settings.assignments })
  const [dirty, setDirty] = useState(false)
  const [selectedId, setSelectedId] = useState(settings.printers[0]?.id ?? '')
  const [system, setSystem] = useState<SystemPrinter[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(false)

  const refreshPrinters = async () => {
    setLoadingPrinters(true)
    setSystem(await listPrinters())
    setLoadingPrinters(false)
  }

  useEffect(() => {
    void refreshPrinters()
  }, [])

  useEffect(() => {
    if (!dirty) setDraft({ printers: settings.printers, assignments: settings.assignments })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.printers, settings.assignments])

  const selected = draft.printers.find((p) => p.id === selectedId) ?? draft.printers[0]

  const change = (next: Draft) => {
    setDraft(next)
    setDirty(true)
  }
  const updateProfile = (patch: Partial<PrinterProfile>) =>
    change({ ...draft, printers: draft.printers.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)) })

  const addPreset = (key: keyof typeof PRINTER_PRESETS) => {
    const profile: PrinterProfile = { id: uid(), ...PRINTER_PRESETS[key] }
    change({ ...draft, printers: [...draft.printers, profile] })
    setSelectedId(profile.id)
  }

  const removeProfile = async () => {
    if (draft.printers.length <= 1) return toast('Mantenha ao menos um perfil de impressão', 'warning')
    if (!(await confirm({ title: `Remover "${selected.name}"?`, confirmLabel: 'Remover', danger: true }))) return
    const printers = draft.printers.filter((p) => p.id !== selected.id)
    const assignments = { ...draft.assignments }
    for (const k of Object.keys(assignments) as PrintPurpose[]) if (assignments[k] === selected.id) assignments[k] = printers[0].id
    change({ printers, assignments })
    setSelectedId(printers[0].id)
  }

  const save = async () => {
    await store.saveSettings({ ...store.getSettings(), ...draft })
    setDirty(false)
    toast('Impressoras salvas')
  }

  const testPrint = () => {
    openPreview({ title: `Teste — ${selected.name}`, purpose: selected.kind === 'a4' ? 'a4' : 'receipt', build: () => testPageHtml(store.getSettings(), selected) })
  }

  return (
    <div className="stack">
      <Card title="Uso padrão" icon={<Printer />} subtitle="Qual perfil cada documento usa ao imprimir">
        <div className="form-grid">
          {(Object.keys(PRINT_PURPOSES) as PrintPurpose[]).map((purpose) => (
            <Field key={purpose} label={PRINT_PURPOSES[purpose].label} hint={PRINT_PURPOSES[purpose].description} span={6}>
              <Select value={draft.assignments[purpose]} onChange={(e) => change({ ...draft, assignments: { ...draft.assignments, [purpose]: e.target.value } })}>
                {draft.printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      </Card>

      <Card
        title="Perfis de impressão"
        icon={<Receipt />}
        subtitle="Cada perfil guarda a impressora, o tamanho do papel e o layout"
        actions={
          <select
            className="select"
            style={{ width: 230, minHeight: 32 }}
            value=""
            onChange={(e) => e.target.value && addPreset(e.target.value as keyof typeof PRINTER_PRESETS)}
          >
            <option value="">+ Adicionar perfil...</option>
            {Object.entries(PRINTER_PRESETS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.name}
              </option>
            ))}
          </select>
        }
        flush
      >
        <div className="card-body">
          <div className="grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
            <div className="stack" style={{ gap: 8 }}>
              {draft.printers.map((p) => (
                <div key={p.id} className={cx('profile-card', p.id === selected?.id && 'active')} onClick={() => setSelectedId(p.id)}>
                  <div className="icon">{KIND_ICON[p.kind]}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="strong truncate">{p.name}</div>
                    <div className="small muted truncate">
                      {PRINTER_KINDS[p.kind]} · {p.paperWidthMm}mm
                    </div>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => addPreset('elgin80')}>
                Novo perfil Elgin i9
              </Button>
            </div>

            {selected && (
              <div className="stack">
                <div className="form-grid">
                  <Field label="Nome do perfil" span={8}>
                    <Input value={selected.name} onChange={(e) => updateProfile({ name: e.target.value })} />
                  </Field>
                  <Field label="Tipo" span={4}>
                    <Select value={selected.kind} onChange={(e) => updateProfile({ kind: e.target.value as PrinterKind })}>
                      {Object.entries(PRINTER_KINDS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Impressora do Windows"
                    span={12}
                    as="div"
                    hint={isDesktop ? 'Selecione da lista ou digite o nome exatamente como aparece no Windows' : 'A lista de impressoras só aparece no app desktop'}
                  >
                    <div className="row">
                      <Input value={selected.printerName} onChange={(e) => updateProfile({ printerName: e.target.value })} list="system-printers" placeholder="Vazio = perguntar ao imprimir" />
                      <datalist id="system-printers">
                        {system.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.displayName}
                            {p.isDefault ? ' (padrão)' : ''}
                          </option>
                        ))}
                      </datalist>
                      <Button iconOnly icon={<RefreshCw className={loadingPrinters ? 'spin' : ''} />} onClick={refreshPrinters} title="Atualizar lista" aria-label="Atualizar lista" />
                    </div>
                    {system.length > 0 && (
                      <div className="row wrap" style={{ marginTop: 6 }}>
                        {system.map((p) => (
                          <button key={p.name} type="button" className={cx('chip', selected.printerName === p.name && 'active')} onClick={() => updateProfile({ printerName: p.name })}>
                            {p.displayName}
                            {p.isDefault && <Badge tone="blue">padrão</Badge>}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>
                  <Field label="Largura do papel (mm)" span={3} hint={selected.kind === 'termica' ? 'Elgin i9: 80 ou 58' : undefined}>
                    <NumberInput value={selected.paperWidthMm} decimals={0} min={20} onChange={(v) => updateProfile({ paperWidthMm: Math.round(v) })} />
                  </Field>
                  <Field label="Altura do papel (mm)" span={3} hint="0 = bobina contínua">
                    <NumberInput value={selected.paperHeightMm} decimals={0} min={0} onChange={(v) => updateProfile({ paperHeightMm: Math.round(v) })} />
                  </Field>
                  <Field label="Margem (mm)" span={2}>
                    <NumberInput value={selected.marginMm} decimals={1} min={0} onChange={(v) => updateProfile({ marginMm: v })} />
                  </Field>
                  <Field label="Fonte (pt)" span={2}>
                    <NumberInput value={selected.fontSizePt} decimals={1} min={5} onChange={(v) => updateProfile({ fontSizePt: v })} />
                  </Field>
                  <Field label="Cópias" span={2}>
                    <NumberInput value={selected.copies} decimals={0} min={1} onChange={(v) => updateProfile({ copies: Math.max(1, Math.round(v)) })} />
                  </Field>
                  <Field label="Família da fonte" span={6}>
                    <Select value={selected.fontFamily} onChange={(e) => updateProfile({ fontFamily: e.target.value })}>
                      <option value="Arial, Helvetica, sans-serif">Arial (recomendada p/ térmica)</option>
                      <option value="'Segoe UI', Tahoma, sans-serif">Segoe UI</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                      <option value="Tahoma, sans-serif">Tahoma</option>
                      <option value="'Courier New', Consolas, monospace">Courier New (monoespaçada)</option>
                      <option value="Georgia, 'Times New Roman', serif">Georgia (serifada)</option>
                    </Select>
                  </Field>
                  <Field span={6} as="div" label="Opções">
                    <div className="stack" style={{ gap: 10 }}>
                      <Switch checked={selected.showLogo} onChange={(v) => updateProfile({ showLogo: v })} label="Imprimir logo da empresa" />
                      <Switch checked={selected.silent} onChange={(v) => updateProfile({ silent: v })} label="Impressão direta" description="Envia sem abrir a janela do Windows (requer impressora definida)" />
                    </div>
                  </Field>
                </div>
                <div className="row">
                  <Button icon={<TestTube2 />} onClick={testPrint}>
                    Imprimir página de teste
                  </Button>
                  <div className="spacer" />
                  <Button variant="danger" icon={<Trash2 />} onClick={removeProfile}>
                    Remover perfil
                  </Button>
                </div>
                {selected.kind === 'termica' && (
                  <div className="alert tone-blue">
                    <Receipt />
                    <div>
                      <b>Elgin i9:</b> instale o driver da Elgin, defina o papel como 80mm (ou 58mm) nas preferências da impressora no Windows e use o mesmo nome aqui.
                      Se o texto sair cortado nas laterais, aumente a margem para 4–5mm.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <SectionFooter
          dirty={dirty}
          onSave={save}
          onReset={() => {
            setDraft({ printers: settings.printers, assignments: settings.assignments })
            setDirty(false)
          }}
        />
      </Card>
    </div>
  )
}
