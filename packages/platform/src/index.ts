import type { UnhContext } from '@uni-helper/unh-core'
import type { Plugin } from 'vite'
import type { PlatformUserOptions } from './types'
import { defineUnhModule } from '@uni-helper/unh-core'
import { VitePluginFilePlatform } from './file-platform'
import { applyHacks } from './hacker'
import { VitePluginPlatformModifier } from './modifier'

export * from './constants'
export * from './file-platform'
export * from './hacker'
export * from './modifier'
export * from './modifier-utils'
export * from './types'

/**
 * 合并后的平台 Vite 插件（兼容导出）。
 *
 * 整合文件级平台编译（vite-plugin-uni-platform）和
 * 属性级平台修饰符（vite-plugin-uni-platform-modifier）。
 *
 * @param userOptions - 用户配置
 * @returns Vite 插件数组
 */
export function VitePluginUniPlatform(userOptions: PlatformUserOptions = {}): Plugin[] {
  const {
    file: fileOptions = {},
    fileEnabled = true,
    modifierEnabled = true,
  } = userOptions

  // 应用 monkey-patch（文件级平台编译依赖）
  if (fileEnabled)
    applyHacks()

  const plugins: Plugin[] = []

  if (fileEnabled)
    plugins.push(VitePluginFilePlatform(fileOptions))

  if (modifierEnabled)
    plugins.push(VitePluginPlatformModifier())

  return plugins
}

export default VitePluginUniPlatform

/**
 * Unh platform 模块定义。
 *
 * 合并了文件级平台编译和属性级平台修饰符。
 * 作为最早执行的模块之一（影响后续模块的文件选择）。
 */
export const unhPlatformModule = defineUnhModule<PlatformUserOptions>({
  meta: {
    name: 'unh:platform',
    configKey: 'platform',
  },
  defaults: {
    fileEnabled: true,
    modifierEnabled: true,
  },
  setup(options, _ctx: UnhContext) {
    const plugins = VitePluginUniPlatform(options)
    ;(this as any).vitePlugins = plugins
  },
})
