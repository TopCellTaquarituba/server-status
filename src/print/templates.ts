/**
 * Templates de impressão em HTML puro (sem React) — renderizados pelo Electron
 * para impressoras térmicas (Elgin i9), A4/PDF e etiquetas.
 */
import { CHECKLIST_STATUS, ORDER_STATUS, PASSWORD_TYPES, QUOTE_STATUS } from '@/domain/defaults'
import type {
  Address,
  CompanySettings,
  Customer,
  Device,
  LineItem,
  OrderLabelTemplate,
  Part,
  PrinterProfile,
  ProductLabelTemplate,
  Quote,
  ServiceOrder,
  Settings,
  User,
} from '@/domain/types'
import type { CopyPrintMode } from '@/domain/types'
import { docCode, formatDate, formatDateTime, money, padNumber } from '@/lib/format'
import { calcTotals, paidAmount, warrantyUntil } from '@/services/orders'
import { barcodeSvg, patternSvg } from './barcode'
import { qrSvg } from './qrcode'

/** URL pública de acompanhamento (QR Code), ou vazio se desativado */
export function publicUrlFor(order: ServiceOrder, s: Settings): string {
  if (!s.statusPage.enabled || !order.tracking || !s.statusPage.baseUrl) return ''
  return `${s.statusPage.baseUrl.replace(/\/+$/, '')}/s/${order.publicToken}`
}

function trackingBlock(order: ServiceOrder, s: Settings): string {
  const url = publicUrlFor(order, s)
  if (!url) return ''
  return `
    <div class="hr"></div>
    <div class="qr">
      ${qrSvg(url, 24)}
      <div class="qr-text">
        <div class="b">Acompanhe seu conserto</div>
        <div class="xs">Aponte a câmera do celular para o QR Code e veja o status do seu aparelho em tempo real.</div>
      </div>
    </div>`
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const esc = (v: unknown): string => String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])
const multiline = (v: string): string => esc(v).replace(/\n/g, '<br>')
const when = (cond: unknown, html: string): string => (cond ? html : '')

