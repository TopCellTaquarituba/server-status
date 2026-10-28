import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import type { Tone } from '@/domain/defaults'
import { cx } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  danger?: boolean
}

interface FeedbackApi {
  toast: (message: string, kind?: ToastKind) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Executa uma ação assíncrona mostrando erro amigável se falhar */
  run: <T>(action: () => Promise<T>, successMessage?: string) => Promise<T | undefined>
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

const TOAST_STYLE: Record<ToastKind, { tone: Tone; icon: ReactNode }> = {
  success: { tone: 'green', icon: <CheckCircle2 /> },
  error: { tone: 'red', icon: <XCircle /> },
  info: { tone: 'blue', icon: <Info /> },
  warning: { tone: 'amber', icon: <AlertTriangle /> },
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(v: boolean) => void>()
  const counter = useRef(0)

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter.current
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5500 : 3200)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const run = useCallback(
    async <T,>(action: () => Promise<T>, successMessage?: string) => {
      try {
        const result = await action()
        if (successMessage) toast(successMessage)
        return result
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Ocorreu um erro inesperado', 'error')
        return undefined
      }
    },
    [toast],
  )

  const close = (value: boolean) => {
    resolver.current?.(value)
    setConfirmState(null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm, run }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={cx('toast', `tone-${TOAST_STYLE[t.kind].tone}`)}>
            {TOAST_STYLE[t.kind].icon}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <Modal
        open={Boolean(confirmState)}
        onClose={() => close(false)}
        size="sm"
        title={confirmState?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {confirmState?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <div className="muted">{confirmState?.message}</div>
      </Modal>
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback deve ser usado dentro de FeedbackProvider')
  return ctx
}
