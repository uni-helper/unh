import type { BuildPhase } from '@/cli/types'
import type { ManifestOptions, UniHelperConfig } from '@/config/types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { yellow } from 'kolorist'
import { isPackageExists } from 'local-pkg'
import { loadConfig } from 'unconfig'

export function writeFileSync(path: string, content: string) {
  fs.writeFileSync(path, content, { encoding: 'utf-8' })
}

export interface GenerateJsonFileOptions {
  outDir: string
  name: string
  json: string
  force: boolean
}

export function generateJsonFile(options: GenerateJsonFileOptions) {
  const resolvedJSONPath = path.join(process.cwd(), options.outDir, `${options.name}.json`)

  if (!options.force && fs.existsSync(resolvedJSONPath)) {
    return
  }

  writeFileSync(resolvedJSONPath, options.json)
}

/**
 * 生成配置文件
 */
export async function generateConfigFiles(
  config: UniHelperConfig,
  phase: BuildPhase,
): Promise<void> {
  const outDir = config.autoGenerate?.outDir || 'src'

  const shouldGeneratePages = shouldAutoGenerate(config.autoGenerate?.pages, phase, 'pages')
  const shouldGenerateManifest = shouldAutoGenerate(config.autoGenerate?.manifest, phase, 'manifest')
  if (shouldGeneratePages) {
    const json = JSON.stringify(
      { pages: [{ path: '' }] },
      null,
      2,
    )

    generateJsonFile({
      outDir,
      name: 'pages',
      json,
      force: false,
    })
  }

  if (shouldGenerateManifest) {
    const { config: manifestConfig } = await loadConfig({
      sources: [{ files: 'manifest.config' }],
      merge: false,
    })

    const opts = resolveManifestOptions(config.autoGenerate?.manifest)

    const json = JSON.stringify(
      manifestConfig || {},
      null,
      opts.minify ? 0 : 2,
    )
    + (opts.insertFinalNewline ? '\n' : '')

    generateJsonFile({
      outDir,
      name: 'manifest',
      json,
      force: manifestConfig != null,
    })
  }
}

/**
 * 判断是否应该在当前阶段自动生成文件
 */
export function shouldAutoGenerate(
  configValue: boolean | string[] | { commands?: string[] } | undefined,
  phase: BuildPhase,
  type: 'pages' | 'manifest',
): boolean {
  if (configValue == null) {
    return false
  }

  if (!isPackageExists(`@uni-helper/vite-plugin-uni-${type}`)) {
    console.warn(`${yellow('警告')}: @uni-helper/vite-plugin-uni-${type} 未安装，无法自动生成 ${type}.json 文件`)
    return false
  }

  if (typeof configValue === 'boolean') {
    return configValue
  }

  const commands = Array.isArray(configValue)
    ? configValue
    : (configValue.commands || [])

  return commands.includes(phase)
}

/**
 * 合并 manifest 配置
 */
export function resolveManifestOptions(options: boolean | ManifestOptions | undefined): Required<ManifestOptions> {
  const defaultOptions = {
    minify: false,
    insertFinalNewline: false,
  }

  if (typeof options === 'boolean') {
    return defaultOptions
  }

  return {
    ...defaultOptions,
    ...options,
  }
}
