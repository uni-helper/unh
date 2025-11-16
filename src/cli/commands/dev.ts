import type { UniHelperConfig } from '@/config/types'
import { executeBeforeHooks, executeUniCommand, generateConfigFiles, loadEnv, resolveTargetPlatform } from '@/utils'

/**
 * 处理开发命令
 */
export async function handleDevCommand(
  argument: string | undefined,
  config: UniHelperConfig,
  options: Record<string, any>,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)
  const mode: string = options.m || options.mode || 'development'
  const envData = config.env ? await loadEnv(platform, mode, config.env) : undefined

  // 生成配置文件
  await generateConfigFiles(config, 'dev')

  // 执行自定义钩子
  await executeBeforeHooks('dev', config, options, platform, mode, envData)

  // 执行uni命令
  await executeUniCommand('dev', platform, options)
}
