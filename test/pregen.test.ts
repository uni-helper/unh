import type { MockInstance } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { preGenerateConfigFiles } from '../src/logics/pregen'

interface SyncResult {
  status: number
  stderr: string | null
  error?: Error
}

const { syncMock, isPackageExistsMock } = vi.hoisted(() => ({
  syncMock: vi.fn((_command: string, _args: string[], _options?: Record<string, any>): SyncResult => ({ status: 0, stderr: null, error: undefined })),
  isPackageExistsMock: vi.fn((_pkg: string): boolean => true),
}))

vi.mock('cross-spawn', () => ({
  sync: syncMock,
}))

vi.mock('local-pkg', () => ({
  isPackageExists: isPackageExistsMock,
}))

describe('preGenerateConfigFiles', () => {
  let cwd: string
  let cwdSpy: MockInstance<() => string>
  let warnSpy: MockInstance

  beforeEach(() => {
    syncMock.mockClear()
    syncMock.mockImplementation(() => ({ status: 0, stderr: null, error: undefined }))
    isPackageExistsMock.mockClear()
    isPackageExistsMock.mockReturnValue(true)
    // 占位文件会写到 cwd 下，用临时目录避免污染仓库
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'unh-pregen-'))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    cwdSpy.mockRestore()
    fs.rmSync(cwd, { recursive: true, force: true })
    delete process.env.UNI_INPUT_DIR
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
    const [command, args, options] = syncMock.mock.calls[0]!
    expect(command).toBe(process.execPath)
    expect(args[0]).toBe('--input-type=module')
    expect(args[1]).toBe('-e')
    expect(args[2]).toContain('resolveConfig')
    expect(options!.cwd).toBe(process.cwd())
    expect(options!.env).toMatchObject({ UNI_PLATFORM: 'h5' })
  })

  it('h5:ssr 平台应以 h5 预生成，避免写出非法条件编译', () => {
    preGenerateConfigFiles('h5:ssr')

    expect(syncMock).toHaveBeenCalledTimes(1)
    const [, , options] = syncMock.mock.calls[0]!
    expect(options!.env).toMatchObject({ UNI_PLATFORM: 'h5' })
  })

  it('预生成失败时应警告但不抛错', () => {
    syncMock.mockImplementation(() => ({ status: 1, stderr: 'boom', error: undefined }))

    expect(() => preGenerateConfigFiles('h5')).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('预生成配置文件失败'))
  })

  describe('manifest.json 占位', () => {
    it('文件不存在时先写占位，插件覆盖后保留生成内容', () => {
      const manifestPath = path.join(cwd, 'src/manifest.json')
      syncMock.mockImplementation(() => {
        expect(fs.readFileSync(manifestPath, 'utf8')).toBe('{}')
        fs.writeFileSync(manifestPath, '{ "name": "demo" }')
        return { status: 0, stderr: null, error: undefined }
      })

      preGenerateConfigFiles('h5')

      expect(fs.readFileSync(manifestPath, 'utf8')).toBe('{ "name": "demo" }')
    })

    it('子进程失败且占位没被覆盖时应删除占位文件', () => {
      const manifestPath = path.join(cwd, 'src/manifest.json')
      syncMock.mockImplementation(() => {
        expect(fs.existsSync(manifestPath)).toBe(true)
        return { status: 1, stderr: 'boom', error: undefined }
      })

      preGenerateConfigFiles('h5')

      expect(fs.existsSync(manifestPath)).toBe(false)
    })

    it('子进程成功但没生成 manifest.json 时应删除占位并提示', () => {
      const manifestPath = path.join(cwd, 'src/manifest.json')

      preGenerateConfigFiles('h5')

      expect(fs.existsSync(manifestPath)).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('没有生成 manifest.json'))
    })

    it('已有的 manifest.json 不应被覆盖', () => {
      const manifestPath = path.join(cwd, 'src/manifest.json')
      fs.mkdirSync(path.join(cwd, 'src'), { recursive: true })
      fs.writeFileSync(manifestPath, '{ "name": "existing" }')

      preGenerateConfigFiles('h5')

      expect(fs.readFileSync(manifestPath, 'utf8')).toBe('{ "name": "existing" }')
    })

    it('未安装 manifest 插件时不应写占位文件', () => {
      isPackageExistsMock.mockImplementation(
        pkg => pkg === '@uni-helper/vite-plugin-uni-pages',
      )

      preGenerateConfigFiles('h5')

      expect(fs.existsSync(path.join(cwd, 'src/manifest.json'))).toBe(false)
    })

    it('设置了 UNI_INPUT_DIR 时应写到该目录', () => {
      process.env.UNI_INPUT_DIR = 'custom-src'
      const manifestPath = path.join(cwd, 'custom-src/manifest.json')
      let placeholderDuringSpawn: string | undefined
      syncMock.mockImplementation(() => {
        placeholderDuringSpawn = fs.readFileSync(manifestPath, 'utf8')
        fs.writeFileSync(manifestPath, '{ "name": "demo" }')
        return { status: 0, stderr: null, error: undefined }
      })

      preGenerateConfigFiles('h5')

      expect(placeholderDuringSpawn).toBe('{}')
    })
  })
})
