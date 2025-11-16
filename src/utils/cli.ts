import type { CommandType } from '@/cli/types'
import type { UniHelperConfig } from '@/config/types'
import type { Platform, Platforms } from '@/constant'
import process from 'node:process'
import { sync } from 'cross-spawn'
import { PLATFORM } from '@/constant'
import { resolvePlatformAlias } from './platform'

/**
 * 解析目标平台
 */
export function resolveTargetPlatform(
  argument: string | undefined,
  config: UniHelperConfig,
) {
  const inputPlatform = argument || config.platform?.default || 'h5'
  return resolvePlatformAlias(inputPlatform, config.platform?.alias || {}) as Platform
}

/**
 * 执行自定义前置钩子
 */
export async function executeBeforeHooks(
  command: CommandType,
  config: UniHelperConfig,
  options: Record<string, any>,
  platform?: Platform,
  mode?: string,
  envData?: Record<string, string>,
): Promise<void> {
  if (command === 'dev' && config.hooks?.dev) {
    await config.hooks.dev({ cliOptions: options, platform, mode, envData })
  }

  if (command === 'build' && config.hooks?.build) {
    await config.hooks.build({ cliOptions: options, platform, mode, envData })
  }

  if (command === 'prepare' && config.hooks?.prepare) {
    await config.hooks.prepare({ cliOptions: options })
  }
}

/**
 * 执行自定义后置钩子
 */
export async function executeAfterHooks(
  command: CommandType,
  config: UniHelperConfig,
  options: Record<string, any>,
  platform?: Platform,
  mode?: string,
  envData?: Record<string, string>,
): Promise<void> {
  if (command === 'build' && config.hooks?.onBuildAfter) {
    await config.hooks.onBuildAfter({ cliOptions: options, platform, mode, envData })
  }
}

/**
 * 执行uni命令
 */
export async function executeUniCommand(
  command: 'dev' | 'build',
  platform: string,
  options: Record<string, any>,
): Promise<void> {
  // 过滤掉 -- 属性（命令行解析器添加的特殊属性）
  const filteredOptions = Object.entries(options)
    .filter(([key]) => key !== '--')
    .map(([key, value]) => `--${key} ${value}`)
    .join(' ')

  const fullCustomCommand = `uni ${command} -p ${platform} ${filteredOptions}`.trim()
  const [uniCommand, ..._args] = fullCustomCommand.split(' ')

  const { error } = sync(uniCommand, [..._args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  })

  if (error)
    throw new Error(`Error executing command: ${error.message}`)
}

/**
 * 组装终端UI平台列表
 * 1. 从配置文件中获取默认平台，默认值为'h5'
 * 2. 从配置文件中获取UI平台列表，默认值为所有平台
 * 3. 合并默认平台和UI平台列表，去重
 */
export function assemblePlatforms(config: UniHelperConfig): Platforms {
  const defaultPlatform = config.platform?.default || 'h5'
  const uiPlatforms = config.ui?.platforms || PLATFORM
  return [...new Set([defaultPlatform, ...uiPlatforms])] as Platforms
}
