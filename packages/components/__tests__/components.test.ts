import { resolve } from 'node:path'
import { UnhContext } from '@uni-helper/unh-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DIRECTIVE_IMPORT_PREFIX, DISABLE_COMMENT, MODULE_NAME, RESOLVER_EXT } from '../src/constants'
import { Context } from '../src/context'
import { resolveOptions } from '../src/options'

const FIXTURES_DIR = resolve(__dirname, 'fixtures')

describe('unh-components: 模块导出', () => {
  it('vitePluginComponents 与 unhComponentsModule 均可导入', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.VitePluginComponents).toBe('function')
    expect(mod.unhComponentsModule).toBeDefined()
    expect(mod.unhComponentsModule.meta.name).toBe('unh:components')
    expect(mod.unhComponentsModule.meta.configKey).toBe('components')
  })

  it('默认导出等于 VitePluginComponents', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBe(mod.VitePluginComponents)
  })
})

describe('unh-components: resolveOptions 默认值', () => {
  it('提供合理的默认值', () => {
    const opts = resolveOptions({}, FIXTURES_DIR)
    expect(opts.dirs).toEqual(['src/components'])
    expect(opts.extensions).toEqual(['vue'])
    expect(opts.deep).toBe(true)
    expect(opts.directoryAsNamespace).toBe(false)
    expect(opts.allowOverrides).toBe(false)
    expect(opts.syncMode).toBe('default')
    expect(opts.transformerUserResolveFunctions).toBe(true)
    expect(opts.root).toBe(FIXTURES_DIR)
  })

  it('globs 基于 dirs 解析为绝对路径', () => {
    const opts = resolveOptions({}, FIXTURES_DIR)
    expect(opts.globs.length).toBeGreaterThan(0)
    expect(opts.globs[0]).toContain('src/components')
    expect(opts.globs[0]).toContain('**/*.vue')
  })

  it('接受用户自定义配置', () => {
    const opts = resolveOptions({ dirs: 'src/my-components', deep: false, prefix: 'U' }, FIXTURES_DIR)
    expect(opts.dirs).toEqual(['src/my-components'])
    expect(opts.deep).toBe(false)
    expect(opts.prefix).toBe('U')
    expect(opts.globs[0]).not.toContain('**')
  })
})

describe('unh-components: searchComponents 通过 ctx 共享扫描缓存', () => {
  let unhCtx: UnhContext

  beforeEach(() => {
    unhCtx = new UnhContext(FIXTURES_DIR)
  })

  afterEach(() => {
    unhCtx.clearCaches()
  })

  it('使用 unhCtx 时命中 scanFiles 缓存', async () => {
    const ctx = new Context({}, unhCtx)
    ctx.setRoot(FIXTURES_DIR)

    await ctx.searchGlob()
    // 缓存条目存在，证明 scanFiles 被调用并写入缓存
    expect(unhCtx.scanCache.size).toBeGreaterThan(0)
  })

  it('扫描到 fixture 组件', async () => {
    const ctx = new Context({}, unhCtx)
    ctx.setRoot(FIXTURES_DIR)

    await ctx.searchGlob()

    // fixture 中存在 MyButton.vue，应被扫描到
    const names = Object.keys(ctx.componentNameMap)
    expect(names).toContain('MyButton')
  })

  it('重复调用 searchGlob 只扫描一次', async () => {
    const ctx = new Context({}, unhCtx)
    ctx.setRoot(FIXTURES_DIR)

    await ctx.searchGlob()
    await ctx.searchGlob()

    // _searched 标记保护，不应重复扫描
    expect(unhCtx.scanCache.size).toBe(1)
  })
})

describe('unh-components: components:extend hook 触发', () => {
  let unhCtx: UnhContext

  beforeEach(() => {
    unhCtx = new UnhContext(FIXTURES_DIR)
  })

  afterEach(() => {
    unhCtx.clearCaches()
  })

  it('searchGlob 完成后触发 components:extend hook', async () => {
    const spy = vi.fn()
    unhCtx.hooks.hook('components:extend', spy)

    const ctx = new Context({}, unhCtx)
    ctx.setRoot(FIXTURES_DIR)

    await ctx.searchGlob()

    expect(spy).toHaveBeenCalledTimes(1)
    // hook 参数应为组件信息数组
    const arg = spy.mock.calls[0]?.[0]
    expect(Array.isArray(arg)).toBe(true)
    expect(arg.length).toBeGreaterThan(0)
    expect(arg.some((c: any) => c.as === 'MyButton')).toBe(true)
  })

  it('未提供 unhCtx 时不报错（兼容独立使用）', async () => {
    const ctx = new Context({})
    ctx.setRoot(FIXTURES_DIR)

    // 不应抛错，且能扫描到组件
    await expect(ctx.searchGlob()).resolves.not.toThrow()
    expect(Object.keys(ctx.componentNameMap)).toContain('MyButton')
  })
})

describe('unh-components: 常量一致性', () => {
  it('mODULE_NAME 为 unh-components', () => {
    expect(MODULE_NAME).toBe('unh-components')
  })

  it('dISABLE_COMMENT 使用 unh-components 命名空间', () => {
    expect(DISABLE_COMMENT).toBe('/* unh-components disabled */')
  })

  it('rESOLVER_EXT 与模块名一致', () => {
    expect(RESOLVER_EXT).toBe('.unh-components')
  })

  it('dIRECTIVE_IMPORT_PREFIX 为 v', () => {
    expect(DIRECTIVE_IMPORT_PREFIX).toBe('v')
  })
})
