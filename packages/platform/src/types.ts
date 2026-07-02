import type { FilterPattern } from 'vite'

/** 文件级平台编译选项 */
export interface FilePlatformOptions {
  /**
   * @default "**\/*"
   */
  include: FilterPattern
  /**
   * @default ['/node_modules/', '/.git/']
   */
  exclude: FilterPattern
}

export interface FilePlatformUserOptions extends Partial<FilePlatformOptions> {}

export interface FilePlatformResolvedOptions extends FilePlatformOptions {}

/** 属性级平台修饰符选项（当前无配置项，预留扩展） */
export interface ModifierOptions {}

export interface ModifierUserOptions extends Partial<ModifierOptions> {}

/** 合并后的平台模块配置 */
export interface PlatformOptions {
  /** 文件级平台编译配置 */
  file?: FilePlatformUserOptions
  /** 属性级平台修饰符配置 */
  modifier?: ModifierUserOptions
  /** 是否启用文件级平台编译 */
  fileEnabled?: boolean
  /** 是否启用属性级平台修饰符 */
  modifierEnabled?: boolean
}

export type PlatformUserOptions = Partial<PlatformOptions>
