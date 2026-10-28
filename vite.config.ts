import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'

// `npm run dev`      -> abre o app desktop (Electron)
// `npm run dev:web`  -> roda só a interface no navegador (dados no localStorage)
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()]

  if (mode !== 'web') {
    plugins.push(
      electron({
        main: { entry: 'electron/main.ts' },
        preload: { input: path.resolve('electron/preload.ts') },
      }),
    )
  }

  return {
    base: './',
    plugins,
    resolve: {
      alias: { '@': path.resolve('src') },
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
  }
})
