import { useMemo, useState } from 'react'
import { Package, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { Badge, Button, Input, InputIcon, Modal, NumberInput } from '@/components/ui'
import { useCollection } from '@/data/store'
import type { LineItem } from '@/domain/types'
import { matches, money } from '@/lib/format'
import { uid } from '@/lib/utils'
import { isLowStock } from '@/services/catalog'

const KIND_BADGE = {
  part: { label: 'Peça', tone: 'blue' as const },
  service: { label: 'Serviço', tone: 'violet' as const },
  custom: { label: 'Avulso', tone: 'gray' as const },
}

export function LineItemsEditor({ items, onChange, readOnly }: { items: LineItem[]; onChange: (items: LineItem[]) => void; readOnly?: boolean }) {
  const [picker, setPicker] = useState<'part' | 'service' | null>(null)

  const update = (id: string, patch: Partial<LineItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))
  const add = (item: Omit<LineItem, 'id'>) => onChange([...items, { id: uid(), ...item }])

  return (
    <div className="stack" style={{ gap: 12 }}>
      {items.length > 0 ? (
        <div className="table-wrap">
          <table className="table items-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Valor unit.</th>
                <th className="num">Total</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="row">
                      <Badge tone={KIND_BADGE[item.kind].tone}>{KIND_BADGE[item.kind].label}</Badge>
                      <Input value={item.description} onChange={(e) => update(item.id, { description: e.target.value })} readOnly={readOnly} />
                    </div>
                  </td>
                  <td className="qty">
                    <NumberInput value={item.quantity} decimals={0} min={1} onChange={(v) => update(item.id, { quantity: Math.max(1, Math.round(v)) })} readOnly={readOnly} />
                  </td>
                  <td className="price">
                    <NumberInput value={item.unitPrice} min={0} prefix="R$" onChange={(v) => update(item.id, { unitPrice: v })} readOnly={readOnly} />
                  </td>
                  <td className="num strong">{money(item.quantity * item.unitPrice)}</td>
                  {!readOnly && (
                    <td style={{ width: 44 }}>
                      <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} onClick={() => remove(item.id)} aria-label="Remover item" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="muted small" style={{ padding: '6px 2px' }}>
          Nenhum item adicionado. Inclua peças do estoque, serviços do catálogo ou itens avulsos.
        </div>
      )}

      {!readOnly && (
        <div className="row wrap">
          <Button size="sm" icon={<Package />} onClick={() => setPicker('part')}>
            Peça do estoque
          </Button>
          <Button size="sm" icon={<Wrench />} onClick={() => setPicker('service')}>
            Serviço do catálogo
          </Button>
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => add({ kind: 'custom', description: 'Item avulso', quantity: 1, unitPrice: 0, unitCost: 0 })}>
            Item avulso
          </Button>
        </div>
      )}

      <CatalogPickerModal
        kind={picker}
        onClose={() => setPicker(null)}
        onPick={(item) => {
          add(item)
          setPicker(null)
        }}
      />
    </div>
  )
}

function CatalogPickerModal({ kind, onClose, onPick }: { kind: 'part' | 'service' | null; onClose: () => void; onPick: (item: Omit<LineItem, 'id'>) => void }) {
  const parts = useCollection('parts')
  const services = useCollection('services')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    if (kind === 'part')
      return parts
        .filter((p) => p.active && matches(query, p.name, p.code, p.barcode, p.brand, p.compatibleModels, p.category))
        .map((p) => ({
          id: p.id,
          title: p.name,
          sub: [p.code, p.brand, p.compatibleModels].filter(Boolean).join(' · '),
          price: p.salePrice,
          extra: <Badge tone={p.stock <= 0 ? 'red' : isLowStock(p) ? 'amber' : 'green'}>{p.stock} em estoque</Badge>,
          item: { kind: 'part' as const, refId: p.id, description: p.name, quantity: 1, unitPrice: p.salePrice, unitCost: p.costPrice },
        }))
    if (kind === 'service')
      return services
        .filter((s) => s.active && matches(query, s.name, s.description))
        .map((s) => ({
          id: s.id,
          title: s.name,
          sub: s.description || `${s.estimatedMinutes} min · garantia ${s.warrantyDays} dias`,
          price: s.price,
          extra: null,
          item: { kind: 'service' as const, refId: s.id, description: s.name, quantity: 1, unitPrice: s.price, unitCost: 0 },
        }))
    return []
  }, [kind, parts, services, query])

  return (
    <Modal open={kind !== null} onClose={onClose} size="md" title={kind === 'part' ? 'Adicionar peça do estoque' : 'Adicionar serviço'}>
      <InputIcon icon={<Search />} placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="picker-list">
        {rows.length === 0 && <div className="muted small" style={{ padding: 16 }}>Nada encontrado. Cadastre em {kind === 'part' ? 'Peças & produtos' : 'Serviços'}.</div>}
        {rows.map((r) => (
          <button key={r.id} type="button" className="picker-item" onClick={() => onPick(r.item)}>
            <div className="grow">
              <div className="strong truncate">{r.title}</div>
              <div className="small muted truncate">{r.sub}</div>
            </div>
            {r.extra}
            <span className="strong nowrap">{money(r.price)}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
