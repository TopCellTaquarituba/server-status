import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { JsonStorage } from './storage'
import { registerPrintingHandlers } from './printing'
import { registerAdbHandlers } from './adb'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    title: 'Assistec Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  // Links externos abrem no navegador padrão, nunca dentro do app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Apenas uma instância do app aberta por vez (evita conflito de escrita nos dados)
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    const storage = new JsonStorage(path.join(app.getPath('userData'), 'dados'))

    ipcMain.handle('storage:get', (_e, key: string) => storage.get(key))
    ipcMain.handle('storage:set', (_e, key: string, value: unknown) => storage.set(key, value))
    ipcMain.handle('app:dataDir', () => storage.dir)
    ipcMain.handle('app:openDataDir', () => shell.openPath(storage.dir))
    ipcMain.handle('app:version', () => app.getVersion())

    registerPrintingHandlers()
    registerAdbHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
