import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Unh from '@uni-helper/unh/vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    Unh()
  ],
})
