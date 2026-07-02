import type { Plugin } from 'vite'
import type { UnhViteConfig } from './config/types'
import process from 'node:process'
import { unhComponentsModule } from '@uni-helper/unh-components'
import {
  createUnhVitePlugin,
  mergeModuleOptions,
  resolveModuleOrder,
  UnhContext,
} from '@uni-helper/unh-core'
import { unhLayoutsModule } from '@uni-helper/unh-layouts'
import { unhManifestModule } from '@uni-helper/unh-manifest'
import { unhPagesModule } from '@uni-helper/unh-pages'
import { unhPlatformModule } from '@uni-helper/unh-platform'

export type { UnhViteConfig } from './config/types'

/**
 * 统一 Unh Vite 插件入口。
 *
 * 创建共享 UnhContext，按需注册各功能模块，
 * 返回合并后的 Vite 插件数组。
 *
 * 模块注册顺序（按依赖关系自动拓扑排序）：
 *   unh:core → unh:platform → unh:pages → unh:layouts → unh:components → unh:manifest
 *
 * 模块间通过 hooks 通信（`pages:extend`、`layouts:extend` 等），
 * 禁止直接 import 其他模块。
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import { UnhVitePlugin } from '@uni-helper/unh'
 *
 * export default defineConfig({
 *   plugins: [
 *     ...UnhVitePlugin({
 *       pages: { exclude: ['src/components'] },
 *       layouts: { defaultLayout: 'default' },
 *       components: { dirs: ['src/components'] },
 *       manifest: { minify: true },
 *       platform: { modifierEnabled: true },
 *     }),
 *   ],
 * })
 * ```
 *
 * @param config - 模块配置，未配置的模块不会加载
 * @returns Vite 插件数组
 */
export function UnhVitePlugin(config: UnhViteConfig = {}): Plugin[] {
  const root = config.root || process.env.VITE_ROOT_DIR || process.cwd()
  const ctx = new UnhContext(root)

  // 按需注册模块（未配置的不加载）
  // 注册顺序不影响最终执行顺序（由 resolveModuleOrder 拓扑排序决定）
  if (config.platform !== false)
    ctx.registerModule(unhPlatformModule)

  if (config.pages)
    ctx.registerModule(unhPagesModule)

  if (config.layouts)
    ctx.registerModule(unhLayoutsModule)

  if (config.components)
    ctx.registerModule(unhComponentsModule)

  if (config.manifest)
    ctx.registerModule(unhManifestModule)

  // 同步安装模块（所有模块的 setup 均为同步）
  const ordered = resolveModuleOrder([...ctx.modules.values()])
  const userModulesConfig: Record<string, any> = {}
  if (config.platform)
    userModulesConfig.platform = config.platform
  if (config.pages)
    userModulesConfig.pages = config.pages
  if (config.layouts)
    userModulesConfig.layouts = config.layouts
  if (config.components)
    userModulesConfig.components = config.components
  if (config.manifest)
    userModulesConfig.manifest = config.manifest

  for (const mod of ordered) {
    const userOptions = userModulesConfig[mod.meta.configKey]
    const merged = mergeModuleOptions(mod.defaults, userOptions)
    mod.setup(merged, ctx)
  }

  ctx.hooks.callHook('modules:installed')

  // 返回合并后的 Vite 插件数组
  return createUnhVitePlugin(ctx)
}

export default UnhVitePlugin
