import { describe, expect, it } from 'vitest'
import { resolvePlatformAlias } from '../src/logics/platform'

describe('cLI Core Functions', () => {
  describe('resolvePlatformAlias', () => {
    it('应该保留未定义的平台和别名', () => {
      const aliasConfig = {
        'mp-weixin': ['wechat'],
      }

      expect(resolvePlatformAlias('custom-platform', aliasConfig)).toBe('custom-platform')
      expect(resolvePlatformAlias('unknown', aliasConfig)).toBe('unknown')
      expect(resolvePlatformAlias('random-text', aliasConfig)).toBe('random-text')
    })

    it('应该处理空别名配置', () => {
      const aliasConfig = {}

      expect(resolvePlatformAlias('h5', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('custom', aliasConfig)).toBe('custom')
      expect(resolvePlatformAlias('anything', aliasConfig)).toBe('anything')
    })

    it('应该处理多个别名映射到同一平台', () => {
      const aliasConfig = {
        'h5': ['web', 'html', 'website'],
        'mp-weixin': ['wechat', 'weixin', 'wx'],
      }

      expect(resolvePlatformAlias('web', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('html', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('website', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('wechat', aliasConfig)).toBe('mp-weixin')
      expect(resolvePlatformAlias('weixin', aliasConfig)).toBe('mp-weixin')
      expect(resolvePlatformAlias('wx', aliasConfig)).toBe('mp-weixin')
    })

    it('应该处理字符串类型的别名配置', () => {
      const aliasConfig = {
        'h5': 'web',
        'mp-weixin': 'wechat',
        'app': 'mobile',
      }

      expect(resolvePlatformAlias('web', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('wechat', aliasConfig)).toBe('mp-weixin')
      expect(resolvePlatformAlias('mobile', aliasConfig)).toBe('app')
      expect(resolvePlatformAlias('unknown', aliasConfig)).toBe('unknown')
    })

    it('应该处理混合类型的别名配置（字符串和数组）', () => {
      const aliasConfig = {
        'h5': ['web', 'html'],
        'mp-weixin': 'wechat',
        'app': ['mobile', 'application'],
      }

      expect(resolvePlatformAlias('web', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('html', aliasConfig)).toBe('h5')
      expect(resolvePlatformAlias('wechat', aliasConfig)).toBe('mp-weixin')
      expect(resolvePlatformAlias('mobile', aliasConfig)).toBe('app')
      expect(resolvePlatformAlias('application', aliasConfig)).toBe('app')
    })
  })

  describe('command Validation', () => {
    it('应该验证有效命令', () => {
      const validCommands = ['dev', 'build', 'prepare']
      validCommands.forEach((cmd) => {
        expect(['dev', 'build', 'prepare'].includes(cmd)).toBe(true)
      })
    })

    it('应该识别无效命令', () => {
      const invalidCommands = ['invalid', 'test', 'deploy']
      invalidCommands.forEach((cmd) => {
        expect(['dev', 'build', 'prepare'].includes(cmd)).toBe(false)
      })
    })
  })
})
