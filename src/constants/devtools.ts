import type { MPPlatform } from './platform'

export const DEVTOOLS_BUNDLE_ID = {
  'mp-weixin': {
    mac: 'wechatwebdevtools',
    windows: '微信开发者工具',
  },
} as Record<MPPlatform, { mac: string, windows: string }>
