import type { UnhContext } from '@uni-helper/unh-core'
import type { Plugin, ViteDevServer } from 'vite'
import type { UserOptions } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineUnhModule } from '@uni-helper/unh-core'
import { MANIFEST_CONFIG_FILES, ManifestContext } from './context'
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
 * 配置加载统一使用 `unconfig`；文件监听复用 Vite 的 `server.watcher`，
 * 不再依赖 c12 的 `watchConfig`。
 *
 * @param userOptions - User configuration options
 * @param unhCtx - Optional UnhContext for shared cache/hooks
 * @returns Vite plugin instance
 */
export function VitePluginUniManifest(userOptions: UserOptions = {}, unhCtx?: UnhContext): Plugin {
  let ctx: ManifestContext
  let removeWatcherListener: (() => void) | undefined
  return {
    name: 'unh-manifest',
    enforce: 'pre',
    async configResolved() {
      ensureManifestJsonExists()
      ctx = new ManifestContext(userOptions, unhCtx)
      await ctx.setup()
    },
    configureServer(server: ViteDevServer) {
      // 复用 Vite 自身 watcher 监听 manifest.config 文件变化
      const cwd = ctx.options.cwd || process.cwd()
      const configFiles = MANIFEST_CONFIG_FILES.map(f => resolve(cwd, f))
      configFiles.forEach(f => server.watcher.add(f))

      const onChange = (id: string) => {
        if (configFiles.includes(id)) {
          ctx.reload()
        }
      }
      server.watcher.on('change', onChange)
      removeWatcherListener = () => {
        server.watcher.off('change', onChange)
      }
    },
    buildEnd() {
      removeWatcherListener?.()
    },
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
