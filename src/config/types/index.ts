import type { Platform, Platforms } from '../../constant'
import type { BuildPhase } from '@/cli/types'

export type PlatformAlias = Partial<Record<Platform, string[] | string>>

export interface ManifestOptions {
  /**
   * minify the `manifest.json`
   * @default false
   */
  minify?: boolean
  /**
   * insert newline at the end of the `manifest.json`
   * @default false
   */
  insertFinalNewline?: boolean
}

/**
 * uni 助手配置
 */
export interface UniHelperConfig {
  /**
   * 平台别名配置
   * 用于自定义配置不同平台的别名，
   */
  platform?: {
    /**
     * 默认平台
     * 用于指定默认的平台，当未指定平台时使用该平台
     * @default 'h5'
     */
    default?: Platform
    /**
     * 平台别名
     * 用于自定义配置不同平台的别名，
     */
    alias?: PlatformAlias
  }
  hooks?: {
    /** 安装依赖时执行 */
    prepare?: () => void | Promise<void>
    /** 构建前执行 */
    build?: (inputPlatform: string) => void | Promise<void>
    /** 开发前执行 */
    dev?: (inputPlatform: string) => void | Promise<void>
  }
  autoGenerate?: {
    /**
     * 自动生成的文件输出目录
     * @default 'src'
     */
    outDir?: string
    /**
     * 是否自动生成pages.json
     * @default false
     */
    pages?: boolean | BuildPhase[]
    /**
     * 是否自动生成manifest.json
     * @default false
     */
    manifest?: boolean | ManifestOptions & {
      commands?: BuildPhase[]
    }
  }
  /**
   * 终端UI配置, 测试功能，谨慎使用
   */
  ui?: {
    /**
     * 用于指定终端UI显示的平台
     */
    platforms?: Platforms
  }
}
