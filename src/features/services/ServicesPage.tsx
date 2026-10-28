import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, InputIcon, Modal, NumberInput, PageHeader, Switch, Textarea } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { store, useCollection } from '@/data/store'
import type { CatalogService } from '@/domain/types'
import { matches, money } from '@/lib/format'
import { newCatalogService, saveCatalogService } from '@/services/catalog'

export function ServicesPage() {
  const services = useCollection('services')
  const { confirm, run } = useFeedback()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CatalogService | null | undefined>(undefined)

  const filtered = services.filter((s) => matches(query, s.name, s.description)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const remove = async (s: CatalogService) => {
    if (!(await confirm({ title: `Excluir ${s.name}?`, confirmLabel: 'Excluir', danger: true }))) return
    await run(() => store.remove('services', s.id), 'Serviço excluído')
  }

  return (
    <div className="page">
      <PageHeader
        title="Serviços"
        subtitle="Catálogo de mão de obra e serviços com preço padrão"
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>
            Novo serviço
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search">
          <InputIcon icon={<Search />} placeholder="Buscar serviço..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState icon={<Wrench />} title="Nenhum serviço cadastrado" description="Cadastre os serviços mais comuns para agilizar as ordens e orçamentos." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Tempo estimado</th>
                  <th>Garantia</th>
                  <th>Situação</th>
                  <th className="num">Preço</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => setEditing(s)}>
                    <td>
                      <div className="cell-main">{s.name}</div>
                      <div className="cell-sub">{s.description}</div>
                    </td>
                    <td>{s.estimatedMinutes >= 60 ? `${Math.floor(s.estimatedMinutes / 60)}h${s.estimatedMinutes % 60 ? ` ${s.estimatedMinutes % 60}min` : ''}` : `${s.estimatedMinutes} min`}</td>
                    <td>{s.warrantyDays ? `${s.warrantyDays} dias` : 'Sem garantia'}</td>
                    <td>{s.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                    <td className="num strong">{money(s.price)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} onClick={() => setEditing(s)} aria-label="Editar" />
                        <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} onClick={() => remove(s)} aria-label="Excluir" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ServiceFormModal open={editing !== undefined} service={editing ?? null} onClose={() => setEditing(undefined)} />
    </div>
  )
}

function ServiceFormModal({ open, service, onClose }: { open: boolean; service: CatalogService | null; onClose: () => void }) {
  const { run } = useFeedback()
  const [draft, setDraft] = useState<CatalogService>(newCatalogService)

  useEffect(() => {
    if (open) setDraft(service ? structuredClone(service) : newCatalogService())
  }, [open, service])

  const set = <K extends keyof CatalogService>(k: K, v: CatalogService[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    const saved = await run(() => saveCatalogService(draft), 'Serviço salvo')
    if (saved) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? 'Editar serviço' : 'Novo serviço'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome do serviço" required span={12}>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Descrição" span={12}>
          <Textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Preço" span={4}>
          <NumberInput value={draft.price} min={0} prefix="R$" onChange={(v) => set('price', v)} />
        </Field>
        <Field label="Tempo estimado (min)" span={4}>
          <NumberInput value={draft.estimatedMinutes} decimals={0} min={0} onChange={(v) => set('estimatedMinutes', Math.round(v))} />
        </Field>
        <Field label="Garantia (dias)" span={4}>
          <NumberInput value={draft.warrantyDays} decimals={0} min={0} onChange={(v) => set('warrantyDays', Math.round(v))} />
        </Field>
        <Field span={12} as="div">
          <Switch checked={draft.active} onChange={(v) => set('active', v)} label="Serviço ativo" description="Inativos não aparecem para seleção nas ordens" />
        </Field>
      </div>
    </Modal>
  )
}
