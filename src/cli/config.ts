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
  ui: {
    enabled: true,
  },
}

/**
 * 加载CLI配置
 */
export async function loadCliConfig(): Promise<UniHelperConfig> {
  const { config } = await loadConfig<UniHelperConfig>({
    sources: [
      {
        files: 'unh.config',
        extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
      },
    ],
    defaults: DEFAULT_CONFIG,
    merge: false,
  })
  return config
}
