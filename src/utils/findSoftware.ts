import type { MPPlatform } from '@/constants'
import { execSync } from 'node:child_process'
import os from 'node:os'
import fs from 'fs-extra'
import { basename, dirname, join } from 'pathe'
import { isMacOS, isWindows } from 'std-env'
import { DEVTOOLS_BUNDLE_ID } from '@/constants'
import { decodeGbk } from '@/utils'
import { logger } from './log'

/**
 * 查找软件安装目录
 * @param executableName 可执行文件名 (不带可执行后缀，例如 "wechatwebdevtools")
 * @param displayName 软件在控制面板显示的名称 (例如 "微信开发者工具")，当前仅作用于 windows 下
 * @returns 软件安装
 */
export function findSoftwareInstallLocation(platform: MPPlatform) {
  const devtoolsBundleId = DEVTOOLS_BUNDLE_ID[platform]
  if (!devtoolsBundleId) {
    logger.error(`暂不支持 ${platform} 开发者工具的查找，欢迎提交 PR 支持`)
    return null
  }
  if (isWindows) {
    const appName = devtoolsBundleId.windows
    // 查询标准卸载注册表 (Uninstall Keys)，兼容 32位 & 64位
    const installPath = findInUninstallRegistry(appName)
    if (installPath) {
      return installPath[0]
    }

    // 查询兼容性助手 (AppCompatFlags)
    // Borrowed from https://github.com/uni-helper/hbuilderx-cli/blob/9e39cbf2f1986ee1f2a3f105b927ec4ee6cf7112/src/utils.ts#L5-L24
    const exeFullName = `${appName}.exe`
    const cmd = `reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store" /f "${exeFullName}" /c`

    const resultBuffer = execSync(cmd)
    const result = decodeGbk(resultBuffer)

    // match: "C:\Folder\app.exe" REG_BINARY
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const regex = /^.*?(\w:\\.*?)\s*REG_BINARY/gm

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

  if (isMacOS) {
    const appName = devtoolsBundleId.mac
    const candidates = [
      `/Applications/${appName}.app`, // 系统应用目录
      join(os.homedir(), 'Applications', `${appName}.app`), // 用户应用目录 (~/Applications)
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate
      }
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
  const psScript = `
    $paths = @(
      "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
      "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
    )
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
    })
    const output = decodeGbk(resultBuffer)

    if (!output)
      return null

    const parts = output.split('|', 2)
    if (parts.length !== 2)
      return null

    const [sourceType, rawPath] = parts
    const cleanPath = rawPath.replace(/"/g, '').trim() // 去掉可能的引号并修剪空格

    if (sourceType === 'INSTALL_LOCATION') {
      return [cleanPath, sourceType]
    }
    else if (sourceType === 'DISPLAY_ICON') {
      return [dirname(cleanPath), sourceType]
    }
  }
  catch { /** nothing */ }

  return null
}

export function getDevtoolsCliPath(platform: MPPlatform) {
  const devtoolsPath = findSoftwareInstallLocation(platform)
  if (!devtoolsPath) {
    return null
  }
  if (isWindows) {
    return join(devtoolsPath, 'cli.bat')
  }
  if (isMacOS) {
    return join(devtoolsPath, 'Contents/MacOS/cli')
  }
}
