---
name: "unh-migration"
description: "Guides the consolidation of uni-helper Vite plugins into a unified Unh framework. Invoke when working on Unh project architecture, migrating plugins, or implementing shared infrastructure."
---

# Unh 集成迁移技能

本技能规范了将 uni-helper 组织下分散的 Vite 插件整合为统一 Unh 框架的完整流程。目标：让 Unh 之于 UniApp，如 Nuxt 之于 Vue。

**本技能完全自包含，不依赖任何外部上下文。** 所有源码获取、架构设计、迁移步骤均在此文件中定义。

---

## 一、源仓库索引

**关键原则：在迁移任何模块之前，必须先从源仓库获取最新源码并阅读理解，禁止凭记忆或猜测编写代码。**

### 1.1 待迁移的 Vite 插件

| 模块名 | 源仓库 | npm 包名 | Stars | 功能 |
|--------|--------|----------|-------|------|
| pages | `https://github.com/uni-helper/vite-plugin-uni-pages` | `@uni-helper/vite-plugin-uni-pages` | 201 | 基于文件系统的路由，TypeScript 编写 pages.json |
| layouts | `https://github.com/uni-helper/vite-plugin-uni-layouts` | `@uni-helper/vite-plugin-uni-layouts` | 65 | 类 Nuxt 的 layouts 系统 |
| components | `https://github.com/uni-helper/vite-plugin-uni-components` | `@uni-helper/vite-plugin-uni-components` | 42 | 按需自动引入组件 |
| manifest | `https://github.com/uni-helper/vite-plugin-uni-manifest` | `@uni-helper/vite-plugin-uni-manifest` | 31 | 用 TypeScript 编写 manifest.json |
| platform | `https://github.com/uni-helper/vite-plugin-uni-platform` | `@uni-helper/vite-plugin-uni-platform` | 15 | 基于文件名的按平台编译 |
| platform-modifier | `https://github.com/uni-helper/vite-plugin-uni-platform-modifier` | `@uni-helper/vite-plugin-uni-platform-modifier` | 14 | 为属性/指令提供平台修饰符 |

### 1.2 参考架构

| 仓库 | 参考价值 |
|------|----------|
| `https://github.com/nuxt/nuxt` | Nuxt 3 monorepo 架构，模块系统，hooks 通信 |
| `https://github.com/unjs/hookable` | hookable 库，Nuxt 使用的 hooks 系统 |

### 1.3 源码获取流程

**每次开始迁移一个新模块时，必须执行以下步骤获取源码：**

1. **克隆源仓库到临时目录**（不要在 unh 项目内克隆）：
   ```bash
   git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-pages.git /tmp/vite-plugin-uni-pages
   ```

2. **阅读核心源码文件**（按优先级）：
   - `package.json` — 依赖、构建配置、导出路径
   - `src/index.ts` — 插件入口，Vite 钩子注册
   - `src/context.ts` — Context 类，插件状态管理
   - `src/types.ts` — 类型定义
   - `src/constants.ts` — 常量定义
   - `src/utils/` 或 `src/shared/` — 工具函数
   - `test/` 或 `__tests__/` — 测试用例

3. **记录关键信息**：
   - Vite 插件钩子列表（configResolved / transform / load / resolveId / configureServer 等）
   - AST 解析方式（`@vue/compiler-sfc` / `ast-kit` / `@vue/compiler-dom` / 正则）
   - 文件扫描方式（`tinyglobby` / `fast-glob` / `chokidar`）
   - 与其他插件的交互方式
   - 导出的公开 API

4. **获取完成后删除临时目录**：
   ```bash
   rm -rf /tmp/vite-plugin-uni-pages
   ```

### 1.4 各模块源码结构参考

> **注意**：以下结构基于历史快照，实际结构可能已变更。迁移前必须按 1.3 流程获取最新源码确认。

