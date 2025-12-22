import type { MPPlatform } from '@/constants'
import { getCliConfig, getGlobalConfig } from '@/cli/config'
import { MPDevtoolsLauncher } from '@/libs/devtools'
import { WechatDevtoolsHandler } from '@/libs/devtools/handlers'

export function openMPDevtools(outputDir: string) {
  if (shouldOpenDevtools()) {
    const platform = getGlobalConfig().platform as MPPlatform
    const mpDevtoolsLauncher = new MPDevtoolsLauncher(getCliConfig().devtools)
    mpDevtoolsLauncher.registerHandlers([
      new WechatDevtoolsHandler(),
    ])
    mpDevtoolsLauncher.open(platform, outputDir)
  }
}

/**
 * 判断是否需要打开开发者工具
 */
export function shouldOpenDevtools() {
  const open = getCliConfig().devtools?.open
  const isMP = getGlobalConfig().platform?.startsWith('mp')
  return open && isMP
}
