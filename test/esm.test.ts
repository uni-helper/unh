import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertEsmProject } from '../src/logics/esm'

const { loadPackageJSONSyncMock } = vi.hoisted(() => ({
  loadPackageJSONSyncMock: vi.fn(() => ({ type: 'module' })),
}))

vi.mock('local-pkg', () => ({
  loadPackageJSONSync: loadPackageJSONSyncMock,
}))

describe('assertEsmProject', () => {
  afterEach(() => {
    loadPackageJSONSyncMock.mockClear()
    loadPackageJSONSyncMock.mockReturnValue({ type: 'module' })
    vi.restoreAllMocks()
  })

  it('项目为 ESM 时应直接放行', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    loadPackageJSONSyncMock.mockReturnValue({ name: 'playground', type: 'module' })

    expect(() => assertEsmProject()).not.toThrow()
    expect(errorSpy).not.toHaveBeenCalled()
    expect(exitSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['显式声明 commonjs', { type: 'commonjs' }],
    ['未声明 type', {}],
    ['找不到 package.json', null],
  ])('%s 时应报错并以状态码 1 中断', (_name, packageJson) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit: ${code}`)
    })
    loadPackageJSONSyncMock.mockReturnValue(packageJson)

    expect(() => assertEsmProject()).toThrow('exit: 1')
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('仅支持 ESM 项目'))
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(loadPackageJSONSyncMock).toHaveBeenCalledWith(process.cwd())
  })
})
