import { describe, expect, it } from 'vitest'
import { VitePluginFilePlatform } from '../src/file-platform'
import { unhPlatformModule, VitePluginUniPlatform } from '../src/index'
import { ModifierContext, VitePluginPlatformModifier } from '../src/modifier'

describe('unh-platform: 模块导出', () => {
  it('vitePluginUniPlatform 与 unhPlatformModule 均可导入', async () => {
    expect(typeof VitePluginUniPlatform).toBe('function')
    expect(unhPlatformModule).toBeDefined()
    expect(unhPlatformModule.meta.name).toBe('unh:platform')
    expect(unhPlatformModule.meta.configKey).toBe('platform')
  })
})

describe('unh-platform: VitePluginUniPlatform 返回插件数组', () => {
  it('默认启用 file + modifier 两个插件', () => {
    const plugins = VitePluginUniPlatform()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins).toHaveLength(2)
    expect(plugins[0].name).toBe('unh-platform-file')
    expect(plugins[1].name).toBe('unh-platform-modifier')
  })

  it('可单独禁用 file 插件', () => {
    const plugins = VitePluginUniPlatform({ fileEnabled: false })
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('unh-platform-modifier')
  })

  it('可单独禁用 modifier 插件', () => {
    const plugins = VitePluginUniPlatform({ modifierEnabled: false })
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('unh-platform-file')
  })
})

describe('unh-platform: VitePluginFilePlatform', () => {
  it('返回有效的 Vite 插件对象', () => {
    const plugin = VitePluginFilePlatform()
    expect(plugin.name).toBe('unh-platform-file')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.resolveId).toBe('function')
    expect(typeof plugin.load).toBe('function')
  })
})

describe('unh-platform: VitePluginPlatformModifier', () => {
  it('返回有效的 Vite 插件对象', () => {
    const plugin = VitePluginPlatformModifier()
    expect(plugin.name).toBe('unh-platform-modifier')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.transform).toBe('function')
  })
})

describe('unh-platform: ModifierContext', () => {
  it('filter 过滤 .vue 文件', () => {
    const ctx = new ModifierContext()
    expect(ctx.filter('src/pages/index.vue')).toBe(true)
    expect(ctx.filter('src/utils/test.ts')).toBe(false)
  })

  it('transform 对无模板的代码返回 undefined', () => {
    const ctx = new ModifierContext()
    const result = ctx.transform('export default {}', 'test.vue')
    expect(result).toBeUndefined()
  })
})
