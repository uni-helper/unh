import type { CAC } from 'cac'
import type { CommandType } from '@/cli/types'
import type { UniHelperConfig } from '@/config/types'
import type { Platform } from '@/constants'
import process from 'node:process'
import { spawn, sync } from 'cross-spawn'
import { TERMINAL_DEV_FLAG, TERMINAL_SKIP_OUTPUTS } from '@/constants/terminal'
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

  if (command === 'dev' && config.hooks?.onDevAfter) {
    await config.hooks.onDevAfter({ platform, options, envData })
  }
}

function buildCommandOptions<T extends 'pipe' | 'inherit'>(uniCommand: string, stdio: T) {
  const [command, ...args] = uniCommand.split(' ')
  return {
    command,
    args,
    options: {
      stdio,
      cwd: process.cwd(),
      env: Object.assign({}, process.env, { FORCE_COLOR: true, UNI_HBUILDERX_LANGID: 'zh-CN' }),
    },
  }
}

/**
 * 执行uni命令
 */
export function executeUniCommandOnDev(uniCommand: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const { command, args, options } = buildCommandOptions(uniCommand, 'pipe')

    const { stdout, stderr } = spawn(command, args, options)

    stdout.on('data', (data) => {
      let output: string = data.toString()

      const shouldFilter = TERMINAL_SKIP_OUTPUTS.some(skipOutput => output.includes(skipOutput))

      if (output.match(TERMINAL_DEV_FLAG)) {
        resolve()
      }

      if (!shouldFilter) {
        output = applyOutputProcessors(output)

        process.stdout.write(output)
      }
    })

    stderr.on('data', (data) => {
      process.stderr.write(data.toString())
    })

    stdout.on('error', reject)
    stderr.on('error', reject)
  })
}

/**
 * 同步执行uni命令
 */
export function executeUniCommandOnBuild(uniCommand: string) {
  const { command, args, options } = buildCommandOptions(uniCommand, 'inherit')

  sync(command, args, options)
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
