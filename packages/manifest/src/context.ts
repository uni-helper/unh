import type { UnhContext } from '@uni-helper/unh-core'
import type { UserManifestConfig } from './config'
import type { UserOptions } from './types'
import { loadConfig } from 'unconfig'
import { defaultManifestConfig } from './constant'
import { resolveOptions } from './options'
import { writeManifestJson } from './writer'

/**
 * `manifest.config` 可能的文件名后缀，用于 Vite watcher 监听。
 */
export const MANIFEST_CONFIG_FILES = [
  'manifest.config.ts',
  'manifest.config.js',
  'manifest.config.mjs',
  'manifest.config.cjs',
  'manifest.config.json',
] as const

/**
 * Manages the lifecycle of `manifest.json` generation.
 *
 * **Unh 改造点**：
 * 1. 通过 `pages:extend` hook 获取 pages 模块产出的页面路由信息，
 *    可自动注入到 manifest 的 pages 字段（如需）。
 * 2. 写入 manifest.json 后触发 `manifest:extend` hook，
 *    通知其他模块当前 manifest 数据。
 * 3. 使用 `unconfig` 加载 `manifest.config.ts`（取代 c12），
 *    文件监听交由 Vite 的 `server.watcher` 处理（见 `index.ts`）。
 */
export class ManifestContext {
  options
  unhCtx?: UnhContext

  constructor(options: UserOptions, unhCtx?: UnhContext) {
    this.options = resolveOptions(options)
    this.unhCtx = unhCtx

    // 监听 pages:extend hook，可在此将页面路由信息注入 manifest
    if (this.unhCtx) {
      this.unhCtx.hooks.hook('pages:extend', (_pages: any[]) => {
        // 页面路由信息可通过 ctx.state 或直接合并到 manifest
        // 当前仅记录到 state，供 manifest 生成时参考
        this.unhCtx!.setState('pages:routes', _pages)
      })
    }
  }

  /**
   * 执行初始加载并写入 `manifest.json`。
   *
   * 文件变化监听由 Vite 插件层（`configureServer` + `server.watcher`）
   * 触发 {@link reload}，避免在此处引入独立的 chokidar 实例。
   */
  async setup() {
    await this.reload()
  }

  /**
   * 重新加载 `manifest.config`（基于 `unconfig`）并写入 `manifest.json`。
   *
   * `defaultManifestConfig` 通过 `unconfig` 的 `defaults` 深合并（defu），
   * 行为与原 c12 `defaultConfig` 一致。
   */
  async reload() {
    const { config } = await loadConfig<UserManifestConfig>({
      sources: [{ files: 'manifest.config' }],
      cwd: this.options.cwd,
      defaults: defaultManifestConfig,
    })
    writeManifestJson(config, this.options, this.unhCtx)
  }
}
