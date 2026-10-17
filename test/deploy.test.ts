import type { DeployResult } from '@uni-helper/deploy'
import type { UniHelperConfig } from '../src/config/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  reportDeployResults,
  resolveDeployAction,
  resolveDeployConfigFile,
  resolveDeployPlatforms,
  splitDeployTargets,
} from '../src/logics/deploy'
import { logger } from '../src/utils/log'

const config: UniHelperConfig = {
  platform: {
    default: 'mp-weixin',
    alias: {
      'h5': ['html'],
      'mp-weixin': ['wx'],
      'mp-alipay': ['ali'],
    },
  },
}

describe('resolveDeployPlatforms', () => {
  it('未指定平台时应返回 undefined，交给 SDK 依据配置推断', () => {
    expect(resolveDeployPlatforms(undefined, config)).toBeUndefined()
    expect(resolveDeployPlatforms([], config)).toBeUndefined()
    expect(resolveDeployPlatforms('', config)).toBeUndefined()
  })

  it('应解析标准平台名', () => {
    expect(resolveDeployPlatforms('mp-weixin', config)).toEqual(['mp-weixin'])
  })

  it('应经由 unh 的平台别名解析平台', () => {
    expect(resolveDeployPlatforms('wx', config)).toEqual(['mp-weixin'])
    expect(resolveDeployPlatforms('ali', config)).toEqual(['mp-alipay'])
  })

  it('应支持逗号分隔、多次传入与数组形式', () => {
    expect(resolveDeployPlatforms('mp-weixin,mp-alipay', config))
      .toEqual(['mp-weixin', 'mp-alipay'])
    expect(resolveDeployPlatforms(['wx', 'mp-baidu,mp-jd'], config))
      .toEqual(['mp-weixin', 'mp-baidu', 'mp-jd'])
  })

  it('应去除空白并忽略空项', () => {
    expect(resolveDeployPlatforms(' wx , , mp-jd ', config))
      .toEqual(['mp-weixin', 'mp-jd'])
  })

  it('应对重复平台去重并保持传入顺序', () => {
    expect(resolveDeployPlatforms(['mp-jd', 'wx', 'mp-jd'], config))
      .toEqual(['mp-jd', 'mp-weixin'])
  })

  it('应拒绝不支持部署的平台，且不支持的别名不参与部署', () => {
    expect(() => resolveDeployPlatforms('html', config)).toThrow('不支持部署的平台 "html"')
    expect(() => resolveDeployPlatforms('h5', config)).toThrow('不支持部署的平台 "h5"')
    expect(() => resolveDeployPlatforms('mp-qq', config)).toThrow('不支持部署的平台')
  })
})

describe('resolveDeployAction', () => {
  it('未指定动作时应默认为 upload', () => {
    expect(resolveDeployAction(undefined)).toBe('upload')
  })

  it('应接受全部受支持的动作', () => {
    expect(resolveDeployAction('upload')).toBe('upload')
    expect(resolveDeployAction('preview')).toBe('preview')
    expect(resolveDeployAction('open')).toBe('open')
  })

  it('应拒绝不支持的动作并列出可选值', () => {
    expect(() => resolveDeployAction('publish')).toThrow('不支持的动作 "publish"')
    expect(() => resolveDeployAction('publish')).toThrow('upload')
  })
})

describe('splitDeployTargets', () => {
  it('空参数应返回空平台列表', () => {
    expect(splitDeployTargets([])).toEqual({ platforms: [] })
  })

  it('仅有平台时应视为平台', () => {
    expect(splitDeployTargets(['wx'])).toEqual({ platforms: ['wx'] })
    expect(splitDeployTargets(['wx', 'ali'])).toEqual({ platforms: ['wx', 'ali'] })
  })

  it('首项命中动作时应视为动作，其余视为平台', () => {
    expect(splitDeployTargets(['preview', 'wx']))
      .toEqual({ action: 'preview', platforms: ['wx'] })
    expect(splitDeployTargets(['open', 'wx', 'ali']))
      .toEqual({ action: 'open', platforms: ['wx', 'ali'] })
  })

  it('仅有动作时应只返回动作', () => {
    expect(splitDeployTargets(['preview'])).toEqual({ action: 'preview', platforms: [] })
  })

  it('平台名恰好与动作同名时才按动作解析', () => {
    // `upload` 不是平台名，因此只有首项参与动作判定
    expect(splitDeployTargets(['wx', 'preview'])).toEqual({ platforms: ['wx', 'preview'] })
  })
})

describe('resolveDeployConfigFile', () => {
  it('未传入时应返回 undefined，使用默认配置文件', () => {
    expect(resolveDeployConfigFile(undefined)).toBeUndefined()
  })

  it('传入 false 或等价的字符串时应表示不读取配置文件', () => {
    expect(resolveDeployConfigFile(false)).toBe(false)
    expect(resolveDeployConfigFile('false')).toBe(false)
    expect(resolveDeployConfigFile('')).toBe(false)
    expect(resolveDeployConfigFile('  ')).toBe(false)
  })

  it('传入路径时应原样返回', () => {
    expect(resolveDeployConfigFile('./custom.ts')).toBe('./custom.ts')
  })
})

describe('reportDeployResults', () => {
  const result = (over: Partial<DeployResult>): DeployResult => ({
    platform: 'mp-weixin',
    action: 'upload',
    success: true,
    version: '1.0.0',
    desc: '',
    projectPath: 'dist/build/mp-weixin',
    qrCodeContent: '',
    qrCodeLocalPath: '',
    ...over,
  })

  beforeEach(() => {
    vi.spyOn(logger, 'success').mockImplementation(() => {})
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    vi.spyOn(logger, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('全部成功时应返回 true 并输出平台中文名', () => {
    const ok = reportDeployResults([
      result({ platform: 'mp-weixin' }),
      result({ platform: 'mp-alipay' }),
    ])

    expect(ok).toBe(true)
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('微信小程序、支付宝小程序'))
  })

  it('应输出二维码图片位置', () => {
    reportDeployResults([result({ qrCodeLocalPath: '/tmp/qr.png' })])

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/tmp/qr.png'))
  })

  it('存在失败时应返回 false 并统计数量', () => {
    const ok = reportDeployResults([
      result({ platform: 'mp-weixin' }),
      result({ platform: 'mp-jd', success: false, error: new Error('boom') }),
    ])

    expect(ok).toBe(false)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('失败 1 个'))
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('京东小程序'))
  })
})
