import type { UnhContext } from '@uni-helper/unh-core'
import type { Plugin } from 'vite'
import type { Options, PublicPluginAPI } from './types'
import { existsSync } from 'node:fs'
import { defineUnhModule } from '@uni-helper/unh-core'
import { createFilter } from 'vite'
import { Context } from './context'
import { shouldTransform, stringifyComponentImport } from './utils'

export * from './constants'
export * from './context'
export * from './declaration'
export * from './options'
export * from './transformer'
export * from './types'
export * from './utils'

/**
 * vite-plugin-uni-components plugin main entry (兼容导出)
 *
 * 保持与 `@uni-helper/vite-plugin-uni-components` 相同的 API，
 * 便于现有项目平滑迁移。内部已基于 UnhContext：
 * - 组件文件扫描通过共享扫描缓存
 * - 扫描完成后触发 `components:extend` hook
 * - 使用 Vite DevServer 共享 watcher，不创建独立 chokidar
 *
 * @param options - User configuration options
 * @param unhCtx - Optional UnhContext for shared cache/hooks
 * @returns Vite plugin instance
 */
export function VitePluginComponents(options: Options = {}, unhCtx?: UnhContext): Plugin & { api: PublicPluginAPI } {
  const filter = createFilter(
    options.include || [
      /\.vue($|\?)/,
    ],
    options.exclude || [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/],
  )
  const ctx: Context = new Context(options, unhCtx)

  return {
    name: 'unh-components',
    enforce: 'post',
    api: {
      async findComponent(name, filename) {
        return await ctx.findComponent(name, 'component', filename ? [filename] : [])
      },
      stringifyImport(info) {
        return stringifyComponentImport(info, ctx)
      },
    },
    async configResolved(config) {
      ctx.setRoot(config.root)
      ctx.sourcemap = true

      if (ctx.options.dts) {
        await ctx.searchGlob()
        if (!existsSync(ctx.options.dts))
          ctx.generateDeclaration()
      }

      if (ctx.options.dumpComponentsInfo && ctx.dumpComponentsInfoPath) {
        if (!existsSync(ctx.dumpComponentsInfoPath))
          ctx.generateComponentsJson()
      }
    },
    configureServer(server) {
      ctx.setupViteServer(server)
    },
    async transform(code, id) {
      if (!shouldTransform(code) || !filter(id))
        return null
      try {
        const result = await ctx.transform(code, id)
        ctx.generateDeclaration()
        ctx.generateComponentsJson()
        return result
      }
      catch (e) {
        this.error(e as string)
      }
    },
  }
}

export default VitePluginComponents

export { camelCase, kebabCase, pascalCase } from './utils'

/**
 * Unh components 模块定义。
 *
 * 通过 `defineUnhModule` 注册到 UnhContext，参与统一模块系统。
 * 在 setup 中创建 Vite 插件并挂载到 `vitePlugins`，由 `createUnhVitePlugin` 收集。
 */
export const unhComponentsModule = defineUnhModule<Options>({
  meta: {
    name: 'unh:components',
    configKey: 'components',
  },
  defaults: {},
  setup(options, ctx: UnhContext) {
    const plugin = VitePluginComponents(options, ctx)
    ;(this as any).vitePlugins = [plugin]
  },
})
