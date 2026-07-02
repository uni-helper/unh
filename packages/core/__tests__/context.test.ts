import { describe, expect, it } from 'vitest'
import { UnhContext } from '../src/context'
import { defineUnhModule } from '../src/module'

describe('unhContext', () => {
  it('初始化时持有 root 与 options', () => {
    const ctx = new UnhContext('/app', { modules: {} })
    expect(ctx.root).toBe('/app')
    expect(ctx.options.modules).toEqual({})
    expect(ctx.modules.size).toBe(0)
    expect(ctx.sfcCache.size).toBe(0)
    expect(ctx.scanCache.size).toBe(0)
  })

  it('registerModule 注册模块，重复注册抛错', () => {
    const ctx = new UnhContext('/app')
    const mod = defineUnhModule({
      meta: { name: 'unh:pages', configKey: 'pages' },
      defaults: {},
      setup() {},
    })
    ctx.registerModule(mod)
    expect(ctx.getModule('unh:pages')).toBe(mod)

    expect(() => ctx.registerModule(mod)).toThrowError(/已注册/)
  })

  it('invalidateSFC 单条/全量失效', () => {
    const ctx = new UnhContext('/app')
    ctx.sfcCache.set('a.vue', { code: 'x', result: {} as any, timestamp: 0 })
    ctx.sfcCache.set('b.vue', { code: 'y', result: {} as any, timestamp: 0 })

    ctx.invalidateSFC('a.vue')
    expect(ctx.sfcCache.has('a.vue')).toBe(false)
    expect(ctx.sfcCache.has('b.vue')).toBe(true)

    ctx.invalidateSFC()
    expect(ctx.sfcCache.size).toBe(0)
  })

  it('invalidateScan 单条/全量失效', () => {
    const ctx = new UnhContext('/app')
    ctx.scanCache.set('k1', { files: ['a'], timestamp: 0 })
    ctx.scanCache.set('k2', { files: ['b'], timestamp: 0 })

    ctx.invalidateScan('k1')
    expect(ctx.scanCache.has('k1')).toBe(false)
    expect(ctx.scanCache.has('k2')).toBe(true)

    ctx.invalidateScan()
    expect(ctx.scanCache.size).toBe(0)
  })

  it('clearCaches 同时清空两种缓存', () => {
    const ctx = new UnhContext('/app')
    ctx.sfcCache.set('a.vue', { code: 'x', result: {} as any, timestamp: 0 })
    ctx.scanCache.set('k1', { files: ['a'], timestamp: 0 })

    ctx.clearCaches()
    expect(ctx.sfcCache.size).toBe(0)
    expect(ctx.scanCache.size).toBe(0)
  })

  it('setState / getState 读写共享状态', () => {
    const ctx = new UnhContext('/app')
    ctx.setState('pages', [{ path: 'home' }])
    expect(ctx.getState('pages')).toEqual([{ path: 'home' }])
    expect(ctx.getState('missing')).toBeUndefined()
  })

  it('hooks 可注册并触发', async () => {
    const ctx = new UnhContext('/app')
    const received: string[] = []
    ctx.hooks.hook('sfc:parse', (filePath) => {
      received.push(filePath)
    })

    ctx.hooks.callHook('sfc:parse', 'foo.vue', {
      code: '',
      result: {} as any,
      timestamp: 0,
    })

    // callHook 可能异步，等待微任务
    await Promise.resolve()
    expect(received).toEqual(['foo.vue'])
  })
})
