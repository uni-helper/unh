import type { DeployAction, DeployResult } from '@uni-helper/deploy'
import type { UniHelperConfig } from '../config/types'
import type { DeployPlatform } from '../constants/deploy'
import {
  DEFAULT_DEPLOY_ACTION,
  DEPLOY_ACTION_DESCRIPTIONS,
  DEPLOY_ACTIONS,
  DEPLOY_PLATFORM_LABELS,
  DEPLOY_PLATFORMS,
} from '../constants/deploy'
import { logger } from '../utils/log'
import { resolvePlatformAlias } from './platform'

/**
 * 把单个平台名解析为标准部署平台名。
 *
 * 先经由 unh 的平台别名转换（`wx` → `mp-weixin`），再校验其具备部署能力；
 * `h5` 等无法部署的编译平台会被明确拒绝，而不是交给部署 SDK 报错。
 */
function toDeployPlatform(input: string, config: UniHelperConfig): DeployPlatform {
  const aliased = resolvePlatformAlias(input, config.platform?.alias || {})

  if ((DEPLOY_PLATFORMS as readonly string[]).includes(aliased)) {
    return aliased as DeployPlatform
  }

  throw new Error(
    `不支持部署的平台 "${input}"，支持部署的平台：${DEPLOY_PLATFORMS.join('、')}`,
  )
}

/**
 * 解析待部署的平台列表。
 *
 * 位置参数与 `-p, --platform` 均支持，二者取并集；每个参数都可用逗号分隔
 * 多个平台，也允许重复传入。均未指定时返回 `undefined`，
 * 由部署 SDK 依据配置自行推断。
 */
export function resolveDeployPlatforms(
  input: string | string[] | undefined,
  config: UniHelperConfig,
): DeployPlatform[] | undefined {
  if (input === undefined) {
    return undefined
  }

  const names = (Array.isArray(input) ? input : [input])
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean)

  if (!names.length) {
    return undefined
  }

  // 去重的同时保持用户传入的顺序
  return [...new Set(names.map(name => toDeployPlatform(name, config)))]
}

/**
 * 解析部署动作，缺省为上传体验版。
 */
export function resolveDeployAction(input: string | undefined): DeployAction {
  if (input === undefined) {
    return DEFAULT_DEPLOY_ACTION
  }

  if ((DEPLOY_ACTIONS as readonly string[]).includes(input)) {
    return input as DeployAction
  }

  const supported = DEPLOY_ACTIONS
    .map(action => `${action}（${DEPLOY_ACTION_DESCRIPTIONS[action]}）`)
    .join('、')

  throw new Error(`不支持的动作 "${input}"，可选：${supported}`)
}

/**
 * 拆分位置参数中的动作与平台。
 *
 * `unh deploy` 的位置参数既可以是平台，也可以像 `uni-deploy` 那样把动作写在
 * 最前面，因此首项命中动作时视为动作，其余项视为平台：
 *
 * - `['preview', 'wx']` → `{ action: 'preview', platforms: ['wx'] }`
 * - `['wx']` → `{ platforms: ['wx'] }`
 */
export function splitDeployTargets(targets: string[]): {
  action?: string
  platforms: string[]
} {
  const [first, ...rest] = targets

  if (first !== undefined && (DEPLOY_ACTIONS as readonly string[]).includes(first)) {
    return { action: first, platforms: rest }
  }

  return { platforms: targets }
}

/**
 * 解析 `--config` 传入的配置文件参数。
 *
 * 传 `false` 表示不读取配置文件，与 `uni-deploy` 的处理保持一致。
 */
export function resolveDeployConfigFile(
  input: string | false | undefined,
): string | false | undefined {
  if (input === false) {
    return false
  }

  if (typeof input === 'string') {
    const value = input.trim()
    return value === '' || value === 'false' ? false : value
  }

  return undefined
}

/**
 * 输出部署结果汇总，并决定是否需要以非零退出码结束。
 *
 * 各平台执行过程中的详细信息（二维码路径、失败原因等）已由部署 SDK 打印，
 * 这里只补充二维码位置与最终结论，避免重复刷屏。
 *
 * @returns 全部成功时返回 `true`
 */
export function reportDeployResults(results: DeployResult[]): boolean {
  const succeeded = results.filter(result => result.success)
  const failed = results.filter(result => !result.success)

  for (const result of succeeded) {
    if (result.qrCodeLocalPath) {
      logger.info(`【${DEPLOY_PLATFORM_LABELS[result.platform]}】二维码图片：${result.qrCodeLocalPath}`)
    }
  }

  if (!failed.length) {
    const labels = succeeded.map(result => DEPLOY_PLATFORM_LABELS[result.platform]).join('、')
    logger.success(`全部完成：${labels}`)
    return true
  }

  const failedLabels = failed.map(result => DEPLOY_PLATFORM_LABELS[result.platform]).join('、')
  logger.error(`失败 ${failed.length} 个（${failedLabels}），成功 ${succeeded.length} 个`)

  return false
}
