import { contextBridge, ipcRenderer } from 'electron'

/**
 * Ponte segura entre a interface (renderer) e o processo principal.
 * A interface nunca tem acesso direto ao Node.js — só a estas funções.
 */
contextBridge.exposeInMainWorld('api', {
  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('storage:set', key, value),
  },
  printing: {
    printers: () => ipcRenderer.invoke('print:printers'),
    print: (job: unknown) => ipcRenderer.invoke('print:html', job),
    savePdf: (job: unknown) => ipcRenderer.invoke('pdf:save', job),
  },
  app: {
    dataDir: () => ipcRenderer.invoke('app:dataDir'),
    openDataDir: () => ipcRenderer.invoke('app:openDataDir'),
    version: () => ipcRenderer.invoke('app:version'),
  },
  adb: {
    check: (cfg: unknown) => ipcRenderer.invoke('adb:check', cfg),
    devices: (cfg: unknown) => ipcRenderer.invoke('adb:devices', cfg),
    scan: (cfg: unknown) => ipcRenderer.invoke('adb:scan', cfg),
    action: (cfg: unknown) => ipcRenderer.invoke('adb:action', cfg),
    shield: (cfg: unknown) => ipcRenderer.invoke('adb:shield', cfg),
    onProgress: (cb: (data: { done: number; total: number; current: string }) => void) => {
      const handler = (_e: unknown, data: { done: number; total: number; current: string }) => cb(data)
      ipcRenderer.on('adb:progress', handler)
      return () => ipcRenderer.removeListener('adb:progress', handler)
    },
  },
})
