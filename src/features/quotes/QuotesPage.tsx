import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, InputIcon, PageHeader } from '@/components/ui'
import { QuoteStatusBadge } from '@/components/shared/StatusBadge'
import { useCollection, useSettings } from '@/data/store'
import { QUOTE_STATUS } from '@/domain/defaults'
import type { QuoteStatus } from '@/domain/types'
import { docCode, formatDate, matches, money } from '@/lib/format'
import { cx } from '@/lib/utils'
import { calcTotals } from '@/services/orders'
import { isQuoteExpired } from '@/services/quotes'
import { deviceTitle } from '@/print/templates'

export function QuotesPage() {
  const quotes = useCollection('quotes')
  const customers = useCollection('customers')
  const settings = useSettings()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<QuoteStatus | 'todos'>('todos')

  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const filtered = quotes
    .filter((q) => filter === 'todos' || q.status === filter)
    .filter((q) => matches(query, q.number, docCode(settings.orders.quotePrefix, q.number), byId.get(q.customerId)?.name, q.device.model, q.description))
    .sort((a, b) => b.number - a.number)

  return (
    <div className="page">
      <PageHeader
        title="Orçamentos"
        subtitle="Envie orçamentos e converta em ordem de serviço quando aprovados"
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => navigate('/orcamentos/novo')}>
            Novo orçamento
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search">
          <InputIcon icon={<Search />} placeholder="Buscar orçamento..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chips">
          {(['todos', ...Object.keys(QUOTE_STATUS)] as (QuoteStatus | 'todos')[]).map((s) => (
            <button key={s} className={cx('chip', filter === s && 'active')} onClick={() => setFilter(s)}>
              {s === 'todos' ? 'Todos' : QUOTE_STATUS[s].label}
              <span className="n">{s === 'todos' ? quotes.length : quotes.filter((q) => q.status === s).length}</span>
            </button>
          ))}
        </div>
      </div>

      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText />} title="Nenhum orçamento" description="Crie orçamentos e imprima ou envie em PDF para o cliente." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Aparelho / descrição</th>
                  <th>Status</th>
                  <th>Emissão</th>
                  <th>Validade</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="clickable" onClick={() => navigate(`/orcamentos/${q.id}`)}>
                    <td className="mono strong">{docCode(settings.orders.quotePrefix, q.number)}</td>
                    <td className="cell-main">{byId.get(q.customerId)?.name ?? '—'}</td>
                    <td>
                      <div className="cell-main">{deviceTitle(q.device) || '—'}</div>
                      <div className="cell-sub truncate" style={{ maxWidth: 280 }}>{q.description}</div>
                    </td>
                    <td>
                      <QuoteStatusBadge status={q.status} />
                    </td>
                    <td>{formatDate(q.createdAt)}</td>
                    <td>{isQuoteExpired(q) ? <Badge tone="red">Vencido</Badge> : formatDate(q.validUntil)}</td>
                    <td className="num strong">{money(calcTotals(q.items, q.discount).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
