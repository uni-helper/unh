import type { PlatformSpecificString } from '../types'
import { execSync } from 'node:child_process'
import os from 'node:os'
import fs from 'fs-extra'
import { basename, dirname, join } from 'pathe'
import { isMacOS, isWindows } from 'std-env'
import { decodeGbk } from '@/utils'

// 常量定义
const REGISTRY_TIMEOUT_MS = 5000
const APP_COMPAT_FLAGS_TIMEOUT_MS = 5000
const MACOS_APP_SUFFIX = '.app'
const WINDOWS_EXE_SUFFIX = '.exe'

// Windows 注册表路径常量
const WINDOWS_UNINSTALL_REGISTRY_PATHS = [
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
] as const

const APP_COMPAT_FLAGS_REGISTRY_PATH = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store'

/**
 * 查找软件安装目录
 *
 * 该函数支持在 Windows 和 macOS 平台上查找已安装软件的路径。
 *
 * Windows 平台查找策略：
 * 1. 首先尝试从系统卸载注册表中查找
 * 2. 如果未找到，则尝试从应用程序兼容性标志注册表中查找
 *
 * macOS 平台查找策略：
 * 1. 检查系统应用程序目录 (/Applications)
 * 2. 检查用户应用程序目录 (~/Applications)
 *
 * @param name 软件名称，包含 windows & mac 平台的不同名称
 * @returns 软件安装路径，如果未找到则返回 null
 */
export function findSoftwareInstallLocation(name: PlatformSpecificString): string | null {
  // 输入验证
  if (!name || typeof name !== 'object') {
    return null
  }

  if (isWindows) {
    return findWindowsSoftware(name.windows)
  }

  if (isMacOS) {
    return findMacOSSoftware(name.mac)
  }

  // 不支持的平台
  return null
}

/**
 * 在 Windows 平台上查找软件安装路径
 *
 * @param appName Windows 平台的应用程序名称
 * @returns 软件安装路径，如果未找到则返回 null
 */
function findWindowsSoftware(appName: string): string | null {
  // 策略1: 查询标准卸载注册表 (Uninstall Keys)，兼容 32位 & 64位
  const installPath = findInUninstallRegistry(appName)
  if (installPath && installPath.length > 0) {
    return installPath[0]
  }

  // 策略2: 查询兼容性助手 (AppCompatFlags)
  // Borrowed from https://github.com/uni-helper/hbuilderx-cli/blob/9e39cbf2f1986ee1f2a3f105b927ec4ee6cf7112/src/utils.ts#L5-L24
  return findInAppCompatFlags(appName)
}

/**
 * 在 Windows 应用程序兼容性标志注册表中查找软件
 *
 * @param appName 应用程序名称
 * @returns 软件安装路径，如果未找到则返回 null
 */
function findInAppCompatFlags(appName: string): string | null {
  const exeFullName = `${appName}${WINDOWS_EXE_SUFFIX}`
  const cmd = `reg query "${APP_COMPAT_FLAGS_REGISTRY_PATH}" /f "${exeFullName}" /c`

  try {
    const resultBuffer = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      timeout: APP_COMPAT_FLAGS_TIMEOUT_MS,
    })
    const result = decodeGbk(resultBuffer)

    // 改进的正则表达式，更好地处理带空格和特殊字符的路径
    // match: "C:\Folder\app.exe" REG_BINARY
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const regex = /^.*?([A-Za-z]:\\[^"]*?)\s*REG_BINARY/gm

    let match
    // 遍历所有匹配结果，防止只取到第一个错误的包含匹配
    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(result)) !== null) {
      if (match && match[1]) {
        const fullExePath = match[1].trim()
        const fileName = basename(fullExePath)

        if (fileName.toLowerCase() === exeFullName.toLowerCase()) {
          return dirname(fullExePath)
        }
      }
    }
  }
  catch {
    // 静默处理错误，继续尝试其他方法
  }

  return null
}

