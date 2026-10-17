#!/usr/bin/env node

import process from 'node:process'
import { cac } from 'cac'
import { assertEsmProject, getRawOptions } from '@/logics'
import { version } from '../../package.json'
import {
  customHelp,
  handleBuildCommand,
  handleDeployCommand,
  handleDevCommand,
  handleInfoCommand,
  handlePlatformCommand,
  handlePrepareCommand,
} from './commands'
import { getCliConfig, loadCliConfig } from './config'

/**
 * CLI入口函数
 * 负责初始化并执行相应的命令处理
 */
async function main(): Promise<void> {
  try {
    // 仅支持 ESM 项目，CJS 环境在任何命令执行前直接中断
    assertEsmProject()
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

    // deploy 命令
    cli
      .command('deploy [...targets]', '部署小程序构建产物')
      .option('-p, --platform <platform>', '目标平台，多个平台用逗号分隔。可选：mp-weixin/mp-alipay/mp-toutiao/mp-baidu/mp-jd/mp-dingtalk')
      .option('-a, --action <action>', '部署动作。可选：upload（上传体验版）/preview（生成预览二维码）/open（打开开发者工具）')
      .option('--cwd <dir>', '工作目录，默认为当前目录')
      .option('--config <path>', '自定义配置文件路径，传 false 表示不读取配置文件')
      .option('--app-version <version>', '版本号，覆盖配置文件中的 version')
      .option('--desc <desc>', '版本描述，覆盖配置文件中的 desc')
      .option('--project-path <path>', '构建产物目录，覆盖配置文件中的 projectPath')
      .action(async (targets, options) => {
        await handleDeployCommand(targets, options)
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

// 启动CLI应用程序
main()
