import type { UnhContext } from '@uni-helper/unh-core'
import type { SFCDescriptor } from '@vue/compiler-sfc'
import type { Page, ResolvedOptions, UserOptions } from './types'
import path, { relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { parseSFC } from '@uni-helper/unh-core'
import { normalizePath } from 'vite'

function slash(str: string): string {
  return str.replace(/\\|\//g, sep)
}

export function resolveOptions(userOptions: UserOptions = {}): ResolvedOptions {
  return {
    layout: 'default',
    layoutDir: 'src/layouts',
    cwd: process.cwd(),
    ...userOptions,
  }
}

/**
 * Find the page matching a given file path.
 *
 * **Unh 改造点**：不再从 pages.json 读取页面列表，
 * 而是由 Context 通过 `pages:extend` hook 维护 `this.pages`。
 * 此函数仅负责路径匹配逻辑，保持与原插件一致。
 */
export function getTarget(
  resolvePath: string,
  pages: Page[] = [],
  layout = 'default',
  cwd = process.cwd(),
) {
  if (!(resolvePath.endsWith('.vue') || resolvePath.endsWith('.nvue')))
    return false

  const hasSrcDir = slash(resolvePath).includes(resolve(cwd, 'src'))

  const relativePath = relative(resolve(cwd, hasSrcDir ? 'src' : ''), resolvePath)
  const fileWithoutExt = path.basename(
    relativePath,
    path.extname(relativePath),
  )
  const pathWithoutExt = normalizePath(
    path.join(path.dirname(relativePath), fileWithoutExt),
  )

  const page = pages.find(p => normalizePath(p.path) === pathWithoutExt)
  if (page) {
    return {
      layout,
      ...page,
    } as Required<Page>
  }
  return false
}

/**
 * 通过 UnhContext 共享 SFC 解析缓存解析 SFC。
 *
 * 兼容 @vue/compiler-sfc 3.x（返回 { descriptor }）和 2.7（直接返回 descriptor）。
 */
export function parseSFCViaCtx(unhCtx: UnhContext, filePath: string, code: string): SFCDescriptor {
  const entry = parseSFC(unhCtx, filePath, code)
  const result = entry.result as any
  return result.descriptor || result
}
