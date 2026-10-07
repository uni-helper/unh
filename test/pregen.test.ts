import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preGenerateConfigFiles } from '../src/logics/pregen'

const { syncMock, isPackageExistsMock } = vi.hoisted(() => ({
  syncMock: vi.fn(() => ({ status: 0, stderr: null, error: undefined })),
  isPackageExistsMock: vi.fn(() => true),
}))

vi.mock('cross-spawn', () => ({
  sync: syncMock,
}))

vi.mock('local-pkg', () => ({
  isPackageExists: isPackageExistsMock,
}))

describe('preGenerateConfigFiles', () => {
  beforeEach(() => {
    syncMock.mockClear()
    syncMock.mockImplementation(() => ({ status: 0, stderr: null, error: undefined }))
    isPackageExistsMock.mockClear()
    isPackageExistsMock.mockReturnValue(true)
  })

  it('未安装 vite 或任何配置生成插件时应跳过预生成', () => {
    isPackageExistsMock.mockReturnValue(false)

    preGenerateConfigFiles('h5')

    expect(syncMock).not.toHaveBeenCalled()
  })

  it('仅安装 vite-plugin-uni-manifest 时也应执行预生成', () => {
    isPackageExistsMock.mockImplementation(
      pkg => pkg === 'vite' || pkg === '@uni-helper/vite-plugin-uni-manifest',
    )

    preGenerateConfigFiles('h5')

    expect(syncMock).toHaveBeenCalledTimes(1)
  })

  it('插件已安装时应以子进程执行预生成并传递 UNI_PLATFORM', () => {
    preGenerateConfigFiles('h5')

    expect(syncMock).toHaveBeenCalledTimes(1)
    const [command, args, options] = syncMock.mock.calls[0]
    expect(command).toBe(process.execPath)
    expect(args[0]).toBe('--input-type=module')
    expect(args[1]).toBe('-e')
    expect(args[2]).toContain('resolveConfig')
    expect(options.cwd).toBe(process.cwd())
    expect(options.env).toMatchObject({ UNI_PLATFORM: 'h5' })
  })

  it('预生成失败时应警告但不抛错', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    syncMock.mockImplementation(() => ({ status: 1, stderr: 'boom', error: undefined }))

    expect(() => preGenerateConfigFiles('h5')).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('预生成配置文件失败'))

    warnSpy.mockRestore()
  })
})
