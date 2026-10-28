import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Button, Field, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { UFS } from '@/domain/defaults'
import type { Customer } from '@/domain/types'
import { lookupCep } from '@/infra/platform'
import { maskCep, maskCpfCnpj, maskPhone } from '@/lib/format'
import { documentError, isValidEmail } from '@/lib/validation'
import { newCustomer, saveCustomer } from '@/services/catalog'

interface Props {
  open: boolean
  customer?: Customer | null
  onClose: () => void
  onSaved?: (c: Customer) => void
}

export function CustomerFormModal({ open, customer, onClose, onSaved }: Props) {
  const { run } = useFeedback()
  const [draft, setDraft] = useState<Customer>(newCustomer)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  useEffect(() => {
    if (open) setDraft(customer ? structuredClone(customer) : newCustomer())
  }, [open, customer])

  const set = <K extends keyof Customer>(key: K, value: Customer[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setAddr = (patch: Partial<Customer['address']>) => setDraft((d) => ({ ...d, address: { ...d.address, ...patch } }))

  const searchCep = async () => {
    setCepLoading(true)
    const found = await lookupCep(draft.address.cep)
    setCepLoading(false)
    if (found) setAddr(found)
  }

  const save = async () => {
    setSaving(true)
    const saved = await run(() => saveCustomer(draft), customer ? 'Cliente atualizado' : 'Cliente cadastrado')
    setSaving(false)
    if (saved) {
      onSaved?.(saved)
      onClose()
    }
  }

  const docErr = documentError(draft.document)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={customer ? 'Editar cliente' : 'Novo cliente'}
      description="Dados de identificação, contato e endereço"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Salvar cliente
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field span={12} as="div">
            <Segmented
              value={draft.type}
              onChange={(v) => set('type', v)}
              options={[
                { value: 'PF', label: 'Pessoa física' },
                { value: 'PJ', label: 'Pessoa jurídica' },
              ]}
            />
          </Field>
          <Field label={draft.type === 'PJ' ? 'Razão social / nome fantasia' : 'Nome completo'} required span={8}>
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </Field>
          <Field label={draft.type === 'PJ' ? 'CNPJ' : 'CPF'} span={4} error={docErr}>
            <Input value={draft.document} onChange={(e) => set('document', maskCpfCnpj(e.target.value))} invalid={Boolean(docErr)} placeholder={draft.type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'} />
          </Field>
          <Field label={draft.type === 'PJ' ? 'Inscrição estadual' : 'RG'} span={4}>
            <Input value={draft.rg} onChange={(e) => set('rg', e.target.value)} />
          </Field>
          {draft.type === 'PF' && (
            <Field label="Data de nascimento" span={4}>
              <Input type="date" value={draft.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
            </Field>
          )}
          <Field label="E-mail" span={draft.type === 'PF' ? 4 : 8} error={isValidEmail(draft.email) ? null : 'E-mail inválido'}>
            <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Telefone" required span={6}>
            <Input value={draft.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="WhatsApp" span={6}>
            <Input value={draft.whatsapp} onChange={(e) => set('whatsapp', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </Field>
        </div>

        <div className="divider" />

        <div className="form-grid">
          <Field label="CEP" span={3} as="div">
            <div className="input-group">
              <Input
                value={draft.address.cep}
                onChange={(e) => setAddr({ cep: maskCep(e.target.value) })}
                onBlur={() => draft.address.cep.length === 9 && searchCep()}
                placeholder="00000-000"
              />
              <span className="trail">
                <Button size="sm" variant="ghost" iconOnly icon={cepLoading ? <Loader2 className="spin" /> : <Search />} onClick={searchCep} aria-label="Buscar CEP" />
              </span>
            </div>
          </Field>
          <Field label="Rua / logradouro" span={7}>
            <Input value={draft.address.street} onChange={(e) => setAddr({ street: e.target.value })} />
          </Field>
          <Field label="Número" span={2}>
            <Input value={draft.address.number} onChange={(e) => setAddr({ number: e.target.value })} />
          </Field>
          <Field label="Complemento" span={4}>
            <Input value={draft.address.complement} onChange={(e) => setAddr({ complement: e.target.value })} />
          </Field>
          <Field label="Bairro" span={3}>
            <Input value={draft.address.district} onChange={(e) => setAddr({ district: e.target.value })} />
          </Field>
          <Field label="Cidade" span={3}>
            <Input value={draft.address.city} onChange={(e) => setAddr({ city: e.target.value })} />
          </Field>
          <Field label="UF" span={2}>
            <Select value={draft.address.state} onChange={(e) => setAddr({ state: e.target.value })}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Select>
          </Field>
          <Field label="Observações" span={12}>
            <Textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Preferências, histórico, restrições..." />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
