import os from 'node:os'

import { parse } from 'node:path'
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
