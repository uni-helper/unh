/**
 * @uni-helper/unh-cli 公共 API。
 *
 * 统一配置入口：CLI 与 Vite 插件均通过 `loadUnhConfig()` / `defineConfig()`
 * 读写 `unh.config.ts`，不再通过插件参数传递配置。
 */

// 配置加载与定义助手（loadUnhConfig / defineConfig / loadCliConfig 等）
export * from './config'

// 平台 / 终端常量与类型
export * from './constants'

// 通用类型（CommandType / BuildPhase / GlobalConfig 等）
export * from './types'

// 配置类型（含统一 UniHelperConfig）
export * from './types/config'
