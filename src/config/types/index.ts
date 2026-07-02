import type { BuildPhase } from '@/cli/types'
import type { Platform } from '@/constants'
import type { MPPlatform } from '@/constants/platform'
import type { PlatformSpecificString } from '@/libs/devtools/types'

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

export interface HookOptions {
  /**
   * 当前编译平台
   */
  platform?: Platform
  /**
   * 编译命令行参数
   */
  options?: Record<string, any>
  /**
   * 当前编译环境变量，需要开启`env`配置才有该数据
   */
  envData?: Record<string, string>
}

/**
 * CLI 路径配置类型
 * 支持字符串或平台特定对象
 */
export type CliPathConfig = string | PlatformSpecificString

/**
 * Unh Vite 插件配置（Phase 7 新增）。
 *
 * 用于 `UnhVitePlugin()` 函数，按需启用各功能模块。
 * 未配置的模块不会加载。
 */
export interface UnhViteConfig {
  /** 项目根目录 */
  root?: string
  /** pages 模块配置（文件路由） */
  pages?: Record<string, any>
  /** layouts 模块配置（布局系统） */
  layouts?: Record<string, any>
  /** components 模块配置（组件自动导入） */
  components?: Record<string, any>
  /** manifest 模块配置（manifest.json 生成） */
  manifest?: Record<string, any>
  /** platform 模块配置（平台编译） */
  platform?: Record<string, any>
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
    /** 开发前执行 */
    dev?: (options: HookOptions) => void | Promise<void>
    /** 开发后执行, 只会执行一次 */
    onDevAfter?: (options: HookOptions) => void | Promise<void>
    /** 构建前执行 */
    build?: (options: HookOptions) => void | Promise<void>
    /** 构建后执行 */
    onBuildAfter?: (options: HookOptions) => void | Promise<void>
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
   * 加载环境变量配置
   * [旨在根据当前编译平台及模式提前加载对应的环境变量并生成类型声明文件]
   * 默认不开启
   */
  env?: true | {
    /**
     * 环境变量文件根目录，默认项目根目录
     */
    root?: string
    /**
     * 是否使用平台名称当作子目录，默认为 `false`
     * 假设`root`为`envs`，开启该参数后，则环境变量文件路径：`envs/mp-weixin/.env` 、`envs/h5/.env`...
     */
    usePlatformDir?: boolean
    /**
     * 筛选需加载的环境变量名前缀，默认为 `['VITE_', 'UNI_']`
     */
    prefixes?: string[]
    /**
     * 是否将加载的环境变量合并至`process.env`中，默认为 `true`
     */
    intoProcess?: boolean
    /**
     * 是否生成类型声明文件，默认为 `uni-env.d.ts`
     */
    dts?: false | string
  }
  /**
   * 小程序开发者工具配置
   */
  devtools?: {
    /**
     * 是否自动打开小程序开发者工具
     * @default false
     */
    open?: boolean
    /**
     * 小程序开发者工具路径配置
     */
    cliPath?: Record<MPPlatform, CliPathConfig>
  }
}
