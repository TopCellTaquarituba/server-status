import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, InputIcon, PageHeader } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useCollection } from '@/data/store'
import type { Customer } from '@/domain/types'
import { formatDate, initials, matches } from '@/lib/format'
import { deleteCustomer } from '@/services/catalog'
import { CustomerFormModal } from './CustomerFormModal'

export function CustomersPage() {
  const customers = useCollection('customers')
  const orders = useCollection('orders')
  const navigate = useNavigate()
  const { confirm, run } = useFeedback()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined)

  const orderCount = useMemo(() => {
    const map = new Map<string, { count: number; last: string }>()
    for (const o of orders) {
      const cur = map.get(o.customerId) ?? { count: 0, last: '' }
      map.set(o.customerId, { count: cur.count + 1, last: o.createdAt > cur.last ? o.createdAt : cur.last })
    }
    return map
  }, [orders])

  const filtered = customers
    .filter((c) => matches(query, c.name, c.document, c.phone, c.whatsapp, c.email, c.address.city))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const remove = async (c: Customer) => {
    if (!(await confirm({ title: `Excluir ${c.name}?`, message: 'O cadastro será removido permanentemente.', confirmLabel: 'Excluir', danger: true }))) return
    await run(() => deleteCustomer(c), 'Cliente excluído')
  }

  return (
    <div className="page">
      <PageHeader
        title="Clientes"
        subtitle={`${customers.length} clientes cadastrados`}
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>
            Novo cliente
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search">
          <InputIcon icon={<Search />} placeholder="Nome, CPF/CNPJ, telefone, e-mail, cidade..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users />} title="Nenhum cliente encontrado" action={<Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>Cadastrar cliente</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                  <th>Ordens</th>
                  <th>Cadastro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const stats = orderCount.get(c.id)
                  return (
                    <tr key={c.id} className="clickable" onClick={() => setEditing(c)}>
                      <td>
                        <div className="row">
                          <div className="avatar">{initials(c.name)}</div>
                          <div>
                            <div className="cell-main">{c.name}</div>
                            <div className="cell-sub">{c.type === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{c.document || <span className="muted">—</span>}</td>
                      <td>
                        <div>{c.phone || c.whatsapp}</div>
                        <div className="cell-sub">{c.email}</div>
                      </td>
                      <td>{[c.address.city, c.address.state].filter(Boolean).join('/') || <span className="muted">—</span>}</td>
                      <td>{stats ? <Badge tone="indigo">{stats.count} OS</Badge> : <span className="muted small">—</span>}</td>
                      <td className="nowrap">{formatDate(c.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                          <Button size="sm" variant="ghost" iconOnly icon={<ClipboardList />} title="Nova OS" aria-label="Nova OS" onClick={() => navigate('/ordens/nova', { state: { customerId: c.id } })} />
                          <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} title="Editar" aria-label="Editar" onClick={() => setEditing(c)} />
                          <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} title="Excluir" aria-label="Excluir" onClick={() => remove(c)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CustomerFormModal open={editing !== undefined} customer={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}
