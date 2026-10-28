import { store } from '@/data/store'
import type { CatalogService, Customer, LineItem, OrderStatus, Part, Quote, ServiceOrder } from '@/domain/types'
import { addDays } from '@/lib/format'
import { uid } from '@/lib/utils'
import { newCustomer, newPart, newCatalogService } from './catalog'
import { emptyDevice, newOrder } from './orders'

/** Dados de demonstração para apresentar o sistema */
export async function loadDemoData(userName: string): Promise<void> {
  const customers: Customer[] = [
    { ...newCustomer(), name: 'Mariana Alves Costa', document: '529.982.247-25', phone: '(14) 99812-3344', whatsapp: '(14) 99812-3344', email: 'mariana@email.com', address: { cep: '18740-000', street: 'Rua XV de Novembro', number: '210', complement: '', district: 'Centro', city: 'Taquarituba', state: 'SP' } },
    { ...newCustomer(), name: 'Carlos Henrique Souza', document: '111.444.777-35', phone: '(14) 99734-1020', whatsapp: '(14) 99734-1020', email: '', address: { cep: '18700-000', street: 'Av. Paulista', number: '1500', complement: 'Apto 12', district: 'Jardim', city: 'Avaré', state: 'SP' } },
    { ...newCustomer(), type: 'PJ', name: 'Padaria Pão Dourado LTDA', document: '11.222.333/0001-81', phone: '(14) 3762-1122', whatsapp: '(14) 99100-2030', email: 'contato@paodourado.com.br', address: { cep: '', street: 'Rua das Flores', number: '45', complement: '', district: 'Vila Nova', city: 'Itaí', state: 'SP' } },
    { ...newCustomer(), name: 'Juliana Martins', document: '', phone: '(14) 99655-7788', whatsapp: '', email: '', address: { cep: '', street: '', number: '', complement: '', district: '', city: 'Taquarituba', state: 'SP' } },
  ]

  const p = (patch: Partial<Part>, i: number): Part => ({ ...newPart(), code: `P${String(i + 1).padStart(5, '0')}`, ...patch })
  const parts: Part[] = [
    p({ name: 'Tela Frontal Samsung A54 Original', category: 'Telas', brand: 'Samsung', compatibleModels: 'Galaxy A54 5G', costPrice: 320, salePrice: 590, stock: 4, minStock: 2, barcode: '7891234560011', location: 'Gaveta A1' }, 0),
    p({ name: 'Tela iPhone 11 Incell', category: 'Telas', brand: 'Apple', compatibleModels: 'iPhone 11', costPrice: 180, salePrice: 390, stock: 3, minStock: 2, barcode: '7891234560028', location: 'Gaveta A2' }, 1),
    p({ name: 'Bateria iPhone 12', category: 'Baterias', brand: 'Apple', compatibleModels: 'iPhone 12 / 12 Pro', costPrice: 95, salePrice: 249, stock: 1, minStock: 3, barcode: '7891234560035', location: 'Gaveta B1' }, 2),
    p({ name: 'Bateria Motorola G60 (MG50)', category: 'Baterias', brand: 'Motorola', compatibleModels: 'Moto G60, G60s', costPrice: 55, salePrice: 160, stock: 6, minStock: 2, location: 'Gaveta B2' }, 3),
    p({ name: 'Conector de Carga USB-C Redmi Note 11', category: 'Conectores', brand: 'Xiaomi', compatibleModels: 'Redmi Note 11 / 11S', costPrice: 18, salePrice: 90, stock: 10, minStock: 4, location: 'Gaveta C1' }, 4),
    p({ name: 'Película 3D Vidro Universal', category: 'Películas', brand: 'Genérica', compatibleModels: 'Diversos', costPrice: 4, salePrice: 30, stock: 45, minStock: 15, barcode: '7891234560042', location: 'Balcão' }, 5),
    p({ name: 'Câmera Traseira Galaxy S21', category: 'Câmeras', brand: 'Samsung', compatibleModels: 'Galaxy S21', costPrice: 140, salePrice: 320, stock: 0, minStock: 1, location: 'Gaveta D1' }, 6),
    p({ name: 'Capinha Silicone Aveludada', category: 'Acessórios', brand: 'Genérica', compatibleModels: 'iPhone 13 / 14', costPrice: 9, salePrice: 49.9, stock: 22, minStock: 5, barcode: '7891234560059', location: 'Vitrine' }, 7),
  ]

  const s = (patch: Partial<CatalogService>): CatalogService => ({ ...newCatalogService(), ...patch })
  const services: CatalogService[] = [
    s({ name: 'Mão de obra — troca de tela', price: 80, estimatedMinutes: 60 }),
    s({ name: 'Mão de obra — troca de bateria', price: 50, estimatedMinutes: 40 }),
    s({ name: 'Troca de conector de carga', price: 70, estimatedMinutes: 90 }),
    s({ name: 'Limpeza de oxidação', price: 120, estimatedMinutes: 120, warrantyDays: 0 }),
    s({ name: 'Formatação / atualização de software', price: 60, estimatedMinutes: 60, warrantyDays: 30 }),
    s({ name: 'Diagnóstico técnico', price: 40, estimatedMinutes: 30, warrantyDays: 0 }),
  ]

  const partItem = (part: Part, qty = 1): LineItem => ({ id: uid(), kind: 'part', refId: part.id, description: part.name, quantity: qty, unitPrice: part.salePrice, unitCost: part.costPrice })
  const svcItem = (svc: CatalogService): LineItem => ({ id: uid(), kind: 'service', refId: svc.id, description: svc.name, quantity: 1, unitPrice: svc.price, unitCost: 0 })

  const baseNumber = store.list('orders').reduce((m, o) => Math.max(m, o.number), 0)
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

  const mk = (n: number, c: Customer, status: OrderStatus, device: Partial<ServiceOrder['device']>, issue: string, items: LineItem[], ageDays: number, paid = 0): ServiceOrder => {
    const o = newOrder()
    const created = daysAgo(ageDays)
    return {
      ...o,
      number: baseNumber + n,
      createdAt: created,
      customerId: c.id,
      device: { ...emptyDevice(), ...device },
      reportedIssue: issue,
      items,
      status,
      dueDate: addDays(3 - ageDays),
      priority: n === 2 ? 'urgente' : 'normal',
      checklist: o.checklist.map((ch, i) => ({ ...ch, status: i < 3 ? 'ok' : 'nao_testado' })),
      payments: paid ? [{ id: uid(), date: created, method: 'PIX', amount: paid, note: '' }] : [],
      history: [{ id: uid(), status, date: created, userName, note: 'Ordem de serviço criada (demonstração)' }],
      deliveredAt: status === 'entregue' ? daysAgo(Math.max(0, ageDays - 2)) : '',
      stockApplied: status === 'entregue',
    }
  }

  const orders: ServiceOrder[] = [
    mk(1, customers[0], 'em_reparo', { brand: 'Samsung', model: 'Galaxy A54 5G', color: 'Preto', imei: '356938035643809', passwordType: 'padrao', password: '1-2-3-6-9', accessories: 'Capinha' }, 'Tela quebrada após queda, touch não responde no canto inferior.', [partItem(parts[0]), svcItem(services[0])], 1),
    mk(2, customers[1], 'aguardando_peca', { brand: 'Samsung', model: 'Galaxy S21', color: 'Violeta' }, 'Câmera traseira não foca e mostra manchas.', [partItem(parts[6]), svcItem(services[0])], 2),
    mk(3, customers[2], 'pronta', { brand: 'Xiaomi', model: 'Redmi Note 11', color: 'Azul', passwordType: 'pin', password: '2580' }, 'Não carrega, só funciona com o cabo em certa posição.', [partItem(parts[4]), svcItem(services[2])], 3, 80),
    mk(4, customers[3], 'aguardando_aprovacao', { brand: 'Apple', model: 'iPhone 12', color: 'Branco' }, 'Bateria descarrega muito rápido e desliga com 30%.', [partItem(parts[2]), svcItem(services[1])], 0),
    mk(5, customers[0], 'entregue', { brand: 'Apple', model: 'iPhone 11', color: 'Vermelho' }, 'Display com listras verdes.', [partItem(parts[1]), svcItem(services[0]), partItem(parts[5])], 12, 500),
    mk(6, customers[1], 'aberta', { brand: 'Motorola', model: 'Moto G60', color: 'Cinza' }, 'Aparelho molhou, não liga.', [svcItem(services[5])], 0),
  ]

  const quote: Quote = {
    id: uid(),
    createdAt: '',
    updatedAt: '',
    number: store.list('quotes').reduce((m, q) => Math.max(m, q.number), 0) + 1,
    customerId: customers[2].id,
    device: { ...emptyDevice(), brand: 'Motorola', model: 'Moto G60' },
    description: 'Troca de bateria e película',
    items: [partItem(parts[3]), svcItem(services[1]), partItem(parts[5])],
    discount: 10,
    validUntil: addDays(7),
    status: 'enviado',
    notes: '',
    orderId: '',
  }

  await store.upsertMany('customers', customers)
  await store.upsertMany('parts', parts)
  await store.upsertMany('services', services)
  await store.upsertMany('orders', orders.reverse())
  await store.upsert('quotes', quote)
}
