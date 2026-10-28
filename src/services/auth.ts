import { store } from '@/data/store'
import type { User, UserRole } from '@/domain/types'
import { hashPassword, safeEqual } from '@/lib/crypto'
import { uid } from '@/lib/utils'

export const DEFAULT_ADMIN = { username: 'admin', password: 'admin' }

/** Cria o administrador padrão no primeiro uso */
export async function ensureDefaultAdmin(): Promise<void> {
  if (store.list('users').length > 0) return
  const { hash, salt } = await hashPassword(DEFAULT_ADMIN.password)
  await store.upsert('users', {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    name: 'Administrador',
    username: DEFAULT_ADMIN.username,
    role: 'admin',
    passwordHash: hash,
    salt,
    active: true,
    mustChangePassword: true,
  })
}

export async function authenticate(username: string, password: string): Promise<User | null> {
  const user = store
    .list('users')
    .find((u) => u.active && u.username.toLowerCase() === username.trim().toLowerCase())
  if (!user) return null
  const { hash } = await hashPassword(password, user.salt)
  return safeEqual(hash, user.passwordHash) ? user : null
}

export async function setPassword(user: User, password: string): Promise<User> {
  const { hash, salt } = await hashPassword(password)
  return store.upsert('users', { ...user, passwordHash: hash, salt, mustChangePassword: false })
}

export interface UserInput {
  id?: string
  name: string
  username: string
  role: UserRole
  active: boolean
  password?: string
}

export async function saveUser(input: UserInput): Promise<User> {
  const users = store.list('users')
  const username = input.username.trim().toLowerCase()
  if (!input.name.trim()) throw new Error('Informe o nome do usuário')
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new Error('Usuário deve ter ao menos 3 caracteres (letras, números, . _ -)')
  if (users.some((u) => u.username === username && u.id !== input.id)) throw new Error('Este nome de usuário já existe')

  const existing = input.id ? users.find((u) => u.id === input.id) : undefined
  if (!existing && !input.password) throw new Error('Defina uma senha para o novo usuário')
  if (input.password && input.password.length < 4) throw new Error('A senha deve ter ao menos 4 caracteres')

  // nunca deixar o sistema sem administrador ativo
  if (existing?.role === 'admin' && (input.role !== 'admin' || !input.active)) {
    const otherAdmins = users.filter((u) => u.role === 'admin' && u.active && u.id !== existing.id)
    if (otherAdmins.length === 0) throw new Error('É necessário manter ao menos um administrador ativo')
  }

  let passwordHash = existing?.passwordHash ?? ''
  let salt = existing?.salt ?? ''
  if (input.password) ({ hash: passwordHash, salt } = await hashPassword(input.password))

  return store.upsert('users', {
    id: existing?.id ?? uid(),
    createdAt: existing?.createdAt ?? '',
    updatedAt: '',
    name: input.name.trim(),
    username,
    role: input.role,
    active: input.active,
    passwordHash,
    salt,
    mustChangePassword: existing?.mustChangePassword ?? false,
  })
}
