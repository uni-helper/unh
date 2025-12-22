import type { UniHelperConfig } from '../config/types'
import type { GlobalConfig } from './types'
import { loadConfig } from 'unconfig'

/**
 * 默认配置值
 */
const DEFAULT_CONFIG: UniHelperConfig = {
  platform: {
    default: 'h5',
    alias: {},
  },
  autoGenerate: {
    outDir: 'src',
    pages: false,
    manifest: false,
  },
  devtools: {
    open: false,
  },
}

/**
 * CLI配置管理器 - 单例模式
 */
class ConfigManager {
  private static instance: ConfigManager | null = null
  private cliConfig: UniHelperConfig | null = null
  private globalConfig: GlobalConfig = {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigManager {
    if (ConfigManager.instance === null) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * 私有构造函数，防止外部直接实例化
   */
  private constructor() {}

  /**
   * 加载配置
   * 如果配置已加载则直接返回
   */
  public async loadCliConfig() {
    if (this.cliConfig !== null) {
      return this.cliConfig
    }

    const { config } = await loadConfig<UniHelperConfig>({
      sources: [{ files: 'unh.config' }],
      defaults: DEFAULT_CONFIG,
    })
    this.cliConfig = config
  }

  /**
   * 获取当前配置
   * 如果配置尚未加载，返回null
   */
  public getCliConfig(): UniHelperConfig | null {
    return this.cliConfig
  }

  /**
   * 设置全局配置
   */
  public setGlobalConfig(config: GlobalConfig) {
    this.globalConfig = { ...this.globalConfig, ...config }
  }

  /**
   * 获取全局配置
   */
  public getGlobalConfig(): GlobalConfig {
    return this.globalConfig
  }
}

// 导出单例实例和方法
const configManager = ConfigManager.getInstance()

/**
 * 加载CLI配置
 * 使用单例模式确保配置只加载一次
 */
export async function loadCliConfig() {
  await configManager.loadCliConfig()
}

/**
 * 获取CLI配置
 */
export function getCliConfig() {
  return configManager.getCliConfig() as UniHelperConfig
}

/**
 * 设置全局配置
 */
export function setGlobalConfig(config: GlobalConfig) {
  configManager.setGlobalConfig(config)
}

/**
 * 获取全局配置
 */
export function getGlobalConfig() {
  return configManager.getGlobalConfig()
}
