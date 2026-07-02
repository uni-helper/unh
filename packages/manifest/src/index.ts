import type { UnhContext } from '@uni-helper/unh-core'
import type { Plugin } from 'vite'
import type { UserOptions } from './types'
import { defineUnhModule } from '@uni-helper/unh-core'
import { ManifestContext } from './context'
import { ensureManifestJsonExists } from './writer'

export * from './config'
export * from './constant'
export * from './context'
export * from './options'
export * from './types'
export * from './writer'

/**
 * vite-plugin-uni-manifest plugin main entry (兼容导出)
 *
 * 保持与 `@uni-helper/vite-plugin-uni-manifest` 相同的 API，
 * 便于现有项目平滑迁移。内部已基于 UnhContext：
 * - 通过 `pages:extend` hook 获取页面路由信息
 * - 写入 manifest.json 后触发 `manifest:extend` hook
 *
 * @param userOptions - User configuration options
 * @param unhCtx - Optional UnhContext for shared cache/hooks
 * @returns Vite plugin instance
 */
export function VitePluginUniManifest(userOptions: UserOptions = {}, unhCtx?: UnhContext): Plugin {
  let ctx: ManifestContext
  return {
    name: 'unh-manifest',
    enforce: 'pre',
    async configResolved() {
      ensureManifestJsonExists()
      ctx = new ManifestContext(userOptions, unhCtx)
      await ctx.setup()
    },
    buildEnd: () => ctx?.unwatch(),
  }
}

export default VitePluginUniManifest

/**
 * Unh manifest 模块定义。
 *
 * 通过 `defineUnhModule` 注册到 UnhContext，参与统一模块系统。
 * 依赖 `unh:pages` 模块（通过 `pages:extend` hook 获取页面路由信息）。
 */
export const unhManifestModule = defineUnhModule<UserOptions>({
  meta: {
    name: 'unh:manifest',
    configKey: 'manifest',
    dependencies: ['unh:pages'],
  },
  defaults: {},
  setup(options, ctx: UnhContext) {
    const plugin = VitePluginUniManifest(options, ctx)
    ;(this as any).vitePlugins = [plugin]
  },
})
