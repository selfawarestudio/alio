import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    target: 'es2019',
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'alio',
      formats: ['es', 'umd', 'iife'],
    },
    rollupOptions: {
      external: ['smitter', 'martha'],
      output: {
        globals: {
          smitter: 'smitter',
          martha: 'martha',
        },
      },
    },
  },
})
