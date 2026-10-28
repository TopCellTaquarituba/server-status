import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Field, NumberInput, Select } from '@/components/ui'
import { useSettings } from '@/data/store'
import type { Payment } from '@/domain/types'
import { formatDate, money } from '@/lib/format'
import { nowIso, uid } from '@/lib/utils'

export function PaymentsPanel({ payments, balance, onChange }: { payments: Payment[]; balance: number; onChange: (p: Payment[]) => void }) {
  const { orders } = useSettings()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState(orders.paymentMethods[0] ?? 'Dinheiro')

  const add = () => {
    if (amount <= 0) return
    onChange([...payments, { id: uid(), date: nowIso(), method, amount, note: '' }])
    setAmount(0)
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {payments.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {payments.map((p) => (
            <div key={p.id} className="row" style={{ padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <div className="grow" style={{ flex: 1 }}>
                <div className="strong">{money(p.amount)}</div>
                <div className="small muted">
                  {p.method} · {formatDate(p.date)}
                </div>
              </div>
              <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} onClick={() => onChange(payments.filter((x) => x.id !== p.id))} aria-label="Remover pagamento" />
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Field label="Valor" className="grow">
          <NumberInput value={amount} min={0} prefix="R$" onChange={setAmount} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </Field>
        <Field label="Forma" className="grow">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {orders.paymentMethods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="row">
        {balance > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setAmount(balance)}>
            Usar saldo ({money(balance)})
          </Button>
        )}
        <div className="spacer" />
        <Button size="sm" icon={<Plus />} onClick={add} disabled={amount <= 0}>
          Registrar pagamento
        </Button>
      </div>
    </div>
  )
}
