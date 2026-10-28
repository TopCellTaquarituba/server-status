import type {
  Address,
  CleanupSettings,
  CopyPrintMode,
  OrderStatus,
  Priority,
  PrinterProfile,
  PublicStatusMessage,
  QuoteStatus,
  Settings,
  StatusPageSettings,
  ThreatSeverity,
  UserRole,
  PasswordType,
  ChecklistStatus,
  PrintPurpose,
  PrinterKind,
} from './types'

export type Tone = 'blue' | 'violet' | 'amber' | 'teal' | 'orange' | 'indigo' | 'green' | 'gray' | 'red' | 'pink'

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  aberta: { label: 'Aberta', tone: 'blue' },
  em_analise: { label: 'Em análise', tone: 'violet' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', tone: 'amber' },
  aprovada: { label: 'Aprovada', tone: 'teal' },
  aguardando_peca: { label: 'Aguardando peça', tone: 'orange' },
  em_reparo: { label: 'Em reparo', tone: 'indigo' },
  pronta: { label: 'Pronta p/ retirada', tone: 'green' },
  entregue: { label: 'Entregue', tone: 'gray' },
  cancelada: { label: 'Cancelada', tone: 'red' },
}

export const ORDER_STATUS_FLOW = Object.keys(ORDER_STATUS) as OrderStatus[]

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  rascunho: { label: 'Rascunho', tone: 'gray' },
  enviado: { label: 'Enviado', tone: 'blue' },
  aprovado: { label: 'Aprovado', tone: 'green' },
  recusado: { label: 'Recusado', tone: 'red' },
  convertido: { label: 'Convertido em OS', tone: 'violet' },
}

export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  baixa: { label: 'Baixa', tone: 'gray' },
  normal: { label: 'Normal', tone: 'blue' },
  alta: { label: 'Alta', tone: 'orange' },
  urgente: { label: 'Urgente', tone: 'red' },
}

export const ROLES: Record<UserRole, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  atendente: 'Atendente',
}

export const PASSWORD_TYPES: Record<PasswordType, string> = {
  nenhuma: 'Sem senha',
  pin: 'PIN numérico',
  padrao: 'Padrão (desenho)',
  senha: 'Senha alfanumérica',
}

export const CHECKLIST_STATUS: Record<ChecklistStatus, { label: string; short: string; tone: Tone }> = {
  ok: { label: 'Funcionando', short: 'OK', tone: 'green' },
  defeito: { label: 'Com defeito', short: 'Defeito', tone: 'red' },
  nao_testado: { label: 'Não testado', short: 'N/T', tone: 'gray' },
}

export const PRINT_PURPOSES: Record<PrintPurpose, { label: string; description: string }> = {
  receipt: { label: 'Cupom de OS / orçamento', description: 'Via do cliente impressa na térmica' },
  a4: { label: 'Documento A4', description: 'OS e orçamento completos em folha A4' },
  productLabel: { label: 'Etiqueta de produto', description: 'Etiquetas com preço e código de barras' },
  orderLabel: { label: 'Etiqueta do aparelho', description: 'Identificação colada no aparelho em reparo' },
}

export const PRINTER_KINDS: Record<PrinterKind, string> = {
  termica: 'Térmica (cupom)',
  a4: 'Folha A4 / Carta',
  etiqueta: 'Etiquetadora',
}

export const emptyAddress = (): Address => ({
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
})

export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

/* ------------------------------------------------------------------ */
/* Perfis de impressora prontos                                        */
/* ------------------------------------------------------------------ */

export const PRINTER_PRESETS: Record<string, Omit<PrinterProfile, 'id'>> = {
  elgin80: {
    name: 'Elgin i9 — Cupom 80mm',
    kind: 'termica',
    printerName: 'ELGIN i9',
    paperWidthMm: 80,
    paperHeightMm: 0,
    marginMm: 4,
    fontSizePt: 9,
    fontFamily: 'Arial, Helvetica, sans-serif',
    showLogo: true,
    copies: 1,
    silent: false,
  },
  thermal58: {
    name: 'Térmica 58mm',
    kind: 'termica',
    printerName: '',
    paperWidthMm: 58,
    paperHeightMm: 0,
    marginMm: 2,
    fontSizePt: 8,
    fontFamily: 'Arial, Helvetica, sans-serif',
    showLogo: true,
    copies: 1,
    silent: false,
  },
  a4: {
    name: 'Impressora A4',
    kind: 'a4',
    printerName: '',
    paperWidthMm: 210,
    paperHeightMm: 297,
    marginMm: 12,
    fontSizePt: 10,
    fontFamily: 'Arial, Helvetica, sans-serif',
    showLogo: true,
    copies: 1,
    silent: false,
  },
  label40x25: {
    name: 'Etiquetadora 40×25mm',
    kind: 'etiqueta',
    printerName: '',
    paperWidthMm: 40,
    paperHeightMm: 25,
    marginMm: 0,
    fontSizePt: 7,
    fontFamily: 'Arial, Helvetica, sans-serif',
    showLogo: false,
    copies: 1,
    silent: false,
  },
  label50x30: {
    name: 'Etiquetadora 50×30mm',
    kind: 'etiqueta',
    printerName: '',
    paperWidthMm: 50,
    paperHeightMm: 30,
    marginMm: 0,
    fontSizePt: 8,
    fontFamily: 'Arial, Helvetica, sans-serif',
    showLogo: false,
    copies: 1,
    silent: false,
  },
}