**vite-plugin-uni-pages**（monorepo，核心在 `packages/core/`）：
```
packages/
├── core/src/
│   ├── index.ts          # 插件入口
│   ├── context.ts        # PageContext 类（~700行，最核心）
│   ├── types.ts          # 类型定义
│   ├── constants.ts      # 常量
│   ├── utils.ts          # 工具函数
│   ├── parse/            # SFC 解析相关
│   └── options.ts        # 配置处理
├── schema/               # JSON Schema
└── types/                # 类型包
```

**vite-plugin-uni-layouts**：
```
src/
├── index.ts              # 插件入口
├── context.ts            # Context 类
├── types.ts              # 类型定义
├── utils.ts              # 工具函数（parseSFC, 组件名生成等）
└── constants.ts          # 常量
```

**vite-plugin-uni-components**（monorepo，核心在 `packages/core/`）：
```
packages/core/src/
├── index.ts              # 插件入口
├── context.ts            # Context 类（~250行）
├── types.ts              # 类型定义
├── transform.ts          # 组件转换逻辑
├── resolvers/            # 组件解析器
└── utils/                # 工具函数
```

**vite-plugin-uni-manifest**（monorepo，核心在 `packages/core/`）：
```
packages/core/src/
├── index.ts              # 插件入口
├── context.ts            # ManifestContext 类（极简，~50行）
└── types.ts              # 类型定义
```

**vite-plugin-uni-platform**：
```
src/
├── index.ts              # 插件入口
├── hacker.ts             # monkey-patch @dcloudio/uni-cli-shared
└── utils.ts              # 工具函数
```

**vite-plugin-uni-platform-modifier**：
```
src/
├── index.ts              # 插件入口
├── context.ts            # Context 类（极简，~30行）
├── utils.ts              # 属性处理工具
└── types.ts              # 类型定义
```

---

## 二、项目背景与目标

### 现状问题

uni-helper 组织下有 6 个独立的 Vite 插件，存在以下问题：

1. **AST 重复解析**：同一个 `.vue` 文件最多被 4 个插件各自解析一次（pages、layouts、platform-modifier、components）
2. **代码冗余**：`parseSFC()`、`setupViteServer()`、Context 类、组件名生成等逻辑在多个插件中重复实现
3. **隐式通信**：插件间通过文件系统中转（pages 生成 pages.json → layouts 读取），脆弱且低效
4. **维护分散**：7 个独立仓库，依赖版本不统一，Issue/PR 分散

### 已识别的重复模式

| 重复点 | 涉及插件 | 详情 |
|--------|----------|------|
| Vue SFC 解析 (`parseSFC`) | pages, layouts | 两者都使用 `@vue/compiler-sfc.parse()`，实现几乎完全相同 |
| Babel AST 解析 | pages, layouts | 两者都使用 `ast-kit.babelParse()` 解析 `<script>` 内容 |
| Vue Template AST 遍历 | layouts, platform-modifier | 两者都遍历 Vue template AST 节点 |
| `setupViteServer()` | pages, layouts, components | 三者有相同的 DevServer 设置模式 |
| chokidar 文件监听 | pages, layouts, components | 三者独立创建 watcher |
| 组件名生成 (PascalCase) | layouts, components | 各自实现，layouts 用 `scule`，components 用自定义函数 |
| Context 类结构 | pages, layouts, components, manifest, platform-modifier | 接口不统一但逻辑重复 |
| MagicString 代码修改 | pages, layouts, components, platform-modifier | 四者使用相同模式 |

### 目标架构

```
@uni-helper/unh (统一入口，monorepo)
├── packages/
│   ├── core/            # 共享上下文 + hooks 系统 + SFC 解析缓存 + 工具函数
│   ├── kit/             # 模块开发 API (defineUnhModule + 工具函数)
│   ├── schema/          # 类型定义
│   ├── cli/             # CLI 工具 (unh dev / unh build)
│   ├── pages/           # 基于文件的路由 (迁移自 vite-plugin-uni-pages)
│   ├── layouts/         # 布局系统 (迁移自 vite-plugin-uni-layouts)
│   ├── components/      # 组件自动导入 (迁移自 vite-plugin-uni-components)
│   ├── manifest/        # manifest.json 生成 (迁移自 vite-plugin-uni-manifest)
│   ├── platform/        # 平台编译 (合并 uni-platform + uni-platform-modifier)
│   └── env/             # 环境变量
├── playground/          # 测试用的示例项目
└── test/                # 共享测试工具和 fixtures
```

