#!/usr/bin/env node

import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { cac } from 'cac'
import { version } from '../package.json'
import {
  customHelp,
  handleBuildCommand,
  handleDevCommand,
  handleInfoCommand,
  handlePlatformCommand,
  handlePrepareCommand,
} from './commands'
import { getCliConfig, loadCliConfig } from './config'
import { getRawOptions } from './logics'

/**
 * CLI入口函数
 * 负责初始化并执行相应的命令处理
 */
async function main(): Promise<void> {
  try {
    await loadCliConfig()
    const defaultPlatform = getCliConfig()?.platform?.default || 'h5'
    const cli = cac('unh')

    // 版本信息
    cli.version(version)

    // prepare 命令
    cli
      .command('prepare', '准备项目环境')
      .action(async () => {
        await handlePrepareCommand()
      })

    // dev 命令
    cli
      .command('dev [platform]', '启动开发服务器')
      .allowUnknownOptions()
      .action(async (platform, options) => {
        const targetPlatform = platform || defaultPlatform
        const rawOptions = getRawOptions(cli, targetPlatform)

        await handleDevCommand(targetPlatform, options, rawOptions)
      })

    // build 命令
    cli
      .command('build [platform]', '构建项目')
      .allowUnknownOptions()
      .action(async (platform, options) => {
        const targetPlatform = platform || defaultPlatform
        const rawOptions = getRawOptions(cli, targetPlatform)

        await handleBuildCommand(targetPlatform, options, rawOptions)
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

/**
 * 启动 CLI 应用程序。
 *
 * 导出此函数供根包 bin shim 显式调用，避免依赖模块副作用
 * （cli 包声明了 `sideEffects: false`）。
 */
export async function runCli(): Promise<void> {
  await main()
}

// 当本模块作为 bin 直接执行时自动启动；
// 被根包 shim import 时不会重复执行（由调用方显式调用 runCli）。
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runCli()
}
