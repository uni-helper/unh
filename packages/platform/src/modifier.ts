import type { Plugin } from 'vite'
import { parse } from '@vue/compiler-dom'
import MagicString from 'magic-string'
import { createFilter } from 'vite'
import { getRootTemplate, transformProps } from './modifier-utils'

/**
 * 属性级平台修饰符 Vite 插件（迁移自 vite-plugin-uni-platform-modifier）。
 *
 * 处理 Vue 模板中带有平台修饰符的属性/指令，例如：
 * `@click.h5="onH5Click"` vs `@click.mp-weixin="onMpClick"`
 *
 * 根据当前编译平台，保留对应修饰符的属性，移除其他平台的属性。
 */
export class ModifierContext {
  filter: (id: unknown) => boolean
  constructor() {
    this.filter = createFilter('**/*.?(nu)vue')
  }

  transform(code: string, id: string) {
    const ast = parse(code)
    const templateNode = getRootTemplate(ast)
    if (!templateNode)
      return
    const ms = new MagicString(code)

    transformProps(templateNode, ms, id)

    if (ms.hasChanged()) {
      return {
        code: ms.toString(),
        map: ms.generateMap({
          file: id,
        }),
      }
    }
  }
}

/**
 * 属性级平台修饰符 Vite 插件。
 */
export function VitePluginPlatformModifier(): Plugin {
  const ctx = new ModifierContext()
  return {
    name: 'unh-platform-modifier',
    enforce: 'pre',
    transform(code, id) {
      if (!ctx.filter(id))
        return

      return ctx.transform(code, id)
    },
  }
}

export default VitePluginPlatformModifier
