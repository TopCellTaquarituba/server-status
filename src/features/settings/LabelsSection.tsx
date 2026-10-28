import { useMemo } from 'react'
import { Tag, Tags } from 'lucide-react'
import { Card, Field, NumberInput, Switch } from '@/components/ui'
import { store, useSettings } from '@/data/store'
import type { OrderLabelTemplate, Part, ProductLabelTemplate, ServiceOrder } from '@/domain/types'
import { profileFor } from '@/print/printService'
import { orderLabelHtml, productLabelsHtml } from '@/print/templates'
import { newCustomer } from '@/services/catalog'
import { newOrder } from '@/services/orders'
import { SectionFooter } from './SectionFooter'
import { useSettingsSection } from './useSettingsSection'

const MM_TO_PX = 96 / 25.4

function LivePreview({ html, widthMm }: { html: string; widthMm: number }) {
  return (
    <div className="preview-stage" style={{ padding: 16, maxHeight: 420 }}>
      <iframe title="Prévia" className="preview-paper" srcDoc={html} style={{ width: Math.round(widthMm * MM_TO_PX), height: 380 }} />
    </div>
  )
}

const samplePart = (): Part => ({
  id: 'sample',
  createdAt: '',
  updatedAt: '',
  code: 'P00042',
  barcode: '7891234567895',
  name: 'Tela Frontal Samsung Galaxy A54 Original',
  category: 'Telas',
  brand: 'Samsung',
  compatibleModels: 'Galaxy A54 5G',
  costPrice: 320,
  salePrice: 589.9,
  stock: 3,
  minStock: 1,
  location: '',
  supplier: '',
  warrantyDays: 90,
  active: true,
})

export function ProductLabelSection() {
  const { draft, patch, save, reset, dirty, settings } = useSettingsSection('productLabel')
  const profile = profileFor('productLabel', settings)
  const html = useMemo(
    () => productLabelsHtml([{ part: samplePart(), quantity: Math.max(1, draft.columns * 2) }], { ...store.getSettings(), productLabel: draft }, profile, draft),
    [draft, profile],
  )
  const num = (key: keyof ProductLabelTemplate, label: string, span: 3 | 4 | 6, decimals = 0, min = 0) => (
    <Field label={label} span={span}>
      <NumberInput value={draft[key] as number} decimals={decimals} min={min} onChange={(v) => patch({ [key]: v } as Partial<ProductLabelTemplate>)} />
    </Field>
  )
  const sw = (key: keyof ProductLabelTemplate, label: string) => (
    <Switch checked={draft[key] as boolean} onChange={(v) => patch({ [key]: v } as Partial<ProductLabelTemplate>)} label={label} />
  )

  return (
    <Card title="Etiquetas de produtos" icon={<Tags />} subtitle={`Imprime no perfil "${profile.name}" (${profile.paperWidthMm}mm) — altere em Impressoras`} flush>
      <div className="card-body">
        <div className="grid grid-2">
          <div className="stack">
            <div className="form-grid">
              {num('widthMm', 'Largura (mm)', 4, 0, 10)}
              {num('heightMm', 'Altura (mm)', 4, 0, 10)}
              {num('columns', 'Colunas', 4, 0, 1)}
              {num('gapMm', 'Espaço entre (mm)', 4, 1)}
              {num('paddingMm', 'Margem interna (mm)', 4, 1)}
              {num('barcodeHeightMm', 'Altura cód. barras', 4, 0, 3)}
              {num('nameFontPt', 'Fonte do nome (pt)', 6, 1, 5)}
              {num('priceFontPt', 'Fonte do preço (pt)', 6, 1, 5)}
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {sw('showCompany', 'Nome da empresa')}
              {sw('showName', 'Nome do produto')}
              {sw('showBrand', 'Marca')}
              {sw('showCompat', 'Modelos compatíveis')}
              {sw('showCode', 'Código interno')}
              {sw('showPrice', 'Preço')}
              {sw('showBarcode', 'Código de barras')}
              {sw('border', 'Borda')}
              {sw('cutLine', 'Linha de corte')}
              {sw('pagePerLabel', 'Uma etiqueta por página')}
            </div>
            <div className="small muted">
              Para bobina térmica de 80mm use largura 72mm e 1 coluna (ou 2 colunas de 34mm). Em etiquetadoras com rolo de etiquetas, ative “uma etiqueta por página”.
            </div>
          </div>
          <LivePreview html={html} widthMm={draft.pagePerLabel ? draft.widthMm : profile.paperWidthMm} />
        </div>
      </div>
      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </Card>
  )
}

export function OrderLabelSection() {
  const { draft, patch, save, reset, dirty, settings } = useSettingsSection('orderLabel')
  const profile = profileFor('orderLabel', settings)

  const html = useMemo(() => {
    const order: ServiceOrder = {
      ...newOrder(),
      number: 1234,
      createdAt: new Date().toISOString(),
      reportedIssue: 'Tela quebrada após queda, touch não responde',
      device: { ...newOrder().device, brand: 'Samsung', model: 'Galaxy A54', passwordType: 'pin', password: '1234' },
    }
    return orderLabelHtml({ order, customer: { ...newCustomer(), name: 'Maria da Silva', phone: '(14) 99999-0000' } }, store.getSettings(), profile, draft)
  }, [draft, profile])

  const num = (key: keyof OrderLabelTemplate, label: string, span: 3 | 4 | 6, decimals = 0, min = 0) => (
    <Field label={label} span={span}>
      <NumberInput value={draft[key] as number} decimals={decimals} min={min} onChange={(v) => patch({ [key]: v } as Partial<OrderLabelTemplate>)} />
    </Field>
  )
  const sw = (key: keyof OrderLabelTemplate, label: string) => (
    <Switch checked={draft[key] as boolean} onChange={(v) => patch({ [key]: v } as Partial<OrderLabelTemplate>)} label={label} />
  )

  return (
    <Card title="Etiqueta do aparelho" icon={<Tag />} subtitle="Identificação colada no aparelho enquanto está na assistência" flush>
      <div className="card-body">
        <div className="grid grid-2">
          <div className="stack">
            <div className="form-grid">
              {num('widthMm', 'Largura (mm)', 4, 0, 10)}
              {num('heightMm', 'Altura (mm)', 4, 0, 10)}
              {num('copies', 'Cópias', 4, 0, 1)}
              {num('titleFontPt', 'Fonte do nº (pt)', 4, 1, 6)}
              {num('textFontPt', 'Fonte do texto (pt)', 4, 1, 5)}
              {num('barcodeHeightMm', 'Altura cód. barras', 4, 0, 3)}
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {sw('showCompany', 'Nome da empresa')}
              {sw('showCustomer', 'Nome do cliente')}
              {sw('showPhone', 'Telefone')}
              {sw('showDevice', 'Aparelho')}
              {sw('showIssue', 'Defeito')}
              {sw('showDate', 'Data de entrada')}
              {sw('showPassword', 'Senha do aparelho')}
              {sw('showBarcode', 'Código de barras')}
              {sw('border', 'Borda')}
            </div>
          </div>
          <LivePreview html={html} widthMm={profile.kind === 'etiqueta' ? draft.widthMm : profile.paperWidthMm} />
        </div>
      </div>
      <SectionFooter dirty={dirty} onSave={save} onReset={reset} />
    </Card>
  )
}
