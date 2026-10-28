import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cx } from '@/lib/utils'

const pos = (n: number) => ({ x: ((n - 1) % 3) * 50 + 25, y: Math.floor((n - 1) / 3) * 50 + 25 })

/** Captura do padrão de desbloqueio Android clicando nos pontos em sequência */
export function PatternLock({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const seq = value
    .split('-')
    .map(Number)
    .filter((n) => n >= 1 && n <= 9)

  const toggle = (n: number) => {
    if (seq.includes(n)) return
    onChange([...seq, n].join('-'))
  }

  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
      <div className="pattern-lock">
        <svg viewBox="0 0 150 150">
          {seq.length > 1 && (
            <polyline
              points={seq.map((n) => `${pos(n).x},${pos(n).y}`).join(' ')}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".7"
            />
          )}
        </svg>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={cx(seq.includes(n) && 'on')} onClick={() => toggle(n)} aria-label={`Ponto ${n}`}>
            <span>{seq.includes(n) ? seq.indexOf(n) + 1 : ''}</span>
          </button>
        ))}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted">Clique nos pontos na ordem do desenho.</span>
        <span className="mono">{value || '—'}</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => onChange('')}>
          Limpar
        </Button>
      </div>
    </div>
  )
}
