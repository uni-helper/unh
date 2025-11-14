import type { UniHelperConfig } from '@/config/types'
import { executeAfterHooks, executeBeforeHooks, executeUniCommand, generateConfigFiles, loadEnv, resolveTargetPlatform } from '@/utils'

/**
 * 处理构建/开发命令
 */
export async function handleBuildCommand(
  argument: string | undefined,
  config: UniHelperConfig,
  options: Record<string, any>,
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)
  const mode = options.m || options.mode || 'production'

  // 加载环境变量
  if (config.env) {
    const envData = await loadEnv(platform, mode, config.env)
    if (config.hooks?.onEnvLoaded) {
      await config.hooks.onEnvLoaded(platform, options, envData)
    }
  }

  // 生成配置文件
  await generateConfigFiles(config, 'build')

  // 执行自定义前置钩子
  await executeBeforeHooks(config, 'build', platform, options)

  // 执行uni命令
  await executeUniCommand('build', platform, options)

  // 执行自定义后置钩子
  await executeAfterHooks(config, platform, options)
}