### 目标用户体验

```ts
// unh.config.ts — 唯一配置入口
import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  pages: {
    exclude: ['**/components/*.vue'],
  },
  layouts: {
    defaultLayout: 'default',
  },
  components: {
    dirs: ['src/components'],
  },
  manifest: {
    minify: true,
  },
  platform: {
    modifiers: true,
  },
  env: {
    root: 'envs',
  },
  devtools: {
    open: true,
  },
})
```

```ts
// vite.config.ts — 极简
import Unh from '@uni-helper/unh'

export default defineConfig({
  plugins: [Unh()],
})
```

---

## 三、核心架构规范

### 3.1 共享上下文 (UnhContext)

所有模块共享一个 `UnhContext` 实例，这是整个架构的核心：

```ts
// packages/core/src/context.ts
import { Hookable } from 'hookable'

export class UnhContext {
  /** hook 系统，模块间通信的核心 */
  hooks: Hookable<UnhHooks>

  /** Vite ResolvedConfig */
  config: ResolvedConfig | null = null

  /** Vite DevServer */
  server: ViteDevServer | null = null

  /** SFC 解析缓存：filePath → parseResult */
  sfcCache: Map<string, SFCParseResult> = new Map()

  /** 模块注册表 */
  modules: Map<string, UnhModule> = new Map()

  /** 共享状态：模块间传递元数据 */
  state: Map<string, unknown> = new Map()

  /** 根目录 */
  root: string

  /** 用户配置 */
  options: ResolvedUnhConfig
}
```

### 3.2 Hook 系统

模块间通过 hooks 通信，不直接 import 其他模块：

```ts
// packages/core/src/hooks.ts
export interface UnhHooks {
  // 生命周期
  'modules:installed': () => void
  'config:resolved': (config: ResolvedConfig) => void
  'server:ready': (server: ViteDevServer) => void
  'build:start': () => void
  'build:end': () => void

  // 模块间数据共享
  'pages:extend': (pages: PageMeta[]) => void
  'layouts:extend': (layouts: LayoutMeta[]) => void
  'components:extend': (components: ComponentMeta[]) => void
  'manifest:extend': (manifest: Record<string, unknown>) => void

  // SFC 解析
  'sfc:parse': (filePath: string, result: SFCParseResult) => void
  'sfc:transform': (filePath: string, code: MagicString) => void
}
```

### 3.3 模块定义规范

每个功能模块必须遵循 `defineUnhModule` 接口：

```ts
// packages/kit/src/module.ts
export interface UnhModuleMeta {
  /** 模块唯一标识 */
  name: string
  /** 对应 unh.config.ts 中的配置键 */
  configKey: string
  /** 依赖的其他模块 */
  dependencies?: string[]
}

export interface UnhModule<TOptions = any> {
  meta: UnhModuleMeta
  defaults: TOptions
  setup(options: TOptions, ctx: UnhContext): void | Promise<void>
}

export function defineUnhModule<TOptions>(module: UnhModule<TOptions>): UnhModule<TOptions> {
  return module
}
```

### 3.4 SFC 解析缓存规范

**这是性能优化的核心**。所有模块必须从 UnhContext 的缓存获取 SFC 解析结果，禁止独立解析：

```ts
// packages/core/src/sfc.ts
export function parseSFC(ctx: UnhContext, filePath: string, code: string): SFCParseResult {
  const cached = ctx.sfcCache.get(filePath)
  if (cached && cached.code === code) {
    return cached
  }

  const result = compilerSFC.parse(code, { filename: filePath })
  const entry: SFCParseResult = { code, result, timestamp: Date.now() }
  ctx.sfcCache.set(filePath, entry)
  ctx.hooks.callHook('sfc:parse', filePath, entry)
  return entry
}
```

