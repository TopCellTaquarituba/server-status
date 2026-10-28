import { store } from '@/data/store'
import type { Device, LineItem, OrderStatus, Part, ServiceOrder } from '@/domain/types'
import { addDays } from '@/lib/format'
import { nowIso, round2, uid } from '@/lib/utils'

export interface Totals {
  parts: number
  services: number
  subtotal: number
  discount: number
  total: number
  cost: number
  profit: number
}

export function calcTotals(items: LineItem[], discount: number): Totals {
  let parts = 0
  let services = 0
  let cost = 0
  for (const item of items) {
    const line = item.quantity * item.unitPrice
    if (item.kind === 'part') parts += line
    else services += line
    cost += item.quantity * (item.unitCost || 0)
  }
  const subtotal = round2(parts + services)
  const disc = round2(Math.min(Math.max(discount || 0, 0), subtotal))
  const total = round2(subtotal - disc)
  return { parts: round2(parts), services: round2(services), subtotal, discount: disc, total, cost: round2(cost), profit: round2(total - cost) }
}

export const paidAmount = (order: Pick<ServiceOrder, 'payments'>): number =>
  round2(order.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))

export const isClosed = (status: OrderStatus): boolean => status === 'entregue' || status === 'cancelada'

export function isOverdue(order: ServiceOrder): boolean {
  if (!order.dueDate || isClosed(order.status) || order.status === 'pronta') return false
  return new Date(`${order.dueDate}T23:59:59`) < new Date()
}

export function warrantyUntil(order: ServiceOrder): string {
  if (!order.deliveredAt || !order.warrantyDays) return ''
  return addDays(order.warrantyDays, new Date(order.deliveredAt))
}

export function emptyDevice(): Device {
  return {
    type: store.getSettings().orders.deviceTypes[0] ?? 'Celular',
    brand: '',
    model: '',
    imei: '',
    serial: '',
    color: '',
    passwordType: 'nenhuma',
    password: '',
    accessories: '',
    condition: '',
  }
}

export function nextOrderNumber(): number {
  const { startNumber } = store.getSettings().orders
  const max = store.list('orders').reduce((m, o) => Math.max(m, o.number), 0)
  return Math.max(max + 1, startNumber)
}

export function newOrder(): ServiceOrder {
  const s = store.getSettings().orders
  return {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    number: 0,
    customerId: '',
    device: emptyDevice(),
    reportedIssue: '',
    diagnosis: '',
    technicalReport: '',
    checklist: s.checklistItems.map((label) => ({ label, status: 'nao_testado' })),
    items: [],
    discount: 0,
    status: 'aberta',
    priority: 'normal',
    technicianId: '',
    dueDate: addDays(s.defaultDueDays),
    warrantyDays: s.defaultWarrantyDays,
    payments: [],
    history: [],
    internalNotes: '',
    customerNotes: '',
    stockApplied: false,
    deliveredAt: '',
    quoteId: '',
    publicToken: randomToken(),
    tracking: store.getSettings().statusPage.enabled,
    lastPublishedAt: '',
  }
}

/** Token público e não sequencial para a página de acompanhamento (sem expor o nº da OS) */
export function randomToken(): string {
  return uid().replace(/-/g, '') + Math.random().toString(36).slice(2, 8)
}

export function validateOrder(order: ServiceOrder): string | null {
  if (!order.customerId) return 'Selecione o cliente'
  if (!order.device.model.trim() && !order.device.brand.trim()) return 'Informe a marca/modelo do aparelho'
  if (!order.reportedIssue.trim()) return 'Descreva o defeito relatado pelo cliente'
  return null
}

/** Ajusta o estoque das peças usadas na OS (sign = -1 baixa, +1 devolve) */
function stockAdjustments(items: LineItem[], sign: 1 | -1): Part[] {
  const changed = new Map<string, Part>()
  for (const item of items) {
    if (item.kind !== 'part' || !item.refId) continue
    const part = changed.get(item.refId) ?? store.get('parts', item.refId)
    if (!part) continue
    changed.set(part.id, { ...part, stock: round2(part.stock + sign * item.quantity) })
  }
  return [...changed.values()]
}

/**
 * Salva a OS aplicando as regras de negócio:
 * - numeração sequencial na criação
 * - histórico de mudanças de status
 * - baixa de estoque na entrega e estorno em cancelamento/reabertura
 */
export async function saveOrder(draft: ServiceOrder, userName: string, statusNote = ''): Promise<ServiceOrder> {
  const error = validateOrder(draft)
  if (error) throw new Error(error)

  const previous = store.get('orders', draft.id)
  const order: ServiceOrder = { ...draft }
  const now = nowIso()

  if (!previous) {
    order.number = nextOrderNumber()
    order.history = [{ id: uid(), status: order.status, date: now, userName, note: statusNote || 'Ordem de serviço criada' }]
  } else if (previous.status !== order.status) {
    order.history = [...order.history, { id: uid(), status: order.status, date: now, userName, note: statusNote }]
  }

  if (order.status === 'entregue' && !order.deliveredAt) order.deliveredAt = now
  if (order.status !== 'entregue') order.deliveredAt = ''

  let partUpdates: Part[] = []
  if (order.status === 'entregue' && !order.stockApplied) {
    partUpdates = stockAdjustments(order.items, -1)
    order.stockApplied = true
  } else if (order.status !== 'entregue' && order.stockApplied) {
    partUpdates = stockAdjustments(previous?.items ?? order.items, 1)
    order.stockApplied = false
  }

  if (partUpdates.length) await store.upsertMany('parts', partUpdates)
  return store.upsert('orders', order)
}

export async function deleteOrder(order: ServiceOrder): Promise<void> {
  if (order.stockApplied) await store.upsertMany('parts', stockAdjustments(order.items, 1))
  await store.remove('orders', order.id)
}
