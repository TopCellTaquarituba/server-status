import { useRef } from 'react'
import { Building2, ImagePlus, Trash2 } from 'lucide-react'
import { Button, Card, Field, Input, Select } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { UFS } from '@/domain/defaults'
import type { Address } from '@/domain/types'
import { lookupCep } from '@/infra/platform'
import { maskCep, maskCpfCnpj, maskPhone } from '@/lib/format'
import { documentError } from '@/lib/validation'
import { readFileAsDataUrl } from '@/lib/utils'
import { SectionFooter } from './SectionFooter'
import { useSettingsSection } from './useSettingsSection'

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024

export function CompanySection() {
  const { draft, patch, save, reset, dirty } = useSettingsSection('company')
  const { toast } = useFeedback()
  const fileRef = useRef<HTMLInputElement>(null)

  const setAddr = (p: Partial<Address>) => patch({ address: { ...draft.address, ...p } })

  const onLogo = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) return toast('Logo muito grande (máx. 1,5 MB)', 'warning')
    patch({ logo: await readFileAsDataUrl(file) })
  }

  return (
    <Card title="Dados da empresa" icon={<Building2 />} subtitle="Aparecem no topo das ordens, orçamentos, cupons e etiquetas" flush>
      <div className="card-body">
        <div className="row" style={{ alignItems: 'flex-start', gap: 24, marginBottom: 22 }}>
          <div className="logo-drop" onClick={() => fileRef.current?.click()} title="Clique para enviar o logo">
            {draft.logo ? <img src={draft.logo} alt="Logo" /> : <div className="stack muted small" style={{ alignItems: 'center', gap: 6 }}><ImagePlus size={24} />Enviar logo</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
          <div className="stack" style={{ gap: 8, paddingTop: 8 }}>
            <strong>Logotipo</strong>
            <span className="muted small">PNG ou JPG com fundo branco/transparente. Na impressora térmica é impresso em preto e branco.</span>
            {draft.logo && (
              <div>
                <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => patch({ logo: '' })}>
                  Remover logo
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="form-grid">
          <Field label="Razão social" span={6}>
            <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Nome fantasia" hint="Nome em destaque nos documentos" span={6}>
            <Input value={draft.tradeName} onChange={(e) => patch({ tradeName: e.target.value })} />
          </Field>
          <Field label="CNPJ / CPF" span={4} error={documentError(draft.cnpj)}>
            <Input value={draft.cnpj} onChange={(e) => patch({ cnpj: maskCpfCnpj(e.target.value) })} />
          </Field>
          <Field label="Inscrição estadual" span={4}>
            <Input value={draft.ie} onChange={(e) => patch({ ie: e.target.value })} />
          </Field>
          <Field label="Inscrição municipal" span={4}>
            <Input value={draft.im} onChange={(e) => patch({ im: e.target.value })} />
          </Field>
          <Field label="Telefone" span={3}>
            <Input value={draft.phone} onChange={(e) => patch({ phone: maskPhone(e.target.value) })} />
          </Field>
          <Field label="WhatsApp" span={3}>
            <Input value={draft.whatsapp} onChange={(e) => patch({ whatsapp: maskPhone(e.target.value) })} />
          </Field>
          <Field label="E-mail" span={3}>
            <Input value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Site / Instagram" span={3}>
            <Input value={draft.website} onChange={(e) => patch({ website: e.target.value })} />
          </Field>

          <Field label="CEP" span={3}>
            <Input
              value={draft.address.cep}
              onChange={(e) => setAddr({ cep: maskCep(e.target.value) })}
              onBlur={async () => {
                const found = await lookupCep(draft.address.cep)
                if (found) setAddr(found)
              }}
            />
          </Field>
          <Field label="Rua" span={7}>
            <Input value={draft.address.street} onChange={(e) => setAddr({ street: e.target.value })} />
          </Field>
          <Field label="Número" span={2}>
            <Input value={draft.address.number} onChange={(e) => setAddr({ number: e.target.value })} />
          </Field>
          <Field label="Complemento" span={3}>
            <Input value={draft.address.complement} onChange={(e) => setAddr({ complement: e.target.value })} />
          </Field>
          <Field label="Bairro" span={3}>
            <Input value={draft.address.district} onChange={(e) => setAddr({ district: e.target.value })} />
          </Field>
          <Field label="Cidade" span={4}>
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
          <Field label="Mensagem de rodapé" hint="Impressa no final dos cupons e documentos" span={12}>
            <Input value={draft.footerMessage} onChange={(e) => patch({ footerMessage: e.target.value })} />
          </Field>
        </div>
      </div>
      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </Card>
  )
}
