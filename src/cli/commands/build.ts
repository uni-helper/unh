import type { UniHelperConfig } from '@/config/types'
import { composeUniCommand, executeAfterHooks, executeBeforeHooks, executeUniCommand, generateConfigFiles, loadEnv, resolveTargetPlatform } from '@/utils'

/**
 * 处理构建/开发命令
 */
export async function handleBuildCommand(
  argument: string | undefined,
  config: UniHelperConfig,
  options: Record<string, any>,
  rawArgs: string[],
): Promise<void> {
  const platform = resolveTargetPlatform(argument, config)
  const mode = options.m || options.mode || 'production'
  const envData = config.env ? await loadEnv(platform, mode, config.env) : undefined
  const uniCommand = composeUniCommand('build', platform, rawArgs)
  console.log(`> ${uniCommand} \n`)

  // 生成配置文件
  await generateConfigFiles(config, 'build')

  // 执行自定义前置钩子
  await executeBeforeHooks('build', config, options, platform, mode, envData)

  // 执行uni命令
  await executeUniCommand(uniCommand)

  // 执行自定义后置钩子
  await executeAfterHooks('build', config, options, platform, mode, envData)
}
