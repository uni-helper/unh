import type { Plugin } from 'vite'
import process from 'node:process'
import Uni from '@dcloudio/vite-plugin-uni'
import { loadUnhConfig } from '@uni-helper/unh-cli'
import { unhComponentsModule } from '@uni-helper/unh-components'
import {
  createUnhVitePlugin,
  installModules,
  UnhContext,
} from '@uni-helper/unh-core'
import { unhLayoutsModule } from '@uni-helper/unh-layouts'
import { unhManifestModule } from '@uni-helper/unh-manifest'
import { unhPagesModule } from '@uni-helper/unh-pages'
import { unhPlatformModule } from '@uni-helper/unh-platform'

/**
 * 统一 Unh Vite 插件入口。
 *
 * 内部完成以下工作：
 * 1. 从 `unh.config.ts` 加载配置（基于 `unconfig`），模块配置直接展开在顶层（无需 `vite` 包裹）
 * 2. 创建共享 UnhContext，按需注册各功能模块
 * 3. 调用 `@dcloudio/vite-plugin-uni`，透传 `uniOptions`
 * 4. 返回合并后的 Vite 插件数组
 *
 * `uniOptions` 直接透传给 `@dcloudio/vite-plugin-uni`，不通过 `unh.config.ts` 配置。
 *
 * 模块间通过 hooks 通信（`pages:extend`、`layouts:extend` 等），
 * 禁止直接 import 其他模块。
 *
 * Vite 的 `asyncFlatten` 会自动 await 插件数组中的 Promise，
 * 因此可以直接以 `plugins: [Unh()]` 形式使用，无需 `await`。
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import Unh from '@uni-helper/unh/vite'
 *
 * export default defineConfig({
 *   plugins: [Unh()],
 * })
 * ```
 *
 * @param uniOptions - 透传给 `@dcloudio/vite-plugin-uni` 的选项
 * @returns Vite 插件数组
 */
export async function Unh(uniOptions?: Record<string, any>): Promise<Plugin[]> {
  const config = await loadUnhConfig()

  const root = config.root || process.env.VITE_ROOT_DIR || process.cwd()
  const ctx = new UnhContext(root)

  // platform 模块默认加载（fileEnabled/modifierEnabled 由模块 defaults 控制）
  ctx.registerModule(unhPlatformModule)

  // 按需注册模块（未配置的不加载）
  if (config.pages)
    ctx.registerModule(unhPagesModule)

  if (config.layouts)
    ctx.registerModule(unhLayoutsModule)

  if (config.components)
    ctx.registerModule(unhComponentsModule)

  if (config.manifest)
    ctx.registerModule(unhManifestModule)

  // 安装模块：拓扑排序 + 合并默认配置 + setup + modules:installed hook
  await installModules(ctx, config as Record<string, any>)

  // 收集 unh 体系插件
  const unhPlugins = createUnhVitePlugin(ctx)

  // 调用 @uni-helper/plugin-uni（透传选项），合并到插件数组
  const uniResult = Uni(uniOptions as any)
  const uniPlugins: Plugin[] = Array.isArray(uniResult) ? uniResult : [uniResult]

  return [...unhPlugins, ...uniPlugins]
}

export default Unh
