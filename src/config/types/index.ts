import type { Platform, Platforms } from '../../constant'

type CommandType = 'dev' | 'build' | 'install'
export type PlatformAlias = Partial<Record<Platform, string[] | string>>

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
  prepare?: {
    /** 安装依赖时执行 */
    install?: () => void | Promise<void>
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
    pages?: boolean | CommandType
    /**
     * 是否自动生成manifest.json
     * @default false
     */
    manifest?: boolean | CommandType
  }
  /**
   * 终端UI配置
   */
  ui?: {
    /**
     * 是否启用终端UI
     * @default true
     */
    enabled?: boolean
    /**
     * 用于指定终端UI显示的平台
     */
    platforms?: Platforms
  }
}
