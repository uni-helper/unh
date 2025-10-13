export const PLATFORM_DESCRIPTIONS = {
  // 应用
  'app': '通用应用平台',
  'app-plus': 'uni-app 应用平台',
  'app-android': 'Android 应用平台',
  'app-ios': 'iOS 应用平台',
  'app-harmony': '鸿蒙应用平台',

  // 自定义
  'custom': '自定义平台',

  // h5
  'h5': 'HTML5 网页平台',
  'h5:ssr': 'HTML5 服务端渲染平台',

  // 小程序
  'mp-alipay': '支付宝小程序',
  'mp-baidu': '百度小程序',
  'mp-harmony': '鸿蒙小程序',
  'mp-jd': '京东小程序',
  'mp-kuaishou': '快手小程序',
  'mp-lark': '飞书小程序',
  'mp-qq': 'QQ小程序',
  'mp-toutiao': '字节跳动小程序',
  'mp-weixin': '微信小程序',
  'mp-xhs': '小红书小程序',

  // 快应用
  'quickapp-webview': '快应用 WebView',
  'quickapp-webview-huawei': '华为快应用',
  'quickapp-webview-union': '快应用联盟',
} as const

export const PLATFORM = Object.keys(PLATFORM_DESCRIPTIONS) as readonly (keyof typeof PLATFORM_DESCRIPTIONS)[]

export type Platforms = typeof PLATFORM
export type Platform = (typeof PLATFORM)[number]
export type PlatformDescriptions = typeof PLATFORM_DESCRIPTIONS
