import { store } from '@/data/store'
import type { Quote, ServiceOrder } from '@/domain/types'
import { addDays } from '@/lib/format'
import { uid } from '@/lib/utils'
import { emptyDevice, newOrder, saveOrder } from './orders'

export function nextQuoteNumber(): number {
  return store.list('quotes').reduce((m, q) => Math.max(m, q.number), 0) + 1
}

export function newQuote(): Quote {
  return {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    number: 0,
    customerId: '',
    device: emptyDevice(),
    description: '',
    items: [],
    discount: 0,
    validUntil: addDays(store.getSettings().orders.quoteValidityDays),
    status: 'rascunho',
    notes: '',
    orderId: '',
  }
}

export async function saveQuote(draft: Quote): Promise<Quote> {
  if (!draft.customerId) throw new Error('Selecione o cliente')
  if (draft.items.length === 0) throw new Error('Adicione ao menos um item ao orçamento')
  const isNew = !store.get('quotes', draft.id)
  return store.upsert('quotes', { ...draft, number: isNew ? nextQuoteNumber() : draft.number })
}

export const isQuoteExpired = (q: Quote): boolean =>
  q.status !== 'convertido' && q.status !== 'aprovado' && !!q.validUntil && new Date(`${q.validUntil}T23:59:59`) < new Date()

/** Converte um orçamento aprovado em ordem de serviço */
export async function convertQuoteToOrder(quote: Quote, userName: string): Promise<ServiceOrder> {
  const base = newOrder()
  const order = await saveOrder(
    {
      ...base,
      customerId: quote.customerId,
      device: { ...quote.device },
      reportedIssue: quote.description || 'Conforme orçamento',
      items: quote.items.map((i) => ({ ...i, id: uid() })),
      discount: quote.discount,
      status: 'aprovada',
      quoteId: quote.id,
      internalNotes: quote.notes,
    },
    userName,
    `Gerada a partir do orçamento nº ${quote.number}`,
  )
  await store.upsert('quotes', { ...quote, status: 'convertido', orderId: order.id })
  return order
}
