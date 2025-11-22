import { composeUniCommand, executeBeforeHooks, executeUniCommand, generateConfigFiles, loadEnv, resolveTargetPlatform } from '@/logics'
import { getCliConfig, setGlobalConfig } from '../config'

/**
 * 处理开发命令
 */
export async function handleDevCommand(
  argument: string | undefined,
  options: Record<string, any>,
  rawArgs: string[],
): Promise<void> {
  const config = getCliConfig()
  const platform = resolveTargetPlatform(argument, config)
  setGlobalConfig({ type: 'dev', platform })

  const mode: string = options.m || options.mode || 'development'
  const envData = config.env ? await loadEnv(platform, mode, config.env) : undefined

  const uniCommand = composeUniCommand('dev', platform, rawArgs)
  console.log(`> ${uniCommand} \n`)

  // 生成配置文件
  await generateConfigFiles(config, 'dev')

  // 执行自定义钩子
  await executeBeforeHooks('dev', config, options, platform, envData)

  // 执行uni命令
  await executeUniCommand(uniCommand)
}