**规则**：
- 任何模块需要解析 Vue SFC 时，必须调用 `parseSFC(ctx, filePath, code)`
- 禁止直接调用 `@vue/compiler-sfc.parse()`
- Vite `transform` 钩子中，先调用 `parseSFC`，再从返回结果中提取所需信息
- 文件变更时，缓存自动失效（通过 code 对比）

### 3.5 文件扫描规范

统一使用 `tinyglobby` 作为 glob 引擎，通过 UnhContext 共享扫描结果：

```ts
// packages/core/src/scan.ts
export interface ScanOptions {
  patterns: string[]
  cwd: string
  ignore?: string[]
}

export async function scanFiles(ctx: UnhContext, key: string, options: ScanOptions): Promise<string[]> {
  const cacheKey = `scan:${key}`
  const cached = ctx.state.get(cacheKey) as string[] | undefined
  if (cached) return cached

  const files = await glob(options.patterns, { cwd: options.cwd, ignore: options.ignore })
  ctx.state.set(cacheKey, files)
  return files
}
```

### 3.6 Vite 插件注册规范

所有模块的 Vite 插件通过统一注册机制注入：

```ts
// packages/core/src/vite.ts
export function createUnhVitePlugin(ctx: UnhContext): Plugin[] {
  const plugins: Plugin[] = []

  // 按依赖顺序注册模块的 Vite 插件
  const orderedModules = resolveModuleOrder(ctx.modules)

  for (const mod of orderedModules) {
    if (mod.vitePlugins) {
      plugins.push(...mod.vitePlugins)
    }
  }

  // 核心 Vite 插件：SFC 缓存 + 共享 transform
  plugins.unshift({
    name: 'unh:core',
    enforce: 'pre',
    async transform(code, id) {
      if (id.endsWith('.vue')) {
        // 预解析 SFC 并缓存，后续模块直接读取
        parseSFC(ctx, id, code)
      }
    },
  })

  return plugins
}
```

**模块注册顺序**（按依赖关系）：
1. `unh:core` — SFC 缓存预解析
2. `unh:platform` — 平台文件解析（影响后续模块的文件选择）
3. `unh:pages` — 页面路由（layouts 依赖其输出）
4. `unh:layouts` — 布局系统（依赖 pages 的路由信息）
5. `unh:components` — 组件自动导入
6. `unh:manifest` — manifest 生成（需要 pages 的路由信息）

---

## 四、分阶段实施流程

### Phase 1: 共享基础层 (packages/core)

**目标**：创建 `@uni-helper/unh-core` 包，抽取所有重复逻辑。

**步骤**：

1. **创建 monorepo 结构**
   - 将现有 unh 项目转为 monorepo（pnpm-workspace.yaml 已存在）
   - 创建 `packages/core/` 目录
   - 配置 tsdown 构建

2. **实现 UnhContext**
   - 引入 `hookable` 依赖
   - 实现 `UnhContext` 类
   - 定义 `UnhHooks` 类型

3. **实现 SFC 解析缓存**
   - 统一 `parseSFC()` 函数
   - 兼容 `@vue/compiler-sfc` 不同版本
   - 实现缓存失效机制

4. **实现文件扫描工具**
   - 统一使用 `tinyglobby`
   - 实现扫描结果缓存
   - 实现 chokidar watcher 工厂

5. **实现通用工具**
   - `setupViteServer()` — 统一的 DevServer 设置
   - `setupWatcher()` — 统一的文件监听设置
   - 组件名生成（统一使用 `scule`）
   - `MagicString` 工具函数

6. **实现 defineUnhModule**
   - 模块注册机制
   - 依赖解析和排序
   - 默认配置合并

**验证标准**：
- [ ] `UnhContext` 可创建并注册模块
- [ ] `parseSFC()` 缓存命中率 > 0
- [ ] 文件扫描结果可跨模块共享
- [ ] 所有工具函数有单元测试

### Phase 2: 迁移 pages 模块

**目标**：将 `vite-plugin-uni-pages` 迁移为 `@uni-helper/unh-pages`。

**源码获取**：
```bash
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-pages.git /tmp/vite-plugin-uni-pages
```

