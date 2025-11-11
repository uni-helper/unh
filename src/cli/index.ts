#!/usr/bin/env node

import process from 'node:process'
import { cac } from 'cac'
import { version } from '../../package.json'
import { customHelp,
  handleBuildCommand,
  handleDevCommand,
  handleInfoCommand,
  handlePlatformCommand,
  handlePrepareCommand,
  handleTuiCommand,
} from './commands'
import { loadCliConfig } from './config'

/**
 * CLI入口函数
 * 负责初始化并执行相应的命令处理
 */
async function main(): Promise<void> {
  try {
    const config = await loadCliConfig()
    const defaultPlatform = config.platform?.default || 'h5'
    const cli = cac('unh')

    // 版本信息
    cli.version(version)

    // prepare 命令
    cli
      .command('prepare', '准备项目环境')
      .action(async () => {
        await handlePrepareCommand(config)
      })

    // dev 命令
    cli
      .command('dev [platform]', '启动开发服务器')
      .allowUnknownOptions()
      .action(async (platform, options) => {
        const targetPlatform = platform || defaultPlatform
        await handleDevCommand(targetPlatform, config, options)
      })

    // build 命令
    cli
      .command('build [platform]', '构建项目')
      .allowUnknownOptions()
      .action(async (platform, options) => {
        const targetPlatform = platform || defaultPlatform
        await handleBuildCommand(targetPlatform, config, options)
      })

    // 信息
    cli
      .command('info', '显示项目信息')
      .action(async () => {
        await handleInfoCommand()
      })

    // platform 命令
    cli
      .command('platform', '显示可编译平台')
      .action(async () => {
        handlePlatformCommand()
      })

    // tui 命令
    cli
      .command('tui', '启动终端UI')
      .action(async () => {
        handleTuiCommand(config.ui?.platforms)
      })

    // 全局帮助选项 - 使用独立的中文帮助模块
    cli.help(customHelp)

    // 解析命令行参数
    cli.parse()
  }
  catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// 启动CLI应用程序
main()
