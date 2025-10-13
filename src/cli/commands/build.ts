import type { UniHelperConfig } from '@/config/types'
import { executeCustomHooks, executeUniCommand, generateConfigFiles, resolveTargetPlatform } from './common'

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