**重点阅读文件**：
- `packages/core/src/index.ts` — 插件入口
- `packages/core/src/context.ts` — PageContext 类（~700行，最核心）
- `packages/core/src/types.ts` — 类型定义
- `packages/core/src/parse/` — SFC 解析和 definePage 宏处理

**步骤**：

1. **创建 packages/pages/ 目录**

2. **迁移核心逻辑**
   - 将 `PageContext` 改为基于 `UnhContext`
   - 将 `parseSFC()` 调用替换为 `ctx.parseSFC()`
   - 将文件扫描替换为 `ctx.scanFiles()`
   - 将 `setupViteServer()` 替换为 `ctx.setupViteServer()`

3. **注册 hooks**
   - `pages:extend` hook：在路由解析完成后通知其他模块
   - `config:resolved` hook：初始化页面扫描
   - `server:ready` hook：设置 HMR

4. **保持 API 兼容**
   - 保留 `definePage` 宏
   - 保留 `virtual:uni-pages` 虚拟模块
   - 保留 `pages.config.ts` 配置方式

5. **编写测试**
   - 从原仓库迁移测试用例
   - 补充 SFC 缓存相关测试

**验证标准**：
- [ ] playground 项目可正常启动开发服务器
- [ ] `definePage` 宏正常工作
- [ ] pages.json 正确生成
- [ ] HMR 正常工作
- [ ] 与独立版 `vite-plugin-uni-pages` 功能对等

### Phase 3: 迁移 layouts 模块

**目标**：将 `vite-plugin-uni-layouts` 迁移为 `@uni-helper/unh-layouts`，并与 pages 模块通过 hooks 通信。

**源码获取**：
```bash
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-layouts.git /tmp/vite-plugin-uni-layouts
```

**重点阅读文件**：
- `src/index.ts` — 插件入口
- `src/context.ts` — Context 类
- `src/utils.ts` — parseSFC、组件名生成等工具函数

**步骤**：

1. **创建 packages/layouts/ 目录**

2. **迁移核心逻辑**
   - 将 `Context` 改为基于 `UnhContext`
   - **关键**：不再读取 pages.json，改为监听 `pages:extend` hook 获取页面列表
   - 将 `parseSFC()` 替换为 `ctx.parseSFC()`

3. **与 pages 模块集成**
   - 监听 `pages:extend` hook 获取页面 layout 配置
   - 不再需要 chokidar 监听 pages.json 变化
   - 通过 `ctx.state` 获取页面元数据

4. **保持 API 兼容**
   - 保留 `defineLayout` 宏
   - 保留 `virtual:uni-layouts` 虚拟模块

**验证标准**：
- [ ] 布局系统正常工作
- [ ] 不再依赖 pages.json 文件读取
- [ ] SFC 解析不再重复（与 pages 共享缓存）

### Phase 4: 迁移 components 模块

**目标**：将 `vite-plugin-uni-components` 迁移为 `@uni-helper/unh-components`。

**源码获取**：
```bash
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-components.git /tmp/vite-plugin-uni-components
```

**重点阅读文件**：
- `packages/core/src/index.ts` — 插件入口
- `packages/core/src/context.ts` — Context 类（~250行）
- `packages/core/src/transform.ts` — 组件转换逻辑
- `packages/core/src/resolvers/` — 组件解析器

**步骤**：

1. **创建 packages/components/ 目录**

2. **迁移核心逻辑**
   - 将 `Context` 改为基于 `UnhContext`
   - 将文件扫描替换为 `ctx.scanFiles()`
   - 将 `setupViteServer()` 替换为 `ctx.setupViteServer()`

3. **注册 hooks**
   - `components:extend` hook：通知其他模块组件列表变化

4. **保持 API 兼容**
   - 保留 resolvers 接口
   - 保留组件自动导入行为

**验证标准**：
- [ ] 组件自动导入正常工作
- [ ] resolvers 正常工作
- [ ] 类型声明正常生成

### Phase 5: 迁移 manifest 模块

**目标**：将 `vite-plugin-uni-manifest` 迁移为 `@uni-helper/unh-manifest`。

