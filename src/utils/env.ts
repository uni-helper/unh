import type { UniHelperConfig } from '@/config/types'
import fs from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { bold, red } from 'kolorist'
/** 配置类型 */
type EnvConfig = Exclude<UniHelperConfig['env'], undefined>
/**
 * 默认环境变量配置
 */
const defaultEnvConfig: Required<Exclude<EnvConfig, true>> = {
  root: '',
  usePlatformDir: false,
  prefixes: ['VITE_', 'UNI_'],
  intoProcess: true,
  dts: 'uni-env.d.ts',
}
/**
 * 检查指定路径的文件是否存在且是一个文件（而不是目录）
 * @param filePath 要检查的文件路径
 * @returns 如果文件存在且是文件则返回 `true` 否则返回 `false`
 */
function isFileExists(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath, { throwIfNoEntry: false })
    return stat ? stat.isFile() : false
  }
  catch { return false }
}
/**
 * 获取环境变量文件路径
 * @param root 环境变量文件根路径
 * @param platform 当前编译平台
 * @param mode 当前编译模式
 * @param usePlatformDir 是否使用平台名称当子目录
 * @returns 返回当前模式及平台下的所有环境变量文件路径
 */
function getEnvFiles(root: string, platform: string, mode: string, usePlatformDir: boolean) {
  return [
    `.env`,
    `.env.local`,
    `.env.${mode}`,
    `.env.${mode}.local`,
  ].map(file => path.join(root, usePlatformDir ? platform : '', file)).filter(isFileExists)
}
/**
 * 生成环境变量类型定义
 * @param dtsPath 类型文件路径
 * @param envVars 环境变量对象
 */
function generateEnvTypes(dtsPath: string, envVars: Record<string, string>) {
  if (!isFileExists(dtsPath)) {
    const dir = path.dirname(dtsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
  fs.writeFileSync(dtsPath, `/// <reference types="vite/client" />\ninterface ImportMetaEnv {`, 'utf8')
  Object.keys(envVars).forEach((key) => {
    fs.appendFileSync(dtsPath, `\n  /** 环境变量 */\n  readonly ${key}: string;`, 'utf8')
  })
  fs.appendFileSync(dtsPath, `\n}\n`, 'utf8')
}
/**
 * 加载环境变量
 * @param platform 当前编译平台
 * @param mode 当前编译模式
 * @param envConfig 配置
 */
export async function loadEnv(platform: string, mode: string, envConfig: EnvConfig) {
  if (mode === 'local') {
    throw new Error(
      `"${bold(red('Local'))}" cannot be used as a mode.`,
    )
  }
  const { root, usePlatformDir, prefixes, intoProcess, dts } = {
    ...defaultEnvConfig, ...(envConfig === true ? {} : envConfig),
  }
  if (prefixes?.length) {
    const envFiles = getEnvFiles(root, platform, mode, usePlatformDir)
    const { parsed } = config({ path: envFiles, processEnv: {}, override: true, quiet: true })
    const envResult = expand({
      parsed: Object.fromEntries(Object.entries(parsed ?? {}).filter(([key]) => prefixes.some(prefix => key.startsWith(prefix)))),
      processEnv: intoProcess ? undefined : {},
    })
    if (envResult.parsed) {
      if (dts !== false) {
        generateEnvTypes(dts, envResult.parsed)
      }
      return envResult.parsed
    }
  }
}
