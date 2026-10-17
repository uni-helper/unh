import type { UniHelperConfig } from '../src/config/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { deployMock, loadCliConfigMock } = vi.hoisted(() => ({
  deployMock: vi.fn(async () => []),
  loadCliConfigMock: vi.fn(),
}))

vi.mock('@uni-helper/deploy', () => ({
  deploy: deployMock,
}))

vi.mock('../src/cli/config', () => ({
  loadCliConfig: loadCliConfigMock,
  getCliConfig: () => ({
    platform: {
      default: 'mp-weixin',
      alias: { 'mp-weixin': ['wx'], 'mp-alipay': ['ali'] },
    },
  } satisfies UniHelperConfig),
  setGlobalConfig: vi.fn(),
  getGlobalConfig: () => ({}),
}))

vi.mock('../src/utils/log', () => ({
  logger: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  },
}))

/** 取出 mock 收到的 SDK 调用参数 */
function lastCall() {
  return deployMock.mock.calls.at(-1)?.[0] as Record<string, any>
}

describe('handleDeployCommand', () => {
  beforeEach(() => {
    deployMock.mockClear()
    deployMock.mockResolvedValue([])
    process.exitCode = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = undefined
  })

  async function run(targets: string[] | undefined, options: Record<string, any> = {}) {
    const { handleDeployCommand } = await import('../src/cli/commands/deploy')
    await handleDeployCommand(targets, options)
  }

  it('默认动作为 upload，且平台交由 SDK 推断', async () => {
    await run(undefined)

    const options = lastCall()
    expect(options.action).toBe('upload')
    expect(options.platform).toBeUndefined()
  })

  it('位置参数中的动作与平台应被正确拆分', async () => {
    await run(['preview', 'wx'])

    const options = lastCall()
    expect(options.action).toBe('preview')
    expect(options.platform).toEqual(['mp-weixin'])
  })

  it('位置参数只有平台时应视为平台', async () => {
    await run(['wx', 'ali'])

    expect(lastCall().platform).toEqual(['mp-weixin', 'mp-alipay'])
  })

  it('--action 应优先于位置参数中的动作', async () => {
    await run(['preview', 'wx'], { action: 'open' })

    expect(lastCall().action).toBe('open')
  })

  it('--platform 与位置参数中的平台应取并集', async () => {
    await run(['wx'], { platform: 'ali' })

    expect(lastCall().platform).toEqual(['mp-weixin', 'mp-alipay'])
  })

  it('--platform 支持逗号分隔与数组', async () => {
    await run(undefined, { platform: 'wx,mp-jd' })
    expect(lastCall().platform).toEqual(['mp-weixin', 'mp-jd'])

    await run(undefined, { platform: ['ali', 'mp-baidu'] })
    expect(lastCall().platform).toEqual(['mp-alipay', 'mp-baidu'])
  })

  it('应将 cwd 传递给 SDK', async () => {
    await run(['wx'], { cwd: '/tmp/some-project' })

    expect(lastCall().cwd).toBe('/tmp/some-project')
  })

  it('未传入覆盖项时不应污染内联配置', async () => {
    await run(['wx'])

    // 传 undefined 会盖掉配置里的同名项，因此必须是空对象
    expect(lastCall().config).toEqual({})
  })

  it('应将版本号、描述与产物目录作为内联配置传递', async () => {
    await run(['wx'], { appVersion: '1.2.3', desc: 'hello', projectPath: 'dist/build/mp-weixin' })

    expect(lastCall().config).toEqual({
      version: '1.2.3',
      desc: 'hello',
      projectPath: 'dist/build/mp-weixin',
    })
  })

  it('应将 --config 归一化后传递给 SDK', async () => {
    await run(['wx'])
    expect(lastCall().configFile).toBeUndefined()

    await run(['wx'], { config: 'false' })
    expect(lastCall().configFile).toBe(false)

    await run(['wx'], { config: './custom.ts' })
    expect(lastCall().configFile).toBe('./custom.ts')
  })

  it('平台非法时不应调用 SDK，且应置非零退出码', async () => {
    await run(['h5'])

    expect(deployMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('动作非法时不应调用 SDK，且应置非零退出码', async () => {
    await run(['wx'], { action: 'publish' })

    expect(deployMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('存在失败结果时应置非零退出码', async () => {
    deployMock.mockResolvedValue([{
      platform: 'mp-weixin',
      action: 'upload',
      success: false,
      version: '1.0.0',
      desc: '',
      projectPath: '',
      qrCodeContent: '',
      qrCodeLocalPath: '',
      error: new Error('boom'),
    }])

    await run(['wx'])
    expect(process.exitCode).toBe(1)
  })

  it('全部成功时不应置非零退出码', async () => {
    deployMock.mockResolvedValue([{
      platform: 'mp-weixin',
      action: 'upload',
      success: true,
      version: '1.0.0',
      desc: '',
      projectPath: 'dist/build/mp-weixin',
      qrCodeContent: '',
      qrCodeLocalPath: '',
    }])

    await run(['wx'])
    expect(process.exitCode).toBeUndefined()
  })

  it('sDK 抛出参数错误时应置非零退出码而不是崩溃', async () => {
    deployMock.mockRejectedValue(new Error('没有可用的平台'))

    await run(['wx'])
    expect(process.exitCode).toBe(1)
  })
})
