import { CheckCheck, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { CHECKLIST_STATUS } from '@/domain/defaults'
import type { ChecklistEntry, ChecklistStatus } from '@/domain/types'
import { cx } from '@/lib/utils'

const ORDER: ChecklistStatus[] = ['ok', 'defeito', 'nao_testado']

export function ChecklistEditor({ items, onChange }: { items: ChecklistEntry[]; onChange: (items: ChecklistEntry[]) => void }) {
  const setAll = (status: ChecklistStatus) => onChange(items.map((i) => ({ ...i, status })))
  const set = (index: number, status: ChecklistStatus) => onChange(items.map((i, idx) => (idx === index ? { ...i, status } : i)))

  const ok = items.filter((i) => i.status === 'ok').length
  const bad = items.filter((i) => i.status === 'defeito').length

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row">
        <span className="small muted">
          {ok} funcionando · {bad} com defeito · {items.length - ok - bad} não testados
        </span>
        <div className="spacer" />
        <Button size="sm" variant="ghost" icon={<CheckCheck />} onClick={() => setAll('ok')}>
          Tudo OK
        </Button>
        <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setAll('nao_testado')}>
          Limpar
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="muted small">Nenhum item de checklist configurado. Ajuste em Configurações → Ordens.</div>
      ) : (
        <div className="checklist-grid">
          {items.map((item, index) => (
            <div key={item.label} className="check-row">
              <span>{item.label}</span>
              <div className="tri">
                {ORDER.map((s) => (
                  <button key={s} type="button" className={cx(`tone-${CHECKLIST_STATUS[s].tone}`, item.status === s && 'on')} onClick={() => set(index, s)}>
                    {CHECKLIST_STATUS[s].short}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