export const DEFAULT_CHECKLIST = [
  'Liga / inicializa',
  'Tela / display',
  'Touch screen',
  'Câmera traseira',
  'Câmera frontal',
  'Alto-falante',
  'Microfone',
  'Auricular',
  'Conector de carga',
  'Bateria',
  'Wi-Fi',
  'Bluetooth',
  'Sinal / chip',
  'Biometria / Face ID',
  'Botões físicos',
  'Vibracall',
  'Sensor de proximidade',
  'Carcaça / tampa',
]

export const DEFAULT_TERMS = `1. A garantia cobre exclusivamente o serviço executado e as peças substituídas, pelo prazo indicado nesta ordem, contado a partir da entrega.
2. A garantia não cobre danos causados por quedas, umidade/oxidação, mau uso, rompimento de lacres ou intervenção de terceiros.
3. A empresa não se responsabiliza por dados, fotos e arquivos armazenados no aparelho. Recomenda-se backup prévio.
4. Aparelhos não retirados em até 90 dias após a comunicação de conclusão estarão sujeitos a cobrança de armazenagem.
5. A retirada do aparelho somente será feita mediante apresentação desta ordem de serviço ou documento do titular.`

export const DEFAULT_QUOTE_TERMS = `Orçamento sujeito a alteração caso sejam identificados defeitos adicionais durante o reparo. Valores válidos até a data indicada.`

/* ------------------------------------------------------------------ */
/* Impressão em partes                                                 */
/* ------------------------------------------------------------------ */

export const COPY_PRINT_MODES: Record<CopyPrintMode, { label: string; description: string }> = {
  together: { label: 'Juntas (uma tira)', description: 'As 2 vias saem seguidas, com linha de corte no meio' },
  separatePages: { label: 'Páginas separadas', description: 'Cada via em uma página — a guilhotina corta entre elas' },
  separateJobs: { label: 'Impressões separadas', description: 'Envia cada via como uma impressão independente' },
}

/* ------------------------------------------------------------------ */
/* Limpeza Android                                                     */
/* ------------------------------------------------------------------ */

export const THREAT_SEVERITY: Record<ThreatSeverity, { label: string; tone: Tone }> = {
  alta: { label: 'Alto risco', tone: 'red' },
  media: { label: 'Suspeito', tone: 'amber' },
  baixa: { label: 'Atenção', tone: 'blue' },
}

export const TRUSTED_INSTALLERS = [
  'com.android.vending',
  'com.google.android.packageinstaller',
  'com.google.android.apps.nbu...',
  'com.sec.android.app.samsungapps',
  'com.xiaomi.market',
  'com.heytap.market',
  'com.amazon.venezia',
]

/**
 * Lista inicial de exemplos de padrões de adware conhecido. É apenas um ponto de partida,
 * totalmente editável nas configurações. A remoção nunca é automática: o técnico confirma.
 */
export const DEFAULT_ADWARE_RULES = [
  { pattern: 'com.adware.', label: 'Família de adware conhecida' },
  { pattern: '.hiddenad', label: 'Padrão de app oculto com anúncios' },
  { pattern: 'com.ads.', label: 'Pacote de anúncios' },
  { pattern: 'com.mobi.', label: 'Família frequentemente associada a adware' },
]

export const DEFAULT_CLEANUP: CleanupSettings = {
  adbPath: '',
  flagHidden: true,
  flagUnknownSource: true,
  flagOverlay: true,
  trustedInstallers: TRUSTED_INSTALLERS,
  blocklist: DEFAULT_ADWARE_RULES,
  maxDeepScan: 80,
}

/* ------------------------------------------------------------------ */
/* Acompanhamento do cliente                                           */
/* ------------------------------------------------------------------ */