**源码获取**：
```bash
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-manifest.git /tmp/vite-plugin-uni-manifest
```

**重点阅读文件**：
- `packages/core/src/index.ts` — 插件入口
- `packages/core/src/context.ts` — ManifestContext 类

**步骤**：

1. **创建 packages/manifest/ 目录**

2. **迁移核心逻辑**
   - 保持 `c12` 配置加载方式
   - 监听 `pages:extend` hook 获取路由信息，自动注入 manifest 的 pages 字段

3. **与 pages 模块集成**
   - 通过 `ctx.state` 获取页面路由信息
   - 自动合并页面路由到 manifest

**验证标准**：
- [ ] manifest.json 正确生成
- [ ] 页面路由自动注入到 manifest

### Phase 6: 合并 platform 模块

**目标**：将 `vite-plugin-uni-platform` 和 `vite-plugin-uni-platform-modifier` 合并为 `@uni-helper/unh-platform`。

**源码获取**：
```bash
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-platform.git /tmp/vite-plugin-uni-platform
git clone --depth 1 https://github.com/uni-helper/vite-plugin-uni-platform-modifier.git /tmp/vite-plugin-uni-platform-modifier
```

**重点阅读文件**：
- `src/index.ts`（两个仓库各一份）
- `src/hacker.ts`（uni-platform 的 monkey-patch 逻辑）
- `src/context.ts`（uni-platform-modifier 的 Context 类）
- `src/utils.ts`（uni-platform-modifier 的属性处理）

**步骤**：

1. **创建 packages/platform/ 目录**

2. **合并两个插件**
   - 文件级平台编译（来自 uni-platform）
   - 属性级平台修饰符（来自 uni-platform-modifier）
   - 统一配置入口

3. **处理 monkey-patch**
   - 保留 `@dcloudio/uni-cli-shared` 的 hack，但封装为独立函数
   - 添加注释说明 hack 的原因和风险

**验证标准**：
- [ ] 平台特定文件加载正常
- [ ] 平台修饰符编译正常
- [ ] 与 pages 模块协作正常

### Phase 7: 统一入口与 CLI 集成

**目标**：创建 `@uni-helper/unh` 统一入口包，整合所有模块。

**步骤**：

1. **创建统一 Vite 插件入口**
   ```ts
   // packages/unh/src/vite.ts
   export function UnhVitePlugin(userConfig?: UnhConfig): Plugin[] {
     const ctx = new UnhContext(userConfig)
     // 注册所有启用的模块
     // 返回合并后的 Vite 插件数组
   }
   ```

2. **整合 CLI**
   - `unh dev` → 启动开发服务器（自动注入 UnhVitePlugin）
   - `unh build` → 构建项目
   - `unh prepare` → 生成类型声明

3. **整合 unh.config.ts**
   - 每个顶层配置键对应一个模块
   - 未配置的模块不加载（按需启用）

4. **更新 playground**
   - 使用新的统一入口
   - 验证所有功能正常

**验证标准**：
- [ ] `unh dev` 可正常启动
- [ ] `unh build` 可正常构建
- [ ] unh.config.ts 中所有模块配置生效
- [ ] 未配置的模块不加载

---

## 五、编码规范

### 5.1 包命名

- 核心包：`@uni-helper/unh-core`
- 模块包：`@uni-helper/unh-pages`、`@uni-helper/unh-layouts` 等
- 统一入口：`@uni-helper/unh`
- Kit：`@uni-helper/unh-kit`

### 5.2 导出规范

```ts
// 每个模块必须导出
export { defineUnhModule } from '@uni-helper/unh-kit'  // 模块定义
export type { ModuleOptions } from './types'             // 配置类型
export { default } from './module'                       // 模块实例
```

### 5.3 依赖管理

- 使用 pnpm catalog 管理共享依赖版本
- `@vue/compiler-sfc`、`@vue/compiler-core`、`@vue/compiler-dom` 版本必须统一
- `magic-string`、`hookable`、`tinyglobby`、`scule` 等工具库版本必须统一
- 所有模块依赖 `@uni-helper/unh-core`，禁止模块间直接依赖

