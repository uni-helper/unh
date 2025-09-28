export const PLATFORM = [
  // 应用
  'app',
  'app-plus',
  'app-android',
  'app-ios',
  'app-harmony',

  // 自定义
  'custom',

  // h5
  'h5',
  'h5:ssr',

  // 小程序
  'mp-alipay',
  'mp-baidu',
  'mp-harmony',
  'mp-jd',
  'mp-kuaishou',
  'mp-lark',
  'mp-qq',
  'mp-toutiao',
  'mp-weixin',
  'mp-xhs',

  // 快应用
  'quickapp-webview',
  'quickapp-webview-huawei',
  'quickapp-webview-union',
] as const

export type Platforms = typeof PLATFORM
export type Platform = (typeof PLATFORM)[number]
