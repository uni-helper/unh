import type { UniHelperConfig } from '@/config/types'
import { executeAfterHooks, executeBeforeHooks, executeUniCommand, generateConfigFiles, resolveTargetPlatform } from '@/utils'

/**
 * 处理构建/开发命令
 */
export async function handleBuildCommand(
  argument: string | undefined,
  config: UniHelperConfig,
  options: Record<string, any>,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)

  // 生成配置文件
  await generateConfigFiles(config, 'build')

  // 执行自定义前置钩子
  await executeBeforeHooks(config, 'build', platform, options)

  // 执行uni命令
  await executeUniCommand('build', platform, options)

  // 执行自定义后置钩子
  await executeAfterHooks(config, platform, options)
}
