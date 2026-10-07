import { describe, expect, it, vi } from 'vitest'

const loadConfigMock = vi.hoisted(() => vi.fn())

vi.mock('unconfig', () => ({
  loadConfig: loadConfigMock,
}))

async function loadConfigWith(config: any) {
  vi.resetModules()
  loadConfigMock.mockResolvedValue({ config, sources: [] })
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { loadCliConfig } = await import('../src/cli/config')
  await loadCliConfig()
  const calls = warnSpy.mock.calls.map(args => [...args])
  warnSpy.mockRestore()
  return calls
}

describe('loadCliConfig', () => {
  it('配置了 autoGenerate 时应输出废弃警告', async () => {
    const calls = await loadConfigWith({
      platform: { default: 'h5' },
      autoGenerate: { pages: true },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toContain('已废弃')
    expect(calls[0][0]).toContain('autoGenerate.pages')
    expect(calls[0][0]).toContain('可以从 unh.config.ts 中删除')
  })

  it('未配置 autoGenerate 时不应输出警告', async () => {
    const calls = await loadConfigWith({
      platform: { default: 'h5' },
    })

    expect(calls).toHaveLength(0)
  })
})
