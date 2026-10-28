const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (value: number | undefined | null): string => currency.format(Number(value) || 0)

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** 'YYYY-MM-DD' na data local */
export function toInputDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return toInputDate(d)
}

export const onlyDigits = (v = ''): string => v.replace(/\D/g, '')

function applyPattern(digits: string, pattern: string): string {
  let out = ''
  let i = 0
  for (const ch of pattern) {
    if (i >= digits.length) break
    if (ch === '#') out += digits[i++]
    else out += ch
  }
  return out
}

export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  return d.length <= 11 ? applyPattern(d, '###.###.###-##') : applyPattern(d, '##.###.###/####-##')
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d.length <= 10 ? applyPattern(d, '(##) ####-####') : applyPattern(d, '(##) #####-####')
}

export const maskCep = (value: string): string => applyPattern(onlyDigits(value).slice(0, 8), '#####-###')

export const padNumber = (n: number, size = 6): string => String(n).padStart(size, '0')

export const docCode = (prefix: string, n: number): string => `${prefix}-${padNumber(n)}`

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** Busca sem acento e sem diferenciar maiúsculas */
export const normalize = (v: string): string =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export const matches = (query: string, ...fields: (string | number | undefined)[]): boolean => {
  const q = normalize(query.trim())
  if (!q) return true
  return fields.some((f) => f !== undefined && normalize(String(f)).includes(q))
}

export const percent = (value: number): string => `${(value * 100).toFixed(1).replace('.', ',')}%`
