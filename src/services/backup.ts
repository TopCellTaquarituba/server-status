import { store, type Snapshot } from '@/data/store'
import { downloadFile } from '@/lib/utils'
import { toInputDate } from '@/lib/format'

const BACKUP_FORMAT = 'assistec-pro-backup'

export function exportBackup(): void {
  const payload = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), ...store.snapshot() }
  downloadFile(JSON.stringify(payload, null, 2), `backup-assistec-${toInputDate()}.json`)
}

export async function importBackup(json: string): Promise<void> {
  let data: Partial<Snapshot> & { format?: string }
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Arquivo inválido: não é um JSON')
  }
  if (data.format !== BACKUP_FORMAT || !data.collections) throw new Error('Este arquivo não é um backup do Assistec Pro')
  await store.restore({ collections: data.collections, settings: data.settings ?? store.getSettings() })
}
