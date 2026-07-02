import type { Context } from '../context'
import { scanFiles } from '@uni-helper/unh-core'
import Debug from 'debug'
import { globSync } from 'tinyglobby'

const debug = Debug('unh-components:glob')

/**
 * 扫描组件文件。
 *
 * **Unh 改造点**：当 ctx.unhCtx 可用时，优先使用 unh-core 的 `scanFiles`
 * 共享扫描缓存（带 chokidar 事件失效）；否则回退到 `tinyglobby.globSync`
 * 直接扫描以兼容独立使用场景。
 *
 * @returns 扫描到的文件路径数组（绝对路径）
 */
export async function searchComponents(ctx: Context): Promise<string[]> {
  debug(`started with: [${ctx.options.globs.join(', ')}]`)
  const root = ctx.root

  let files: string[]
  if (ctx.unhCtx) {
    files = await scanFiles(ctx.unhCtx, ctx.options.globs, {
      cwd: root,
      ignore: ctx.options.globsExclude,
      absolute: true,
    })
  }
  else {
    files = globSync(ctx.options.globs, {
      ignore: ctx.options.globsExclude,
      onlyFiles: true,
      cwd: root,
      absolute: true,
      expandDirectories: false,
    })
  }

  if (!files.length && !ctx.options.resolvers?.length)
    console.warn('[unh-components] no components found')

  debug(`${files.length} components found.`)

  ctx.addComponents(files)
  return files
}
