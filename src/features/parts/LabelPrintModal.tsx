import { useEffect, useState } from 'react'
import { Printer, Trash2 } from 'lucide-react'
import { Button, Modal, NumberInput } from '@/components/ui'
import type { Part } from '@/domain/types'
import { money } from '@/lib/format'
import { useDocumentPrinting } from '@/print/useDocumentPrinting'

/** Define a quantidade de etiquetas por produto antes de imprimir */
export function LabelPrintModal({ parts, onClose }: { parts: Part[]; onClose: () => void }) {
  const printing = useDocumentPrinting()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [list, setList] = useState<Part[]>([])

  useEffect(() => {
    setList(parts)
    setQty(Object.fromEntries(parts.map((p) => [p.id, 1])))
  }, [parts])

  const total = list.reduce((s, p) => s + (qty[p.id] ?? 1), 0)

  const print = () => {
    printing.productLabels(list.map((part) => ({ part, quantity: qty[part.id] ?? 1 })))
    onClose()
  }

  return (
    <Modal
      open={parts.length > 0}
      onClose={onClose}
      size="md"
      title="Imprimir etiquetas"
      description="Defina quantas etiquetas imprimir de cada produto"
      footer={
        <>
          <span className="spacer muted small">{total} etiquetas</span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Printer />} onClick={print} disabled={list.length === 0}>
            Pré-visualizar e imprimir
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 6 }}>
        {list.map((p) => (
          <div key={p.id} className="picker-item" style={{ cursor: 'default' }}>
            <div className="grow">
              <div className="strong truncate">{p.name}</div>
              <div className="small muted">
                {p.code} · {money(p.salePrice)} · estoque {p.stock}
              </div>
            </div>
            <div style={{ width: 90 }}>
              <NumberInput value={qty[p.id] ?? 1} decimals={0} min={1} onChange={(v) => setQty((q) => ({ ...q, [p.id]: Math.max(1, Math.round(v)) }))} />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setQty((q) => ({ ...q, [p.id]: Math.max(1, p.stock) }))}>
              = estoque
            </Button>
            <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} onClick={() => setList((l) => l.filter((x) => x.id !== p.id))} aria-label="Remover" />
          </div>
        ))}
      </div>
    </Modal>
  )
}
