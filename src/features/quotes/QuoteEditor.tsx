import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRightCircle, ClipboardCheck, DollarSign, FileDown, FileText, Printer, Receipt, Save, Smartphone, Trash2, User as UserIcon } from 'lucide-react'
import { Button, Card, Dropdown, EmptyState, Field, Input, NumberInput, PageHeader, Select, Textarea } from '@/components/ui'
import { QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { store, useCollection, useSettings } from '@/data/store'
import { QUOTE_STATUS } from '@/domain/defaults'
import type { Device, Quote, QuoteStatus } from '@/domain/types'
import { useCurrentUser } from '@/features/auth/AuthContext'
import { DeviceFields } from '@/features/orders/DeviceFields'
import { docCode, formatDateTime, money } from '@/lib/format'
import { calcTotals } from '@/services/orders'
import { convertQuoteToOrder, newQuote, saveQuote } from '@/services/quotes'
import { useDocumentPrinting } from '@/print/useDocumentPrinting'

export function QuoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const settings = useSettings()
  const quotes = useCollection('quotes')
  const { confirm, run } = useFeedback()
  const printing = useDocumentPrinting()

  const existing = id ? quotes.find((q) => q.id === id) : undefined
  const [draft, setDraft] = useState<Quote>(() => (existing ? structuredClone(existing) : newQuote()))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing && (existing.id !== draft.id || (!dirty && existing.updatedAt !== draft.updatedAt))) setDraft(structuredClone(existing))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  if (id && !existing) {
    return (
      <div className="page">
        <EmptyState icon={<FileText />} title="Orçamento não encontrado" action={<Button onClick={() => navigate('/orcamentos')}>Voltar</Button>} />
      </div>
    )
  }

  const isNew = !existing
  const locked = draft.status === 'convertido'
  const code = isNew ? 'Novo orçamento' : docCode(settings.orders.quotePrefix, draft.number)
  const totals = calcTotals(draft.items, draft.discount)

  const update = <K extends keyof Quote>(key: K, value: Quote[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
  }

  const save = async (): Promise<Quote | undefined> => {
    setSaving(true)
    const saved = await run(() => saveQuote(draft), isNew ? 'Orçamento criado' : 'Orçamento salvo')
    setSaving(false)
    if (!saved) return undefined
    setDraft(structuredClone(saved))
    setDirty(false)
    if (isNew) navigate(`/orcamentos/${saved.id}`, { replace: true })
    return saved
  }

  const withSaved = async (action: (q: Quote) => void) => {
    const q = dirty || isNew ? await save() : draft
    if (q) action(q)
  }

  const convert = async () => {
    const q = dirty || isNew ? await save() : draft
    if (!q) return
    const ok = await confirm({ title: 'Converter em ordem de serviço?', message: 'Será criada uma OS aprovada com os mesmos itens. Complete os dados do aparelho na OS.', confirmLabel: 'Criar OS' })
    if (!ok) return
    const order = await run(() => convertQuoteToOrder(q, user.name), 'Ordem de serviço criada a partir do orçamento')
    if (order) navigate(`/ordens/${order.id}`)
  }

  const remove = async () => {
    if (!existing) return
    if (!(await confirm({ title: `Excluir ${code}?`, confirmLabel: 'Excluir', danger: true }))) return
    await run(() => store.remove('quotes', existing.id), 'Orçamento excluído')
    navigate('/orcamentos')
  }

  return (
    <div className="page">
      <PageHeader
        back="/orcamentos"
        title={code}
        badge={!isNew && <QuoteStatusBadge status={draft.status} />}
        subtitle={isNew ? 'Monte o orçamento com peças e serviços' : `Criado em ${formatDateTime(draft.createdAt)}`}
        actions={
          <>
            {!isNew && <Button variant="ghost" iconOnly icon={<Trash2 />} onClick={remove} aria-label="Excluir" />}
            <Dropdown
              label="Imprimir"
              icon={<Printer />}
              items={[
                { label: 'Cupom (impressora térmica)', icon: <Receipt />, onClick: () => withSaved(printing.quoteReceipt) },
                { label: 'Documento A4 / PDF', icon: <FileDown />, onClick: () => withSaved(printing.quoteA4) },
              ]}
            />
            {locked ? (
              <Button icon={<ArrowRightCircle />} onClick={() => navigate(`/ordens/${draft.orderId}`)}>
                Ver OS gerada
              </Button>
            ) : (
              <Button icon={<ArrowRightCircle />} onClick={convert}>
                Converter em OS
              </Button>
            )}
            <Button variant="primary" icon={<Save />} onClick={save} loading={saving} disabled={(!dirty && !isNew) || locked}>
              Salvar
            </Button>
          </>
        }
      />

      <div className="editor-layout">
        <div className="stack">
          <Card title="Cliente" icon={<UserIcon />}>
            <CustomerPicker value={draft.customerId} onChange={(v) => update('customerId', v)} />
          </Card>
          <Card title="Aparelho" icon={<Smartphone />}>
            <DeviceFields compact device={draft.device} onChange={(patch: Partial<Device>) => update('device', { ...draft.device, ...patch })} />
          </Card>
          <Card title="Descrição" icon={<FileText />}>
            <Textarea rows={3} value={draft.description} onChange={(e) => update('description', e.target.value)} placeholder="Serviço a ser realizado, defeito constatado..." />
          </Card>
          <Card title="Peças e serviços" icon={<ClipboardCheck />}>
            <LineItemsEditor items={draft.items} onChange={(v) => update('items', v)} readOnly={locked} />
          </Card>
        </div>

        <aside>
          <Card title="Condições" icon={<FileText />}>
            <div className="form-grid">
              <Field label="Status" span={12}>
                <Select value={draft.status} disabled={locked} onChange={(e) => update('status', e.target.value as QuoteStatus)}>
                  {Object.entries(QUOTE_STATUS)
                    .filter(([k]) => k !== 'convertido' || locked)
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Válido até" span={12}>
                <Input type="date" value={draft.validUntil} onChange={(e) => update('validUntil', e.target.value)} />
              </Field>
              <Field label="Observações internas" span={12}>
                <Textarea rows={3} value={draft.notes} onChange={(e) => update('notes', e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card title="Valores" icon={<DollarSign />}>
            <div className="summary-row">
              <span className="muted">Peças</span>
              <span>{money(totals.parts)}</span>
            </div>
            <div className="summary-row">
              <span className="muted">Serviços</span>
              <span>{money(totals.services)}</span>
            </div>
            <div className="summary-row">
              <span className="muted">Desconto</span>
              <div style={{ width: 140 }}>
                <NumberInput value={draft.discount} min={0} prefix="R$" onChange={(v) => update('discount', v)} />
              </div>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
