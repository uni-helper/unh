import type { UniHelperConfig } from '@/config/types'
import { executeCustomHooks, generateConfigFiles } from './common'

/**
 * 处理prepare命令
 */
export async function handlePrepareCommand(config: UniHelperConfig): Promise<void> {
  // 生成配置文件
  await generateConfigFiles(config, 'install')

  // 执行自定义安装钩子
  await executeCustomHooks(config, 'prepare', '')
}
