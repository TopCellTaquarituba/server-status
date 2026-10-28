import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Phone, Search, UserPlus, X } from 'lucide-react'
import { Button, InputIcon } from '@/components/ui'
import { useCollection } from '@/data/store'
import { initials, matches } from '@/lib/format'
import { CustomerFormModal } from '@/features/customers/CustomerFormModal'
import { cx } from '@/lib/utils'

/** Seleção de cliente com busca e cadastro rápido */
export function CustomerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const customers = useCollection('customers')
  const selected = customers.find((c) => c.id === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(0)
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(
    () => customers.filter((c) => matches(query, c.name, c.document, c.phone, c.whatsapp, c.email)).slice(0, 8),
    [customers, query],
  )

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (id: string) => {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <>
      {selected ? (
        <div className="customer-chip">
          <div className="avatar">{initials(selected.name)}</div>
          <div className="grow" style={{ flex: 1, minWidth: 0 }}>
            <div className="strong truncate">{selected.name}</div>
            <div className="small muted row" style={{ gap: 12 }}>
              {(selected.phone || selected.whatsapp) && (
                <span className="row" style={{ gap: 4 }}>
                  <Phone size={12} /> {selected.phone || selected.whatsapp}
                </span>
              )}
              {selected.document && <span>{selected.document}</span>}
            </div>
          </div>
          <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} onClick={() => setModal('edit')} aria-label="Editar cliente" />
          <Button size="sm" variant="ghost" iconOnly icon={<X />} onClick={() => onChange('')} aria-label="Trocar cliente" />
        </div>
      ) : (
        <div className="row" ref={ref}>
          <div className="combo" style={{ flex: 1 }}>
            <InputIcon
              icon={<Search />}
              placeholder="Buscar cliente por nome, telefone ou CPF..."
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
                setFocus(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setFocus((f) => Math.min(f + 1, results.length - 1))
                if (e.key === 'ArrowUp') setFocus((f) => Math.max(f - 1, 0))
                if (e.key === 'Enter' && results[focus]) {
                  e.preventDefault()
                  pick(results[focus].id)
                }
              }}
            />
            {open && (
              <div className="combo-pop">
                {results.length === 0 && <div className="muted small" style={{ padding: 12 }}>Nenhum cliente encontrado.</div>}
                {results.map((c, i) => (
                  <button key={c.id} type="button" className={cx('picker-item', i === focus && 'focused')} onMouseDown={() => pick(c.id)}>
                    <div className="avatar">{initials(c.name)}</div>
                    <div className="grow">
                      <div className="strong truncate">{c.name}</div>
                      <div className="small muted">{[c.phone || c.whatsapp, c.document].filter(Boolean).join(' · ')}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button icon={<UserPlus />} onClick={() => setModal('new')}>
            Novo cliente
          </Button>
        </div>
      )}

      <CustomerFormModal
        open={modal !== null}
        customer={modal === 'edit' ? selected : null}
        onClose={() => setModal(null)}
        onSaved={(c) => onChange(c.id)}
      />
    </>
  )
}
