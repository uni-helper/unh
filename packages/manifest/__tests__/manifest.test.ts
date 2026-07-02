import { resolve } from 'node:path'
import { UnhContext } from '@uni-helper/unh-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultManifestConfig, resolveManifestJsonPath } from '../src/constant'
import { ManifestContext } from '../src/context'
import { resolveOptions } from '../src/options'

const TMP_DIR = resolve(__dirname, 'tmp-manifest-test')

describe('unh-manifest: 模块导出', () => {
  it('vitePluginUniManifest 与 unhManifestModule 均可导入', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.VitePluginUniManifest).toBe('function')
    expect(mod.unhManifestModule).toBeDefined()
    expect(mod.unhManifestModule.meta.name).toBe('unh:manifest')
    expect(mod.unhManifestModule.meta.configKey).toBe('manifest')
    expect(mod.unhManifestModule.meta.dependencies).toContain('unh:pages')
  })
})

describe('unh-manifest: resolveOptions', () => {
  it('提供合理的默认值', () => {
    const opts = resolveOptions({})
    expect(opts.minify).toBe(false)
    expect(opts.insertFinalNewline).toBe(false)
  })

  it('接受用户自定义配置', () => {
    const opts = resolveOptions({ minify: true, insertFinalNewline: true })
    expect(opts.minify).toBe(true)
    expect(opts.insertFinalNewline).toBe(true)
  })
})

describe('unh-manifest: defaultManifestConfig', () => {
  it('包含必要的基础字段', () => {
    expect(defaultManifestConfig.versionName).toBe('1.0.0')
    expect(defaultManifestConfig.versionCode).toBe('100')
    expect(defaultManifestConfig.vueVersion).toBe('3')
    expect(defaultManifestConfig['app-plus']).toBeDefined()
    expect(defaultManifestConfig['mp-weixin']).toBeDefined()
  })
})

describe('unh-manifest: ManifestContext 通过 pages:extend hook 集成', () => {
  let unhCtx: UnhContext

  beforeEach(() => {
    unhCtx = new UnhContext(TMP_DIR)
  })

  afterEach(() => {
    unhCtx.clearCaches()
  })

  it('pages:extend hook 将页面路由信息存入 state', async () => {
    const ctx = new ManifestContext({}, unhCtx)

    try {
      await ctx.setup()
    }
    catch {
      // TMP_DIR 无 manifest.config.ts，预期可能失败
    }

    // 模拟 pages 模块触发 hook
    await unhCtx.hooks.callHook('pages:extend', [
      { path: 'pages/index/index' },
      { path: 'pages/about/about' },
    ] as any)

    // 页面路由信息应存入 state
    const routes = unhCtx.getState('pages:routes') as any[]
    expect(routes).toBeDefined()
    expect(routes).toHaveLength(2)
    expect(routes[0].path).toBe('pages/index/index')
  })

  it('manifest:extend hook 在写入后被触发', async () => {
    const spy = vi.fn()
    unhCtx.hooks.hook('manifest:extend', spy)

    const ctx = new ManifestContext({}, unhCtx)
    try {
      await ctx.setup()
    }
    catch {
      // 预期可能失败
    }

    // 至少触发一次（初始写入）
    expect(spy).toHaveBeenCalled()
  })
})

describe('unh-manifest: resolveManifestJsonPath', () => {
  it('返回以 manifest.json 结尾的路径', () => {
    const path = resolveManifestJsonPath()
    expect(path.endsWith('manifest.json')).toBe(true)
  })
})
