import fs from 'node:fs'
import path from 'node:path'

/**
 * Armazenamento local em arquivos JSON (um arquivo por coleção).
 * - Escrita atômica (arquivo temporário + rename) para não corromper dados
 * - Backup diário automático, mantendo os últimos 30 dias
 * - Chaves validadas para impedir path traversal
 */
export class JsonStorage {
  private static readonly KEY_PATTERN = /^[a-z0-9_-]+$/i
  private static readonly BACKUPS_TO_KEEP = 30

  constructor(readonly dir: string) {
    fs.mkdirSync(dir, { recursive: true })
    this.dailyBackup()
  }

  get(key: string): unknown {
    const file = this.fileFor(key)
    if (!fs.existsSync(file)) return null
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (error) {
      console.error(`[storage] Falha ao ler ${key}:`, error)
      return null
    }
  }

  set(key: string, value: unknown): void {
    const file = this.fileFor(key)
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf-8')
    fs.renameSync(tmp, file)
  }

  private fileFor(key: string): string {
    if (!JsonStorage.KEY_PATTERN.test(key)) throw new Error(`Chave de armazenamento inválida: ${key}`)
    return path.join(this.dir, `${key}.json`)
  }

  private dailyBackup(): void {
    try {
      const files = fs.readdirSync(this.dir).filter((f) => f.endsWith('.json'))
      if (files.length === 0) return

      const backupsRoot = path.join(this.dir, 'backups')
      const today = new Date().toISOString().slice(0, 10)
      const dest = path.join(backupsRoot, today)
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
        for (const f of files) fs.copyFileSync(path.join(this.dir, f), path.join(dest, f))
      }

      const days = fs.readdirSync(backupsRoot).sort()
      for (const old of days.slice(0, Math.max(0, days.length - JsonStorage.BACKUPS_TO_KEEP))) {
        fs.rmSync(path.join(backupsRoot, old), { recursive: true, force: true })
      }
    } catch (error) {
      console.error('[storage] Falha no backup diário:', error)
    }
  }
}
