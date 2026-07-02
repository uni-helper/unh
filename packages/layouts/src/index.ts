import type { Plugin } from 'vite'
import type { UserOptions } from './types'
import process from 'node:process'
import { defineUnhModule, UnhContext } from '@uni-helper/unh-core'
import { createFilter } from 'vite'
import { resolvedVirtualModuleId, virtualModuleId } from './constant'
import { LayoutContext } from './context'
import { resolveOptions } from './utils'

export * from './constant'
export * from './context'
export * from './scan'
export * from './types'
export * from './utils'

/**
 * vite-plugin-uni-layouts plugin main entry (兼容导出)
 *
 * 保持与 `@uni-helper/vite-plugin-uni-layouts` 相同的 API，
 * 便于现有项目平滑迁移。内部已基于 UnhContext：
 * - SFC 解析通过共享缓存
 * - 页面列表通过 `pages:extend` hook 获取（不再读 pages.json）
 * - 布局文件扫描通过共享扫描缓存
 *
 * @param userOptions - User configuration options
 * @param unhCtx - Optional UnhContext for shared cache/hooks
 * @returns Vite plugin instance
 */
export function VitePluginUniLayouts(userOptions: UserOptions = {}, unhCtx?: UnhContext): Plugin {
  const options = resolveOptions({
    cwd: process.env.VITE_ROOT_DIR || process.cwd(),
    ...userOptions,
  })

  // 若未提供 UnhContext，创建独立实例（兼容独立使用场景）
  const ctx = unhCtx ?? new UnhContext(options.cwd)
  let layoutCtx: LayoutContext

  return {
    name: 'unh-layouts',
    enforce: 'pre',
    async configResolved(config) {
      layoutCtx = new LayoutContext(options, ctx)
      layoutCtx.config = config
      await layoutCtx.init()
    },
    configureServer(server) {
      layoutCtx.setupViteServer(server)
    },
    resolveId(id) {
      if (id === virtualModuleId)
        return resolvedVirtualModuleId
    },
    load(id) {
      if (id === resolvedVirtualModuleId)
        return layoutCtx.virtualModule()
    },
    transform(code, id) {
      const filter = createFilter(['src/main.(ts|js)', 'main.(ts|js)'])
      if (filter(id))
        return layoutCtx.importLayoutComponents(code, id)

      return layoutCtx.transform(code, id)
    },
  }
}

export default VitePluginUniLayouts

/**
 * Unh layouts 模块定义。
 *
 * 通过 `defineUnhModule` 注册到 UnhContext，参与统一模块系统。
 * 依赖 `unh:pages` 模块（通过 `pages:extend` hook 获取页面列表）。
 */
export const unhLayoutsModule = defineUnhModule<UserOptions>({
  meta: {
    name: 'unh:layouts',
    configKey: 'layouts',
    dependencies: ['unh:pages'],
  },
  defaults: {},
  setup(options, ctx: UnhContext) {
    const plugin = VitePluginUniLayouts(options, ctx)
    ;(this as any).vitePlugins = [plugin]
  },
})
