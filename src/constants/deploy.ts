import type { DeployAction } from '@uni-helper/deploy'

/**
 * 支持部署的小程序平台。
 *
 * 与 `@uni-helper/deploy` 的 `PLATFORMS` 保持一致，这里单独声明一份，
 * 是为了在不加载部署 SDK（其二维码相关依赖较重）的前提下提前校验平台，
 * 真正执行部署时仍会由 SDK 再做一次校验。
 */
export const DEPLOY_PLATFORMS = [
  'mp-weixin',
  'mp-alipay',
  'mp-toutiao',
  'mp-baidu',
  'mp-jd',
  'mp-dingtalk',
] as const

export type DeployPlatform = (typeof DEPLOY_PLATFORMS)[number]

/**
 * 支持的部署动作，与 `@uni-helper/deploy` 的 `DeployAction` 保持一致
 */
export const DEPLOY_ACTIONS = ['upload', 'preview', 'open'] as const satisfies readonly DeployAction[]

/**
 * 默认部署动作：上传代码作为体验版
 */
export const DEFAULT_DEPLOY_ACTION: DeployAction = 'upload'

/**
 * 部署动作的中文描述
 */
export const DEPLOY_ACTION_DESCRIPTIONS: Record<DeployAction, string> = {
  upload: '上传代码作为体验版',
  preview: '上传代码作为开发版并生成预览二维码',
  open: '打开小程序开发者工具',
}

/**
 * 部署平台的中文名称，与 `@uni-helper/deploy` 的 `PLATFORM_LABELS` 保持一致
 */
export const DEPLOY_PLATFORM_LABELS: Record<DeployPlatform, string> = {
  'mp-weixin': '微信小程序',
  'mp-alipay': '支付宝小程序',
  'mp-toutiao': '字节跳动小程序',
  'mp-baidu': '百度小程序',
  'mp-jd': '京东小程序',
  'mp-dingtalk': '钉钉小程序',
}
