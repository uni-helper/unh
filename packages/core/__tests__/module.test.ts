import { describe, expect, it, vi } from 'vitest'
import { UnhContext } from '../src/context'
import { defineUnhModule, installModules, mergeModuleOptions, resolveModuleOrder } from '../src/module'

describe('defineUnhModule', () => {
  it('返回模块自身（仅用于类型推断）', () => {
    const mod = defineUnhModule({
      meta: { name: 'unh:pages', configKey: 'pages' },
      defaults: { dir: 'src/pages' },
      setup() {},
    })
    expect(mod.meta.name).toBe('unh:pages')
    expect(mod.defaults.dir).toBe('src/pages')
  })
})

describe('resolveModuleOrder', () => {
  it('无依赖时保持注册顺序', () => {
    const a = defineUnhModule({ meta: { name: 'a', configKey: 'a' }, defaults: {}, setup() {} })
    const b = defineUnhModule({ meta: { name: 'b', configKey: 'b' }, defaults: {}, setup() {} })
    const ordered = resolveModuleOrder([a, b])
    expect(ordered.map(m => m.meta.name)).toEqual(['a', 'b'])
  })

  it('按依赖拓扑排序（被依赖者在前）', () => {
    // b 依赖 a，因此 a 应排在 b 前
    const a = defineUnhModule({ meta: { name: 'a', configKey: 'a' }, defaults: {}, setup() {} })
    const b = defineUnhModule({
      meta: { name: 'b', configKey: 'b', dependencies: ['a'] },
      defaults: {},
      setup() {},
    })
    const ordered = resolveModuleOrder([b, a])
    expect(ordered.map(m => m.meta.name)).toEqual(['a', 'b'])
  })

  it('多级依赖链', () => {
    const a = defineUnhModule({ meta: { name: 'a', configKey: 'a' }, defaults: {}, setup() {} })
    const b = defineUnhModule({
      meta: { name: 'b', configKey: 'b', dependencies: ['a'] },
      defaults: {},
      setup() {},
    })
    const c = defineUnhModule({
      meta: { name: 'c', configKey: 'c', dependencies: ['b'] },
      defaults: {},
      setup() {},
    })
    const ordered = resolveModuleOrder([c, b, a])
    expect(ordered.map(m => m.meta.name)).toEqual(['a', 'b', 'c'])
  })

  it('检测循环依赖并抛错', () => {
    const a = defineUnhModule({
      meta: { name: 'a', configKey: 'a', dependencies: ['b'] },
      defaults: {},
      setup() {},
    })
    const b = defineUnhModule({
      meta: { name: 'b', configKey: 'b', dependencies: ['a'] },
      defaults: {},
      setup() {},
    })
    expect(() => resolveModuleOrder([a, b])).toThrowError(/循环依赖/)
  })

  it('依赖缺失时抛错', () => {
    const a = defineUnhModule({
      meta: { name: 'a', configKey: 'a', dependencies: ['missing'] },
      defaults: {},
      setup() {},
    })
    expect(() => resolveModuleOrder([a])).toThrowError(/依赖未注册/)
  })
})

describe('mergeModuleOptions', () => {
  it('无用户配置时返回默认值', () => {
    const merged = mergeModuleOptions({ dir: 'src', ext: 'vue' }, undefined)
    expect(merged).toEqual({ dir: 'src', ext: 'vue' })
  })

  it('标量字段被用户值覆盖', () => {
    const merged = mergeModuleOptions({ dir: 'src', ext: 'vue' }, { ext: 'uvue' })
    expect(merged).toEqual({ dir: 'src', ext: 'uvue' })
  })

  it('对象字段执行一层合并', () => {
    const merged = mergeModuleOptions(
      { nested: { a: 1, b: 2 } },
      { nested: { b: 20, c: 3 } },
    )
    expect(merged.nested).toEqual({ a: 1, b: 20, c: 3 })
  })

  it('数组字段被用户值完全覆盖', () => {
    const merged = mergeModuleOptions(
      { dirs: ['a', 'b'] },
      { dirs: ['c'] },
    )
    expect(merged.dirs).toEqual(['c'])
  })
})

describe('installModules', () => {
  it('按拓扑顺序调用 setup', async () => {
    const order: string[] = []
    const a = defineUnhModule({
      meta: { name: 'a', configKey: 'a' },
      defaults: {},
      setup() {
        order.push('a')
      },
    })
    const b = defineUnhModule({
      meta: { name: 'b', configKey: 'b', dependencies: ['a'] },
      defaults: {},
      setup() {
        order.push('b')
      },
    })

    const ctx = new UnhContext('/app')
    ctx.registerModule(b)
    ctx.registerModule(a)

    await installModules(ctx)
    expect(order).toEqual(['a', 'b'])
  })

  it('用户配置覆盖模块默认值', async () => {
    const received: any[] = []
    const a = defineUnhModule({
      meta: { name: 'a', configKey: 'a' },
      defaults: { dir: 'default', count: 1 },
      setup(options) {
        received.push(options)
      },
    })

    const ctx = new UnhContext('/app')
    ctx.registerModule(a)

    await installModules(ctx, { a: { dir: 'custom' } })
    expect(received[0]).toEqual({ dir: 'custom', count: 1 })
  })

  it('setup 可返回 Promise', async () => {
    const a = defineUnhModule({
      meta: { name: 'a', configKey: 'a' },
      defaults: {},
      async setup() {
        await Promise.resolve()
      },
    })

    const ctx = new UnhContext('/app')
    ctx.registerModule(a)
    await expect(installModules(ctx)).resolves.toBeUndefined()
  })

  it('完成后触发 modules:installed hook', async () => {
    const a = defineUnhModule({ meta: { name: 'a', configKey: 'a' }, defaults: {}, setup() {} })
    const ctx = new UnhContext('/app')
    ctx.registerModule(a)

    const spy = vi.fn()
    ctx.hooks.hook('modules:installed', spy)

    await installModules(ctx)
    await Promise.resolve()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
