export type ID = string

export interface BaseEntity {
  id: ID
  createdAt: string
  updatedAt: string
}

export interface Address {
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export type PersonType = 'PF' | 'PJ'

export interface Customer extends BaseEntity {
  type: PersonType
  name: string
  /** CPF ou CNPJ */
  document: string
  rg: string
  birthDate: string
  phone: string
  whatsapp: string
  email: string
  address: Address
  notes: string
}

/* ------------------------------------------------------------------ */
/* Catálogo: peças/produtos e serviços                                 */
/* ------------------------------------------------------------------ */

export interface Part extends BaseEntity {
  code: string
  barcode: string
  name: string
  category: string
  brand: string
  compatibleModels: string
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  location: string
  supplier: string
  warrantyDays: number
  active: boolean
}

export interface CatalogService extends BaseEntity {
  name: string
  description: string
  price: number
  estimatedMinutes: number
  warrantyDays: number
  active: boolean
}

/* ------------------------------------------------------------------ */
/* Itens de OS / orçamento                                             */
/* ------------------------------------------------------------------ */

export type LineItemKind = 'part' | 'service' | 'custom'

export interface LineItem {
  id: ID
  kind: LineItemKind
  refId?: ID
  description: string
  quantity: number
  unitPrice: number
  unitCost: number
}

/* ------------------------------------------------------------------ */
/* Ordem de serviço                                                    */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | 'aberta'
  | 'em_analise'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'aguardando_peca'
  | 'em_reparo'
  | 'pronta'
  | 'entregue'
  | 'cancelada'

export type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
export type PasswordType = 'nenhuma' | 'pin' | 'padrao' | 'senha'

export interface Device {
  type: string
  brand: string
  model: string
  imei: string
  serial: string
  color: string
  passwordType: PasswordType
  password: string
  accessories: string
  condition: string
}

export type ChecklistStatus = 'ok' | 'defeito' | 'nao_testado'

export interface ChecklistEntry {
  label: string
  status: ChecklistStatus
}

export interface Payment {
  id: ID
  date: string
  method: string
  amount: number
  note: string
}

export interface StatusEvent {
  id: ID
  status: OrderStatus
  date: string
  userName: string
  note: string
}

export interface ServiceOrder extends BaseEntity {
  number: number
  customerId: ID
  device: Device
  reportedIssue: string
  diagnosis: string
  technicalReport: string
  checklist: ChecklistEntry[]
  items: LineItem[]
  discount: number
  status: OrderStatus
  priority: Priority
  technicianId: ID
  dueDate: string
  warrantyDays: number
  payments: Payment[]
  history: StatusEvent[]
  internalNotes: string
  customerNotes: string
  stockApplied: boolean
  deliveredAt: string
  quoteId: ID
  /** Token público para a página de acompanhamento (QR Code). Não revela dados sensíveis. */
  publicToken: string
  /** Se o cliente pode acompanhar esta OS pela página pública */
  tracking: boolean
  /** Última sincronização bem-sucedida do status com o servidor público */
  lastPublishedAt: string
}

/* ------------------------------------------------------------------ */
/* Orçamento                                                           */
/* ------------------------------------------------------------------ */

export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'convertido'

export interface Quote extends BaseEntity {
  number: number
  customerId: ID
  device: Device
  description: string
  items: LineItem[]
  discount: number
  validUntil: string
  status: QuoteStatus
  notes: string
  orderId: ID
}

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

export type UserRole = 'admin' | 'tecnico' | 'atendente'

export interface User extends BaseEntity {
  name: string
  username: string
  role: UserRole
  passwordHash: string
  salt: string
  active: boolean
  mustChangePassword: boolean
}

/* ------------------------------------------------------------------ */
/* Configurações                                                       */
/* ------------------------------------------------------------------ */

export type PrinterKind = 'termica' | 'a4' | 'etiqueta'

export interface PrinterProfile {
  id: ID
  name: string
  kind: PrinterKind
  /** Nome da impressora no Windows (ex.: "ELGIN i9"). Vazio = perguntar ao imprimir. */
  printerName: string
  paperWidthMm: number
  /** 0 = bobina contínua */
  paperHeightMm: number
  marginMm: number
  fontSizePt: number
  fontFamily: string
  showLogo: boolean
  copies: number
  /** Imprime direto, sem abrir a janela do Windows */
  silent: boolean
}

export type PrintPurpose = 'receipt' | 'a4' | 'productLabel' | 'orderLabel'

export interface ProductLabelTemplate {
  widthMm: number
  heightMm: number
  columns: number
  gapMm: number
  paddingMm: number
  showCompany: boolean
  showName: boolean
  showBrand: boolean
  showCompat: boolean
  showCode: boolean
  showPrice: boolean
  showBarcode: boolean
  nameFontPt: number
  priceFontPt: number
  barcodeHeightMm: number
  border: boolean
  cutLine: boolean
  /** Cada etiqueta em uma página (etiquetadoras com rolo de etiquetas) */
  pagePerLabel: boolean
}

export interface OrderLabelTemplate {
  widthMm: number
  heightMm: number
  paddingMm: number
  showCompany: boolean
  showCustomer: boolean
  showPhone: boolean
  showDevice: boolean
  showIssue: boolean
  showDate: boolean
  showPassword: boolean
  showBarcode: boolean
  titleFontPt: number
  textFontPt: number
  barcodeHeightMm: number
  border: boolean
  copies: number
}

export interface CompanySettings {
  name: string
  tradeName: string
  cnpj: string
  ie: string
  im: string
  phone: string
  whatsapp: string
  email: string
  website: string
  address: Address
  /** data URL (base64) */
  logo: string
  footerMessage: string
}

export type ThemeMode = 'dark' | 'light' | 'system'
export type Density = 'confortavel' | 'compacto'

export interface AppearanceSettings {
  theme: ThemeMode
  primary: string
  density: Density
  radius: number
}

export interface OrderSettings {
  prefix: string
  startNumber: number
  quotePrefix: string
  defaultWarrantyDays: number
  defaultDueDays: number
  quoteValidityDays: number
  printTwoCopies: boolean
  /** Como imprimir as 2 vias do cupom: juntas (corte manual), em páginas separadas (corte da guilhotina entre elas) ou em trabalhos de impressão separados */
  copyPrintMode: CopyPrintMode
  showPasswordOnStoreCopy: boolean
  terms: string
  quoteTerms: string
  checklistItems: string[]
  paymentMethods: string[]
  deviceTypes: string[]
  partCategories: string[]
}

export type CopyPrintMode = 'together' | 'separatePages' | 'separateJobs'

/* ------------------------------------------------------------------ */
/* Limpeza Android (ADB)                                               */
/* ------------------------------------------------------------------ */

export interface AdwareRule {
  /** Trecho do nome do pacote a procurar (ex.: "com.adware.") */
  pattern: string
  label: string
}

export interface CleanupSettings {
  /** Caminho do executável adb. Vazio = usa "adb" do PATH do sistema. */
  adbPath: string
  /** Sinaliza apps sem ícone na tela (ocultos) */
  flagHidden: boolean
  /** Sinaliza apps instalados fora da Play Store (origem desconhecida) */
  flagUnknownSource: boolean
  /** Sinaliza apps que podem desenhar sobre outros apps (sobreposição/anúncios) */
  flagOverlay: boolean
  /** Instaladores confiáveis (não sinalizados como origem desconhecida) */
  trustedInstallers: string[]
  /** Lista de pacotes reconhecidos como adware (editável) */
  blocklist: AdwareRule[]
  /** Quantos apps no máximo analisar a fundo por scan */
  maxDeepScan: number
}

/* ------------------------------------------------------------------ */
/* Acompanhamento do cliente (QR Code + página pública)                */
/* ------------------------------------------------------------------ */

export interface PublicStatusMessage {
  status: OrderStatus
  /** Texto curto mostrado ao cliente (ex.: "Em manutenção") */
  publicLabel: string
  /** Mensagem explicativa (ex.: "Aguarde, seu aparelho ainda está em manutenção.") */
  message: string
  color: string
  /** Se o cliente deve enxergar este status (senão mostra um status genérico) */
  visible: boolean
}

export interface StatusPageSettings {
  enabled: boolean
  /** URL base do servidor de status (ex.: https://status.minhaloja.com.br) */
  baseUrl: string
  /** Chave de API para o app publicar os status com segurança */
  apiKey: string
  headline: string
  subheadline: string
  themeColor: string
  showDevice: boolean
  showEta: boolean
  showShopContact: boolean
  /** Textos e cores por status */
  messages: PublicStatusMessage[]
}

export interface Settings {
  company: CompanySettings
  appearance: AppearanceSettings
  printers: PrinterProfile[]
  assignments: Record<PrintPurpose, ID>
  productLabel: ProductLabelTemplate
  orderLabel: OrderLabelTemplate
  orders: OrderSettings
  cleanup: CleanupSettings
  statusPage: StatusPageSettings
}

/* ------------------------------------------------------------------ */
/* Tipos da limpeza Android (compartilhados entre Electron e UI)       */
/* ------------------------------------------------------------------ */

export interface AdbDevice {
  serial: string
  state: string
  model: string
  description: string
}

export interface AndroidDeviceInfo {
  serial: string
  model: string
  brand: string
  name: string
  android: string
  sdk: string
}

export type ThreatSeverity = 'alta' | 'media' | 'baixa'

export interface ScannedApp {
  packageName: string
  label: string
  installer: string
  system: boolean
  hidden: boolean
  unknownSource: boolean
  overlay: boolean
  accessibility: boolean
  deviceAdmin: boolean
  knownAdware: boolean
  adwareLabel: string
  reasons: string[]
  severity: ThreatSeverity
  flagged: boolean
}

export interface ScanResult {
  info: AndroidDeviceInfo
  apps: ScannedApp[]
  total: number
  flaggedCount: number
  scannedAt: string
  simulated: boolean
}

/* ------------------------------------------------------------------ */
/* Coleções persistidas                                                */
/* ------------------------------------------------------------------ */

export interface Collections {
  customers: Customer[]
  parts: Part[]
  services: CatalogService[]
  orders: ServiceOrder[]
  quotes: Quote[]
  users: User[]
}

export type CollectionName = keyof Collections
export type EntityOf<K extends CollectionName> = Collections[K][number]
