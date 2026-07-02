import type { ResolvedConfig, ViteDevServer } from 'vite'
import type {
  ResolvedUnhConfig,
  ScanCacheEntry,
  SFCParseResult,
  UnhHookable,
  UnhHooks,
  UnhModule,
} from './types'
import { createHooks } from 'hookable'

/**
 * Unh 共享上下文，是整个框架的核心。
 *
 * 所有模块共享同一个 `UnhContext` 实例：
 * - 通过 `hooks` 进行模块间通信（禁止直接 import 其他模块）
 * - 通过 `sfcCache` 共享 SFC 解析结果（每个文件最多解析一次）
 * - 通过 `scanCache` 共享文件扫描结果（带 chokidar 事件失效）
 * - 通过 `state` 传递临时元数据
 * - 通过 `modules` 注册表管理已安装模块
 */
export class UnhContext {
  /** hook 系统，模块间通信的核心 */
  hooks: UnhHookable = createHooks<UnhHooks>()

  /** Vite ResolvedConfig，在 config:resolved 后填充 */
  config: ResolvedConfig | null = null

  /** Vite DevServer，在 server:ready 后填充 */
  server: ViteDevServer | null = null

  /** SFC 解析缓存：filePath → 解析结果。通过 code 对比自动失效。 */
  sfcCache: Map<string, SFCParseResult> = new Map()

  /** 文件扫描缓存：缓存键 → 路径数组。通过 chokidar 事件主动失效。 */
  scanCache: Map<string, ScanCacheEntry> = new Map()

  /** 模块注册表：name → 模块实例 */
  modules: Map<string, UnhModule> = new Map()

  /** 共享状态：模块间传递临时元数据 */
  state: Map<string, unknown> = new Map()

  /** 项目根目录 */
  root: string

  /** 用户配置（已合并默认值） */
  options: ResolvedUnhConfig

  constructor(root: string, options: ResolvedUnhConfig = {}) {
    this.root = root
    this.options = options
  }

  // ===== 模块注册 =====

  /**
   * 注册一个模块。若同名模块已存在则抛错。
   * 注意：此方法仅登记，模块的 `setup` 由 `installModules` 统一执行。
   */
  registerModule(module: UnhModule): void {
    const name = module.meta.name
    if (this.modules.has(name)) {
      throw new Error(`[unh] 模块已注册: ${name}`)
    }
    this.modules.set(name, module)
  }

  /** 按名称获取已注册模块。 */
  getModule<T extends UnhModule = UnhModule>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined
  }

  // ===== SFC 缓存管理 =====

  /**
   * 失效指定文件的 SFC 缓存。未传参时清空全部。
   * 通常由文件监听器在 `change` / `unlink` 事件中调用。
   */
  invalidateSFC(filePath?: string): void {
    if (filePath) {
      this.sfcCache.delete(filePath)
    }
    else {
      this.sfcCache.clear()
    }
  }

  // ===== 文件扫描缓存管理 =====

  /**
   * 失效文件扫描缓存。
   * - 传 `cacheKey`：仅失效对应条目
   * - 不传：清空全部扫描缓存
   *
   * 必须由 chokidar 的 `add`/`change`/`unlink` 事件触发，
   * 否则新增/删除/重命名文件会导致路径列表过期（参见 project_memory 教训）。
   */
  invalidateScan(cacheKey?: string): void {
    if (cacheKey) {
      this.scanCache.delete(cacheKey)
    }
    else {
      this.scanCache.clear()
    }
  }

  /** 清空所有缓存（SFC + 扫描）。 */
  clearCaches(): void {
    this.sfcCache.clear()
    this.scanCache.clear()
  }

  // ===== 共享状态 =====

  /** 读取共享状态。 */
  getState<T = unknown>(key: string): T | undefined {
    return this.state.get(key) as T | undefined
  }

  /** 写入共享状态。 */
  setState<T = unknown>(key: string, value: T): void {
    this.state.set(key, value)
  }
}
