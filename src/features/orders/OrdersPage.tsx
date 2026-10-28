import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, Plus, Printer, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, InputIcon, PageHeader } from '@/components/ui'
import { OrderStatusBadge, PriorityBadge } from '@/components/shared/StatusBadge'
import { useCollection, useSettings } from '@/data/store'
import { ORDER_STATUS, ORDER_STATUS_FLOW } from '@/domain/defaults'
import type { OrderStatus } from '@/domain/types'
import { docCode, formatDate, matches, money } from '@/lib/format'
import { cx } from '@/lib/utils'
import { calcTotals, isClosed, isOverdue, paidAmount } from '@/services/orders'
import { deviceTitle } from '@/print/templates'
import { useDocumentPrinting } from '@/print/useDocumentPrinting'

type Filter = OrderStatus | 'todas' | 'abertas' | 'atrasadas'

export function OrdersPage() {
  const orders = useCollection('orders')
  const customers = useCollection('customers')
  const settings = useSettings()
  const navigate = useNavigate()
  const printing = useDocumentPrinting()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const filter = (params.get('status') as Filter) || 'abertas'

  const customerName = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  const counts = useMemo(() => {
    const map: Record<string, number> = { todas: orders.length, abertas: 0, atrasadas: 0 }
    for (const o of orders) {
      map[o.status] = (map[o.status] ?? 0) + 1
      if (!isClosed(o.status)) map.abertas++
      if (isOverdue(o)) map.atrasadas++
    }
    return map
  }, [orders])

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => {
          if (filter === 'todas') return true
          if (filter === 'abertas') return !isClosed(o.status)
          if (filter === 'atrasadas') return isOverdue(o)
          return o.status === filter
        })
        .filter((o) => {
          const c = customerName.get(o.customerId)
          return matches(query, docCode(settings.orders.prefix, o.number), o.number, c?.name, c?.phone, c?.document, o.device.brand, o.device.model, o.device.imei, o.reportedIssue)
        })
        .sort((a, b) => b.number - a.number),
    [orders, filter, query, customerName, settings.orders.prefix],
  )

  const chips: { value: Filter; label: string }[] = [
    { value: 'abertas', label: 'Em aberto' },
    { value: 'atrasadas', label: 'Atrasadas' },
    ...ORDER_STATUS_FLOW.map((s) => ({ value: s, label: ORDER_STATUS[s].label })),
    { value: 'todas', label: 'Todas' },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Ordens de serviço"
        subtitle="Acompanhe cada aparelho da entrada à entrega"
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => navigate('/ordens/nova')}>
            Nova OS
          </Button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <InputIcon icon={<Search />} placeholder="Nº da OS, cliente, modelo, IMEI..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="chips">
        {chips.map((c) => (
          <button key={c.value} className={cx('chip', filter === c.value && 'active')} onClick={() => setParams({ status: c.value })}>
            {c.label}
            <span className="n">{counts[c.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Nenhuma ordem encontrada"
            description={orders.length ? 'Ajuste os filtros ou a busca.' : 'Crie a primeira ordem de serviço.'}
            action={!orders.length && <Button variant="primary" icon={<Plus />} onClick={() => navigate('/ordens/nova')}>Nova OS</Button>}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Aparelho</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Entrada</th>
                  <th>Previsão</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const c = customerName.get(o.customerId)
                  const total = calcTotals(o.items, o.discount).total
                  const paid = paidAmount(o)
                  return (
                    <tr key={o.id} className="clickable" onClick={() => navigate(`/ordens/${o.id}`)}>
                      <td className="mono strong nowrap">{docCode(settings.orders.prefix, o.number)}</td>
                      <td>
                        <div className="cell-main">{c?.name ?? '—'}</div>
                        <div className="cell-sub">{c?.phone || c?.whatsapp}</div>
                      </td>
                      <td>
                        <div className="cell-main">{deviceTitle(o.device)}</div>
                        <div className="cell-sub truncate" style={{ maxWidth: 260 }}>{o.reportedIssue}</div>
                      </td>
                      <td>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td>
                        <PriorityBadge priority={o.priority} />
                      </td>
                      <td className="nowrap">{formatDate(o.createdAt)}</td>
                      <td className="nowrap">{isOverdue(o) ? <Badge tone="red">{formatDate(o.dueDate)}</Badge> : formatDate(o.dueDate)}</td>
                      <td className="num">
                        <div className="strong">{money(total)}</div>
                        {total > 0 && <div className="cell-sub">{paid >= total ? 'Pago' : paid > 0 ? `Pago ${money(paid)}` : 'A receber'}</div>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" iconOnly icon={<Printer />} onClick={() => printing.orderReceipt(o)} title="Imprimir cupom" aria-label="Imprimir cupom" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
