import { store } from '@/data/store'
import { ORDER_STATUS } from '@/domain/defaults'
import type { ServiceOrder, Settings } from '@/domain/types'
import { docCode, formatDate } from '@/lib/format'
import { nowIso } from '@/lib/utils'
import { deviceTitle } from '@/print/templates'

/** Dados públicos enviados ao servidor de status. Nunca inclui senha, valores ou dados sensíveis. */
export interface PublicPayload {
  token: string
  osCode: string
  shopName: string
  shopPhone: string
  shopWhatsapp: string
  logo: string
  headline: string
  subheadline: string
  themeColor: string
  statusKey: string
  statusLabel: string
  message: string
  color: string
  finished: boolean
  canceled: boolean
  deviceLabel: string
  showDevice: boolean
  eta: string
  showEta: boolean
  showShopContact: boolean
  updatedAt: string
}

export function buildPublicPayload(order: ServiceOrder, settings: Settings = store.getSettings()): PublicPayload {
  const sp = settings.statusPage
  const custom = sp.messages.find((m) => m.status === order.status)
  const fallback = ORDER_STATUS[order.status]
  const visible = custom?.visible ?? true

  return {
    token: order.publicToken,
    osCode: docCode(settings.orders.prefix, order.number),
    shopName: settings.company.tradeName || settings.company.name,
    shopPhone: settings.company.phone,
    shopWhatsapp: settings.company.whatsapp,
    logo: settings.company.logo,
    headline: sp.headline,
    subheadline: sp.subheadline,
    themeColor: sp.themeColor,
    statusKey: order.status,
    statusLabel: visible ? custom?.publicLabel || fallback.label : 'Em atendimento',
    message: visible ? custom?.message || '' : 'Seu aparelho está em atendimento. Em breve traremos novidades.',
    color: visible ? custom?.color || sp.themeColor : sp.themeColor,
    finished: order.status === 'pronta' || order.status === 'entregue',
    canceled: order.status === 'cancelada',
    deviceLabel: deviceTitle(order.device),
    showDevice: sp.showDevice,
    eta: order.dueDate ? formatDate(order.dueDate) : '',
    showEta: sp.showEta,
    showShopContact: sp.showShopContact,
    updatedAt: nowIso(),
  }
}

export interface PublishResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export function trackingUrl(order: ServiceOrder, settings: Settings = store.getSettings()): string {
  const base = settings.statusPage.baseUrl.replace(/\/+$/, '')
  return base ? `${base}/s/${order.publicToken}` : ''
}

export function canPublish(order: ServiceOrder, settings: Settings = store.getSettings()): boolean {
  return settings.statusPage.enabled && order.tracking && Boolean(settings.statusPage.baseUrl)
}

/**
 * Publica o status atual da OS no servidor (best-effort).
 * Falhas de rede não interrompem o fluxo — o status é reenviado no próximo salvamento.
 */
export async function publishOrder(order: ServiceOrder, settings: Settings = store.getSettings()): Promise<PublishResult> {
  if (!canPublish(order, settings)) return { ok: false, skipped: true }
  const base = settings.statusPage.baseUrl.replace(/\/+$/, '')
  try {
    const res = await fetch(`${base}/api/os/${order.publicToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': settings.statusPage.apiKey },
      body: JSON.stringify(buildPublicPayload(order, settings)),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha de conexão' }
  }
}

/** Remove a OS do servidor público (quando o acompanhamento é desativado) */
export async function unpublishOrder(order: ServiceOrder, settings: Settings = store.getSettings()): Promise<PublishResult> {
  const base = settings.statusPage.baseUrl.replace(/\/+$/, '')
  if (!base) return { ok: false, skipped: true }
  try {
    const res = await fetch(`${base}/api/os/${order.publicToken}`, {
      method: 'DELETE',
      headers: { 'x-api-key': settings.statusPage.apiKey },
    })
    return { ok: res.ok }
  } catch {
    return { ok: false, error: 'Falha de conexão' }
  }
}

/** Publica e registra o horário da sincronização na OS (sem alterar o histórico) */
export async function publishAndStamp(order: ServiceOrder): Promise<PublishResult> {
  const result = await publishOrder(order)
  if (result.ok) {
    const current = store.get('orders', order.id)
    if (current) await store.upsert('orders', { ...current, lastPublishedAt: nowIso() })
  }
  return result
}
