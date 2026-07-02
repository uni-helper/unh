import type { FSWatcher } from 'chokidar'
import type { UnhContext } from './context'
import type { ScanCacheEntry } from './types'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'

export interface ScanOptions {
  /** 扫描根目录，默认 `ctx.root` */
  cwd?: string
  /** 是否返回绝对路径，默认 false（返回相对 cwd 的路径） */
  absolute?: boolean
  /** 忽略的 glob 模式 */
  ignore?: string[]
  /** 是否启用缓存，默认 true */
  cache?: boolean
}

/**
 * 构造扫描缓存键。
 *
 * **缓存键必须包含 patterns + cwd**（参见 project_memory 教训）：
 * 不同 patterns 或不同 cwd 的扫描结果不能混用，否则会返回错误路径。
 */
export function buildScanCacheKey(
  patterns: string | string[],
  cwd: string,
): string {
  const p = Array.isArray(patterns) ? patterns.slice().sort().join('|') : patterns
  return `${cwd}::${p}`
}

/**
 * 扫描文件，返回**路径数组**（非文件内容）。
 *
 * 结果通过 `ctx.scanCache` 共享，缓存键包含 patterns + cwd。
 *
 * **缓存失效**：必须由 chokidar 的 `add`/`change`/`unlink` 事件触发
 * `ctx.invalidateScan(cacheKey)`，否则新增/删除/重命名文件会导致路径列表过期。
 * 可使用 `bindScanInvalidation` 自动绑定失效逻辑。
 *
 * @param ctx Unh 上下文
 * @param patterns glob 模式
 * @param options 扫描选项
 */
export async function scanFiles(
  ctx: UnhContext,
  patterns: string | string[],
  options: ScanOptions = {},
): Promise<string[]> {
  const cwd = options.cwd ? resolve(options.cwd) : ctx.root
  const useCache = options.cache !== false
  const key = buildScanCacheKey(patterns, cwd)

  if (useCache) {
    const cached = ctx.scanCache.get(key)
    if (cached) {
      return cached.files
    }
  }

  const files = await glob(patterns, {
    cwd,
    absolute: options.absolute,
    ignore: options.ignore,
  })

  if (useCache) {
    const entry: ScanCacheEntry = { files, timestamp: Date.now() }
    ctx.scanCache.set(key, entry)
  }

  return files
}

/**
 * 将 chokidar watcher 的文件事件绑定到扫描缓存失效逻辑。
 *
 * 任何 `add`/`change`/`unlink` 事件都会清空全部扫描缓存
 * （因为单个文件变更可能影响任意 patterns 的命中结果）。
 * 若需精细失效，可传入 `predicate` 限定仅失效特定缓存键。
 *
 * **注意**：此函数返回的解除绑定函数应在 watcher 关闭时调用。
 */
export function bindScanInvalidation(
  ctx: UnhContext,
  watcher: FSWatcher,
  predicate?: (cacheKey: string) => boolean,
): () => void {
  const invalidate = () => {
    if (predicate) {
      for (const key of ctx.scanCache.keys()) {
        if (predicate(key)) {
          ctx.scanCache.delete(key)
        }
      }
    }
    else {
      ctx.scanCache.clear()
    }
  }

  watcher.on('add', invalidate)
  watcher.on('change', invalidate)
  watcher.on('unlink', invalidate)
  watcher.on('addDir', invalidate)
  watcher.on('unlinkDir', invalidate)

  return () => {
    watcher.off('add', invalidate)
    watcher.off('change', invalidate)
    watcher.off('unlink', invalidate)
    watcher.off('addDir', invalidate)
    watcher.off('unlinkDir', invalidate)
  }
}
