import { store } from '@/data/store'
import { emptyAddress } from '@/domain/defaults'
import type { CatalogService, Customer, Part } from '@/domain/types'
import { documentError, isValidEmail } from '@/lib/validation'
import { uid } from '@/lib/utils'

/* ----------------------------- Clientes ----------------------------- */

export function newCustomer(): Customer {
  return {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    type: 'PF',
    name: '',
    document: '',
    rg: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: emptyAddress(),
    notes: '',
  }
}

export function validateCustomer(c: Customer): string | null {
  if (!c.name.trim()) return 'Informe o nome do cliente'
  if (!c.phone.trim() && !c.whatsapp.trim()) return 'Informe ao menos um telefone de contato'
  const docErr = documentError(c.document)
  if (docErr) return docErr
  if (!isValidEmail(c.email)) return 'E-mail inválido'
  const dup = c.document && store.list('customers').find((x) => x.id !== c.id && x.document === c.document)
  if (dup) return `Já existe um cliente com este documento (${dup.name})`
  return null
}

export async function saveCustomer(c: Customer): Promise<Customer> {
  const err = validateCustomer(c)
  if (err) throw new Error(err)
  return store.upsert('customers', { ...c, name: c.name.trim() })
}

export async function deleteCustomer(c: Customer): Promise<void> {
  const used = store.list('orders').some((o) => o.customerId === c.id) || store.list('quotes').some((q) => q.customerId === c.id)
  if (used) throw new Error('Este cliente possui ordens ou orçamentos e não pode ser excluído')
  await store.remove('customers', c.id)
}

/* ------------------------------ Peças ------------------------------- */

export function nextPartCode(): string {
  const max = store
    .list('parts')
    .map((p) => Number(p.code.replace(/\D/g, '')) || 0)
    .reduce((a, b) => Math.max(a, b), 0)
  return `P${String(max + 1).padStart(5, '0')}`
}

export function newPart(): Part {
  return {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    code: nextPartCode(),
    barcode: '',
    name: '',
    category: '',
    brand: '',
    compatibleModels: '',
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 1,
    location: '',
    supplier: '',
    warrantyDays: 90,
    active: true,
  }
}

export async function savePart(p: Part): Promise<Part> {
  if (!p.name.trim()) throw new Error('Informe o nome da peça/produto')
  if (!p.code.trim()) throw new Error('Informe o código interno')
  const dup = store.list('parts').find((x) => x.id !== p.id && x.code.toLowerCase() === p.code.trim().toLowerCase())
  if (dup) throw new Error(`O código ${p.code} já está em uso por "${dup.name}"`)
  if (p.salePrice < 0 || p.costPrice < 0) throw new Error('Valores não podem ser negativos')
  return store.upsert('parts', { ...p, name: p.name.trim(), code: p.code.trim() })
}

export const isLowStock = (p: Part): boolean => p.active && p.stock <= p.minStock

/* ----------------------------- Serviços ----------------------------- */

export function newCatalogService(): CatalogService {
  return {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    name: '',
    description: '',
    price: 0,
    estimatedMinutes: 60,
    warrantyDays: store.getSettings().orders.defaultWarrantyDays,
    active: true,
  }
}

export async function saveCatalogService(s: CatalogService): Promise<CatalogService> {
  if (!s.name.trim()) throw new Error('Informe o nome do serviço')
  return store.upsert('services', { ...s, name: s.name.trim() })
}
