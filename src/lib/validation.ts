import { onlyDigits } from './format'

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

/** Retorna mensagem de erro ou null. Documento vazio é aceito (campo opcional). */
export function documentError(value: string): string | null {
  const d = onlyDigits(value)
  if (!d) return null
  if (d.length === 11) return isValidCpf(d) ? null : 'CPF inválido'
  if (d.length === 14) return isValidCnpj(d) ? null : 'CNPJ inválido'
  return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)'
}

export const isValidEmail = (v: string): boolean => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

/** IMEI: 15 dígitos com dígito verificador Luhn */
export function isValidImei(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 15) return false
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let n = Number(d[i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}
