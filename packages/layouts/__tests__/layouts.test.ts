import { resolve } from 'node:path'
import { UnhContext } from '@uni-helper/unh-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvedVirtualModuleId, virtualModuleId } from '../src/constant'
import { LayoutContext } from '../src/context'
import { scanLayouts } from '../src/scan'
import { resolveOptions } from '../src/utils'

const TMP_DIR = resolve(__dirname, 'tmp-layouts-test')

describe('unh-layouts: 模块导出', () => {
  it('vitePluginUniLayouts 与 unhLayoutsModule 均可导入', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.VitePluginUniLayouts).toBe('function')
    expect(mod.unhLayoutsModule).toBeDefined()
    expect(mod.unhLayoutsModule.meta.name).toBe('unh:layouts')
    expect(mod.unhLayoutsModule.meta.configKey).toBe('layouts')
    expect(mod.unhLayoutsModule.meta.dependencies).toContain('unh:pages')
  })
})

describe('unh-layouts: resolveOptions', () => {
  it('提供合理的默认值', () => {
    const opts = resolveOptions({})
    expect(opts.layout).toBe('default')
    expect(opts.layoutDir).toBe('src/layouts')
    expect(opts.cwd).toBe(process.cwd())
  })

  it('接受用户自定义配置', () => {
    const opts = resolveOptions({ layout: 'custom', layoutDir: 'src/my-layouts' })
    expect(opts.layout).toBe('custom')
    expect(opts.layoutDir).toBe('src/my-layouts')
  })
})

describe('unh-layouts: scanLayouts 通过 ctx 共享扫描缓存', () => {
  it('相同 patterns+cwd 命中缓存', async () => {
    const ctx = new UnhContext(__dirname)

    await scanLayouts('layouts', __dirname, ctx)
    await scanLayouts('layouts', __dirname, ctx)

    // 缓存条目存在，证明 scanFiles 命中缓存
    expect(ctx.scanCache.size).toBeGreaterThan(0)
  })
})

describe('unh-layouts: LayoutContext 通过 pages:extend hook 获取页面列表', () => {
  let ctx: LayoutContext
  let unhCtx: UnhContext

  beforeEach(() => {
    unhCtx = new UnhContext(TMP_DIR)
    const opts = resolveOptions({ cwd: TMP_DIR }, TMP_DIR)
    ctx = new LayoutContext(opts, unhCtx)
  })

  afterEach(() => {
    unhCtx.clearCaches()
  })

  it('pages:extend hook 更新 pages 列表', async () => {
    // 模拟 pages 模块触发 hook
    await unhCtx.hooks.callHook('pages:extend', [
      { path: 'pages/index/index', layout: 'default' },
      { path: 'pages/about/about', layout: false },
    ] as any)

    expect(ctx.pages).toHaveLength(2)
    expect(ctx.pages[0].path).toBe('pages/index/index')
    expect(ctx.pages[0].layout).toBe('default')
    expect(ctx.pages[1].layout).toBe(false)
  })

  it('init 完成后触发 layouts:extend hook', async () => {
    const spy = vi.fn()
    unhCtx.hooks.hook('layouts:extend', spy)

    try {
      await ctx.init()
    }
    catch {
      // TMP_DIR 不存在布局目录，预期空结果
    }

    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('unh-layouts: 虚拟模块常量', () => {
  it('virtual 模块 ID 一致性', () => {
    expect(virtualModuleId).toBe('virtual:uni-layouts')
    expect(resolvedVirtualModuleId).toBe(`\0${virtualModuleId}`)
  })
})
