import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 测试环境下将 @uni-helper/unh-* 工作区包映射到各自的 src 入口，
// 避免每个包都需要先构建出 dist/ 才能被根包的测试导入。
const workspaceRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@uni-helper/unh-core': resolve(workspaceRoot, 'packages/core/src/index.ts'),
      '@uni-helper/unh-pages': resolve(workspaceRoot, 'packages/pages/src/index.ts'),
      '@uni-helper/unh-layouts': resolve(workspaceRoot, 'packages/layouts/src/index.ts'),
      '@uni-helper/unh-components': resolve(workspaceRoot, 'packages/components/src/index.ts'),
      '@uni-helper/unh-manifest': resolve(workspaceRoot, 'packages/manifest/src/index.ts'),
      '@uni-helper/unh-platform': resolve(workspaceRoot, 'packages/platform/src/index.ts'),
    },
  },
  test: {
    server: {
      deps: {
        inline: ['vitest-package-exports'],
      },
    },
  },
})
