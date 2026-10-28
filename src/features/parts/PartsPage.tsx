import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, InputIcon, Kpi, PageHeader, Select } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { store, useCollection } from '@/data/store'
import type { Part } from '@/domain/types'
import { matches, money, percent } from '@/lib/format'
import { isLowStock } from '@/services/catalog'
import { LabelPrintModal } from './LabelPrintModal'
import { PartFormModal } from './PartFormModal'
import { AlertTriangle, Boxes, DollarSign } from 'lucide-react'

export function PartsPage() {
  const parts = useCollection('parts')
  const orders = useCollection('orders')
  const { confirm, run } = useFeedback()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [onlyLow, setOnlyLow] = useState(params.get('filtro') === 'baixo')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Part | null | undefined>(undefined)
  const [labelParts, setLabelParts] = useState<Part[]>([])

  const categories = useMemo(() => [...new Set(parts.map((p) => p.category).filter(Boolean))].sort(), [parts])

  const filtered = parts
    .filter((p) => (!category || p.category === category) && (!onlyLow || isLowStock(p)))
    .filter((p) => matches(query, p.name, p.code, p.barcode, p.brand, p.compatibleModels, p.category, p.location))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const stockValue = parts.reduce((s, p) => s + Math.max(0, p.stock) * p.costPrice, 0)
  const saleValue = parts.reduce((s, p) => s + Math.max(0, p.stock) * p.salePrice, 0)
  const lowCount = parts.filter(isLowStock).length

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  const remove = async (p: Part) => {
    const used = orders.some((o) => o.items.some((i) => i.refId === p.id))
    if (!(await confirm({ title: `Excluir ${p.name}?`, message: used ? 'Este item aparece em ordens de serviço. Considere apenas inativá-lo.' : 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true }))) return
    await run(() => store.remove('parts', p.id), 'Produto excluído')
  }

  return (
    <div className="page">
      <PageHeader
        title="Peças & produtos"
        subtitle="Estoque, preços e etiquetas"
        actions={
          <>
            <Button icon={<Tags />} disabled={selected.size === 0} onClick={() => setLabelParts(parts.filter((p) => selected.has(p.id)))}>
              Imprimir etiquetas {selected.size > 0 && `(${selected.size})`}
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>
              Novo produto
            </Button>
          </>
        }
      />

      <div className="grid grid-4">
        <Kpi label="Itens cadastrados" value={parts.length} icon={<Boxes />} tone="indigo" />
        <Kpi label="Estoque baixo" value={lowCount} icon={<AlertTriangle />} tone={lowCount ? 'amber' : 'gray'} />
        <Kpi label="Valor em estoque (custo)" value={money(stockValue)} icon={<DollarSign />} tone="teal" />
        <Kpi label="Valor em estoque (venda)" value={money(saleValue)} icon={<DollarSign />} tone="green" />
      </div>

      <div className="toolbar">
        <div className="search">
          <InputIcon icon={<Search />} placeholder="Nome, código, EAN, marca, modelo..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 200 }}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <button className={`chip ${onlyLow ? 'active' : ''}`} onClick={() => setOnlyLow((v) => !v)}>
          Somente estoque baixo <span className="n">{lowCount}</span>
        </button>
      </div>

      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState icon={<Package />} title="Nenhum produto encontrado" action={<Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>Cadastrar produto</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.id)))} />
                  </th>
                  <th>Produto</th>
                  <th>Código</th>
                  <th>Categoria</th>
                  <th className="num">Estoque</th>
                  <th className="num">Custo</th>
                  <th className="num">Venda</th>
                  <th className="num">Margem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setEditing(p)} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    </td>
                    <td>
                      <div className="cell-main">{p.name}</div>
                      <div className="cell-sub">{[p.brand, p.compatibleModels].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      <div className="mono">{p.code}</div>
                      {p.barcode && <div className="cell-sub mono">{p.barcode}</div>}
                    </td>
                    <td>{p.category || <span className="muted">—</span>}</td>
                    <td className="num">
                      <Badge tone={p.stock <= 0 ? 'red' : isLowStock(p) ? 'amber' : 'green'}>{p.stock}</Badge>
                    </td>
                    <td className="num">{money(p.costPrice)}</td>
                    <td className="num strong">{money(p.salePrice)}</td>
                    <td className="num muted">{p.salePrice > 0 ? percent((p.salePrice - p.costPrice) / p.salePrice) : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" iconOnly icon={<Tags />} title="Etiqueta" aria-label="Etiqueta" onClick={() => setLabelParts([p])} />
                        <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} title="Editar" aria-label="Editar" onClick={() => setEditing(p)} />
                        <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} title="Excluir" aria-label="Excluir" onClick={() => remove(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PartFormModal open={editing !== undefined} part={editing ?? null} onClose={() => setEditing(undefined)} />
      <LabelPrintModal parts={labelParts} onClose={() => setLabelParts([])} />
    </div>
  )
}
