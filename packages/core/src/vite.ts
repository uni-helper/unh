import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { UnhContext } from './context'
import { parseSFC } from './sfc'

/**
 * 统一的 Vite DevServer 设置。
 *
 * 在 Vite `configureServer` 钩子中调用：
 * - 将 server 存入 ctx 供模块访问
 * - 触发 `server:ready` hook，模块可在此注册 HMR 回调
 *
 * 替代各模块重复实现的 `setupViteServer()` 模式。
 */
export function setupViteServer(ctx: UnhContext, server: ViteDevServer): void {
  ctx.server = server
  ctx.hooks.callHook('server:ready', server)
}

/**
 * 创建 Unh 统一 Vite 插件集合。
 *
 * 返回的插件数组按依赖顺序排列：
 * 1. `unh:core`（核心插件，SFC 预解析 + config/server 注入）
 * 2. 各模块贡献的 Vite 插件（按拓扑排序）
 *
 * 模块注册顺序（按依赖关系）：
 *   unh:core → unh:platform → unh:pages → unh:layouts → unh:components → unh:manifest
 *
 * @param ctx 已注册所有模块的 Unh 上下文
 */
export function createUnhVitePlugin(ctx: UnhContext): Plugin[] {
  const plugins: Plugin[] = []

  // 核心 Vite 插件：SFC 缓存预解析 + config/server 注入
  const corePlugin: Plugin = {
    name: 'unh:core',
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      ctx.config = config
      ctx.hooks.callHook('config:resolved', config)
    },
    configureServer(server: ViteDevServer) {
      setupViteServer(ctx, server)
    },
    transform(code: string, id: string) {
      // 预解析 SFC 并缓存，后续模块直接读取，避免重复解析
      if (id.endsWith('.vue')) {
        parseSFC(ctx, id, code)
      }
    },
  }

  plugins.push(corePlugin)

  // 按依赖顺序收集模块贡献的 Vite 插件
  // 注意：此处假设模块已通过 installModules 完成 setup，
  // setup 中填充的 vitePlugins 会被收集。
  for (const mod of ctx.modules.values()) {
    if (mod.vitePlugins && mod.vitePlugins.length > 0) {
      plugins.push(...mod.vitePlugins)
    }
  }

  return plugins
}
