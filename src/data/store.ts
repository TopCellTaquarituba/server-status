import { useSyncExternalStore } from 'react'
import { storage } from '@/infra/platform'
import { mergeSettings, DEFAULT_SETTINGS } from '@/domain/defaults'
import type { BaseEntity, CollectionName, Collections, EntityOf, ID, Settings } from '@/domain/types'
import { nowIso } from '@/lib/utils'

const COLLECTIONS: CollectionName[] = ['customers', 'parts', 'services', 'orders', 'quotes', 'users']

export interface Snapshot {
  collections: Collections
  settings: Settings
}

/**
 * Fonte única de verdade da aplicação (padrão Repository + Observer).
 * Mantém os dados em memória, persiste a cada alteração e notifica a interface.
 * Coleções são sempre substituídas de forma imutável, o que permite ao React
 * detectar mudanças por referência.
 */
class DataStore {
  private collections: Collections = { customers: [], parts: [], services: [], orders: [], quotes: [], users: [] }
  private settings: Settings = DEFAULT_SETTINGS
  private listeners = new Set<() => void>()
  ready = false

  async init(): Promise<void> {
    const values = await Promise.all(COLLECTIONS.map((name) => storage.get<unknown[]>(name)))
    COLLECTIONS.forEach((name, i) => {
      const value = values[i]
      ;(this.collections as unknown as Record<CollectionName, unknown[]>)[name] = Array.isArray(value) ? value : []
    })
    this.settings = mergeSettings(await storage.get('settings'))
    this.ready = true
    this.emit()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  /* ----------------------------- leitura ----------------------------- */

  list<K extends CollectionName>(name: K): Collections[K] {
    return this.collections[name]
  }

  get<K extends CollectionName>(name: K, id: ID | undefined): EntityOf<K> | undefined {
    if (!id) return undefined
    return (this.collections[name] as BaseEntity[]).find((e) => e.id === id) as EntityOf<K> | undefined
  }

  getSettings(): Settings {
    return this.settings
  }

  /* ----------------------------- escrita ----------------------------- */

  async upsert<K extends CollectionName>(name: K, entity: EntityOf<K>): Promise<EntityOf<K>> {
    const [saved] = await this.upsertMany(name, [entity])
    return saved
  }

  async upsertMany<K extends CollectionName>(name: K, entities: EntityOf<K>[]): Promise<EntityOf<K>[]> {
    const now = nowIso()
    let next = [...(this.collections[name] as BaseEntity[])]
    const saved: BaseEntity[] = []

    for (const entity of entities) {
      const e = { ...(entity as BaseEntity), updatedAt: now, createdAt: (entity as BaseEntity).createdAt || now }
      const index = next.findIndex((x) => x.id === e.id)
      if (index >= 0) next[index] = e
      else next = [e, ...next]
      saved.push(e)
    }

    await this.commit(name, next)
    return saved as EntityOf<K>[]
  }

  async remove<K extends CollectionName>(name: K, id: ID): Promise<void> {
    const next = (this.collections[name] as BaseEntity[]).filter((e) => e.id !== id)
    await this.commit(name, next)
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.settings = settings
    await storage.set('settings', settings)
    this.emit()
  }

  async updateSettings<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    await this.saveSettings({ ...this.settings, [key]: value })
  }

  private async commit(name: CollectionName, next: BaseEntity[]): Promise<void> {
    ;(this.collections as unknown as Record<CollectionName, BaseEntity[]>)[name] = next
    await storage.set(name, next)
    this.emit()
  }

  /* ----------------------------- backup ------------------------------ */

  snapshot(): Snapshot {
    return { collections: this.collections, settings: this.settings }
  }

  async restore(snapshot: Snapshot): Promise<void> {
    for (const name of COLLECTIONS) {
      const list = snapshot.collections[name]
      await this.commit(name, Array.isArray(list) ? (list as BaseEntity[]) : [])
    }
    await this.saveSettings(mergeSettings(snapshot.settings))
  }
}

export const store = new DataStore()

/* ------------------------------------------------------------------ */
/* Hooks React                                                         */
/* ------------------------------------------------------------------ */

export function useCollection<K extends CollectionName>(name: K): Collections[K] {
  return useSyncExternalStore(store.subscribe, () => store.list(name))
}

export function useSettings(): Settings {
  return useSyncExternalStore(store.subscribe, () => store.getSettings())
}
