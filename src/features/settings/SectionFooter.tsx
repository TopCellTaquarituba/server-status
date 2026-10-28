import { Save, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui'

export function SectionFooter({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="sticky-foot">
      <span className="spacer muted small">{dirty ? 'Há alterações não salvas' : 'Tudo salvo'}</span>
      <Button variant="ghost" icon={<Undo2 />} onClick={onReset} disabled={!dirty}>
        Descartar
      </Button>
      <Button variant="primary" icon={<Save />} onClick={onSave} disabled={!dirty}>
        Salvar alterações
      </Button>
    </div>
  )
}
