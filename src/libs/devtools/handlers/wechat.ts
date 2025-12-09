import type { DevtoolsConfig, DevtoolsHandler } from '../types'
import type { MPPlatform } from '@/constants/platform'
import process from 'node:process'
import spawn from 'cross-spawn'
import { join } from 'pathe'
import { isMacOS } from 'std-env'
import { buildDevtoolsCliPath, findSoftwareInstallLocation } from '@/libs/devtools/utils/findSoftware'
import { ensureJsonSync } from '@/utils'
import { logger } from '@/utils/log'

/**
 * 微信开发者工具处理器
 * 实现微信小程序开发者工具的检测、路径获取和完整的启动逻辑
 * 支持 Windows 和 macOS 操作系统
 */
export class WechatDevtoolsHandler implements DevtoolsHandler {
  platform: MPPlatform = 'mp-weixin'

  cliPathSuffix = {
    windows: 'cli.bat',
    mac: 'Contents/MacOS/cli',
  }

  devtoolsName = {
    windows: '微信开发者工具',
    mac: 'wechatwebdevtools',
  }

  /**
   * 配置选项
   */
  private config: DevtoolsConfig = {}

  /**
   * 开发者工具安装路径，在detect时存储
   */
  private installPath: string | null = null

  constructor() {}

  /**
   * 检测微信开发者工具是否安装
   * @returns 是否安装微信开发者工具
   */
  async detect(): Promise<boolean> {
    // 如果已经检测过且存储了安装路径，直接返回
    if (this.installPath) {
      return true
    }

    // 检测安装路径并存储
    const path = findSoftwareInstallLocation(this.devtoolsName)
    this.installPath = path
    return path !== null
  }

  /**
   * 获取微信开发者工具CLI路径
   * 优先使用自定义路径，其次使用存储的安装路径和CLI路径后缀构建
   * @returns 微信开发者工具CLI路径或null
   */
  async getCliPath(): Promise<string | null> {
    // 优先使用自定义路径
    const customPath = this.config?.cliPath?.[this.platform]
    if (customPath) {
      if (typeof customPath === 'string') {
        return customPath
      }
      return isMacOS ? customPath.mac : customPath.windows
    }

    // 确保已检测安装路径
    if (this.installPath === null) {
      await this.detect()
    }

    if (!this.installPath) {
      return null
    }

    // 构建完整CLI路径
    return buildDevtoolsCliPath(this.installPath, this.cliPathSuffix)
  }

  /**
   * 完整的启动逻辑，包括命令构建和执行
   * @param projectPath 项目路径
   * @returns 是否成功启动
   */
  async launch(projectPath: string): Promise<boolean> {
    try {
      // 获取开发者工具路径
      const cliPath = await this.getCliPath()

      if (!cliPath) {
        return false
      }

      ensureJsonSync(join(projectPath, 'project.config.json'), {
        appid: 'touristappid',
        projectname: 'empty',
      })

      // 构建命令
      const command = [cliPath, 'open', '--project', projectPath]

      // 执行命令
      return new Promise((resolve) => {
        const childProcess = spawn(command[0], command.slice(1), {
          stdio: 'inherit',
          cwd: process.cwd(),
        })

        // 监听错误事件
        childProcess.on('error', (error) => {
          logger.error(`微信开发者工具打开失败: ${error.message}`)
          logger.info('请检查开发者工具是否已安装并配置正确路径')
          resolve(false)
        })

        // 监听关闭事件
        childProcess.on('close', (code) => {
          if (code === 0) {
            resolve(true)
          }
          else {
            logger.error(`微信开发者工具打开失败，退出码: ${code}`)
            logger.info('请检查开发者工具服务端口是否已开启')
            logger.info('具体操作: 开发者工具 -> 设置 -> 安全设置 -> 开启服务端口')
            resolve(false)
          }
        })
      })
    }
    catch (error) {
      logger.error(`微信开发者工具打开失败: ${(error as Error).message}`)
      return false
    }
  }
}
