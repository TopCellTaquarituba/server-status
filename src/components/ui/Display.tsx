import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Tone } from '@/domain/defaults'
import { cx } from '@/lib/utils'
import { Button } from './Button'

export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && (
              <h3>
                {icon}
                {title}
              </h3>
            )}
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      <div className={cx('card-body', flush && 'flush')}>{children}</div>
    </section>
  )
}

export function Badge({ tone = 'gray', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('badge', `tone-${tone}`)}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  badge,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: string
  badge?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <div className="titles">
        {back && <Button variant="secondary" iconOnly icon={<ArrowLeft />} onClick={() => navigate(back)} aria-label="Voltar" />}
        <div>
          <div className="row">
            <h1>{title}</h1>
            {badge}
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: ReactNode; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" className={cx('tab', t.value === value && 'active')} onClick={() => onChange(t.value)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Kpi({ label, value, icon, tone, foot }: { label: string; value: ReactNode; icon: ReactNode; tone: Tone; foot?: ReactNode }) {
  return (
    <div className={cx('card kpi', `tone-${tone}`)}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

export interface MenuItem {
  label: string
  description?: string
  icon?: ReactNode
  onClick: () => void
}

export function Dropdown({ label, icon, items, variant = 'secondary' }: { label: string; icon?: ReactNode; items: MenuItem[]; variant?: 'primary' | 'secondary' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="menu-wrap" ref={ref}>
      <Button variant={variant} icon={icon} onClick={() => setOpen((o) => !o)}>
        {label}
        <ChevronDown style={{ marginLeft: -2, opacity: 0.7 }} />
      </Button>
      {open && (
        <div className="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.icon}
              <span>
                {item.label}
                {item.description && <small>{item.description}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
