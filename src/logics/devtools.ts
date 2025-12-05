import type { MPPlatform } from '@/constants'
import process from 'node:process'
import spawn from 'cross-spawn'
import { bold, gray, white } from 'kolorist'
import { join, resolve } from 'pathe'
import { getCliConfig, getGlobalConfig } from '@/cli/config'
import { MP_PLATFORMS } from '@/constants'
import { ensureJsonSync, stripAnsiColors } from '@/utils'
import { getDevtoolsCliPath } from '@/utils/findSoftware'
import { logger } from '@/utils/log'

function getDevtoolsPath() {
  const platform = getGlobalConfig().platform! as MPPlatform
  const userCliPath = getCliConfig().devtools?.cliPath?.[platform]
  if (userCliPath) {
    return userCliPath
  }

  const cliPath = getDevtoolsCliPath(platform)

  return cliPath
}

export function openDevtools(outputDir: string) {
  const cliPath = getDevtoolsPath()
  const platform = getGlobalConfig().platform as MPPlatform
  const platformName = MP_PLATFORMS[platform]

  if (!cliPath) {
    logger.error(`${bold(`未找到 ${platformName}开发者工具`)}`)
    logger.info('请尝试以下解决方案：')
    logger.info('1. 安装对应平台的开发者工具')
    logger.info('2. 在配置文件中手动设置开发者工具路径：')
    logger.info(`   devtools.cliPath.${platform} = "开发者工具路径"`)
    return
  }
  const finalOutputDir = resolve(process.cwd(), stripAnsiColors(outputDir))

  ensureJsonSync(join(finalOutputDir, 'project.config.json'), {
    appid: 'touristappid',
    projectname: 'empty',
  })

  const devtoolsProcess = spawn(cliPath, ['open', '--project', finalOutputDir], {
    stdio: 'inherit',
    cwd: process.cwd(),
  })

  // 监听错误事件，捕获命令执行前的错误（如文件不存在、权限问题等）
  devtoolsProcess.on('error', (error) => {
    logger.error(`${bold(`打开${platformName}开发者工具失败`)}: ${gray(error.message)}`)
  })

  // 监听关闭事件，区分成功和失败退出
  devtoolsProcess.on('close', (code) => {
    if (code !== 0) {
      logger.info('如果无法打开项目，请确保：')
      logger.info(`1. ${cliPath} 存在且可执行`)
      logger.info(`2. 在开发者工具中已开启"设置 > 安全设置 > 服务端口"`)
    }
    else {
      logger.success(white(`${platformName}开发者工具已打开`))
    }
  })
}

/**
 * 判断是否需要打开开发者工具
 */
export function shouldOpenDevtools() {
  const open = getCliConfig().devtools?.open
  if (open === false) {
    return false
  }

  const isMP = getGlobalConfig().platform?.startsWith('mp')
  return isMP
}
