import type { UnhContext } from '@uni-helper/unh-core'
import type { UserManifestConfig } from './config'
import type { UserOptions } from './types'
import { watchConfig } from 'c12'
import { defaultManifestConfig } from './constant'
import { resolveOptions } from './options'
import { writeManifestJson } from './writer'

/**
 * Manages the lifecycle of `manifest.json` generation.
 *
 * **Unh 改造点**：
 * 1. 通过 `pages:extend` hook 获取 pages 模块产出的页面路由信息，
 *    可自动注入到 manifest 的 pages 字段（如需）。
 * 2. 写入 manifest.json 后触发 `manifest:extend` hook，
 *    通知其他模块当前 manifest 数据。
 * 3. 使用 `c12` 的 `watchConfig` 监听 `manifest.config.ts` 变化并自动同步。
 */
export class ManifestContext {
  options
  unhCtx?: UnhContext
  unwatch!: () => Promise<void>

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
   * Start watching config sources and perform initial write.
   * Must be called after construction.
   */
  async setup() {
    const { config, unwatch } = await watchConfig<UserManifestConfig>({
      cwd: this.options.cwd,
      name: 'manifest',
      defaultConfig: defaultManifestConfig,
      rcFile: false,
      packageJson: false,
      onUpdate: (config) => {
        writeManifestJson(config.newConfig.config, this.options, this.unhCtx)
      },
    })
    writeManifestJson(config, this.options, this.unhCtx)

    this.unwatch = unwatch
  }
}
