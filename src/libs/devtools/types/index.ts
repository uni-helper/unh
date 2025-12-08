import type { UniHelperConfig } from '@/config/types'
import type { MPPlatform } from '@/constants'

/**
 * 平台特定的字符串配置
 */
export interface PlatformSpecificString {
  /** macOS 平台的值 */
  mac: string
  /** Windows 平台的值 */
  windows: string
}

/**
 * 开发者工具处理器接口
 * 每个平台需要实现此接口来处理开发者工具的检测、路径获取和完整的启动逻辑
 */
export interface DevtoolsHandler {
  /** 支持的小程序平台 */
  platform: MPPlatform
  /** CLI 路径后缀 */
  cliPathSuffix: PlatformSpecificString
  /** 开发者工具名称 */
  devtoolsName: PlatformSpecificString
  /** 检测开发者工具是否安装 */
  detect: () => Promise<boolean>
  /** 获取开发者工具 CLI 路径 */
  getCliPath: () => Promise<string | null>
  /** 完整的启动逻辑，包括命令构建和执行 */
  launch: (projectPath: string) => Promise<boolean>
}

/**
 * 开发者工具配置选项
 */
export type DevtoolsConfig = UniHelperConfig['devtools']
