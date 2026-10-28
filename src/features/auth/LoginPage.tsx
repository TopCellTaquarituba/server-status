import { useState, type FormEvent } from 'react'
import { ClipboardList, FileText, Lock, Printer, Smartphone, Tags, User as UserIcon, Users } from 'lucide-react'
import { Button, Field, InputIcon } from '@/components/ui'
import { useCollection, useSettings } from '@/data/store'
import { DEFAULT_ADMIN } from '@/services/auth'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const settings = useSettings()
  const users = useCollection('users')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const firstAccess = users.length === 1 && users[0].mustChangePassword && users[0].username === DEFAULT_ADMIN.username
  const company = settings.company

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await login(username, password)
    setLoading(false)
    if (!ok) setError('Usuário ou senha incorretos')
  }

  return (
    <div className="login">
      <div className="login-hero">
        <div className="brand" style={{ padding: 0 }}>
          {company.logo ? <img src={company.logo} className="brand-logo" alt="" /> : <div className="brand-mark"><Smartphone size={20} /></div>}
          <div className="brand-text">
            <strong style={{ color: 'white' }}>{company.tradeName || company.name}</strong>
            <span style={{ color: 'rgba(255,255,255,.6)' }}>Assistec Pro</span>
          </div>
        </div>
        <div>
          <h2>Gestão completa da sua assistência técnica.</h2>
          <p>Ordens de serviço, orçamentos, clientes, estoque de peças e impressão de cupons e etiquetas — tudo em um só lugar.</p>
        </div>
        <div className="features">
          <div className="feature"><ClipboardList />Ordens de serviço</div>
          <div className="feature"><FileText />Orçamentos e PDF</div>
          <div className="feature"><Users />Cadastro de clientes</div>
          <div className="feature"><Tags />Etiquetas de produtos</div>
          <div className="feature"><Printer />Cupom térmico Elgin i9</div>
          <div className="feature"><Lock />Acesso por usuário</div>
        </div>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div>
            <h1>Entrar</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>Acesse com seu usuário e senha.</p>
          </div>
          <Field label="Usuário">
            <InputIcon icon={<UserIcon />} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="seu.usuario" />
          </Field>
          <Field label="Senha" error={error}>
            <InputIcon icon={<Lock />} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••" />
          </Field>
          <Button type="submit" variant="primary" loading={loading} style={{ height: 44 }}>
            Entrar
          </Button>
          {firstAccess && (
            <div className="alert tone-blue">
              <Lock />
              <div>
                Primeiro acesso: usuário <b>{DEFAULT_ADMIN.username}</b> e senha <b>{DEFAULT_ADMIN.password}</b>. Você será solicitado a trocar a senha.
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
