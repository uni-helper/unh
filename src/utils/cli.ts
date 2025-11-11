import type { CommandType } from '@/cli/types'
import type { UniHelperConfig } from '@/config/types'
import type { Platforms } from '@/constant'
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
): string {
  const inputPlatform = argument || config.platform?.default || 'h5'
  return resolvePlatformAlias(inputPlatform, config.platform?.alias || {})
}

/**
 * 执行自定义钩子
 */
export async function executeCustomHooks(
  config: UniHelperConfig,
  command: CommandType,
  platform: string,
  options?: Record<string, any>,
): Promise<void> {
  if (command === 'dev' && config.hooks?.dev) {
    await config.hooks.dev(platform, options)
  }

  if (command === 'build' && config.hooks?.build) {
    await config.hooks.build(platform, options)
  }

  if (command === 'prepare' && config.hooks?.prepare) {
    await config.hooks.prepare()
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