### 5.4 TypeScript 规范

- 严格模式：`strict: true`
- 所有公开 API 必须有类型导出
- 使用 `interface` 而非 `type` 定义配置类型
- 泛型参数命名：`TOptions`、`TContext`

### 5.5 测试规范

- 每个模块必须有 `__tests__/` 目录
- 使用 `vitest` + `@vue/compiler-sfc` 编写测试
- 测试覆盖率目标：核心工具 > 80%，模块 > 60%
- 迁移前必须先为原功能编写测试，确保行为一致

### 5.6 构建规范

- 使用 `tsdown` 构建
- 输出 ESM 格式（`.mjs`）
- 生成类型声明文件（`.d.mts`）
- `sideEffects: false`

---

## 六、迁移检查清单

每个模块迁移时，必须逐项确认：

### 迁移前
- [ ] 按「1.3 源码获取流程」克隆源仓库并阅读核心源码
- [ ] 记录原插件的 Vite 钩子列表和 AST 解析方式
- [ ] 阅读原仓库的 issues 和 PR，了解已知问题和边界情况
- [ ] 为原功能编写测试（在原仓库中或新仓库中）
- [ ] 确认原仓库的 npm 包名和版本号

### 迁移中
- [ ] 所有 `@vue/compiler-sfc.parse()` 替换为 `parseSFC(ctx, ...)`
- [ ] 所有 `ast-kit.babelParse()` 通过 `ctx` 共享
- [ ] 所有 `chokidar.watch()` 替换为 `ctx.setupWatcher()`
- [ ] 所有 `fast-glob`/`tinyglobby` 直接调用替换为 `ctx.scanFiles()`
- [ ] 所有 `setupViteServer()` 替换为 `ctx.setupViteServer()`
- [ ] Context 类改为基于 `UnhContext`
- [ ] 模块间通信改为 hooks，禁止直接 import 其他模块
- [ ] 组件名生成统一使用 `scule`

### 迁移后
- [ ] 功能与原插件对等
- [ ] 测试全部通过
- [ ] playground 项目正常工作
- [ ] 类型声明正确生成
- [ ] 无 `@vue/compiler-sfc` 直接调用（除 core 包外）
- [ ] 无 `chokidar` 直接调用（除 core 包外）
- [ ] 无 `fast-glob`/`tinyglobby` 直接调用（除 core 包外）
- [ ] 删除临时克隆的源仓库目录

---

## 七、风险与注意事项

### 7.1 关键风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| uni-app 框架更新导致 hack 失效 | platform 模块崩溃 | 封装 hack 为独立函数，添加版本检测 |
| SFC 缓存导致 HMR 不刷新 | 开发体验差 | 监听文件变更，主动清除缓存 |
| 模块间 hook 时序问题 | 功能异常 | 严格定义 hook 触发顺序，添加依赖声明 |
| monorepo 构建复杂度 | CI 变慢 | 使用 tsdown 增量构建，pnpm 缓存 |

### 7.2 禁止事项

- **禁止**在模块间直接 import（必须通过 hooks 或 ctx.state）
- **禁止**直接调用 `@vue/compiler-sfc.parse()`（必须通过 `parseSFC(ctx, ...)`）
- **禁止**在 transform 钩子中做文件 I/O（使用缓存）
- **禁止**跳过测试直接迁移
- **禁止**一次性迁移所有模块（必须逐个迁移，逐个验证）
- **禁止**凭记忆编写迁移代码（必须先获取源码阅读理解）

### 7.3 性能目标

- SFC 解析次数：每个文件 ≤ 1 次（当前 4 次）
- 文件扫描：每种模式 ≤ 1 次（当前 3 次）
- chokidar watcher：全局 ≤ 1 个（当前 3 个）
- 开发服务器启动时间：减少 30%+

---

## 八、参考资源

- Nuxt 3 架构：`https://github.com/nuxt/nuxt`
- hookable 库：`https://github.com/unjs/hookable`
- uni-helper 组织：`https://github.com/uni-helper`
