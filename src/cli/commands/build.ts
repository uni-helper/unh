import {
  composeUniCommand,
  executeAfterHooks,
  executeBeforeHooks,
  executeUniCommandOnBuild,
  loadEnv,
  preGenerateConfigFiles,
  resolveTargetPlatform,
} from '@/logics'
import { getCliConfig, setGlobalConfig } from '../config'

/**
 * 处理构建/开发命令
 */
export async function handleBuildCommand(
  argument: string | undefined,
  options: Record<string, any>,
  rawArgs: string[],
): Promise<void> {
  const config = getCliConfig()
  const platform = resolveTargetPlatform(argument, config)
  setGlobalConfig({ type: 'build', platform })

  const mode = options.m || options.mode || 'production'
  const envData = config.env ? await loadEnv(platform, mode, config.env) : undefined

  const uniCommand = composeUniCommand('build', platform, rawArgs)
  console.log(`> ${uniCommand} \n`)

  // 预生成配置文件（pages.json、manifest.json 等），避免 uni 基于占位内容误判编译开关
  preGenerateConfigFiles(platform)

  // 执行自定义前置钩子
  await executeBeforeHooks('build', config, options, platform, envData)

  // 执行uni命令
  executeUniCommandOnBuild(uniCommand)

  // 执行自定义后置钩子
  await executeAfterHooks('build', config, options, platform, envData)
}
