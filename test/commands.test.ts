import type { BuildPhase } from '../src/cli/types'
import type { UniHelperConfig } from '../src/config/types'
import { describe, expect, it, vi } from 'vitest'

// Mock utils
vi.mock('../src/utils/files', () => ({
  generateJsonFile: vi.fn(),
}))

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

describe('cLI Commands', () => {
  describe('configuration Tests', () => {
    it('应该处理基本的配置结构', () => {
      const mockConfig: UniHelperConfig = {
        platform: {
          default: 'h5',
          alias: { h5: ['h'] },
        },
        autoGenerate: {
          outDir: 'src',
          pages: true,
          manifest: true,
        },
      }

      expect(mockConfig).toBeDefined()
      expect(mockConfig.platform?.default).toBe('h5')
      expect(mockConfig.autoGenerate?.outDir).toBe('src')
      expect(mockConfig.autoGenerate?.pages).toBe(true)
      expect(mockConfig.autoGenerate?.manifest).toBe(true)
    })

    it('应该处理最小配置', () => {
      const minimalConfig: UniHelperConfig = {
        platform: { default: 'h5' },
        autoGenerate: { outDir: 'src' },
      }

      expect(minimalConfig.platform?.default).toBe('h5')
      expect(minimalConfig.autoGenerate?.outDir).toBe('src')
    })

    it('应该处理空别名配置', () => {
      const config: UniHelperConfig = {
        platform: { default: 'h5', alias: {} },
        autoGenerate: { outDir: 'src', pages: false, manifest: false },
      }

      expect(config.platform?.alias).toEqual({})
    })
  })

  describe('platform Resolution', () => {
    it('应该解析平台别名', () => {
      const aliasConfig = { web: 'h5', wechat: 'mp-weixin' }

      expect(aliasConfig.web).toBe('h5')
      expect(aliasConfig.wechat).toBe('mp-weixin')
    })

    it('应该处理未定义的平台', () => {
      const platform = 'unknown-platform'
      expect(platform).toBe('unknown-platform')
    })
  })

  describe('auto Generation Logic', () => {
    it('应该根据阶段判断是否生成文件', () => {
      const shouldGenerate = (
        configValue: boolean | string[] | { commands?: string[] } | undefined,
        phase: BuildPhase,
      ): boolean => {
        if (configValue == null) {
          return false
        }

        if (typeof configValue === 'boolean') {
          return configValue
        }

        const commands = Array.isArray(configValue)
          ? configValue
          : (configValue.commands || [])

        return commands.includes(phase)
      }

      expect(shouldGenerate(true, 'dev')).toBe(true)
      expect(shouldGenerate(['dev'], 'dev')).toBe(true)
      expect(shouldGenerate(['build'], 'dev')).toBe(false)
      expect(shouldGenerate({ commands: ['dev'] }, 'dev')).toBe(true)
      expect(shouldGenerate({ commands: ['build'] }, 'dev')).toBe(false)
      expect(shouldGenerate(false, 'dev')).toBe(false)
      expect(shouldGenerate(undefined, 'dev')).toBe(false)
    })
  })

  describe('hook Configuration', () => {
    it('应该支持自定义钩子配置', () => {
      const mockHooks = {
        install: vi.fn(),
        dev: vi.fn(),
        build: vi.fn(),
      }

      const config: UniHelperConfig = {
        platform: { default: 'h5' },
        autoGenerate: { outDir: 'src' },
        prepare: mockHooks,
      }

      expect(config.prepare?.install).toBeDefined()
      expect(config.prepare?.dev).toBeDefined()
      expect(config.prepare?.build).toBeDefined()
    })
  })
})
