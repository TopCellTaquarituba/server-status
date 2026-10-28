import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal, NumberInput, Switch } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useSettings } from '@/data/store'
import type { Part } from '@/domain/types'
import { money, percent } from '@/lib/format'
import { newPart, savePart } from '@/services/catalog'

export function PartFormModal({ open, part, onClose }: { open: boolean; part: Part | null; onClose: () => void }) {
  const { orders } = useSettings()
  const { run } = useFeedback()
  const [draft, setDraft] = useState<Part>(newPart)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(part ? structuredClone(part) : newPart())
  }, [open, part])

  const set = <K extends keyof Part>(key: K, value: Part[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const margin = draft.salePrice > 0 ? (draft.salePrice - draft.costPrice) / draft.salePrice : 0

  const save = async () => {
    setSaving(true)
    const saved = await run(() => savePart(draft), part ? 'Produto atualizado' : 'Produto cadastrado')
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={part ? 'Editar peça / produto' : 'Nova peça / produto'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome / descrição" required span={8}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus placeholder="Ex.: Tela Frontal Galaxy A54 Original" />
        </Field>
        <Field label="Código interno" required span={4}>
          <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="mono" />
        </Field>
        <Field label="Categoria" span={4}>
          <Input value={draft.category} onChange={(e) => set('category', e.target.value)} list="part-categories" />
          <datalist id="part-categories">
            {orders.partCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Marca" span={4}>
          <Input value={draft.brand} onChange={(e) => set('brand', e.target.value)} />
        </Field>
        <Field label="Código de barras (EAN)" span={4} hint="Vazio = usa o código interno na etiqueta">
          <Input value={draft.barcode} onChange={(e) => set('barcode', e.target.value)} className="mono" />
        </Field>
        <Field label="Modelos compatíveis" span={12}>
          <Input value={draft.compatibleModels} onChange={(e) => set('compatibleModels', e.target.value)} placeholder="Galaxy A54, A54 5G..." />
        </Field>

        <Field label="Preço de custo" span={3}>
          <NumberInput value={draft.costPrice} min={0} prefix="R$" onChange={(v) => set('costPrice', v)} />
        </Field>
        <Field label="Preço de venda" span={3} hint={draft.salePrice > 0 ? `Margem ${percent(margin)} · lucro ${money(draft.salePrice - draft.costPrice)}` : undefined}>
          <NumberInput value={draft.salePrice} min={0} prefix="R$" onChange={(v) => set('salePrice', v)} />
        </Field>
        <Field label="Estoque atual" span={2}>
          <NumberInput value={draft.stock} decimals={0} onChange={(v) => set('stock', Math.round(v))} />
        </Field>
        <Field label="Estoque mínimo" span={2}>
          <NumberInput value={draft.minStock} decimals={0} min={0} onChange={(v) => set('minStock', Math.round(v))} />
        </Field>
        <Field label="Garantia (dias)" span={2}>
          <NumberInput value={draft.warrantyDays} decimals={0} min={0} onChange={(v) => set('warrantyDays', Math.round(v))} />
        </Field>

        <Field label="Localização" span={4}>
          <Input value={draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Gaveta, prateleira..." />
        </Field>
        <Field label="Fornecedor" span={5}>
          <Input value={draft.supplier} onChange={(e) => set('supplier', e.target.value)} />
        </Field>
        <Field span={3} as="div" label="Situação">
          <Switch checked={draft.active} onChange={(v) => set('active', v)} label={draft.active ? 'Ativo' : 'Inativo'} />
        </Field>
      </div>
    </Modal>
  )
}
