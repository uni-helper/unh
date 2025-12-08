import type { DevtoolsConfig, DevtoolsHandler, PlatformSpecificString } from './types'
import type { MPPlatform } from '@/constants/platform'
import process from 'node:process'
import { bold } from 'kolorist'
import { resolve } from 'pathe'
import { MP_PLATFORMS } from '@/constants/platform'
import { logger } from '@/utils/log'

/**
 * 小程序开发者工具启动器
 * 提供跨平台的开发者工具打开能力，支持插件化扩展
 */
export class MPDevtoolsLauncher {
  /** 平台处理器映射 */
  private handlers: Map<MPPlatform, DevtoolsHandler> = new Map()
  /** 配置选项 */
  private config: DevtoolsConfig = {}

  /**
   * 构造函数
   * @param config 初始配置
   */
  constructor(config?: DevtoolsConfig) {
    this.config = config || {}
  }

  /**
   * 注册平台处理器
   * @param handler 平台处理器
   */
  registerHandler(handler: DevtoolsHandler): void {
    // 如果处理器有config属性，则传递当前配置
    if ('config' in handler && typeof handler.config === 'object') {
      (handler as any).config = this.config
    }

    this.handlers.set(handler.platform, handler)
  }

  /**
   * 批量注册平台处理器
   * @param handlers 平台处理器数组
   */
  registerHandlers(handlers: DevtoolsHandler[]): void {
    handlers.forEach(handler => this.registerHandler(handler))
  }

  /**
   * 获取平台处理器
   * @param platform 小程序平台
   * @returns 平台处理器或 null
   */
  getHandler(platform: MPPlatform): DevtoolsHandler | null {
    return this.handlers.get(platform) || null
  }

  /**
   * 检查是否支持指定平台
   * @param platform 小程序平台
   * @returns 是否支持
   */
  supports(platform: MPPlatform): boolean {
    return this.handlers.has(platform)
  }

  /**
   * 获取支持的平台列表
   * @returns 支持的平台数组
   */
  getSupportedPlatforms(): MPPlatform[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 获取配置
   * @returns 配置选项
   */
  getConfig(): DevtoolsConfig {
    return { ...this.config }
  }

  /**
   * 获取特定平台的自定义路径
   * @param platform 小程序平台
   * @returns 自定义路径或 undefined
   */
  getCustomCliPath(platform: MPPlatform): string | PlatformSpecificString | undefined {
    return this.config?.cliPath?.[platform]
  }

  /**
   * 打开开发者工具
   * @param platform 小程序平台
   * @param projectPath 项目路径
   * @returns 是否成功打开
   */
  async open(platform: MPPlatform, projectPath: string): Promise<boolean> {
    // 检查是否支持该平台
    if (!this.supports(platform)) {
      logger.warn(`暂不支持自动打开${bold(`${MP_PLATFORMS[platform]}开发者工具`)}`)
      logger.info(`支持的平台: ${this.getSupportedPlatforms().join(', ')}`)
      return false
    }

    const handler = this.getHandler(platform)! // 已检查支持，不会为 null
    const finalProjectPath = resolve(process.cwd(), projectPath)

    try {
      // 检测开发者工具是否安装
      const isInstalled = await handler.detect()
      if (!isInstalled) {
        logger.error(`${platform} 开发者工具未安装或无法检测到`)
        return false
      }

      // 调用 Handler 的完整启动逻辑
      return await handler.launch(finalProjectPath)
    }
    catch (error) {
      logger.error(`${platform} 开发者工具打开失败: ${(error as Error).message}`)
      return false
    }
  }
}
