import type { SFCParseResult as VueSFCParseResult } from '@vue/compiler-sfc'
import type { Hookable } from 'hookable'
import type MagicString from 'magic-string'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { UnhContext } from './context'

/**
 * SFC 解析缓存条目。
 * 通过 `code` 对比实现缓存失效：源码变更后缓存自动作废。
 */
export interface SFCParseResult {
  /** 被解析的源码，用于缓存命中校验 */
  code: string
  /** @vue/compiler-sfc 的解析结果 */
  result: VueSFCParseResult
  /** 解析时间戳 */
  timestamp: number
}

/**
 * 文件扫描缓存条目。
 * 缓存键必须包含 patterns + cwd，且通过 chokidar 事件触发失效。
 */
export interface ScanCacheEntry {
  /** 命中的文件路径数组（注意：是路径数组，不是文件内容） */
  files: string[]
  /** 扫描时间戳 */
  timestamp: number
}

/**
 * 模块间通信的 Hook 定义。
 * 模块禁止直接 import 其他模块，必须通过 hooks 或 ctx.state 通信。
 */
export interface UnhHooks {
  // ===== 生命周期 =====
  /** 所有模块安装完成后触发 */
  'modules:installed': () => void
  /** Vite config 解析完成后触发 */
  'config:resolved': (config: ResolvedConfig) => void
  /** Vite DevServer 就绪后触发 */
  'server:ready': (server: ViteDevServer) => void
  /** 构建开始 */
  'build:start': () => void
  /** 构建结束 */
  'build:end': () => void

  // ===== 模块间数据共享 =====
  /** 页面路由解析完成后触发，layouts/manifest 等模块监听此 hook */
  'pages:extend': (pages: PageMeta[]) => void
  /** 布局列表解析完成后触发 */
  'layouts:extend': (layouts: LayoutMeta[]) => void
  /** 组件列表变化时触发 */
  'components:extend': (components: ComponentMeta[]) => void
  /** manifest 数据变化时触发 */
  'manifest:extend': (manifest: Record<string, unknown>) => void

  // ===== SFC 解析 =====
  /** SFC 被解析（命中缓存或新建）后触发 */
  'sfc:parse': (filePath: string, result: SFCParseResult) => void
  /** SFC 即将被 transform，允许模块通过 MagicString 修改代码 */
  'sfc:transform': (filePath: string, code: MagicString) => void
}

/** Hook 系统的实例类型 */
export type UnhHookable = Hookable<UnhHooks>

/**
 * 模块元信息。
 * 每个功能模块必须提供唯一 name 与对应配置键。
 */
export interface UnhModuleMeta {
  /** 模块唯一标识，例如 `unh:pages` */
  name: string
  /** 对应 unh.config.ts 中的配置键，例如 `pages` */
  configKey: string
  /** 依赖的其他模块 name 列表，用于拓扑排序 */
  dependencies?: string[]
}

/**
 * Unh 模块定义。
 * 每个功能模块（pages / layouts / components 等）遵循此接口。
 *
 * 模块间禁止直接 import，必须通过 `ctx.hooks` 或 `ctx.state` 通信。
 */
export interface UnhModule<TOptions = any> {
  meta: UnhModuleMeta
  /** 默认配置，会与用户配置深度合并 */
  defaults: TOptions
  /**
   * 模块安装函数。在此注册 Vite 插件、监听 hooks、初始化状态。
   * 可返回 Promise。
   */
  setup: (options: TOptions, ctx: UnhContext) => void | Promise<void>
  /** 模块贡献的 Vite 插件（由 setup 中填充，createUnhVitePlugin 收集） */
  vitePlugins?: Plugin[]
}

/** 基础页面元数据（pages 模块产出，供 layouts/manifest 消费） */
export interface PageMeta {
  path: string
  file: string
  layout?: string
  style?: Record<string, unknown>
  [key: string]: unknown
}

/** 基础布局元数据 */
export interface LayoutMeta {
  name: string
  file: string
  default?: boolean
}

/** 基础组件元数据 */
export interface ComponentMeta {
  name: string
  /** 组件来源路径，用于按需导入 */
  from: string
  /** 是否为异步组件 */
  async?: boolean
}

/**
 * 解析后的 Unh 顶层配置。
 * Phase 1 仅保留通用字段，各模块的配置键由模块自身声明（configKey）。
 */
export interface ResolvedUnhConfig {
  /** 模块配置，按 configKey 索引 */
  modules?: Record<string, any>
  [key: string]: unknown
}
