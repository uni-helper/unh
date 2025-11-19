import type { CAC } from 'cac'
import type { CommandType } from '@/cli/types'
import type { UniHelperConfig } from '@/config/types'
import type { Platform, Platforms } from '@/constants'
import process from 'node:process'
import { spawn } from 'cross-spawn'
import { PLATFORM } from '@/constants'
import { TERMINAL_REPLACE_OUTPUTS, TERMINAL_SKIP_OUTPUTS } from '@/constants/terminal'
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
 * 应用输出替换规则
 */
function applyOutputReplaceRules(output: string): string {
  let processedOutput = output

  for (const replaceRule of TERMINAL_REPLACE_OUTPUTS) {
    const { from, to } = replaceRule

    // 处理正则表达式规则
    if (from instanceof RegExp) {
      const match = processedOutput.match(from)
      if (match) {
        processedOutput = typeof to === 'function' ? to(match) : to
      }
    }
    // 处理字符串规则
    else if (typeof from === 'string' && processedOutput.includes(from)) {
      processedOutput = typeof to === 'function' ? to() : to
    }
  }

  return processedOutput
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
      output = applyOutputReplaceRules(output)

      process.stdout.write(output)
    }
  })

  stderr.on('data', (data) => {
    process.stderr.write(data.toString())
  })
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
