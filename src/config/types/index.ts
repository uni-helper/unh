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
    /**
     * 环境变量加载完毕时执行（需开启`env`环境变量加载配置）
     * @param inputPlatform 当前编译平台
     * @param options 当前编译命令参数
     * @param envData 当前已加载环境变量
     * @returns void
     */
    onEnvLoaded?: (inputPlatform: string, options?: Record<string, any>, envData?: Record<string, string>) => void | Promise<void>
    /** 安装依赖时执行 */
    prepare?: () => void | Promise<void>
    /** 构建前执行 */
    build?: (inputPlatform: string, options?: Record<string, any>) => void | Promise<void>
    /** 开发前执行 */
    dev?: (inputPlatform: string, options?: Record<string, any>) => void | Promise<void>
    /** 构建后执行 */
    onBuildAfter?: (inputPlatform: string, options?: Record<string, any>) => void | Promise<void>
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
     * 是否生成类型声明文件，默认为 `unh-env.d.ts`
     */
    dts?: false | string
  }
}
