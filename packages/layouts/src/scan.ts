import type { UnhContext } from '@uni-helper/unh-core'
import type { Layout } from './types'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { scanFiles } from '@uni-helper/unh-core'
import { camelCase, kebabCase, pascalCase, splitByCase } from 'scule'
import { globSync } from 'tinyglobby'
import { normalizePath } from 'vite'

/**
 * Scan layout files and generate Layout metadata.
 *
 * **Unh 改造点**：优先使用 unh-core 的 `scanFiles(ctx, ...)` 共享扫描缓存
 * （带 chokidar 事件失效）。若 ctx 未提供（兼容独立调用场景），
 * 回退到 `tinyglobby.globSync` 直接扫描。
 */
export async function scanLayouts(
  dir = 'src/layouts',
  cwd = process.cwd(),
  ctx?: UnhContext,
): Promise<Layout[]> {
  const resolvedDir = resolve(cwd, dir)
  const pattern = '**/*.vue'
  const ignore = ['node_modules', '.git', '**/__*__/*']

  let files: string[]
  if (ctx) {
    files = await scanFiles(ctx, [pattern], {
      cwd: resolvedDir,
      ignore,
      absolute: false,
    })
  }
  else {
    files = globSync(pattern, {
      onlyFiles: true,
      ignore,
      cwd: resolvedDir,
    })
  }

  files.sort()
  return parseLayoutFiles(files, resolvedDir)
}

/** 从文件路径数组生成 Layout 元数据 */
function parseLayoutFiles(files: string[], dir: string): Layout[] {
  const layouts: Layout[] = []

  for (const file of files) {
    const filePath = normalizePath(join(dir, file))
    const dirNameParts = splitByCase(
      normalizePath(relative(dir, dirname(filePath))),
    )
    let fileName = basename(filePath, extname(filePath))
    if (fileName.toLowerCase() === 'index')
      fileName = basename(dirname(filePath))

    const fileNameParts = splitByCase(fileName)
    const componentNameParts: string[] = []

    while (
      dirNameParts.length
      && (dirNameParts[0] || '').toLowerCase()
      !== (fileNameParts[0] || '').toLowerCase()
    ) {
      componentNameParts.push(dirNameParts.shift()!)
    }

    const pascalName
      = pascalCase(componentNameParts) + pascalCase(fileNameParts)
    const camelName = camelCase(pascalName)
    const kebabName = kebabCase(pascalName)
    layouts.push({
      name: camelName,
      path: filePath,
      pascalName,
      kebabName,
    })
  }
  return layouts
}
