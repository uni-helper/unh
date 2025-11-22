import type { CAC } from 'cac'
import type { CommandType } from '@/cli/types'
import type { UniHelperConfig } from '@/config/types'
import type { Platform } from '@/constants'
import process from 'node:process'
import { spawn } from 'cross-spawn'
import { TERMINAL_SKIP_OUTPUTS } from '@/constants/terminal'
import { resolvePlatformAlias } from './platform'
import { applyOutputProcessors } from './terminal'

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
  options?: Record<string, any>,
  platform?: Platform,
  envData?: Record<string, string>,
): Promise<void> {
  if (command === 'dev' && config.hooks?.dev) {
    await config.hooks.dev({ platform, options, envData })
  }

  if (command === 'build' && config.hooks?.build) {
    await config.hooks.build({ platform, options, envData })
  }

  if (command === 'prepare' && config.hooks?.prepare) {
    await config.hooks.prepare()
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
  envData?: Record<string, string>,
): Promise<void> {
  if (command === 'build' && config.hooks?.onBuildAfter) {
    await config.hooks.onBuildAfter({ platform, options, envData })
  }
}

/**
 * 执行uni命令
 */
export async function executeUniCommand(uniCommand: string): Promise<void> {
  const [command, ...args] = uniCommand.split(' ')

  const { stdout, stderr } = spawn(command, args, {
    stdio: 'pipe',
    cwd: process.cwd(),
    env: Object.assign({}, process.env, { FORCE_COLOR: true, UNI_HBUILDERX_LANGID: 'zh-CN' }),
  })

  stdout.on('data', (data) => {
    let output = data.toString()

    // 过滤掉不需要显示的内容
    const shouldFilter = TERMINAL_SKIP_OUTPUTS.some(skipOutput => output.includes(skipOutput))

    if (!shouldFilter) {
      // 应用输出替换规则
      output = applyOutputProcessors(output)

      process.stdout.write(output)
    }
  })

  stderr.on('data', (data) => {
    process.stderr.write(data.toString())
  })
}

/**
 * 获取原始的命令行参数
 */
export function getRawOptions(cli: CAC, platform: string): string[] {
  // 解析命令行参数，移除前两个元素（node 可执行文件路径和脚本文件路径）
  const rawArgs = cli.rawArgs.slice(2)

  // 获取原始属性，如果包含平台参数则从索引2开始，否则从索引1开始
  const rawOptions = rawArgs.slice(rawArgs[1] === platform ? 2 : 1)

  return rawOptions
}
