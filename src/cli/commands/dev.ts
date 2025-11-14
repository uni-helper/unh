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
  const mode = options.m || options.mode || 'development'

  // 加载环境变量
  if (config.env) {
    const envData = await loadEnv(platform, mode, config.env)
    if (config.hooks?.onEnvLoaded) {
      await config.hooks.onEnvLoaded(platform, options, envData)
    }
  }

  // 生成配置文件
  await generateConfigFiles(config, 'dev')

  // 执行自定义钩子
  await executeBeforeHooks(config, 'dev', platform, options)

  // 执行uni命令
  await executeUniCommand('dev', platform, options)
}