function documentShell(title: string, css: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`
}

export function formatAddress(a: Address): string {
  return [
    [a.street, a.number].filter(Boolean).join(', '),
    a.complement,
    a.district,
    [a.city, a.state].filter(Boolean).join('/'),
    a.cep && `CEP ${a.cep}`,
  ]
    .filter(Boolean)
    .join(' — ')
}

const companyContacts = (c: CompanySettings): string =>
  [c.phone && `Tel: ${c.phone}`, c.whatsapp && `WhatsApp: ${c.whatsapp}`, c.email, c.website].filter(Boolean).join(' · ')

export const deviceTitle = (d: Device): string => [d.type, d.brand, d.model].filter(Boolean).join(' ')

export interface OrderDocData {
  order: ServiceOrder
  customer?: Customer
  technician?: User
}

export interface QuoteDocData {
  quote: Quote
  customer?: Customer
}

/* ------------------------------------------------------------------ */
/* Cupom térmico (Elgin i9 80mm / 58mm)                                */
/* ------------------------------------------------------------------ */

function thermalCss(p: PrinterProfile): string {
  return `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: ${p.paperWidthMm}mm; padding: ${p.marginMm}mm; font-family: ${p.fontFamily}; font-size: ${p.fontSizePt}pt; line-height: 1.28;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .c { text-align: center; } .r { text-align: right; } .b { font-weight: 700; }
  .xl { font-size: 1.55em; } .lg { font-size: 1.2em; } .sm { font-size: .88em; } .xs { font-size: .76em; }
  .logo { display: block; max-width: 70%; max-height: 20mm; margin: 0 auto 1.5mm; object-fit: contain; }
  .hr { border-top: 1px dashed #000; margin: 2mm 0; }
  .hr2 { border-top: 2px solid #000; margin: 2mm 0; }
  .sec { font-weight: 700; text-transform: uppercase; letter-spacing: .04em; margin: 2mm 0 .8mm; font-size: .92em; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: .25mm 0; }
  .tag { display: inline-block; border: 1px solid #000; padding: .3mm 1.5mm; border-radius: 1mm; font-weight: 700; }
  .via { text-align: center; font-weight: 700; letter-spacing: .1em; font-size: .8em; margin-top: 2mm; }
  .cut { text-align: center; font-size: .75em; margin: 6mm 0; border-top: 1px dashed #000; padding-top: 1mm; }
  .sign { margin-top: 12mm; border-top: 1px solid #000; text-align: center; padding-top: 1mm; font-size: .85em; }
  .terms { font-size: .74em; text-align: justify; }
  .pattern { display: flex; align-items: center; gap: 3mm; }
  .barcode { margin-top: 2mm; }
  .qr { display: flex; align-items: center; gap: 3mm; margin: 1mm 0; }
  .qr .qr-text { flex: 1; }
  .pagebreak { break-before: page; page-break-before: always; height: 0; }
  `
}

function thermalHeader(s: Settings, p: PrinterProfile): string {
  const c = s.company
  const address = formatAddress(c.address)
  const contacts = companyContacts(c)
  return `
    ${when(p.showLogo && c.logo, `<img class="logo" src="${c.logo}">`)}
    <div class="c b lg">${esc(c.tradeName || c.name)}</div>
    ${when(c.tradeName && c.name && c.tradeName !== c.name, `<div class="c sm">${esc(c.name)}</div>`)}
    ${when(c.cnpj, `<div class="c sm">CNPJ: ${esc(c.cnpj)}${c.ie ? ` · IE: ${esc(c.ie)}` : ''}</div>`)}
    ${when(address, `<div class="c xs">${esc(address)}</div>`)}
    ${when(contacts, `<div class="c xs">${esc(contacts)}</div>`)}
  `
}

const kv = (label: string, value: unknown): string =>
  value ? `<div><span class="b">${esc(label)}:</span> ${esc(value)}</div>` : ''

function thermalItems(items: LineItem[], discount: number): string {
  if (items.length === 0) return ''
  const t = calcTotals(items, discount)
  const rows = items
    .map(
      (i) => `
      <tr><td colspan="2">${esc(i.description)}</td></tr>
      <tr><td class="sm">&nbsp;&nbsp;${i.quantity} x ${money(i.unitPrice)}</td><td class="r">${money(i.quantity * i.unitPrice)}</td></tr>`,
    )
    .join('')
  return `
    <div class="sec">Peças e serviços</div>
    <table>${rows}</table>
    <div class="hr"></div>
    ${when(t.discount, `<div class="row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="row"><span>Desconto</span><span>- ${money(t.discount)}</span></div>`)}
    <div class="row b lg"><span>TOTAL</span><span>${money(t.total)}</span></div>`
}

function thermalChecklist(order: ServiceOrder): string {
  const ok = order.checklist.filter((c) => c.status === 'ok').map((c) => c.label)
  const bad = order.checklist.filter((c) => c.status === 'defeito').map((c) => c.label)
  if (!ok.length && !bad.length) return ''
  return `
    <div class="sec">Checklist de entrada</div>
    ${when(ok.length, `<div class="sm"><span class="b">${CHECKLIST_STATUS.ok.label}:</span> ${esc(ok.join(', '))}</div>`)}
    ${when(bad.length, `<div class="sm"><span class="b">${CHECKLIST_STATUS.defeito.label}:</span> ${esc(bad.join(', '))}</div>`)}`
}

function devicePassword(d: Device, sizeMm: number): string {
  if (d.passwordType === 'nenhuma' || !d.password) return ''
  if (d.passwordType === 'padrao') {
    return `<div class="pattern"><span class="b">Padrão:</span>${patternSvg(d.password, sizeMm)}<span class="xs">${esc(d.password)}</span></div>`
  }
  return kv(PASSWORD_TYPES[d.passwordType], d.password)
}

export interface ReceiptOptions {
  mode?: CopyPrintMode
  only?: 'client' | 'store'
}

export function receiptOrderHtml(data: OrderDocData, s: Settings, p: PrinterProfile, opts: ReceiptOptions = {}): string {
  const { order, customer, technician } = data
  const code = docCode(s.orders.prefix, order.number)
  const paid = paidAmount(order)
  const total = calcTotals(order.items, order.discount).total
  const d = order.device

  const via = (label: string, storeCopy: boolean) => `
    ${thermalHeader(s, p)}
    <div class="hr2"></div>
    <div class="c b">ORDEM DE SERVIÇO</div>
    <div class="c b xl">${esc(code)}</div>
    <div class="c sm">Entrada: ${formatDateTime(order.createdAt || new Date().toISOString())}</div>
    <div class="c" style="margin-top:1mm"><span class="tag">${esc(ORDER_STATUS[order.status].label.toUpperCase())}</span></div>
    <div class="hr"></div>

    <div class="sec">Cliente</div>
    <div class="b">${esc(customer?.name ?? '—')}</div>
    ${kv('Doc', customer?.document)}
    ${kv('Tel', customer?.phone || customer?.whatsapp)}

    <div class="sec">Aparelho</div>
    <div class="b">${esc(deviceTitle(d))}</div>
    ${kv('IMEI', d.imei)}${kv('Nº série', d.serial)}${kv('Cor', d.color)}
    ${kv('Acessórios', d.accessories)}
    ${kv('Estado', d.condition)}
    ${storeCopy && s.orders.showPasswordOnStoreCopy ? devicePassword(d, 14) : when(d.passwordType !== 'nenhuma', `<div class="sm">Senha informada ao técnico: ${esc(PASSWORD_TYPES[d.passwordType])}</div>`)}

    <div class="sec">Defeito relatado</div>
    <div>${multiline(order.reportedIssue)}</div>
    ${when(order.diagnosis, `<div class="sec">Diagnóstico</div><div>${multiline(order.diagnosis)}</div>`)}
    ${when(order.technicalReport, `<div class="sec">Laudo técnico</div><div>${multiline(order.technicalReport)}</div>`)}
    ${thermalChecklist(order)}
    ${thermalItems(order.items, order.discount)}
    ${when(paid, `<div class="row"><span>Pago</span><span>${money(paid)}</span></div><div class="row b"><span>A receber</span><span>${money(Math.max(0, total - paid))}</span></div>`)}

    <div class="hr"></div>
    ${kv('Previsão de entrega', order.dueDate && formatDate(order.dueDate))}
    ${kv('Garantia', order.warrantyDays ? `${order.warrantyDays} dias${order.deliveredAt ? ` (até ${formatDate(warrantyUntil(order))})` : ''}` : 'Sem garantia')}
    ${kv('Técnico', technician?.name)}
    ${when(order.customerNotes, `<div class="sec">Observações</div><div>${multiline(order.customerNotes)}</div>`)}
    ${when(storeCopy && order.internalNotes, `<div class="sec">Notas internas</div><div>${multiline(order.internalNotes)}</div>`)}

    ${when(!storeCopy && s.orders.terms, `<div class="sec">Termos</div><div class="terms">${multiline(s.orders.terms)}</div>`)}
    ${when(!storeCopy, trackingBlock(order, s))}
    <div class="sign">${storeCopy ? 'Assinatura do cliente' : 'Assinatura do responsável'}</div>
    ${barcodeSvg(padNumber(order.number), 10)}
    ${when(!storeCopy && s.company.footerMessage, `<div class="c sm" style="margin-top:2mm">${esc(s.company.footerMessage)}</div>`)}
    <div class="via">— ${label} —</div>
  `

  const client = via('VIA DO CLIENTE', false)
  const storeVia = via('VIA DA LOJA', true)
  const mode = opts.mode ?? s.orders.copyPrintMode

  let body: string
  if (opts.only === 'client') body = client
  else if (opts.only === 'store') body = storeVia
  else if (!s.orders.printTwoCopies) body = client
  else if (mode === 'separatePages' || mode === 'separateJobs')
    body = `${client}<div class="pagebreak"></div>${storeVia}`
  else body = `${client}<div class="cut">✂ corte aqui</div>${storeVia}`

  return documentShell(code, thermalCss(p), body)
}

export function receiptQuoteHtml(data: QuoteDocData, s: Settings, p: PrinterProfile): string {
  const { quote, customer } = data
  const code = docCode(s.orders.quotePrefix, quote.number)
  const body = `
    ${thermalHeader(s, p)}
    <div class="hr2"></div>
    <div class="c b">ORÇAMENTO</div>
    <div class="c b xl">${esc(code)}</div>
    <div class="c sm">Emitido em ${formatDate(quote.createdAt || new Date().toISOString())} · Válido até ${formatDate(quote.validUntil)}</div>
    <div class="hr"></div>
    <div class="sec">Cliente</div>
    <div class="b">${esc(customer?.name ?? '—')}</div>
    ${kv('Tel', customer?.phone || customer?.whatsapp)}
    ${when(quote.device.model || quote.device.brand, `<div class="sec">Aparelho</div><div class="b">${esc(deviceTitle(quote.device))}</div>`)}
    ${when(quote.description, `<div class="sec">Descrição</div><div>${multiline(quote.description)}</div>`)}
    ${thermalItems(quote.items, quote.discount)}
    ${when(s.orders.quoteTerms, `<div class="hr"></div><div class="terms">${multiline(s.orders.quoteTerms)}</div>`)}
    <div class="sign">De acordo — assinatura do cliente</div>
    ${when(s.company.footerMessage, `<div class="c sm" style="margin-top:2mm">${esc(s.company.footerMessage)}</div>`)}
  `
  return documentShell(code, thermalCss(p), body)
}

/* ------------------------------------------------------------------ */
/* Documento A4 (impressão e PDF)                                      */
/* ------------------------------------------------------------------ */

function a4Css(s: Settings, p: PrinterProfile): string {
  const accent = s.appearance.primary || '#4f46e5'
  return `
  @page { size: A4; margin: ${p.marginMm}mm; }
  @media screen { body { padding: ${p.marginMm}mm; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${p.fontFamily}; font-size: ${p.fontSizePt}pt; color: #1f2430; line-height: 1.4; --a: ${accent};
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: stretch; gap: 8mm; padding-bottom: 5mm; border-bottom: 2px solid var(--a); }
  .brand { display: flex; gap: 4mm; align-items: center; }
  .brand img { max-height: 22mm; max-width: 45mm; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 16pt; color: #0f172a; }
  .brand .muted { font-size: 8.5pt; }
  .docbox { min-width: 55mm; text-align: right; display: flex; flex-direction: column; justify-content: center; }
  .docbox .kind { font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: var(--a); font-weight: 700; }
  .docbox .num { font-size: 20pt; font-weight: 800; color: #0f172a; }
  .muted { color: #5b6475; }
  .pill { display: inline-block; padding: 1mm 3mm; border-radius: 10mm; font-size: 8pt; font-weight: 700; background: color-mix(in srgb, var(--a) 12%, white); color: var(--a); margin-top: 1.5mm; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 5mm; }
  .card { border: 1px solid #e3e6ec; border-radius: 2.5mm; padding: 3.5mm 4mm; break-inside: avoid; }
  .card h3 { margin: 0 0 2mm; font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: var(--a); }
  .card .big { font-weight: 700; font-size: 11pt; color: #0f172a; }
  .kv { display: grid; grid-template-columns: 26mm 1fr; gap: .6mm 3mm; font-size: 9pt; }
  .kv span:nth-child(odd) { color: #5b6475; }
  .full { margin-top: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .08em; color: #5b6475; border-bottom: 1.5px solid #cfd4dd; padding: 2mm 2mm; }
  td { padding: 2.2mm 2mm; border-bottom: 1px solid #eceff3; font-size: 9.5pt; }
  .num-col { text-align: right; white-space: nowrap; }
  .kind-tag { font-size: 7pt; color: #5b6475; text-transform: uppercase; letter-spacing: .06em; }
  .totals { margin-left: auto; width: 75mm; margin-top: 4mm; }
  .totals .row { display: flex; justify-content: space-between; padding: 1.2mm 0; font-size: 9.5pt; }
  .totals .grand { border-top: 2px solid var(--a); margin-top: 1mm; padding-top: 2mm; font-size: 13pt; font-weight: 800; color: #0f172a; }
  .checklist { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2mm 4mm; font-size: 8.5pt; }
  .chk { display: flex; justify-content: space-between; border-bottom: 1px dotted #d7dbe2; padding: .6mm 0; }
  .ok { color: #15803d; font-weight: 700; } .bad { color: #b91c1c; font-weight: 700; } .nt { color: #94a3b8; }
  .terms { font-size: 7.8pt; color: #4b5363; text-align: justify; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 16mm; break-inside: avoid; }
  .signs div { border-top: 1px solid #1f2430; text-align: center; padding-top: 1.5mm; font-size: 8.5pt; color: #4b5363; }
  .foot { margin-top: 8mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; font-size: 8pt; color: #5b6475; }
  .foot .barcode { width: 50mm !important; }
  `
}

function a4Header(s: Settings, p: PrinterProfile, kind: string, code: string, extra: string): string {
  const c = s.company
  return `
  <div class="head">
    <div class="brand">
      ${when(p.showLogo && c.logo, `<img src="${c.logo}">`)}
      <div>
        <h1>${esc(c.tradeName || c.name)}</h1>
        ${when(c.tradeName && c.name !== c.tradeName, `<div class="muted">${esc(c.name)}</div>`)}
        ${when(c.cnpj, `<div class="muted">CNPJ ${esc(c.cnpj)}${c.ie ? ` · IE ${esc(c.ie)}` : ''}</div>`)}
        <div class="muted">${esc(formatAddress(c.address))}</div>
        <div class="muted">${esc(companyContacts(c))}</div>
      </div>
    </div>
    <div class="docbox">
      <div class="kind">${esc(kind)}</div>
      <div class="num">${esc(code)}</div>
      ${extra}
    </div>
  </div>`
}

function a4CustomerCard(customer?: Customer): string {
  if (!customer) return `<div class="card"><h3>Cliente</h3><div class="muted">Não informado</div></div>`
  return `
  <div class="card"><h3>Cliente</h3>
    <div class="big">${esc(customer.name)}</div>
    <div class="kv" style="margin-top:1.5mm">
      ${when(customer.document, `<span>${customer.type === 'PJ' ? 'CNPJ' : 'CPF'}</span><span>${esc(customer.document)}</span>`)}
      ${when(customer.phone, `<span>Telefone</span><span>${esc(customer.phone)}</span>`)}
      ${when(customer.whatsapp, `<span>WhatsApp</span><span>${esc(customer.whatsapp)}</span>`)}
      ${when(customer.email, `<span>E-mail</span><span>${esc(customer.email)}</span>`)}
      ${when(formatAddress(customer.address), `<span>Endereço</span><span>${esc(formatAddress(customer.address))}</span>`)}
    </div>
  </div>`
}

function a4DeviceCard(d: Device, showPassword: boolean): string {
  return `
  <div class="card"><h3>Aparelho</h3>
    <div class="big">${esc(deviceTitle(d) || '—')}</div>
    <div class="kv" style="margin-top:1.5mm">
      ${when(d.imei, `<span>IMEI</span><span>${esc(d.imei)}</span>`)}
      ${when(d.serial, `<span>Nº de série</span><span>${esc(d.serial)}</span>`)}
      ${when(d.color, `<span>Cor</span><span>${esc(d.color)}</span>`)}
      ${when(d.accessories, `<span>Acessórios</span><span>${esc(d.accessories)}</span>`)}
      ${when(d.condition, `<span>Estado</span><span>${esc(d.condition)}</span>`)}
      ${when(d.passwordType !== 'nenhuma', `<span>Senha</span><span>${esc(PASSWORD_TYPES[d.passwordType])}${showPassword && d.password && d.passwordType !== 'padrao' ? `: ${esc(d.password)}` : ''}</span>`)}
    </div>
  </div>`
}

function a4Items(items: LineItem[], discount: number, paid?: number): string {
  if (items.length === 0) return ''
  const t = calcTotals(items, discount)
  const kindLabel = { part: 'Peça', service: 'Serviço', custom: 'Item' }
  return `
  <table>
    <thead><tr><th style="width:52%">Descrição</th><th class="num-col">Qtd</th><th class="num-col">Valor unit.</th><th class="num-col">Total</th></tr></thead>
    <tbody>
      ${items
        .map(
          (i) => `<tr><td>${esc(i.description)}<div class="kind-tag">${kindLabel[i.kind]}</div></td><td class="num-col">${i.quantity}</td><td class="num-col">${money(i.unitPrice)}</td><td class="num-col">${money(i.quantity * i.unitPrice)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <div class="totals">
    ${when(t.parts, `<div class="row"><span class="muted">Peças</span><span>${money(t.parts)}</span></div>`)}
    ${when(t.services, `<div class="row"><span class="muted">Serviços</span><span>${money(t.services)}</span></div>`)}
    ${when(t.discount, `<div class="row"><span class="muted">Desconto</span><span>- ${money(t.discount)}</span></div>`)}
    <div class="row grand"><span>Total</span><span>${money(t.total)}</span></div>
    ${when(paid, `<div class="row"><span class="muted">Pago</span><span>${money(paid)}</span></div><div class="row"><b>A receber</b><b>${money(Math.max(0, t.total - (paid ?? 0)))}</b></div>`)}
  </div>`
}

export function a4OrderHtml(data: OrderDocData, s: Settings, p: PrinterProfile): string {
  const { order, customer, technician } = data
  const code = docCode(s.orders.prefix, order.number)
  const status = ORDER_STATUS[order.status]
  const tested = order.checklist.filter((c) => c.status !== 'nao_testado')

  const body = `
  ${a4Header(s, p, 'Ordem de serviço', code, `<div class="muted">Entrada: ${formatDateTime(order.createdAt || new Date().toISOString())}</div><div><span class="pill">${esc(status.label)}</span></div>`)}
  <div class="grid">${a4CustomerCard(customer)}${a4DeviceCard(order.device, false)}</div>

  <div class="card full"><h3>Defeito relatado</h3><div>${multiline(order.reportedIssue)}</div></div>
  ${when(order.diagnosis || order.technicalReport, `<div class="grid">
    ${when(order.diagnosis, `<div class="card"><h3>Diagnóstico</h3><div>${multiline(order.diagnosis)}</div></div>`)}
    ${when(order.technicalReport, `<div class="card"><h3>Laudo técnico</h3><div>${multiline(order.technicalReport)}</div></div>`)}
  </div>`)}

  ${when(tested.length, `<div class="card full"><h3>Checklist de entrada</h3><div class="checklist">
    ${order.checklist
      .map((c) => `<div class="chk"><span>${esc(c.label)}</span><span class="${c.status === 'ok' ? 'ok' : c.status === 'defeito' ? 'bad' : 'nt'}">${CHECKLIST_STATUS[c.status].short}</span></div>`)
      .join('')}
  </div></div>`)}

  ${a4Items(order.items, order.discount, paidAmount(order))}

  <div class="grid">
    <div class="card"><h3>Prazos e garantia</h3><div class="kv">
      <span>Previsão</span><span>${formatDate(order.dueDate)}</span>
      <span>Garantia</span><span>${order.warrantyDays ? `${order.warrantyDays} dias` : 'Sem garantia'}</span>
      ${when(order.deliveredAt, `<span>Entregue em</span><span>${formatDateTime(order.deliveredAt)}</span><span>Garantia até</span><span>${formatDate(warrantyUntil(order))}</span>`)}
      ${when(technician, `<span>Técnico</span><span>${esc(technician?.name)}</span>`)}
    </div></div>
    ${when(order.customerNotes, `<div class="card"><h3>Observações</h3><div>${multiline(order.customerNotes)}</div></div>`)}
  </div>

  ${when(s.orders.terms, `<div class="card full"><h3>Termos e condições</h3><div class="terms">${multiline(s.orders.terms)}</div></div>`)}
  ${when(publicUrlFor(order, s), `<div class="card full" style="display:flex;gap:5mm;align-items:center">
    <div style="width:26mm;height:26mm;flex-shrink:0">${qrSvg(publicUrlFor(order, s), 26)}</div>
    <div><h3 style="margin-bottom:1mm">Acompanhe seu conserto</h3><div>Aponte a câmera do seu celular para o QR Code e acompanhe o status do seu aparelho em tempo real.</div></div>
  </div>`)}
  <div class="signs"><div>Assinatura do cliente</div><div>${esc(s.company.tradeName || s.company.name)}</div></div>
  <div class="foot"><span>${esc(s.company.footerMessage)}</span>${barcodeSvg(padNumber(order.number), 9)}</div>
  `
  return documentShell(code, a4Css(s, p), body)
}

export function a4QuoteHtml(data: QuoteDocData, s: Settings, p: PrinterProfile): string {
  const { quote, customer } = data
  const code = docCode(s.orders.quotePrefix, quote.number)
  const body = `
  ${a4Header(s, p, 'Orçamento', code, `<div class="muted">Emissão: ${formatDate(quote.createdAt || new Date().toISOString())}</div><div class="muted">Validade: <b>${formatDate(quote.validUntil)}</b></div><div><span class="pill">${esc(QUOTE_STATUS[quote.status].label)}</span></div>`)}
  <div class="grid">${a4CustomerCard(customer)}${a4DeviceCard(quote.device, false)}</div>
  ${when(quote.description, `<div class="card full"><h3>Descrição do serviço</h3><div>${multiline(quote.description)}</div></div>`)}
  ${a4Items(quote.items, quote.discount)}
  ${when(s.orders.quoteTerms, `<div class="card full"><h3>Condições</h3><div class="terms">${multiline(s.orders.quoteTerms)}</div></div>`)}
  <div class="signs"><div>De acordo — assinatura do cliente</div><div>${esc(s.company.tradeName || s.company.name)}</div></div>
  <div class="foot"><span>${esc(s.company.footerMessage)}</span></div>
  `
  return documentShell(code, a4Css(s, p), body)
}

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

function labelSheetCss(p: PrinterProfile, t: { widthMm: number; heightMm: number; paddingMm: number; border: boolean }, columns: number, gapMm: number, pagePerLabel: boolean, cutLine: boolean): string {
  const sheetPad = pagePerLabel ? 0 : p.marginMm
  return `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: ${p.fontFamily}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { display: grid; grid-template-columns: repeat(${columns}, ${t.widthMm}mm); gap: ${pagePerLabel ? 0 : gapMm}mm; padding: ${sheetPad}mm; ${pagePerLabel ? '' : `width: ${p.paperWidthMm}mm;`} }
  .label { width: ${t.widthMm}mm; height: ${t.heightMm}mm; padding: ${t.paddingMm}mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;
    ${t.border ? 'border: 0.3mm solid #000; border-radius: 1mm;' : ''} ${!pagePerLabel && cutLine ? 'border-bottom: 0.3mm dashed #000;' : ''} break-inside: avoid; }
  ${pagePerLabel ? '.label { page-break-after: always; break-after: page; }' : ''}
  .co { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .one { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .b { font-weight: 700; }
  .row { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5mm; }
  `
}

export interface LabelEntry {
  part: Part
  quantity: number
}

export function productLabelsHtml(entries: LabelEntry[], s: Settings, p: PrinterProfile, t: ProductLabelTemplate = s.productLabel): string {
  const labels: string[] = []
  for (const { part, quantity } of entries) {
    const barcodeValue = part.barcode || part.code
    const html = `
    <div class="label">
      <div>
        ${when(t.showCompany, `<div class="co">${esc(s.company.tradeName || s.company.name)}</div>`)}
        ${when(t.showName, `<div class="b clamp2" style="font-size:${t.nameFontPt}pt;line-height:1.15">${esc(part.name)}</div>`)}
        ${when(t.showBrand && part.brand, `<div class="one" style="font-size:${Math.max(6, t.nameFontPt - 2)}pt">${esc(part.brand)}${t.showCompat && part.compatibleModels ? ` · ${esc(part.compatibleModels)}` : ''}</div>`)}
        ${when(!t.showBrand && t.showCompat && part.compatibleModels, `<div class="one" style="font-size:${Math.max(6, t.nameFontPt - 2)}pt">${esc(part.compatibleModels)}</div>`)}
      </div>
      <div class="row">
        ${when(t.showCode, `<span style="font-size:${Math.max(6, t.nameFontPt - 2)}pt">Cód. ${esc(part.code)}</span>`)}
        ${when(t.showPrice, `<span class="b" style="font-size:${t.priceFontPt}pt;white-space:nowrap">${money(part.salePrice)}</span>`)}
      </div>
      ${when(t.showBarcode, barcodeSvg(barcodeValue, t.barcodeHeightMm))}
    </div>`
    for (let i = 0; i < Math.max(1, quantity); i++) labels.push(html)
  }
  return documentShell('Etiquetas', labelSheetCss(p, t, t.columns, t.gapMm, t.pagePerLabel, t.cutLine), `<div class="sheet">${labels.join('')}</div>`)
}

export function orderLabelHtml(data: OrderDocData, s: Settings, p: PrinterProfile, t: OrderLabelTemplate = s.orderLabel): string {
  const { order, customer } = data
  const code = docCode(s.orders.prefix, order.number)
  const d = order.device
  const issue = order.reportedIssue.length > 70 ? `${order.reportedIssue.slice(0, 70)}…` : order.reportedIssue
  const pagePerLabel = p.kind === 'etiqueta'
  const label = `
  <div class="label" style="font-size:${t.textFontPt}pt;line-height:1.2">
    <div>
      ${when(t.showCompany, `<div class="co">${esc(s.company.tradeName || s.company.name)}</div>`)}
      <div class="row"><span class="b" style="font-size:${t.titleFontPt}pt">${esc(code)}</span>${when(t.showDate, `<span>${formatDate(order.createdAt || new Date().toISOString())}</span>`)}</div>
      ${when(t.showCustomer, `<div class="b one">${esc(customer?.name ?? '')}</div>`)}
      ${when(t.showPhone && customer, `<div class="one">${esc(customer?.phone || customer?.whatsapp || '')}</div>`)}
      ${when(t.showDevice, `<div class="one">${esc(deviceTitle(d))}</div>`)}
      ${when(t.showIssue && issue, `<div class="clamp2">${esc(issue)}</div>`)}
      ${when(t.showPassword && d.passwordType !== 'nenhuma' && d.password, `<div class="one"><b>Senha:</b> ${esc(d.password)}</div>`)}
    </div>
    ${when(t.showBarcode, barcodeSvg(padNumber(order.number), t.barcodeHeightMm, false))}
  </div>`
  const labels = Array.from({ length: Math.max(1, t.copies) }, () => label).join('')
  return documentShell(`Etiqueta ${code}`, labelSheetCss(p, t, 1, 2, pagePerLabel, !pagePerLabel), `<div class="sheet">${labels}</div>`)
}

/* ------------------------------------------------------------------ */
/* Página de teste                                                     */
/* ------------------------------------------------------------------ */

export function testPageHtml(s: Settings, p: PrinterProfile): string {
  const isThermal = p.kind !== 'a4'
  const css = isThermal ? thermalCss(p) : a4Css(s, p)
  const body = isThermal
    ? `${thermalHeader(s, p)}<div class="hr2"></div>
       <div class="c b lg">TESTE DE IMPRESSÃO</div>
       <div class="c sm">${esc(p.name)}</div>
       <div class="hr"></div>
       ${kv('Impressora', p.printerName || 'Padrão do sistema')}
       ${kv('Largura do papel', `${p.paperWidthMm} mm`)}
       ${kv('Margem', `${p.marginMm} mm`)}
       ${kv('Fonte', `${p.fontSizePt} pt`)}
       <div class="hr"></div>
       <div style="border:1px solid #000;padding:1mm" class="c">A borda deste quadro deve aparecer inteira</div>
       <div class="row" style="margin-top:2mm"><span>Esquerda</span><span>Direita</span></div>
       ${barcodeSvg('123456789012', 10)}
       <div class="c sm" style="margin-top:2mm">${formatDateTime(new Date().toISOString())}</div>`
    : `${a4Header(s, p, 'Teste de impressão', p.name, `<div class="muted">${formatDateTime(new Date().toISOString())}</div>`)}
       <div class="card full"><h3>Configuração</h3><div class="kv"><span>Impressora</span><span>${esc(p.printerName || 'Padrão do sistema')}</span><span>Margem</span><span>${p.marginMm} mm</span><span>Fonte</span><span>${p.fontSizePt} pt</span></div></div>`
  return documentShell('Teste de impressão', css, body)
}
