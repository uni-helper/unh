import type { UnhContext } from './context'
import type { SFCParseResult } from './types'
import { parse as compilerSfcParse } from '@vue/compiler-sfc'

/**
 * 解析 Vue SFC，结果通过 `ctx.sfcCache` 全局共享。
 *
 * **这是性能优化的核心**：所有模块必须调用此函数获取 SFC 解析结果，
 * 禁止直接调用 `@vue/compiler-sfc.parse()`。
 *
 * 缓存失效策略：
 * - 通过 `code` 对比实现自动失效：源码变更后下次调用会重新解析
 * - 文件被删除/重命名时，由 watcher 调用 `ctx.invalidateSFC(filePath)` 主动清除
 *
 * @param ctx Unh 上下文
 * @param filePath 文件绝对路径
 * @param code 文件源码
 */
export function parseSFC(
  ctx: UnhContext,
  filePath: string,
  code: string,
): SFCParseResult {
  const cached = ctx.sfcCache.get(filePath)

  // 命中缓存：源码未变更时直接复用
  if (cached && cached.code === code) {
    return cached
  }

  // 未命中或源码已变更：重新解析
  const result = compilerSfcParse(code, { filename: filePath })
  const entry: SFCParseResult = {
    code,
    result,
    timestamp: Date.now(),
  }
  ctx.sfcCache.set(filePath, entry)
  ctx.hooks.callHook('sfc:parse', filePath, entry)
  return entry
}

/**
 * 从缓存中获取已解析的 SFC（不触发重新解析）。
 * 若缓存不存在则返回 undefined。用于 transform 钩子中复用 core 预解析结果。
 */
export function getCachedSFC(
  ctx: UnhContext,
  filePath: string,
): SFCParseResult | undefined {
  return ctx.sfcCache.get(filePath)
}
