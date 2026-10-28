import { useState } from 'react'
import { Button, Field, Input, Modal } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { setPassword } from '@/services/auth'
import type { User } from '@/domain/types'

export function ChangePasswordModal({ user, open, onClose, forced }: { user: User; open: boolean; onClose: () => void; forced?: boolean }) {
  const { toast } = useFeedback()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (pwd.length < 4) return setError('A senha deve ter ao menos 4 caracteres')
    if (pwd !== confirm) return setError('As senhas não conferem')
    setSaving(true)
    await setPassword(user, pwd)
    setSaving(false)
    setPwd('')
    setConfirm('')
    setError('')
    toast('Senha alterada com sucesso')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissable={!forced}
      size="sm"
      title={forced ? 'Defina uma nova senha' : 'Alterar senha'}
      description={forced ? 'Por segurança, troque a senha padrão antes de continuar.' : undefined}
      footer={
        <>
          {!forced && (
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button variant="primary" onClick={save} loading={saving}>
            Salvar senha
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Nova senha">
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus />
        </Field>
        <Field label="Confirmar nova senha" error={error}>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
      </div>
    </Modal>
  )
}
