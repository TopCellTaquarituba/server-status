import { useEffect, useState } from 'react'
import { store, useSettings } from '@/data/store'
import type { Settings } from '@/domain/types'
import { useFeedback } from '@/components/feedback/FeedbackProvider'

/** Rascunho local de uma seção das configurações, com salvar/descartar */
export function useSettingsSection<K extends keyof Settings>(key: K) {
  const settings = useSettings()
  const { toast } = useFeedback()
  const [draft, setDraftState] = useState<Settings[K]>(settings[key])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) setDraftState(settings[key])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings[key]])

  const setDraft = (value: Settings[K]) => {
    setDraftState(value)
    setDirty(true)
  }

  const patch = (partial: Partial<Settings[K]>) => {
    setDraftState((d) => ({ ...(d as object), ...(partial as object) }) as Settings[K])
    setDirty(true)
  }

  const save = async () => {
    await store.updateSettings(key, draft)
    setDirty(false)
    toast('Configurações salvas')
  }

  const reset = () => {
    setDraftState(settings[key])
    setDirty(false)
  }

  return { draft, setDraft, patch, save, reset, dirty, settings }
}
