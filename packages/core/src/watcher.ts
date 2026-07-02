import type { FSWatcher, WatchOptions } from 'chokidar'
import type { UnhContext } from './context'
import chokidar from 'chokidar'
import { bindScanInvalidation } from './scan'

export interface UnhWatcherOptions extends WatchOptions {
  /** 是否自动绑定扫描缓存失效（默认 true） */
  bindScanInvalidation?: boolean
  /** 是否自动绑定 SFC 缓存失效（默认 true，对 .vue 文件） */
  bindSfcInvalidation?: boolean
}

/**
 * 创建一个 chokidar watcher。
 * 全局应尽量复用同一个 watcher（性能目标：chokidar watcher 全局 ≤ 1 个）。
 */
export function createWatcher(
  paths: string | string[],
  options: WatchOptions = {},
): FSWatcher {
  return chokidar.watch(paths, options)
}

/**
 * 统一的文件监听设置。
 *
 * 创建 watcher 并自动绑定：
 * - 扫描缓存失效（add/change/unlink 等事件清空 scanCache）
 * - SFC 缓存失效（.vue 文件变更时清除对应 sfcCache 条目）
 *
 * 返回 watcher 实例，模块可继续在其上注册业务回调。
 *
 * @param ctx Unh 上下文
 * @param paths 监听路径
 * @param options 选项
 */
export function setupWatcher(
  ctx: UnhContext,
  paths: string | string[],
  options: UnhWatcherOptions = {},
): FSWatcher {
  const {
    bindScanInvalidation: bindScan = true,
    bindSfcInvalidation: bindSfc = true,
    ...watchOptions
  } = options

  const watcher = createWatcher(paths, watchOptions)

  if (bindScan) {
    bindScanInvalidation(ctx, watcher)
  }

  if (bindSfc) {
    const invalidateSfc = (filePath: string) => {
      if (filePath.endsWith('.vue')) {
        ctx.invalidateSFC(filePath)
      }
    }
    watcher.on('change', invalidateSfc)
    watcher.on('unlink', invalidateSfc)
  }

  return watcher
}
