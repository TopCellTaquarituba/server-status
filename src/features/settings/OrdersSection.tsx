import { useState } from 'react'
import { ArrowDown, ArrowUp, ClipboardList, Plus, X } from 'lucide-react'
import { Button, Card, Field, Input, NumberInput, Select, Switch, Textarea } from '@/components/ui'
import { docCode } from '@/lib/format'
import { COPY_PRINT_MODES, DEFAULT_TERMS } from '@/domain/defaults'
import type { CopyPrintMode } from '@/domain/types'
import { SectionFooter } from './SectionFooter'
import { useSettingsSection } from './useSettingsSection'

/** Editor de listas simples (checklist, formas de pagamento...) */
function ListEditor({ items, onChange, placeholder, orderable }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; orderable?: boolean }) {
  const [value, setValue] = useState('')
  const add = () => {
    const v = value.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setValue('')
  }
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="stack" style={{ gap: 4, maxHeight: 280, overflowY: 'auto' }}>
        {items.map((item, i) => (
          <div key={item} className="row" style={{ padding: '4px 4px 4px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ flex: 1 }}>{item}</span>
            {orderable && (
              <>
                <Button size="sm" variant="ghost" iconOnly icon={<ArrowUp />} onClick={() => move(i, -1)} aria-label="Subir" />
                <Button size="sm" variant="ghost" iconOnly icon={<ArrowDown />} onClick={() => move(i, 1)} aria-label="Descer" />
              </>
            )}
            <Button size="sm" variant="ghost" iconOnly icon={<X />} onClick={() => onChange(items.filter((x) => x !== item))} aria-label="Remover" />
          </div>
        ))}
      </div>
      <div className="row">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button icon={<Plus />} onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}

export function OrdersSection() {
  const { draft, patch, save, reset, dirty } = useSettingsSection('orders')

  return (
    <Card title="Ordens de serviço e orçamentos" icon={<ClipboardList />} subtitle="Numeração, prazos, garantia, termos e listas" flush>
      <div className="card-body stack">
        <div className="form-grid">
          <Field label="Prefixo da OS" span={3} hint={`Ex.: ${docCode(draft.prefix || 'OS', draft.startNumber)}`}>
            <Input value={draft.prefix} onChange={(e) => patch({ prefix: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Nº inicial da OS" span={3} hint="Útil ao migrar de outro sistema">
            <NumberInput value={draft.startNumber} decimals={0} min={1} onChange={(v) => patch({ startNumber: Math.max(1, Math.round(v)) })} />
          </Field>
          <Field label="Prefixo do orçamento" span={3}>
            <Input value={draft.quotePrefix} onChange={(e) => patch({ quotePrefix: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Validade do orçamento (dias)" span={3}>
            <NumberInput value={draft.quoteValidityDays} decimals={0} min={1} onChange={(v) => patch({ quoteValidityDays: Math.round(v) })} />
          </Field>
          <Field label="Garantia padrão (dias)" span={3}>
            <NumberInput value={draft.defaultWarrantyDays} decimals={0} min={0} onChange={(v) => patch({ defaultWarrantyDays: Math.round(v) })} />
          </Field>
          <Field label="Prazo padrão de entrega (dias)" span={3}>
            <NumberInput value={draft.defaultDueDays} decimals={0} min={0} onChange={(v) => patch({ defaultDueDays: Math.round(v) })} />
          </Field>
          <Field span={6} as="div" label="Impressão do cupom">
            <div className="stack" style={{ gap: 10 }}>
              <Switch checked={draft.printTwoCopies} onChange={(v) => patch({ printTwoCopies: v })} label="Imprimir 2 vias (cliente + loja)" />
              <Switch checked={draft.showPasswordOnStoreCopy} onChange={(v) => patch({ showPasswordOnStoreCopy: v })} label="Mostrar senha do aparelho na via da loja" />
            </div>
          </Field>
          {draft.printTwoCopies && (
            <Field label="Como imprimir as 2 vias" span={6} hint={COPY_PRINT_MODES[draft.copyPrintMode].description}>
              <Select value={draft.copyPrintMode} onChange={(e) => patch({ copyPrintMode: e.target.value as CopyPrintMode })}>
                {(Object.keys(COPY_PRINT_MODES) as CopyPrintMode[]).map((m) => (
                  <option key={m} value={m}>
                    {COPY_PRINT_MODES[m].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Termos e condições da OS" span={12} hint="Impressos na via do cliente e no documento A4">
            <Textarea rows={7} value={draft.terms} onChange={(e) => patch({ terms: e.target.value })} />
          </Field>
          <div className="span-12">
            <Button size="sm" variant="ghost" onClick={() => patch({ terms: DEFAULT_TERMS })}>
              Restaurar termos padrão
            </Button>
          </div>
          <Field label="Condições do orçamento" span={12}>
            <Textarea rows={3} value={draft.quoteTerms} onChange={(e) => patch({ quoteTerms: e.target.value })} />
          </Field>
        </div>

        <div className="grid grid-2">
          <Field label="Itens do checklist de entrada" as="div">
            <ListEditor items={draft.checklistItems} onChange={(v) => patch({ checklistItems: v })} placeholder="Ex.: Face ID" orderable />
          </Field>
          <div className="stack">
            <Field label="Formas de pagamento" as="div">
              <ListEditor items={draft.paymentMethods} onChange={(v) => patch({ paymentMethods: v })} placeholder="Ex.: Boleto" />
            </Field>
          </div>
          <Field label="Tipos de aparelho" as="div">
            <ListEditor items={draft.deviceTypes} onChange={(v) => patch({ deviceTypes: v })} placeholder="Ex.: Videogame" />
          </Field>
          <Field label="Categorias de peças" as="div">
            <ListEditor items={draft.partCategories} onChange={(v) => patch({ partCategories: v })} placeholder="Ex.: Alto-falantes" />
          </Field>
        </div>
      </div>
      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </Card>
  )
}
