import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/features/findbar/findbar-preload.ts'),
      formats: ['cjs'],
      fileName: () => 'findbar-preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: '.vite/build',
    emptyOutDir: false,
  },
})
