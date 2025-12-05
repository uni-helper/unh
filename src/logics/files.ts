import type { BuildPhase } from '@/cli/types'
import type { ManifestOptions, UniHelperConfig } from '@/config/types'
import fs from 'node:fs'
import process from 'node:process'
import { yellow } from 'kolorist'
import { isPackageExists } from 'local-pkg'
import path from 'pathe'
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
  configValue: boolean | BuildPhase[] | ManifestOptions & { commands?: BuildPhase[] } | undefined,
  phase: BuildPhase,
  type: 'pages' | 'manifest',
): boolean {
  // 未配置或为false不生成
  if (configValue === false || configValue === undefined) {
    return false
  }

  // 插件未安装时默认不生成
  if (!isPackageExists(`@uni-helper/vite-plugin-uni-${type}`)) {
    console.warn(`${yellow('警告')}: @uni-helper/vite-plugin-uni-${type} 未安装，无法自动生成 ${type}.json 文件`)
    return false
  }

  // 配置为 true 时默认生成
  if (typeof configValue === 'boolean') {
    return configValue
  }

  // 配置为数组时，包含当前阶段时默认生成
  if (Array.isArray(configValue)) {
    return configValue.includes(phase)
  }

  // 配置为对象时，未指定 commands 时默认生成
  if (configValue.commands === undefined) {
    return true
  }

  // 配置为对象时，指定 commands 时，包含当前阶段时默认生成
  return configValue.commands.includes(phase)
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
