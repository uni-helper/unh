import type { UniHelperConfig } from '../config/types'
import { loadConfig } from 'unconfig'

/**
 * 默认配置值
 */
const DEFAULT_CONFIG: UniHelperConfig = {
  platform: {
    default: 'h5',
    alias: {},
  },
  autoGenerate: {
    outDir: 'src',
    pages: false,
    manifest: false,
  },
}

/**
 * 加载CLI配置
 */
export async function loadCliConfig(): Promise<UniHelperConfig> {
  const { config } = await loadConfig<UniHelperConfig>({
    sources: [{ files: 'unh.config' }],
    defaults: DEFAULT_CONFIG,
  })
  return config
}
