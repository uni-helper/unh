import type { UnhContext } from '@uni-helper/unh-core'
import type { ResolvedOptions } from './types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolveManifestJsonPath } from './constant'

/**
 * Write the resolved manifest config to `manifest.json`.
 *
 * **Unh 改造点**：写入完成后触发 `manifest:extend` hook，
 * 通知其他模块当前 manifest 数据。
 *
 * Skips the write when the content is unchanged, avoiding unnecessary downstream recompiles.
 */
export function writeManifestJson(config: any = {}, opts?: ResolvedOptions, unhCtx?: UnhContext): void {
  const path = resolveManifestJsonPath()
  const content = JSON.stringify(config, null, opts?.minify ? 0 : 2) + (opts?.insertFinalNewline ? '\n' : '')

  // 通知其他模块当前 manifest 数据（无论是否实际写入文件）
  if (unhCtx)
    unhCtx.hooks.callHook('manifest:extend', config)

  if (existsSync(path) && readFileSync(path, 'utf-8') === content)
    return
  writeFileSync(path, content)
}

/** Ensure `manifest.json` exists; create an empty one if missing. */
export function ensureManifestJsonExists(): void {
  if (!existsSync(resolveManifestJsonPath()))
    writeManifestJson()
}
