import type { PlatformAlias } from '../config/types'

/**
 * 解析平台别名
 * @param input - 输入的平台名称或别名
 * @param aliasConfig - 别名配置
 * @returns 如果找到别名映射则返回对应平台，否则返回原值
 */
export function resolvePlatformAlias(
  input: string,
  aliasConfig: PlatformAlias,
): string {
  // 如果没有别名配置，直接返回原值
  if (!aliasConfig || Object.keys(aliasConfig).length === 0) {
    return input
  }

  // 检查是否是某个平台的别名
  for (const [platform, aliases] of Object.entries(aliasConfig)) {
    if (typeof aliases === 'string') {
      // 处理单个字符串的情况
      if (aliases === input) {
        return platform
      }
    }
    else if (Array.isArray(aliases)) {
      // 处理字符串数组的情况
      if (aliases.includes(input)) {
        return platform
      }
    }
  }

  // 如果不是别名，保留原值
  return input
}

/** unh 自用的 SSR 平台名，uni 没有这个平台 */
const SSR_PLATFORM = 'h5:ssr'

/**
 * 把 unh 的平台名拆成 uni CLI 认识的平台和额外参数。
 *
 * uni 的 SSR 用 `--ssr` 开关表示，平台仍是 `h5`；直接传 `-p h5:ssr` 会走
 * 未知平台的编译流程，h5 的别名和外部化不生效，pages.json 也会被写成非法的
 * `#ifdef H5:SSR` 条件编译。
 * @param platform - unh 平台名（已解析别名）
 * @returns uni 的平台名和需要附带在命令上的参数
 */
export function resolveUniPlatform(
  platform: string,
): { platform: string, args: string[] } {
  if (platform === SSR_PLATFORM) {
    return { platform: 'h5', args: ['--ssr'] }
  }

  return { platform, args: [] }
}
