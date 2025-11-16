import type { UniHelperConfig } from '@/config/types'
import { executeBeforeHooks } from '@/utils'

/**
 * 处理prepare命令
 */
export async function handlePrepareCommand(config: UniHelperConfig, options: Record<string, any>): Promise<void> {
  // 执行自定义安装钩子
  await executeBeforeHooks('prepare', config, options)
}
