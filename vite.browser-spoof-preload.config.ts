import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/features/spoof/browser-spoof-preload.ts'),
      formats: ['cjs'],
      fileName: () => 'browser-spoof-preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: '.vite/build',
    emptyOutDir: false,
  },
})
