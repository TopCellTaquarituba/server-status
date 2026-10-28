import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, DollarSign, Package, Plus, Sparkles, TrendingUp } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Kpi, PageHeader } from '@/components/ui'
import { OrderStatusBadge } from '@/components/shared/StatusBadge'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useCollection, useSettings } from '@/data/store'
import { ORDER_STATUS, ORDER_STATUS_FLOW } from '@/domain/defaults'
import { useCurrentUser } from '@/features/auth/AuthContext'
import { docCode, formatDate, money } from '@/lib/format'
import { cx } from '@/lib/utils'
import { calcTotals, isClosed, isOverdue } from '@/services/orders'
import { isLowStock } from '@/services/catalog'
import { loadDemoData } from '@/services/seed'
import { deviceTitle } from '@/print/templates'

export function DashboardPage() {
  const orders = useCollection('orders')
  const customers = useCollection('customers')
  const parts = useCollection('parts')
  const settings = useSettings()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { run } = useFeedback()

  const stats = useMemo(() => {
    const now = new Date()
    const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`
    const thisMonth = monthKey(now)

    const payments = orders.flatMap((o) => o.payments)
    const revenueMonth = payments.filter((p) => monthKey(new Date(p.date)) === thisMonth).reduce((s, p) => s + p.amount, 0)

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const value = payments.filter((p) => monthKey(new Date(p.date)) === monthKey(d)).reduce((s, p) => s + p.amount, 0)
      return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value }
    })

    const delivered = orders.filter((o) => o.status === 'entregue')
    const ticket = delivered.length ? delivered.reduce((s, o) => s + calcTotals(o.items, o.discount).total, 0) / delivered.length : 0

    const byStatus = ORDER_STATUS_FLOW.filter((s) => !isClosed(s)).map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length }))

    return {
      open: orders.filter((o) => !isClosed(o.status)).length,
      ready: orders.filter((o) => o.status === 'pronta').length,
      overdue: orders.filter(isOverdue),
      revenueMonth,
      months,
      ticket,
      byStatus,
      lowStock: parts.filter(isLowStock),
    }
  }, [orders, parts])

  const recent = orders.slice(0, 7)
  const maxMonth = Math.max(1, ...stats.months.map((m) => m.value))
  const maxStatus = Math.max(1, ...stats.byStatus.map((s) => s.count))
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="page">
      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <Button icon={<Plus />} onClick={() => navigate('/orcamentos/novo')}>
              Novo orçamento
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => navigate('/ordens/nova')}>
              Nova OS
            </Button>
          </>
        }
      />

      {orders.length === 0 && customers.length === 0 && (
        <Card>
          <EmptyState
            icon={<Sparkles />}
            title="Bem-vindo ao Assistec Pro"
            description="Comece cadastrando a sua empresa em Configurações, ou carregue dados de demonstração para conhecer o sistema."
            action={
              <div className="row">
                <Button onClick={() => navigate('/configuracoes')}>Configurar empresa</Button>
                <Button variant="primary" icon={<Sparkles />} onClick={() => run(() => loadDemoData(user.name), 'Dados de demonstração carregados')}>
                  Carregar demonstração
                </Button>
              </div>
            }
          />
        </Card>
      )}

      <div className="grid grid-4">
        <Kpi label="OS em andamento" value={stats.open} icon={<ClipboardList />} tone="indigo" foot={`${orders.length} ordens no total`} />
        <Kpi label="Prontas p/ retirada" value={stats.ready} icon={<CheckCircle2 />} tone="green" foot="Avise o cliente" />
        <Kpi label="Atrasadas" value={stats.overdue.length} icon={<AlertTriangle />} tone={stats.overdue.length ? 'red' : 'gray'} foot="Passaram da previsão" />
        <Kpi label="Recebido no mês" value={money(stats.revenueMonth)} icon={<DollarSign />} tone="teal" foot={`Ticket médio ${money(stats.ticket)}`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <Card title="Faturamento" icon={<TrendingUp />} subtitle="Pagamentos recebidos nos últimos 6 meses">
          <div className="bars">
            {stats.months.map((m) => (
              <div key={m.label} className="bar-col">
                <span className="v">{m.value ? money(m.value).replace(',00', '') : ''}</span>
                <div className="bar" style={{ height: `${(m.value / maxMonth) * 100}%` }} />
                <span className="l">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Ordens por status" icon={<ClipboardList />} subtitle="Apenas ordens em aberto">
          <div className="hbar">
            {stats.byStatus.map(({ status, count }) => (
              <div key={status} className={cx('hbar-row', `tone-${ORDER_STATUS[status].tone}`)} style={{ cursor: 'pointer' }} onClick={() => navigate(`/ordens?status=${status}`)}>
                <span className="truncate">{ORDER_STATUS[status].label}</span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(count / maxStatus) * 100}%` }} />
                </div>
                <span className="right strong">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        <Card title="Ordens recentes" icon={<ClipboardList />} actions={<Button size="sm" variant="ghost" onClick={() => navigate('/ordens')}>Ver todas</Button>} flush>
          {recent.length === 0 ? (
            <EmptyState icon={<ClipboardList />} title="Nenhuma ordem ainda" />
          ) : (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="table">
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => navigate(`/ordens/${o.id}`)}>
                      <td className="mono strong">{docCode(settings.orders.prefix, o.number)}</td>
                      <td>
                        <div className="cell-main">{customers.find((c) => c.id === o.customerId)?.name ?? '—'}</div>
                        <div className="cell-sub">{deviceTitle(o.device)}</div>
                      </td>
                      <td>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="num strong">{money(calcTotals(o.items, o.discount).total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card title="Atrasadas" icon={<AlertTriangle />} flush>
            {stats.overdue.length === 0 ? (
              <div className="muted small" style={{ padding: '12px 20px 20px' }}>Nenhuma ordem atrasada. 🎉</div>
            ) : (
              <div className="picker-list" style={{ padding: '0 10px 10px' }}>
                {stats.overdue.slice(0, 5).map((o) => (
                  <button key={o.id} className="picker-item" onClick={() => navigate(`/ordens/${o.id}`)}>
                    <div className="grow">
                      <div className="strong">{docCode(settings.orders.prefix, o.number)} · {deviceTitle(o.device)}</div>
                      <div className="small muted">Previsto para {formatDate(o.dueDate)}</div>
                    </div>
                    <Badge tone="red">Atrasada</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
          <Card title="Estoque baixo" icon={<Package />} flush actions={<Button size="sm" variant="ghost" onClick={() => navigate('/pecas?filtro=baixo')}>Ver</Button>}>
            {stats.lowStock.length === 0 ? (
              <div className="muted small" style={{ padding: '12px 20px 20px' }}>Estoque em dia.</div>
            ) : (
              <div className="picker-list" style={{ padding: '0 10px 10px' }}>
                {stats.lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="picker-item">
                    <div className="grow">
                      <div className="strong truncate">{p.name}</div>
                      <div className="small muted">Mínimo: {p.minStock}</div>
                    </div>
                    <Badge tone={p.stock <= 0 ? 'red' : 'amber'}>{p.stock} un.</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
