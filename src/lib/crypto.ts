const encoder = new TextEncoder()
const ITERATIONS = 120_000

const toHex = (buffer: ArrayBuffer | Uint8Array): string =>
  Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export function randomSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

/** Hash de senha com PBKDF2-SHA256 (Web Crypto). Senhas nunca são salvas em texto puro. */
export async function hashPassword(password: string, salt = randomSalt()): Promise<{ hash: string; salt: string }> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: ITERATIONS },
    key,
    256,
  )
  return { hash: toHex(bits), salt }
}

/** Comparação em tempo constante */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
