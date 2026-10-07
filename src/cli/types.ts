import type { Platform } from '@/constants'

/**
 * 支持的命令类型
 */
export type CommandType = 'dev' | 'build' | 'prepare'

/**
 * 构建或开发阶段
 */
export type BuildPhase = 'dev' | 'build'

export type GlobalConfig = Partial<{
  type: BuildPhase
  platform: Platform
}>
