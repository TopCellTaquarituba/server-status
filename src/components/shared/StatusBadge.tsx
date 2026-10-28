import { Badge } from '@/components/ui'
import { ORDER_STATUS, PRIORITY, QUOTE_STATUS } from '@/domain/defaults'
import type { OrderStatus, Priority, QuoteStatus } from '@/domain/types'

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone={ORDER_STATUS[status].tone} dot>
    {ORDER_STATUS[status].label}
  </Badge>
)

export const QuoteStatusBadge = ({ status }: { status: QuoteStatus }) => (
  <Badge tone={QUOTE_STATUS[status].tone} dot>
    {QUOTE_STATUS[status].label}
  </Badge>
)

export const PriorityBadge = ({ priority }: { priority: Priority }) =>
  priority === 'normal' ? <span className="muted small">Normal</span> : <Badge tone={PRIORITY[priority].tone}>{PRIORITY[priority].label}</Badge>
