import type { UnhContext } from './context'
import type { UnhModule } from './types'

/**
 * 模块定义助手，仅用于类型推断。
 * 每个功能模块通过此函数声明自身，便于 IDE 类型提示。
 */
export function defineUnhModule<TOptions>(
  module: UnhModule<TOptions>,
): UnhModule<TOptions> {
  return module
}

/**
 * 对已注册模块按 `meta.dependencies` 做拓扑排序。
 *
 * 排序保证被依赖的模块先执行 setup。
 * 检测到循环依赖或缺失依赖时抛错。
 *
 * @param modules 模块数组（按注册顺序）
 * @returns 排序后的模块数组
 */
export function resolveModuleOrder(modules: UnhModule[]): UnhModule[] {
  const map = new Map<string, UnhModule>()
  for (const m of modules) {
    map.set(m.meta.name, m)
  }

  // 校验依赖存在性
  for (const m of modules) {
    for (const dep of m.meta.dependencies ?? []) {
      if (!map.has(dep)) {
        throw new Error(
          `[unh] 模块 ${m.meta.name} 依赖未注册的模块: ${dep}`,
        )
      }
    }
  }

  // DFS 拓扑排序 + 环检测
  const SORTED = 2
  const VISITING = 1
  const UNVISITED = 0
  const state = new Map<string, number>()
  const result: UnhModule[] = []

  const visit = (name: string, stack: string[]): void => {
    const s = state.get(name) ?? UNVISITED
    if (s === SORTED) {
      return
    }
    if (s === VISITING) {
      throw new Error(
        `[unh] 检测到循环依赖: ${[...stack, name].join(' → ')}`,
      )
    }
    const mod = map.get(name)
    if (!mod) {
      return
    }
    state.set(name, VISITING)
    for (const dep of mod.meta.dependencies ?? []) {
      visit(dep, [...stack, name])
    }
    state.set(name, SORTED)
    result.push(mod)
  }

  for (const m of modules) {
    visit(m.meta.name, [])
  }

  return result
}

/**
 * 合并模块配置：用户配置覆盖默认值。
 *
 * Phase 1 采用浅合并 + 一层 objects 合并的策略，满足大多数模块需求。
 * 深层数组（如 `dirs`、`exclude`）以用户值完全覆盖默认值。
 */
export function mergeModuleOptions<TOptions>(
  defaults: TOptions,
  user: Partial<TOptions> | undefined,
): TOptions {
  if (!user) {
    return defaults
  }
  const result: any = { ...defaults }
  for (const key of Object.keys(user) as (keyof TOptions)[]) {
    const defVal = defaults?.[key]
    const userVal = user[key]
    if (
      defVal && typeof defVal === 'object' && !Array.isArray(defVal)
      && userVal && typeof userVal === 'object' && !Array.isArray(userVal)
    ) {
      result[key] = { ...defVal, ...userVal }
    }
    else {
      result[key] = userVal
    }
  }
  return result
}

/**
 * 安装所有已注册模块。
 *
 * 流程：
 * 1. 拓扑排序模块（保证被依赖者先 setup）
 * 2. 合并每个模块的默认配置与用户配置（`options.modules[configKey]`）
 * 3. 调用 `module.setup(mergedOptions, ctx)`
 * 4. 触发 `modules:installed` hook
 *
 * @param ctx Unh 上下文（已通过 registerModule 注册所有模块）
 * @param userModulesConfig 用户配置中按 configKey 索引的模块配置
 */
export async function installModules(
  ctx: UnhContext,
  userModulesConfig: Record<string, any> = {},
): Promise<void> {
  const ordered = resolveModuleOrder([...ctx.modules.values()])

  for (const mod of ordered) {
    const userOptions = userModulesConfig[mod.meta.configKey]
    const merged = mergeModuleOptions(mod.defaults, userOptions)
    await mod.setup(merged, ctx)
  }

  ctx.hooks.callHook('modules:installed')
}
