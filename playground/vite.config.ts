import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import Uni from '@uni-helper/plugin-uni'
import { UnhVitePlugin } from '@uni-helper/unh'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // Unh 统一插件（pages + manifest + platform 等）
    ...UnhVitePlugin({
      pages: {},
      manifest: {},
      platform: {},
    }),
    // https://uni-helper.js.org/plugin-uni
    Uni(),
  ],
})
