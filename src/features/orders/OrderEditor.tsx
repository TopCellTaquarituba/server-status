import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ClipboardCheck,
  ClipboardList,
  Copy,
  DollarSign,
  FileDown,
  History,
  ListChecks,
  MessageSquare,
  Printer,
  QrCode,
  Receipt,
  Save,
  Smartphone,
  Stethoscope,
  Store,
  Tag,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { Badge, Button, Card, Dropdown, EmptyState, Field, Input, NumberInput, PageHeader, Select, Switch, Textarea } from '@/components/ui'
import { OrderStatusBadge } from '@/components/shared/StatusBadge'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { LineItemsEditor } from '@/components/shared/LineItemsEditor'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useCollection, useSettings } from '@/data/store'
import { COPY_PRINT_MODES, ORDER_STATUS, ORDER_STATUS_FLOW, PRIORITY } from '@/domain/defaults'
import type { Device, OrderStatus, Priority, ServiceOrder } from '@/domain/types'
import { useCurrentUser } from '@/features/auth/AuthContext'
import { docCode, formatDate, formatDateTime, money } from '@/lib/format'
import { calcTotals, deleteOrder, isOverdue, newOrder, paidAmount, saveOrder, validateOrder, warrantyUntil } from '@/services/orders'
import { canPublish, publishAndStamp, trackingUrl, unpublishOrder } from '@/services/statusSync'
import { qrSvg } from '@/print/qrcode'
import { useDocumentPrinting } from '@/print/useDocumentPrinting'
import { ChecklistEditor } from './ChecklistEditor'
import { DeviceFields } from './DeviceFields'
import { PaymentsPanel } from './PaymentsPanel'

