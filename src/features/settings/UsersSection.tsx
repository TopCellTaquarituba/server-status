import { useEffect, useState } from 'react'
import { Pencil, Plus, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Modal, Select, Switch } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { useCollection } from '@/data/store'
import { ROLES } from '@/domain/defaults'
import type { User, UserRole } from '@/domain/types'
import { formatDate, initials } from '@/lib/format'
import { saveUser, type UserInput } from '@/services/auth'

const empty = (): UserInput => ({ name: '', username: '', role: 'tecnico', active: true, password: '' })

export function UsersSection() {
  const users = useCollection('users')
  const [editing, setEditing] = useState<User | null | undefined>(undefined)

  return (
    <Card
      title="Usuários e acesso"
      icon={<ShieldCheck />}
      subtitle="Administradores acessam as configurações; técnicos e atendentes operam OS, clientes e estoque"
      actions={
        <Button size="sm" variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>
          Novo usuário
        </Button>
      }
      flush
    >
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Situação</th>
              <th>Criado em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="clickable" onClick={() => setEditing(u)}>
                <td>
                  <div className="row">
                    <div className="avatar">{initials(u.name)}</div>
                    <span className="cell-main">{u.name}</span>
                  </div>
                </td>
                <td className="mono">{u.username}</td>
                <td>
                  <Badge tone={u.role === 'admin' ? 'violet' : u.role === 'tecnico' ? 'blue' : 'teal'}>{ROLES[u.role]}</Badge>
                </td>
                <td>{u.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td>
                  <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} aria-label="Editar" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UserModal user={editing} onClose={() => setEditing(undefined)} />
    </Card>
  )
}

function UserModal({ user, onClose }: { user: User | null | undefined; onClose: () => void }) {
  const { run } = useFeedback()
  const [draft, setDraft] = useState<UserInput>(empty)

  useEffect(() => {
    if (user !== undefined) setDraft(user ? { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active, password: '' } : empty())
  }, [user])

  const set = <K extends keyof UserInput>(k: K, v: UserInput[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    const saved = await run(() => saveUser(draft), user ? 'Usuário atualizado' : 'Usuário criado')
    if (saved) onClose()
  }

  return (
    <Modal
      open={user !== undefined}
      onClose={onClose}
      size="sm"
      title={user ? 'Editar usuário' : 'Novo usuário'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Nome" required>
          <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Usuário de acesso" required>
          <Input value={draft.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} className="mono" />
        </Field>
        <Field label="Perfil">
          <Select value={draft.role} onChange={(e) => set('role', e.target.value as UserRole)}>
            {Object.entries(ROLES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={user ? 'Nova senha' : 'Senha'} hint={user ? 'Deixe em branco para manter a atual' : undefined} required={!user}>
          <Input type="password" value={draft.password} onChange={(e) => set('password', e.target.value)} />
        </Field>
        <Field as="div">
          <Switch checked={draft.active} onChange={(v) => set('active', v)} label="Usuário ativo" />
        </Field>
      </div>
    </Modal>
  )
}
