import type { UniHelperConfig } from '@/config/types'
import { executeCustomHooks } from '@/utils'

/**
 * 处理prepare命令
 */
export async function handlePrepareCommand(config: UniHelperConfig): Promise<void> {
  // 执行自定义安装钩子
  await executeCustomHooks(config, 'prepare', '')
}
