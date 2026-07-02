import { describe, expect, it } from 'vitest'
import { UnhContext } from '../src/context'
import { getCachedSFC, parseSFC } from '../src/sfc'

const SAMPLE = `<template><div>hello</div></template>`

describe('parseSFC', () => {
  it('解析 .vue 文件并写入缓存', () => {
    const ctx = new UnhContext('/app')
    const entry = parseSFC(ctx, '/app/a.vue', SAMPLE)

    expect(entry.code).toBe(SAMPLE)
    expect(entry.result.descriptor.template).toBeDefined()
    expect(ctx.sfcCache.has('/app/a.vue')).toBe(true)
  })

  it('相同 code 命中缓存（不重复解析）', () => {
    const ctx = new UnhContext('/app')
    const first = parseSFC(ctx, '/app/a.vue', SAMPLE)
    const second = parseSFC(ctx, '/app/a.vue', SAMPLE)

    // 同一引用，证明复用缓存
    expect(second).toBe(first)
    expect(ctx.sfcCache.size).toBe(1)
  })

  it('code 变更后自动失效并重新解析', () => {
    const ctx = new UnhContext('/app')
    const first = parseSFC(ctx, '/app/a.vue', SAMPLE)
    const changed = `<template><span>world</span></template>`
    const second = parseSFC(ctx, '/app/a.vue', changed)

    expect(second).not.toBe(first)
    expect(second.code).toBe(changed)
    expect(ctx.sfcCache.get('/app/a.vue')?.code).toBe(changed)
  })

  it('不同文件路径分别缓存', () => {
    const ctx = new UnhContext('/app')
    parseSFC(ctx, '/app/a.vue', SAMPLE)
    parseSFC(ctx, '/app/b.vue', SAMPLE)

    expect(ctx.sfcCache.size).toBe(2)
    expect(ctx.sfcCache.has('/app/a.vue')).toBe(true)
    expect(ctx.sfcCache.has('/app/b.vue')).toBe(true)
  })

  it('触发 sfc:parse hook', async () => {
    const ctx = new UnhContext('/app')
    const calls: string[] = []
    ctx.hooks.hook('sfc:parse', (filePath) => {
      calls.push(filePath)
    })

    parseSFC(ctx, '/app/a.vue', SAMPLE)
    // 命中缓存时不触发
    parseSFC(ctx, '/app/a.vue', SAMPLE)
    // code 变更时再次触发
    parseSFC(ctx, '/app/a.vue', '<template><div>new</div></template>')

    await Promise.resolve()
    expect(calls).toEqual(['/app/a.vue', '/app/a.vue'])
  })

  it('getCachedSFC 不触发解析', () => {
    const ctx = new UnhContext('/app')
    expect(getCachedSFC(ctx, '/app/a.vue')).toBeUndefined()
    parseSFC(ctx, '/app/a.vue', SAMPLE)
    expect(getCachedSFC(ctx, '/app/a.vue')).toBeDefined()
  })

  it('invalidateSFC 后重新解析', () => {
    const ctx = new UnhContext('/app')
    parseSFC(ctx, '/app/a.vue', SAMPLE)
    ctx.invalidateSFC('/app/a.vue')

    expect(ctx.sfcCache.has('/app/a.vue')).toBe(false)
    const entry = parseSFC(ctx, '/app/a.vue', SAMPLE)
    expect(entry.code).toBe(SAMPLE)
  })
})
