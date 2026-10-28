import { createContext, useContext, useState, type ReactNode } from 'react'
import { useCollection } from '@/data/store'
import type { User } from '@/domain/types'
import { authenticate } from '@/services/auth'

const SESSION_KEY = 'assistec:session'

interface AuthApi {
  user: User | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const users = useCollection('users')
  const [userId, setUserId] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY))
  const user = users.find((u) => u.id === userId && u.active) ?? null

  const login = async (username: string, password: string) => {
    const found = await authenticate(username, password)
    if (!found) return false
    sessionStorage.setItem(SESSION_KEY, found.id)
    setUserId(found.id)
    return true
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUserId(null)
  }

  return <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

/** Usuário logado (só usar em telas protegidas) */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('Nenhum usuário autenticado')
  return user
}
