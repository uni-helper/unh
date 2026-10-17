import process from 'node:process'
import {
  reportDeployResults,
  resolveDeployAction,
  resolveDeployConfigFile,
  resolveDeployPlatforms,
  splitDeployTargets,
} from '@/logics'
import { logger } from '@/utils/log'
import { getCliConfig } from '../config'

/**
 * 部署命令的选项
 */
export interface DeployCommandOptions {
  platform?: string | string[]
  action?: string
  cwd?: string
  config?: string | false
  appVersion?: string
  desc?: string
  projectPath?: string
}

/**
 * 处理 deploy 命令。
 *
 * 借助 `@uni-helper/deploy` 的 SDK 能力完成上传体验版、生成预览二维码、
 * 打开开发者工具等动作。平台与动作在本层先行校验并给出中文提示；
 * 其余配置完全交给 SDK 读取 `unh.config.ts` 的 `deploy` 字段，
 * 因此配置项、环境变量与优先级都与 `uni-deploy` 保持一致。
 */
export async function handleDeployCommand(
  targets: string[] | undefined,
  options: DeployCommandOptions,
): Promise<void> {
  const config = getCliConfig()
  const cwd = options.cwd || process.cwd()

  try {
    const parsed = splitDeployTargets(targets ?? [])

    // 显式传入的 -a/--action 优先于位置参数中的动作
    const action = resolveDeployAction(options.action ?? parsed.action)
    // -p/--platform 与位置参数中的平台取并集，位置参数在前以保持书写顺序
    const platform = resolveDeployPlatforms(
      [...parsed.platforms, ...(options.platform !== undefined ? [options.platform].flat() : [])],
      config,
    )

    // 仅显式传入时才覆盖，避免以 undefined 干扰 SDK 的配置优先级
    const inlineConfig = {
      ...(options.appVersion ? { version: options.appVersion } : {}),
      ...(options.desc ? { desc: options.desc } : {}),
      ...(options.projectPath ? { projectPath: options.projectPath } : {}),
    }

    // 部署 SDK 及其二维码相关依赖较重，仅在真正执行部署时加载
    const { deploy } = await import('@uni-helper/deploy')

    const results = await deploy({
      action,
      platform,
      cwd,
      config: inlineConfig,
      configFile: resolveDeployConfigFile(options.config),
    })

    if (!reportDeployResults(results)) {
      process.exitCode = 1
    }
  }
  catch (error) {
    logger.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