export function OrderEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const settings = useSettings()
  const orders = useCollection('orders')
  const users = useCollection('users')
  const { toast, confirm, run } = useFeedback()
  const printing = useDocumentPrinting()

  const existing = id ? orders.find((o) => o.id === id) : undefined
  const location = useLocation()
  const [draft, setDraft] = useState<ServiceOrder>(() =>
    existing ? structuredClone(existing) : { ...newOrder(), customerId: (location.state as { customerId?: string } | null)?.customerId ?? '' },
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    if (existing && existing.id !== draft.id) {
      setDraft(structuredClone(existing))
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  if (id && !existing) {
    return (
      <div className="page">
        <EmptyState icon={<ClipboardList />} title="Ordem de serviço não encontrada" action={<Button onClick={() => navigate('/ordens')}>Voltar</Button>} />
      </div>
    )
  }

  const isNew = !existing
  const code = isNew ? 'Nova ordem de serviço' : docCode(settings.orders.prefix, draft.number)
  const totals = calcTotals(draft.items, draft.discount)
  const paid = paidAmount(draft)
  const balance = Math.max(0, totals.total - paid)
  const statusChanged = existing && existing.status !== draft.status
  const technicians = users.filter((u) => u.active)

  const update = <K extends keyof ServiceOrder>(key: K, value: ServiceOrder[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
  }
  const updateDevice = (patch: Partial<Device>) => update('device', { ...draft.device, ...patch })

  const save = async (): Promise<ServiceOrder | undefined> => {
    const error = validateOrder(draft)
    if (error) {
      toast(error, 'warning')
      return undefined
    }
    setSaving(true)
    const saved = await run(() => saveOrder(draft, user.name, statusNote), isNew ? 'Ordem de serviço criada' : 'Alterações salvas')
    setSaving(false)
    if (!saved) return undefined
    setDraft(structuredClone(saved))
    setDirty(false)
    setStatusNote('')
    if (isNew) navigate(`/ordens/${saved.id}`, { replace: true })
    // Publica o status no servidor de acompanhamento (best-effort, não bloqueia)
    if (canPublish(saved)) {
      void publishAndStamp(saved).then((r) => {
        if (!r.ok && !r.skipped) toast(`Status não sincronizado: ${r.error}`, 'warning')
      })
    }
    return saved
  }

  /** Salva antes de imprimir para que o documento reflita os dados atuais */
  const withSaved = async (action: (o: ServiceOrder) => void) => {
    const order = dirty || isNew ? await save() : draft
    if (order) action(order)
  }

  const remove = async () => {
    if (!existing) return
    const ok = await confirm({ title: `Excluir ${code}?`, message: 'Esta ação não pode ser desfeita. Peças já baixadas retornam ao estoque.', confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    await run(() => deleteOrder(existing), 'Ordem excluída')
    navigate('/ordens')
  }

  const quickStatus = (status: OrderStatus) => {
    update('status', status)
  }

  return (
    <div className="page">
      <PageHeader
        back="/ordens"
        title={code}
        badge={!isNew && <OrderStatusBadge status={existing.status} />}
        subtitle={isNew ? 'Registre a entrada do aparelho' : `Aberta em ${formatDateTime(draft.createdAt)} · atualizada em ${formatDateTime(existing.updatedAt)}`}
        actions={
          <>
            {!isNew && <Button variant="ghost" iconOnly icon={<Trash2 />} onClick={remove} title="Excluir" aria-label="Excluir" />}
            <Dropdown
              label="Imprimir"
              icon={<Printer />}
              items={[
                { label: 'Cupom — 2 vias', description: COPY_PRINT_MODES[settings.orders.copyPrintMode].label, icon: <Receipt />, onClick: () => withSaved(printing.orderReceipt) },
                { label: 'Cupom — só via do cliente', icon: <UserIcon />, onClick: () => withSaved((o) => printing.orderReceiptOnly(o, 'client')) },
                { label: 'Cupom — só via da loja', icon: <Store />, onClick: () => withSaved((o) => printing.orderReceiptOnly(o, 'store')) },
                { label: 'Etiqueta do aparelho', description: 'Identificação para colar no aparelho', icon: <Tag />, onClick: () => withSaved(printing.orderLabel) },
                { label: 'Documento A4 / PDF', description: 'Ordem completa com termos', icon: <FileDown />, onClick: () => withSaved(printing.orderA4) },
              ]}
            />
            <Button variant="primary" icon={<Save />} onClick={save} loading={saving} disabled={!dirty && !isNew}>
              {isNew ? 'Abrir OS' : 'Salvar'}
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
            <DeviceFields device={draft.device} onChange={updateDevice} />
          </Card>

          <Card title="Defeito e diagnóstico" icon={<Stethoscope />}>
            <div className="form-grid">
              <Field label="Defeito relatado pelo cliente" required span={12}>
                <Textarea rows={3} value={draft.reportedIssue} onChange={(e) => update('reportedIssue', e.target.value)} placeholder="Descreva o problema conforme o cliente relatou..." />
              </Field>
              <Field label="Diagnóstico técnico" span={6}>
                <Textarea rows={3} value={draft.diagnosis} onChange={(e) => update('diagnosis', e.target.value)} placeholder="O que foi identificado na análise" />
              </Field>
              <Field label="Laudo / serviço executado" span={6}>
                <Textarea rows={3} value={draft.technicalReport} onChange={(e) => update('technicalReport', e.target.value)} placeholder="Descrição do reparo realizado" />
              </Field>
            </div>
          </Card>

          <Card title="Checklist de entrada" icon={<ListChecks />} subtitle="Teste as funções do aparelho na frente do cliente">
            <ChecklistEditor items={draft.checklist} onChange={(v) => update('checklist', v)} />
          </Card>

          <Card title="Peças e serviços" icon={<ClipboardCheck />}>
            <LineItemsEditor items={draft.items} onChange={(v) => update('items', v)} />
            {draft.stockApplied && <div className="small muted" style={{ marginTop: 10 }}>As peças desta OS já foram baixadas do estoque na entrega.</div>}
          </Card>

          <Card title="Observações" icon={<MessageSquare />}>
            <div className="form-grid">
              <Field label="Observações para o cliente" hint="Saem impressas na OS" span={6}>
                <Textarea rows={3} value={draft.customerNotes} onChange={(e) => update('customerNotes', e.target.value)} />
              </Field>
              <Field label="Notas internas" hint="Visíveis apenas para a equipe" span={6}>
                <Textarea rows={3} value={draft.internalNotes} onChange={(e) => update('internalNotes', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <aside>
          <Card title="Andamento" icon={<ClipboardList />}>
            <div className="form-grid">
              <Field label="Status" span={12}>
                <Select value={draft.status} onChange={(e) => update('status', e.target.value as OrderStatus)}>
                  {ORDER_STATUS_FLOW.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
              {statusChanged && (
                <Field label="Observação da mudança de status" span={12}>
                  <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Ex.: cliente aprovou por WhatsApp" />
                </Field>
              )}
              <Field label="Prioridade" span={6}>
                <Select value={draft.priority} onChange={(e) => update('priority', e.target.value as Priority)}>
                  {Object.entries(PRIORITY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Previsão de entrega" span={6} error={isOverdue(draft) ? 'Atrasada' : null}>
                <Input type="date" value={draft.dueDate} onChange={(e) => update('dueDate', e.target.value)} />
              </Field>
              <Field label="Técnico responsável" span={7}>
                <Select value={draft.technicianId} onChange={(e) => update('technicianId', e.target.value)}>
                  <option value="">— Não atribuído —</option>
                  {technicians.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Garantia (dias)" span={5}>
                <NumberInput value={draft.warrantyDays} decimals={0} min={0} onChange={(v) => update('warrantyDays', Math.round(v))} />
              </Field>
            </div>
            {!isNew && existing.status !== 'entregue' && (
              <div className="row wrap" style={{ marginTop: 14 }}>
                {existing.status !== 'pronta' && (
                  <Button size="sm" onClick={() => quickStatus('pronta')}>
                    Marcar como pronta
                  </Button>
                )}
                <Button size="sm" variant="success" onClick={() => quickStatus('entregue')}>
                  Entregar ao cliente
                </Button>
              </div>
            )}
            {draft.deliveredAt && (
              <div className="alert tone-green" style={{ marginTop: 14 }}>
                <ClipboardCheck />
                <div>
                  Entregue em {formatDateTime(draft.deliveredAt)}
                  {draft.warrantyDays > 0 && <> · garantia até <b>{formatDate(warrantyUntil(draft))}</b></>}
                </div>
              </div>
            )}
          </Card>

          <Card title="Financeiro" icon={<DollarSign />}>
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
            <div className="summary-row">
              <span className="muted">Pago</span>
              <span>{money(paid)}</span>
            </div>
            <div className="summary-row strong">
              <span>A receber</span>
              {balance > 0 ? <Badge tone="amber">{money(balance)}</Badge> : <Badge tone="green">Quitado</Badge>}
            </div>
            {user.role === 'admin' && totals.total > 0 && (
              <div className="small muted" style={{ marginTop: 6 }}>
                Custo {money(totals.cost)} · lucro estimado {money(totals.profit)}
              </div>
            )}
            <div className="divider" style={{ margin: '14px 0' }} />
            <PaymentsPanel payments={draft.payments} balance={balance} onChange={(v) => update('payments', v)} />
          </Card>

          <Card title="Acompanhamento do cliente" icon={<QrCode />}>
            {!settings.statusPage.enabled ? (
              <div className="small muted">
                Ative e configure a página de acompanhamento em <b>Configurações → Acompanhamento do cliente</b> para gerar o QR Code na via do cliente.
              </div>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                <Switch
                  checked={draft.tracking}
                  onChange={(v) => {
                    update('tracking', v)
                    if (!v && !isNew) void unpublishOrder({ ...draft, tracking: false })
                  }}
                  label="Permitir que o cliente acompanhe esta OS"
                  description="Gera o QR Code na via do cliente"
                />
                {draft.tracking && trackingUrl(draft) && (
                  <>
                    <div className="qr-box">
                      <div className="qr-img" dangerouslySetInnerHTML={{ __html: qrSvg(trackingUrl(draft), 28) }} />
                      <div className="stack" style={{ gap: 8, minWidth: 0 }}>
                        <div className="small muted truncate mono">{trackingUrl(draft)}</div>
                        <div className="row" style={{ gap: 6 }}>
                          <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => { void navigator.clipboard?.writeText(trackingUrl(draft)); toast('Link copiado') }}>
                            Copiar link
                          </Button>
                        </div>
                        {draft.lastPublishedAt && <div className="small muted">Sincronizado {formatDateTime(draft.lastPublishedAt)}</div>}
                      </div>
                    </div>
                    {!isNew && (
                      <Button size="sm" variant="ghost" icon={<QrCode />} onClick={() => withSaved((o) => void publishAndStamp(o).then((r) => toast(r.ok ? 'Status publicado' : `Falha: ${r.error}`, r.ok ? 'success' : 'error')))}>
                        Sincronizar status agora
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {!isNew && (
            <Card title="Histórico" icon={<History />}>
              <div className="timeline">
                {[...draft.history].reverse().map((h) => (
                  <div key={h.id} className={`tl-item tone-${ORDER_STATUS[h.status].tone}`}>
                    <span className="tl-dot" />
                    <div>
                      <div className="strong small">{ORDER_STATUS[h.status].label}</div>
                      <div className="small muted">
                        {formatDateTime(h.date)} · {h.userName}
                      </div>
                      {h.note && <div className="small">{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
