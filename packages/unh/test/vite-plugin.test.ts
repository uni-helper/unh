import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { loadUnhConfig } from '@uni-helper/unh-cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Unh from '../src/vite'

// Mock @dcloudio/vite-plugin-uni 以避免测试依赖
vi.mock('@dcloudio/vite-plugin-uni', () => ({
  default: () => [{ name: 'vite-plugin-uni' }],
}))

// Mock loadUnhConfig 以控制 Unh() 读取到的配置。
// vitest 会自动将 vi.mock 提升到所有导入之前执行。
vi.mock('@uni-helper/unh-cli', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@uni-helper/unh-cli')>()
  return {
    ...actual,
    loadUnhConfig: vi.fn(),
  }
})

// manifest 模块 setup 会写入 manifest.json，重定向 UNI_INPUT_DIR 到临时目录以隔离副作用。
let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(resolve(tmpdir(), 'unh-vite-test-'))
  process.env.UNI_INPUT_DIR = tmpDir
  vi.mocked(loadUnhConfig).mockReset()
})

afterEach(() => {
  delete process.env.UNI_INPUT_DIR
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('unh: 统一 Vite 插件入口', () => {
  it('unh 是函数', () => {
    expect(typeof Unh).toBe('function')
  })

  it('返回 Promise<Plugin[]>', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({} as any)
    const result = Unh()
    expect(result).toBeInstanceOf(Promise)
    const plugins = await result
    expect(Array.isArray(plugins)).toBe(true)
  })

  it('空配置至少返回 core 插件 + uni 插件', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({} as any)
    const plugins = await Unh()
    expect(plugins.length).toBeGreaterThanOrEqual(1)
    expect(plugins.some(p => p.name === 'unh:core')).toBe(true)
    expect(plugins.some(p => p.name === 'vite-plugin-uni')).toBe(true)
  })

  it('配置 pages + manifest 返回对应模块插件', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({
      pages: {},
      manifest: {},
    } as any)
    const plugins = await Unh()
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh:core')
    expect(names).toContain('unh-pages')
    expect(names).toContain('unh-manifest')
    expect(names).toContain('unh-platform-file')
  })

  it('配置所有模块返回完整插件集', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({
      pages: {},
      layouts: {},
      components: {},
      manifest: {},
    } as any)
    const plugins = await Unh()
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh:core')
    expect(names).toContain('unh-pages')
    expect(names).toContain('unh-layouts')
    expect(names).toContain('unh-components')
    expect(names).toContain('unh-manifest')
    expect(names).toContain('unh-platform-file')
    expect(names).toContain('unh-platform-modifier')
  })

  it('未配置的模块不加载', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({
      pages: {},
    } as any)
    const plugins = await Unh()
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh-pages')
    expect(names).not.toContain('unh-layouts')
    expect(names).not.toContain('unh-components')
    expect(names).not.toContain('unh-manifest')
  })

  it('模块按依赖顺序排列（platform 在 pages 之前）', async () => {
    vi.mocked(loadUnhConfig).mockResolvedValue({
      pages: {},
      layouts: {},
    } as any)
    const plugins = await Unh()
    const names = plugins.map(p => p.name)
    const platformIdx = names.indexOf('unh-platform-file')
    const pagesIdx = names.indexOf('unh-pages')
    const layoutsIdx = names.indexOf('unh-layouts')
    expect(platformIdx).toBeLessThan(pagesIdx)
    expect(pagesIdx).toBeLessThan(layoutsIdx)
  })
})
