import { composeUniCommand, executeAfterHooks, executeBeforeHooks, executeUniCommandOnDev, loadEnv, preGenerateConfigFiles, resolveTargetPlatform } from '@/logics'
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

  // 预生成配置文件（pages.json、manifest.json 等），避免 uni 基于占位内容误判编译开关
  preGenerateConfigFiles(platform)

  // 执行自定义钩子
  await executeBeforeHooks('dev', config, options, platform, envData)

  // 执行uni命令
  await executeUniCommandOnDev(uniCommand)

  // 执行自定义后置钩子
  await executeAfterHooks('dev', config, options, platform, envData)
}
