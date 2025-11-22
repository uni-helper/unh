import { executeBeforeHooks } from '@/logics'
import { getCliConfig } from '../config'

/**
 * 处理prepare命令
 */
export async function handlePrepareCommand(): Promise<void> {
  const config = getCliConfig()
  // 执行自定义安装钩子
  await executeBeforeHooks('prepare', config)
}
