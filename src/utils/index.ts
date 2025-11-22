import { execSync } from 'node:child_process'
import os from 'node:os'
import { dirname, join, parse } from 'node:path'
import fs from 'fs-extra'

export function isMac() {
  return os.platform() === 'darwin'
}

export function isWindows() {
  return os.platform() === 'win32'
}

/**
 * 去除字符串中的 ANSI 颜色代码
 * @param str 包含 ANSI 颜色代码的字符串
 * @returns 去除颜色代码后的纯文本字符串
 */
export function stripAnsiColors(str: string): string {
  // ANSI 颜色代码的正则表达式
  // 匹配 \x1B[ 后跟任意数量的参数，然后以 m 结尾的模式
  // 例如: \x1B[31m, \x1B[1;31m, \x1B[0m 等
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1B\[[0-9;]*m/g
  return str.replace(ansiRegex, '')
}

export function ensureJsonSync(path: string, object: any = {}) {
  if (!fs.existsSync(path)) {
    fs.ensureDirSync(parse(path).dir)
    fs.writeJSONSync(path, object)
  }
}

export async function ensureJson(path: string, object: any = {}) {
  if (!fs.existsSync(path)) {
    await fs.ensureDir(parse(path).dir)
    await fs.writeJSON(path, object)
  }
}

export function decodeGbk(input?: NonSharedBuffer) {
  const decoder = new TextDecoder('gbk')
  return decoder.decode(input)
}

/**
 * 查找软件安装目录
 * @param executableName 可执行文件名 (不带可执行后缀，例如 "wechatwebdevtools")
 * @param displayName 软件在控制面板显示的名称 (例如 "微信开发者工具")，当前仅作用于 windows 下
 * @returns 软件安装
 */
export function findSoftwareInstallLocation(executableName: string, displayName?: string) {
  if (isWindows()) {
    // 查询标准卸载注册表 (Uninstall Keys)，兼容 32位 & 64位
    if (displayName) {
      try {
        const installPath = findInUninstallRegistry(displayName)
        if (installPath) {
          return installPath[0]
        }
      }
      catch { /** nothing  */ }
    }

    // 查询兼容性助手 (AppCompatFlags)
    // Borrowed from https://github.com/uni-helper/hbuilderx-cli/blob/9e39cbf2f1986ee1f2a3f105b927ec4ee6cf7112/src/utils.ts#L5-L24
    try {
      const exeFullName = `${executableName}.exe`
      const cmd = `reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store" /f "${exeFullName}" /c`

      const resultBuffer = execSync(cmd)
      const result = decodeGbk(resultBuffer)

      // match: "C:\Folder\app.exe" REG_BINARY
      // eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/no-useless-flag
      const regex = /^.*?(\w:\\.*?)\s*REG_BINARY/gm
      const matches = regex.exec(result)

      if (matches && matches[1]) {
        return dirname(matches[1])
      }
    }
    catch { /** nothing  */ }
  }

  if (isMac()) {
    const candidates = [
      `/Applications/${executableName}.app`, // 系统应用目录
      join(os.homedir(), 'Applications', `${executableName}.app`), // 用户应用目录 (~/Applications)
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
