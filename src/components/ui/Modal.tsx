import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cx } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
  children: ReactNode
  dismissable?: boolean
}

export function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissable = true }: ModalProps) {
  useEffect(() => {
    if (!open || !dismissable) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, dismissable])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => dismissable && e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', `modal-${size}`)} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {dismissable && <Button variant="ghost" size="sm" iconOnly icon={<X />} onClick={onClose} aria-label="Fechar" />}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
