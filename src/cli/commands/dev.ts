import type { UniHelperConfig } from '../../config/types'
import { executeCustomHooks, executeUniCommand, generateConfigFiles, resolveTargetPlatform } from '@/utils'

/**
 * 处理开发命令
 */
export async function handleDevCommand(
  argument: string | undefined,
  config: UniHelperConfig,
  options: Record<string, any>,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)

  // 生成配置文件
  await generateConfigFiles(config, 'dev')

  // 执行自定义钩子
  await executeCustomHooks(config, 'dev', platform)

  // 执行uni命令
  await executeUniCommand('dev', platform, options)
}
