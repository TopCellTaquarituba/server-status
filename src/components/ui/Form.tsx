import {
  forwardRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from '@/lib/utils'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  span?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12
  children: ReactNode
  className?: string
  /** use 'div' quando o conteúdo tiver botões (evita o clique do <label> no primeiro botão) */
  as?: 'label' | 'div'
}

export function Field({ label, hint, error, required, span, children, className, as: Tag = 'label' }: FieldProps) {
  return (
    <Tag className={cx('field', span && `span-${span}`, className)}>
      {label && (
        <span className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </span>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </Tag>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cx('input', invalid && 'invalid', className)} {...rest} />
  },
)

export function InputIcon({ icon, trail, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; trail?: ReactNode }) {
  return (
    <div className="input-group">
      <span className="addon">{icon}</span>
      <input className="input" {...rest} />
      {trail && <span className="trail">{trail}</span>}
    </div>
  )
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx('select', className)} {...rest}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx('textarea', className)} {...rest} />
})

/** Campo numérico que aceita vírgula como separador decimal */
export function NumberInput({
  value,
  onChange,
  decimals = 2,
  min,
  prefix,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'> & {
  value: number
  onChange: (v: number) => void
  decimals?: number
  min?: number
  prefix?: string
}) {
  const format = (n: number) => (Number.isFinite(n) ? n.toFixed(decimals).replace('.', ',') : '')
  const [text, setText] = useState(format(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])

  const parse = (t: string) => {
    const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
    const n = Number(normalized)
    if (!Number.isFinite(n)) return 0
    return min !== undefined ? Math.max(min, n) : n
  }

  const input = (
    <input
      {...rest}
      inputMode="decimal"
      className={cx('input', className)}
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        onChange(parse(text))
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d,.-]/g, '')
        setText(t)
        onChange(parse(t))
      }}
    />
  )

  if (!prefix) return input
  return (
    <div className="input-group">
      <span className="addon">{prefix}</span>
      {input}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  description?: ReactNode
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {label && (
        <span className="text">
          {label}
          {description && <small>{description}</small>}
        </span>
      )}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} type="button" className={cx(o.value === value && 'active')} onClick={() => onChange(o.value)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
