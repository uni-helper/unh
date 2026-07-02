import { describe, expect, it } from 'vitest'
import { UnhVitePlugin } from '../src/vite'

describe('unh: 统一 Vite 插件入口', () => {
  it('unhVitePlugin 是函数', () => {
    expect(typeof UnhVitePlugin).toBe('function')
  })

  it('空配置返回仅含 core 插件的数组', () => {
    const plugins = UnhVitePlugin()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThanOrEqual(1)
    // core 插件应始终存在
    expect(plugins.some(p => p.name === 'unh:core')).toBe(true)
  })

  it('配置 pages + manifest + platform 返回对应模块插件', () => {
    const plugins = UnhVitePlugin({
      pages: {},
      manifest: {},
      platform: {},
    })
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh:core')
    expect(names).toContain('unh-pages')
    expect(names).toContain('unh-manifest')
    expect(names).toContain('unh-platform-file')
  })

  it('配置所有模块返回完整插件集', () => {
    const plugins = UnhVitePlugin({
      pages: {},
      layouts: {},
      components: {},
      manifest: {},
      platform: {},
    })
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh:core')
    expect(names).toContain('unh-pages')
    expect(names).toContain('unh-layouts')
    expect(names).toContain('unh-components')
    expect(names).toContain('unh-manifest')
    expect(names).toContain('unh-platform-file')
    expect(names).toContain('unh-platform-modifier')
  })

  it('未配置的模块不加载', () => {
    const plugins = UnhVitePlugin({
      pages: {},
    })
    const names = plugins.map(p => p.name)
    expect(names).toContain('unh-pages')
    expect(names).not.toContain('unh-layouts')
    expect(names).not.toContain('unh-components')
    expect(names).not.toContain('unh-manifest')
  })

  it('模块按依赖顺序排列（platform 在 pages 之前）', () => {
    const plugins = UnhVitePlugin({
      platform: {},
      pages: {},
      layouts: {},
    })
    const names = plugins.map(p => p.name)
    const platformIdx = names.indexOf('unh-platform-file')
    const pagesIdx = names.indexOf('unh-pages')
    const layoutsIdx = names.indexOf('unh-layouts')
    expect(platformIdx).toBeLessThan(pagesIdx)
    expect(pagesIdx).toBeLessThan(layoutsIdx)
  })
})
