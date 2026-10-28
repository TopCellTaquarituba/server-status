import { useState } from 'react'
import { Copy, KeyRound, Link2, QrCode, RefreshCw, RotateCcw } from 'lucide-react'
import { Button, Card, Field, Input, Switch, Textarea } from '@/components/ui'
import { useFeedback } from '@/components/feedback/FeedbackProvider'
import { ORDER_STATUS, defaultStatusMessages } from '@/domain/defaults'
import type { PublicStatusMessage } from '@/domain/types'
import { SectionFooter } from './SectionFooter'
import { useSettingsSection } from './useSettingsSection'

const COLORS = ['#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

export function StatusPageSection() {
  const { draft, patch, save, reset, dirty } = useSettingsSection('statusPage')
  const { toast } = useFeedback()
  const [testing, setTesting] = useState(false)

  const setMessage = (status: string, m: Partial<PublicStatusMessage>) =>
    patch({ messages: draft.messages.map((x) => (x.status === status ? { ...x, ...m } : x)) })

  const genKey = () => patch({ apiKey: crypto.randomUUID().replace(/-/g, '') })

  const testConnection = async () => {
    if (!draft.baseUrl) return toast('Informe a URL do servidor', 'warning')
    setTesting(true)
    try {
      const res = await fetch(`${draft.baseUrl.replace(/\/+$/, '')}/api/health`)
      toast(res.ok ? 'Servidor respondeu com sucesso!' : `Servidor respondeu ${res.status}`, res.ok ? 'success' : 'error')
    } catch {
      toast('Não foi possível conectar ao servidor', 'error')
    } finally {
      setTesting(false)
    }
  }

  const preview = draft.messages.find((m) => m.status === 'em_reparo') ?? draft.messages[0]

  return (
    <div className="stack">
      <Card title="Acompanhamento do cliente" icon={<QrCode />} subtitle="Página web que o cliente abre pelo QR Code para ver o status em tempo real" flush>
        <div className="card-body stack">
          <Switch
            checked={draft.enabled}
            onChange={(v) => patch({ enabled: v })}
            label="Ativar acompanhamento por QR Code"
            description="Gera o QR Code na via do cliente e publica o status no servidor"
          />

          <div className="form-grid">
            <Field label="URL do servidor de status" span={8} hint="Endereço onde você publicou o servidor (veja a pasta status-server e o README)">
              <div className="input-group">
                <span className="addon"><Link2 size={16} /></span>
                <Input value={draft.baseUrl} onChange={(e) => patch({ baseUrl: e.target.value })} className="mono" placeholder="https://status.minhaloja.com.br" style={{ paddingLeft: 36 }} />
              </div>
            </Field>
            <Field label="Testar" span={4} as="div">
              <Button icon={<RefreshCw className={testing ? 'spin' : ''} />} onClick={testConnection} loading={testing}>
                Testar conexão
              </Button>
            </Field>
            <Field label="Chave de API (API Key)" span={12} hint="A mesma chave deve estar no servidor (variável API_KEY). Mantenha em segredo.">
              <div className="row">
                <div className="input-group" style={{ flex: 1 }}>
                  <span className="addon"><KeyRound size={16} /></span>
                  <Input value={draft.apiKey} onChange={(e) => patch({ apiKey: e.target.value })} className="mono" style={{ paddingLeft: 36 }} />
                </div>
                <Button variant="secondary" icon={<Copy />} onClick={() => { void navigator.clipboard?.writeText(draft.apiKey); toast('Chave copiada') }}>
                  Copiar
                </Button>
                <Button variant="secondary" icon={<RefreshCw />} onClick={genKey}>
                  Gerar
                </Button>
              </div>
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Personalização da página" icon={<QrCode />}>
        <div className="grid grid-2">
          <div className="form-grid" style={{ height: 'fit-content' }}>
            <Field label="Título" span={12}>
              <Input value={draft.headline} onChange={(e) => patch({ headline: e.target.value })} />
            </Field>
            <Field label="Subtítulo" span={12}>
              <Input value={draft.subheadline} onChange={(e) => patch({ subheadline: e.target.value })} />
            </Field>
            <Field label="Cor do tema" span={12} as="div">
              <div className="row wrap">
                <div className="color-swatches">
                  {COLORS.map((c) => (
                    <button key={c} type="button" className="swatch" style={{ background: c, outline: draft.themeColor === c ? '2px solid var(--text)' : 'none' }} onClick={() => patch({ themeColor: c })} aria-label={c} />
                  ))}
                </div>
                <Input type="color" value={draft.themeColor} onChange={(e) => patch({ themeColor: e.target.value })} style={{ width: 52, padding: 4 }} />
              </div>
            </Field>
            <Field span={12} as="div" label="O que mostrar ao cliente">
              <div className="stack" style={{ gap: 10 }}>
                <Switch checked={draft.showDevice} onChange={(v) => patch({ showDevice: v })} label="Mostrar o aparelho (marca e modelo)" />
                <Switch checked={draft.showEta} onChange={(v) => patch({ showEta: v })} label="Mostrar previsão de entrega" />
                <Switch checked={draft.showShopContact} onChange={(v) => patch({ showShopContact: v })} label="Mostrar contato da loja (telefone/WhatsApp)" />
              </div>
            </Field>
          </div>

          {/* Prévia simplificada da página pública */}
          <div className="status-preview" style={{ ['--sc' as string]: draft.themeColor }}>
            <div className="status-preview-head">
              <div className="status-preview-dot" />
              <div>
                <div className="strong">{draft.headline || 'Acompanhe seu conserto'}</div>
                <div className="small muted">{draft.subheadline}</div>
              </div>
            </div>
            <div className="status-preview-card" style={{ borderColor: preview?.color }}>
              <div className="badge" style={{ background: `color-mix(in srgb, ${preview?.color} 15%, transparent)`, color: preview?.color, borderColor: 'transparent' }}>
                {preview?.publicLabel}
              </div>
              <p>{preview?.message}</p>
              {draft.showDevice && <div className="small muted">Aparelho: Samsung Galaxy A14</div>}
              {draft.showEta && <div className="small muted">Previsão: 31/10/2026</div>}
            </div>
            <div className="small muted" style={{ textAlign: 'center' }}>Prévia · atualiza quando você muda o status no sistema</div>
          </div>
        </div>
      </Card>

      <Card
        title="Textos por status"
        icon={<QrCode />}
        subtitle="Personalize o que o cliente vê em cada etapa"
        actions={
          <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => patch({ messages: defaultStatusMessages() })}>
            Restaurar padrão
          </Button>
        }
        flush
      >
        <div className="card-body">
          <div className="stack" style={{ gap: 4 }}>
            {draft.messages.map((m) => (
              <div key={m.status} className="status-edit-row">
                <div className="status-edit-label">
                  <input type="color" className="status-swatch" value={m.color} onChange={(e) => setMessage(m.status, { color: e.target.value })} />
                  <span className="small strong">{ORDER_STATUS[m.status].label}</span>
                </div>
                <Input value={m.publicLabel} onChange={(e) => setMessage(m.status, { publicLabel: e.target.value })} placeholder="Rótulo público" />
                <Textarea value={m.message} onChange={(e) => setMessage(m.status, { message: e.target.value })} rows={1} placeholder="Mensagem ao cliente" />
                <Switch checked={m.visible} onChange={(v) => setMessage(m.status, { visible: v })} label="" />
              </div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>
            Status sem o visto ficam ocultos: o cliente vê apenas “Em atendimento”, sem detalhes internos.
          </div>
        </div>
      </Card>

      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </div>
  )
}
