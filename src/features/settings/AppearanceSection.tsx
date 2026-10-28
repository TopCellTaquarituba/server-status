import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { Card, Field, Input, Segmented } from '@/components/ui'
import { store, useSettings } from '@/data/store'
import type { AppearanceSettings } from '@/domain/types'
import { cx } from '@/lib/utils'

const COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b']

/** Aparência é aplicada na hora (sem botão salvar) para o usuário ver o resultado */
export function AppearanceSection() {
  const { appearance } = useSettings()
  const set = (patch: Partial<AppearanceSettings>) => store.updateSettings('appearance', { ...appearance, ...patch })

  return (
    <Card title="Aparência" icon={<Palette />} subtitle="As alterações são aplicadas imediatamente">
      <div className="stack" style={{ gap: 24 }}>
        <Field label="Tema" as="div">
          <Segmented
            value={appearance.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'dark', label: 'Escuro', icon: <Moon /> },
              { value: 'light', label: 'Claro', icon: <Sun /> },
              { value: 'system', label: 'Sistema', icon: <Monitor /> },
            ]}
          />
        </Field>

        <Field label="Cor principal" hint="Usada em botões, destaques e no cabeçalho dos documentos A4" as="div">
          <div className="row wrap">
            <div className="color-swatches">
              {COLORS.map((c) => (
                <button key={c} type="button" className={cx('swatch', appearance.primary.toLowerCase() === c && 'active')} style={{ background: c }} onClick={() => set({ primary: c })} aria-label={c} />
              ))}
            </div>
            <Input type="color" value={appearance.primary} onChange={(e) => set({ primary: e.target.value })} style={{ width: 56, padding: 4 }} />
          </div>
        </Field>

        <Field label="Densidade da interface" as="div">
          <Segmented
            value={appearance.density}
            onChange={(density) => set({ density })}
            options={[
              { value: 'confortavel', label: 'Confortável' },
              { value: 'compacto', label: 'Compacta' },
            ]}
          />
        </Field>

        <Field label={`Arredondamento dos cantos: ${appearance.radius}px`} as="div">
          <input type="range" min={0} max={20} value={appearance.radius} onChange={(e) => set({ radius: Number(e.target.value) })} style={{ width: 280, accentColor: 'var(--primary)' }} />
        </Field>
      </div>
    </Card>
  )
}