/**
 * 在 macOS 平台上查找软件安装路径
 *
 * @param appName macOS 平台的应用程序名称
 * @returns 软件安装路径，如果未找到则返回 null
 */
function findMacOSSoftware(appName: string): string | null {
  // macOS 应用程序候选路径
  const candidates = [
    `/Applications/${appName}${MACOS_APP_SUFFIX}`, // 系统应用目录
    join(os.homedir(), 'Applications', `${appName}${MACOS_APP_SUFFIX}`), // 用户应用目录 (~/Applications)
  ]

  // 检查每个候选路径
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
    catch {
      // 静默处理错误，继续尝试下一个候选路径
    }
  }

  return null
}

/**
 * 使用 PowerShell 深度遍历 Uninstall 注册表
 * - 兼容 64位 和 32位
 * - 返回 InstallLocation 或 DisplayIcon
 * @platform Only `windows`
 */
function findInUninstallRegistry(appName: string): [string, 'INSTALL_LOCATION' | 'DISPLAY_ICON'] | null {
  // 使用预定义的常量构建 PowerShell 脚本
  const paths = WINDOWS_UNINSTALL_REGISTRY_PATHS.map(path => `"${path}"`).join(', ')
  const psScript = `
    $paths = @(${paths})
    $target = "*${appName}*"

    foreach ($path in $paths) {
      Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like $target } | ForEach-Object {
        if ($_.InstallLocation) {
          # 使用 INSTALL_LOCATION| 标识前缀
          Write-Output "INSTALL_LOCATION|$($_.InstallLocation)"
          exit
        }
        if ($_.DisplayIcon) {
          # 使用 DISPLAY_ICON| 标识前缀
          # 如果没有 InstallLocation，尝试从 DisplayIcon (通常是 exe 路径) 获取目录
          Write-Output "DISPLAY_ICON|$($_.DisplayIcon)"
          exit
        }
      }
    }
  `

  // 编码，防止转义、乱码问题
  // eslint-disable-next-line node/prefer-global/buffer
  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64')

  try {
    const resultBuffer = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand "${encodedCommand}"`, {
      stdio: ['ignore', 'pipe', 'ignore'], // ignore error
      windowsHide: true,
      timeout: REGISTRY_TIMEOUT_MS,
    })
    const output = decodeGbk(resultBuffer)

    if (!output || output.trim() === '') {
      return null
    }

    const parts = output.split('|', 2)
    if (parts.length !== 2) {
      return null
    }

    const [sourceType, rawPath] = parts
    if (!rawPath) {
      return null
    }

    const cleanPath = rawPath.replace(/"/g, '').trim() // 去掉可能的引号并修剪空格

    if (cleanPath === '') {
      return null
    }

    if (sourceType === 'INSTALL_LOCATION') {
      return [cleanPath, sourceType]
    }
    else if (sourceType === 'DISPLAY_ICON') {
      // 对于 DISPLAY_ICON，可能包含命令行参数，需要提取路径部分
      // 例如: "C:\Program Files\App\app.exe,0" 或 "C:\Program Files\App\app.exe"
      const pathOnly = cleanPath.split(',')[0].trim()
      if (pathOnly === '') {
        return null
      }
      return [dirname(pathOnly), sourceType]
    }
  }
  catch {
    // 静默处理错误
  }

  return null
}

/**
 * 构建开发者工具 CLI 路径
 *
 * 根据当前平台和提供的后缀，构建完整的 CLI 工具路径。
 *
 * @param installPath 开发者工具的安装路径
 * @param suffix 包含不同平台 CLI 路径后缀的对象
 * @returns 完整的 CLI 工具路径
 */
export function buildDevtoolsCliPath(installPath: string, suffix: PlatformSpecificString): string {
  const platformSuffix = isMacOS ? suffix.mac : suffix.windows

  return join(installPath, platformSuffix)
}