const PUBLIC_STATUS_DEFAULTS: Record<OrderStatus, { label: string; message: string; visible: boolean }> = {
  aberta: { label: 'Recebido', message: 'Recebemos seu aparelho e ele entrou na fila de atendimento.', visible: true },
  em_analise: { label: 'Em análise', message: 'Nossos técnicos estão analisando seu aparelho para identificar o problema.', visible: true },
  aguardando_aprovacao: { label: 'Aguardando sua aprovação', message: 'O orçamento está pronto! Aguardamos seu retorno para iniciar o reparo.', visible: true },
  aprovada: { label: 'Aprovado', message: 'Tudo certo! Seu reparo foi aprovado e entrará em execução.', visible: true },
  aguardando_peca: { label: 'Aguardando peça', message: 'Estamos aguardando a chegada da peça necessária para o seu reparo.', visible: true },
  em_reparo: { label: 'Em manutenção', message: 'Aguarde — seu aparelho ainda está em manutenção. Estamos cuidando dele com atenção.', visible: true },
  pronta: { label: 'Pronto para retirada', message: 'Boas notícias! Seu aparelho está pronto. Pode passar aqui para retirar. 🎉', visible: true },
  entregue: { label: 'Entregue', message: 'Aparelho entregue. Obrigado pela confiança!', visible: true },
  cancelada: { label: 'Cancelado', message: 'Este atendimento foi cancelado. Em caso de dúvida, entre em contato conosco.', visible: true },
}

export const defaultStatusMessages = (): PublicStatusMessage[] =>
  ORDER_STATUS_FLOW.map((status) => ({
    status,
    publicLabel: PUBLIC_STATUS_DEFAULTS[status].label,
    message: PUBLIC_STATUS_DEFAULTS[status].message,
    color: {
      aberta: '#3b82f6',
      em_analise: '#8b5cf6',
      aguardando_aprovacao: '#f59e0b',
      aprovada: '#14b8a6',
      aguardando_peca: '#f97316',
      em_reparo: '#6366f1',
      pronta: '#22c55e',
      entregue: '#64748b',
      cancelada: '#ef4444',
    }[status],
    visible: PUBLIC_STATUS_DEFAULTS[status].visible,
  }))

export const DEFAULT_STATUS_PAGE: StatusPageSettings = {
  enabled: false,
  baseUrl: '',
  apiKey: '',
  headline: 'Acompanhe seu conserto',
  subheadline: 'Veja em tempo real o andamento do seu aparelho.',
  themeColor: '#6366f1',
  showDevice: true,
  showEta: true,
  showShopContact: true,
  messages: defaultStatusMessages(),
}

export const DEFAULT_SETTINGS: Settings = {
  company: {
    name: 'Minha Assistência Técnica LTDA',
    tradeName: 'Minha Assistência',
    cnpj: '',
    ie: '',
    im: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: emptyAddress(),
    logo: '',
    footerMessage: 'Obrigado pela preferência!',
  },
  appearance: {
    theme: 'dark',
    primary: '#6366f1',
    density: 'confortavel',
    radius: 12,
  },
  printers: [
    { id: 'elgin-i9', ...PRINTER_PRESETS.elgin80 },
    { id: 'a4', ...PRINTER_PRESETS.a4 },
  ],
  assignments: {
    receipt: 'elgin-i9',
    a4: 'a4',
    productLabel: 'elgin-i9',
    orderLabel: 'elgin-i9',
  },
  productLabel: {
    widthMm: 72,
    heightMm: 32,
    columns: 1,
    gapMm: 2,
    paddingMm: 1.5,
    showCompany: true,
    showName: true,
    showBrand: true,
    showCompat: true,
    showCode: true,
    showPrice: true,
    showBarcode: true,
    nameFontPt: 9,
    priceFontPt: 15,
    barcodeHeightMm: 9,
    border: false,
    cutLine: true,
    pagePerLabel: false,
  },
  orderLabel: {
    widthMm: 72,
    heightMm: 42,
    paddingMm: 1.5,
    showCompany: true,
    showCustomer: true,
    showPhone: true,
    showDevice: true,
    showIssue: true,
    showDate: true,
    showPassword: false,
    showBarcode: true,
    titleFontPt: 16,
    textFontPt: 8,
    barcodeHeightMm: 8,
    border: false,
    copies: 1,
  },
  orders: {
    prefix: 'OS',
    startNumber: 1,
    quotePrefix: 'ORC',
    defaultWarrantyDays: 90,
    defaultDueDays: 3,
    quoteValidityDays: 7,
    printTwoCopies: true,
    copyPrintMode: 'together',
    showPasswordOnStoreCopy: true,
    terms: DEFAULT_TERMS,
    quoteTerms: DEFAULT_QUOTE_TERMS,
    checklistItems: DEFAULT_CHECKLIST,
    paymentMethods: ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito', 'Transferência'],
    deviceTypes: ['Celular', 'Tablet', 'Smartwatch', 'Notebook', 'Fone de ouvido', 'Outro'],
    partCategories: ['Telas', 'Baterias', 'Conectores', 'Câmeras', 'Tampas', 'Flex', 'Acessórios', 'Películas'],
  },
  cleanup: DEFAULT_CLEANUP,
  statusPage: DEFAULT_STATUS_PAGE,
}

/* ------------------------------------------------------------------ */
/* Merge profundo: garante que configurações antigas recebam campos novos */
/* ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(patch)) {
    out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], patch[key]) : patch[key]
  }
  return out as T
}

export const mergeSettings = (stored: unknown): Settings => deepMerge(DEFAULT_SETTINGS, stored)
