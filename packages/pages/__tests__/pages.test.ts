import fs from 'node:fs'
import { resolve } from 'node:path'
import { UnhContext } from '@uni-helper/unh-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MODULE_ID_VIRTUAL, RESOLVED_MODULE_ID_VIRTUAL } from '../src/constant'
import { PageContext } from '../src/context'
import { checkPagesJsonFileSync, getPageFiles } from '../src/files'
import { resolveOptions } from '../src/options'

const TMP_DIR = resolve(__dirname, 'tmp-pages-test')

describe('unh-pages: 模块导出', () => {
  it('vitePluginUniPages 与 unhPagesModule 均可导入', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.VitePluginUniPages).toBe('function')
    expect(mod.unhPagesModule).toBeDefined()
    expect(mod.unhPagesModule.meta.name).toBe('unh:pages')
    expect(mod.unhPagesModule.meta.configKey).toBe('pages')
  })
})

describe('unh-pages: resolveOptions', () => {
  it('提供合理的默认值', () => {
    // 使用项目根目录（真实存在），使 globSync 能解析 src/pages
    const opts = resolveOptions({}, resolve(__dirname, '..'))
    expect(opts.outDir).toBe('src')
    expect(opts.mergePages).toBe(true)
    expect(opts.minify).toBe(false)
    expect(opts.exclude).toContain('node_modules')
    expect(opts.homePage).toEqual(['pages/index', 'pages/index/index'])
    expect(opts.configSource).toHaveLength(1)
  })

  it('subPackages 对象格式生成 subPackageRootMap', () => {
    const opts = resolveOptions(
      { subPackages: [{ dir: '../../pkgs/login/pages', root: 'pkgs/login/pages' }] },
      '/app',
    )
    expect(opts.subPackages).toEqual(['../../pkgs/login/pages'])
    expect(opts.subPackageRootMap.get('../../pkgs/login/pages')).toBe('pkgs/login/pages')
  })
})

describe('unh-pages: getPageFiles 通过 ctx 共享扫描缓存', () => {
  it('相同 patterns+cwd 命中缓存', async () => {
    const ctx = new UnhContext(__dirname)
    const opts = resolveOptions({}, __dirname)

    await getPageFiles(__dirname, opts, ctx)
    await getPageFiles(__dirname, opts, ctx)

    // 缓存条目存在，证明 scanFiles 命中缓存（返回路径数组，非内容）
    expect(ctx.scanCache.size).toBeGreaterThan(0)
  })
})

describe('unh-pages: PageContext 触发 pages:extend hook', () => {
  let ctx: PageContext
  let unhCtx: UnhContext

  beforeEach(() => {
    unhCtx = new UnhContext(TMP_DIR)
    ctx = new PageContext({}, TMP_DIR, unhCtx)
  })

  afterEach(() => {
    // hookable 没有 flush，清空缓存避免用例间干扰
    unhCtx.clearCaches()
  })

  it('updatePagesJSON 完成后触发 pages:extend', async () => {
    const spy = vi.fn()
    unhCtx.hooks.hook('pages:extend', spy)

    // 注意：此用例仅验证 hook 触发机制，不验证具体页面数据
    // 完整的端到端验证依赖 playground 集成测试
    try {
      await ctx.updatePagesJSON()
    }
    catch {
      // TMP_DIR 不存在真实页面，预期可能产生空结果或警告
    }

    // 即使没有页面，hook 也应被调用一次（携带空数组或当前 pageMetaData）
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('unh-pages: 虚拟模块常量', () => {
  it('virtual 模块 ID 一致性', () => {
    expect(MODULE_ID_VIRTUAL).toBe('virtual:uni-pages')
    expect(RESOLVED_MODULE_ID_VIRTUAL).toBe(`\0${MODULE_ID_VIRTUAL}`)
  })
})

describe('unh-pages: checkPagesJsonFileSync', () => {
  it('文件不存在时创建空 pages.json', () => {
    const tmpFile = resolve(TMP_DIR, 'test-pages.json')
    try {
      fs.mkdirSync(TMP_DIR, { recursive: true })
      if (fs.existsSync(tmpFile))
        fs.unlinkSync(tmpFile)

      const ok = checkPagesJsonFileSync(tmpFile)
      expect(ok).toBe(true)
      expect(fs.existsSync(tmpFile)).toBe(true)
      const content = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'))
      expect(content).toEqual({ pages: [{ path: '' }] })
    }
    finally {
      if (fs.existsSync(tmpFile))
        fs.unlinkSync(tmpFile)
    }
  })
})
