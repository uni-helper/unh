import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { UnhContext } from '../src/context'
import { buildScanCacheKey, scanFiles } from '../src/scan'

const SRC_DIR = resolve(__dirname, '..', 'src')

describe('buildScanCacheKey', () => {
  it('缓存键包含 patterns 与 cwd', () => {
    const key = buildScanCacheKey('**/*.vue', '/app')
    expect(key).toContain('/app')
    expect(key).toContain('**/*.vue')
  })

  it('不同 patterns 产生不同键', () => {
    const a = buildScanCacheKey('**/*.vue', '/app')
    const b = buildScanCacheKey('**/*.ts', '/app')
    expect(a).not.toBe(b)
  })

  it('不同 cwd 产生不同键', () => {
    const a = buildScanCacheKey('**/*.vue', '/app')
    const b = buildScanCacheKey('**/*.vue', '/other')
    expect(a).not.toBe(b)
  })

  it('patterns 数组顺序不影响键（内部排序）', () => {
    const a = buildScanCacheKey(['a', 'b'], '/app')
    const b = buildScanCacheKey(['b', 'a'], '/app')
    expect(a).toBe(b)
  })
})

describe('scanFiles', () => {
  afterEach(() => {
    // 避免用例间缓存污染
  })

  it('返回路径数组（非内容）', async () => {
    const ctx = new UnhContext(SRC_DIR)
    const files = await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })

    expect(Array.isArray(files)).toBe(true)
    expect(files.length).toBeGreaterThan(0)
    // 返回的是相对路径
    expect(files).toContain('index.ts')
    expect(files).toContain('context.ts')
  })

  it('相同 patterns+cwd 命中缓存', async () => {
    const ctx = new UnhContext(SRC_DIR)
    const first = await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })
    const second = await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })

    // 引用相同，证明命中缓存
    expect(second).toBe(first)
    expect(ctx.scanCache.size).toBe(1)
  })

  it('不同 patterns 分别缓存', async () => {
    const ctx = new UnhContext(SRC_DIR)
    await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })
    await scanFiles(ctx, ['*.vue'], { cwd: SRC_DIR })

    expect(ctx.scanCache.size).toBe(2)
  })

  it('cache:false 不写入缓存', async () => {
    const ctx = new UnhContext(SRC_DIR)
    await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR, cache: false })

    expect(ctx.scanCache.size).toBe(0)
  })

  it('invalidateScan 单条失效', async () => {
    const ctx = new UnhContext(SRC_DIR)
    await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })
    const key = buildScanCacheKey(['*.ts'], SRC_DIR)

    expect(ctx.scanCache.has(key)).toBe(true)
    ctx.invalidateScan(key)
    expect(ctx.scanCache.has(key)).toBe(false)
  })

  it('invalidateScan 全量失效', async () => {
    const ctx = new UnhContext(SRC_DIR)
    await scanFiles(ctx, ['*.ts'], { cwd: SRC_DIR })
    await scanFiles(ctx, ['*.vue'], { cwd: SRC_DIR })

    ctx.invalidateScan()
    expect(ctx.scanCache.size).toBe(0)
  })

  it('默认 cwd 为 ctx.root', async () => {
    const ctx = new UnhContext(SRC_DIR)
    const files = await scanFiles(ctx, ['*.ts'])

    expect(files).toContain('index.ts')
    expect(ctx.scanCache.size).toBe(1)
    const key = buildScanCacheKey(['*.ts'], SRC_DIR)
    expect(ctx.scanCache.has(key)).toBe(true)
  })
})
