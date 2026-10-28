import { usePrint } from '@/components/print/PrintProvider'
import { store } from '@/data/store'
import type { Quote, ServiceOrder } from '@/domain/types'
import { docCode } from '@/lib/format'
import {
  a4OrderHtml,
  a4QuoteHtml,
  orderLabelHtml,
  productLabelsHtml,
  receiptOrderHtml,
  receiptQuoteHtml,
  type LabelEntry,
  type OrderDocData,
} from './templates'

const orderData = (order: ServiceOrder): OrderDocData => ({
  order,
  customer: store.get('customers', order.customerId),
  technician: store.get('users', order.technicianId),
})

/** Ações de impressão prontas para uso nas telas (abrem a pré-visualização) */
export function useDocumentPrinting() {
  const { openPreview, printJobs } = usePrint()

  return {
    orderReceipt(order: ServiceOrder) {
      const s = store.getSettings()
      const code = docCode(s.orders.prefix, order.number)
      // "Impressões separadas": envia a via do cliente e a da loja como trabalhos independentes
      if (s.orders.printTwoCopies && s.orders.copyPrintMode === 'separateJobs') {
        void printJobs([
          { title: `${code} — via do cliente`, purpose: 'receipt', build: (p) => receiptOrderHtml(orderData(order), store.getSettings(), p, { only: 'client' }) },
          { title: `${code} — via da loja`, purpose: 'receipt', build: (p) => receiptOrderHtml(orderData(order), store.getSettings(), p, { only: 'store' }) },
        ])
        return
      }
      openPreview({ title: `Cupom da ${code}`, purpose: 'receipt', build: (p) => receiptOrderHtml(orderData(order), store.getSettings(), p) })
    },
    orderReceiptOnly(order: ServiceOrder, only: 'client' | 'store') {
      const code = docCode(store.getSettings().orders.prefix, order.number)
      openPreview({
        title: `${code} — via ${only === 'client' ? 'do cliente' : 'da loja'}`,
        purpose: 'receipt',
        build: (p) => receiptOrderHtml(orderData(order), store.getSettings(), p, { only }),
      })
    },
    orderA4(order: ServiceOrder) {
      const code = docCode(store.getSettings().orders.prefix, order.number)
      openPreview({ title: `Ordem de serviço ${code}`, purpose: 'a4', pdfName: `${code}.pdf`, build: (p) => a4OrderHtml(orderData(order), store.getSettings(), p) })
    },
    orderLabel(order: ServiceOrder) {
      const code = docCode(store.getSettings().orders.prefix, order.number)
      openPreview({ title: `Etiqueta do aparelho — ${code}`, purpose: 'orderLabel', build: (p) => orderLabelHtml(orderData(order), store.getSettings(), p) })
    },
    quoteReceipt(quote: Quote) {
      const code = docCode(store.getSettings().orders.quotePrefix, quote.number)
      openPreview({
        title: `Cupom do orçamento ${code}`,
        purpose: 'receipt',
        build: (p) => receiptQuoteHtml({ quote, customer: store.get('customers', quote.customerId) }, store.getSettings(), p),
      })
    },
    quoteA4(quote: Quote) {
      const code = docCode(store.getSettings().orders.quotePrefix, quote.number)
      openPreview({
        title: `Orçamento ${code}`,
        purpose: 'a4',
        pdfName: `${code}.pdf`,
        build: (p) => a4QuoteHtml({ quote, customer: store.get('customers', quote.customerId) }, store.getSettings(), p),
      })
    },
    productLabels(entries: LabelEntry[]) {
      const total = entries.reduce((s, e) => s + e.quantity, 0)
      openPreview({ title: `Etiquetas de produtos (${total})`, purpose: 'productLabel', build: (p) => productLabelsHtml(entries, store.getSettings(), p) })
    },
  }
}
