import type { UniHelperConfig } from '../config/types'
import type { Platform, Platforms } from '../constant'
import type { BuildPhase, CommandType } from './types'
import process from 'node:process'
import { PLATFORM } from '../constant'
import { UniHelperTerminalUi } from '../ui'
import { generateJsonFile } from '../utils/files'
import { resolvePlatformAlias } from '../utils/platform'

/**
 * 生成配置文件
 */
async function generateConfigFiles(
  config: UniHelperConfig,
  phase: BuildPhase,
): Promise<void> {
  const outDir = config.autoGenerate?.outDir || 'src'

  const shouldGeneratePages = shouldAutoGenerate(config.autoGenerate?.pages, phase)
  const shouldGenerateManifest = shouldAutoGenerate(config.autoGenerate?.manifest, phase)

  if (shouldGeneratePages) {
    generateJsonFile(outDir, 'pages')
  }

  if (shouldGenerateManifest) {
    generateJsonFile(outDir, 'manifest')
  }
}

/**
 * 解析目标平台
 */
function resolveTargetPlatform(
  argument: string | undefined,
  config: UniHelperConfig,
): string {
  const inputPlatform = argument || config.platform?.default || 'h5'
  return resolvePlatformAlias(inputPlatform, config.platform?.alias || {})
}

/**
 * 判断是否应该在当前阶段自动生成文件
 */
function shouldAutoGenerate(
  configValue: boolean | string | undefined,
  phase: BuildPhase,
): boolean {
  return configValue === true || configValue === phase
}

/**
 * 执行自定义钩子
 */
async function executeCustomHooks(
  config: UniHelperConfig,
  command: CommandType,
  platform: string,
): Promise<void> {
  if (command === 'dev' && config.prepare?.dev) {
    await config.prepare.dev(platform)
  }

  if (command === 'build' && config.prepare?.build) {
    await config.prepare.build(platform)
  }

  if (command === 'prepare' && config.prepare?.install) {
    await config.prepare.install()
  }
}

/**
 * 执行uni命令
 */
async function executeUniCommand(
  command: 'dev' | 'build',
  platform: string,
): Promise<void> {
  try {
    const { execSync } = await import('node:child_process')
    const uniCommand = `uni ${command} -p ${platform}`

    execSync(uniCommand, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
  }
  catch (error) {
    throw new Error(`Failed to execute uni command: ${error}`)
  }
}

/**
 * 组装终端UI平台列表
 * 1. 从配置文件中获取默认平台，默认值为'h5'
 * 2. 从配置文件中获取UI平台列表，默认值为所有平台
 * 3. 合并默认平台和UI平台列表，去重
 */
function assemblePlatforms(config: UniHelperConfig): Platforms {
  const defaultPlatform = config.platform?.default || 'h5'
  const uiPlatforms = config.ui?.platforms || PLATFORM
  return [...new Set([defaultPlatform, ...uiPlatforms])] as unknown as Platforms
}

/**
 * 启动终端UI
 */
async function startTerminalUI(platform: Platform, config: UniHelperConfig): Promise<void> {
  const terminalUi = new UniHelperTerminalUi(assemblePlatforms(config))
  terminalUi.render()
  terminalUi.startPlatform(platform)
  terminalUi.selectPlatform(platform)
  process.on('SIGTERM', () => {
    terminalUi.cleanup()
    process.exit(0)
  })
}

/**
 * 处理prepare命令
 */
export async function handlePrepareCommand(config: UniHelperConfig): Promise<void> {
  // 生成配置文件
  await generateConfigFiles(config, 'install')

  // 执行自定义安装钩子
  await executeCustomHooks(config, 'prepare', '')
}

/**
 * 处理构建/开发命令
 */
export async function handleBuildCommand(
  argument: string | undefined,
  config: UniHelperConfig,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)

  // 生成配置文件
  await generateConfigFiles(config, 'build')

  // 执行自定义钩子
  await executeCustomHooks(config, 'build', platform)

  // 执行uni命令
  await executeUniCommand('build', platform)
}

/**
 * 处理开发命令
 */
export async function handleDevCommand(
  argument: string | undefined,
  config: UniHelperConfig,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)

  // 生成配置文件
  await generateConfigFiles(config, 'dev')

  // 执行自定义钩子
  await executeCustomHooks(config, 'dev', platform)

  // 执行uni命令
  if (config.ui?.enabled) {
    await startTerminalUI(platform as Platform, config)
  }
  else {
    await executeUniCommand('dev', platform)
  }
}
