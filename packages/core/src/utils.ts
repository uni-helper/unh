import { basename, extname } from 'node:path'
import MagicString from 'magic-string'
import { pascalCase } from 'scule'

/**
 * 将字符串转为 PascalCase（统一使用 scule，替代各模块自定义实现）。
 */
export function toPascalCase(str: string): string {
  return pascalCase(str)
}

export interface ComponentNameOptions {
  /** 基础目录，用于计算相对路径前缀（如 `src/components`） */
  base?: string
  /** 是否保留目录层级作为前缀，默认 true */
  prefix?: boolean
  /** 文件名中需要剥离的前缀，如 `Base`、`The` */
  stripPrefix?: string[]
}

/**
 * 由文件路径生成组件名（PascalCase）。
 *
 * 示例：
 * - `src/components/AppHeader.vue` → `AppHeader`
 * - `src/components/form/InputEntry.vue` (prefix=true) → `FormInputEntry`
 * - `BaseButton.vue` (stripPrefix=['Base']) → `Button`
 *
 * 统一使用 `scule.pascalCase`，layouts 与 components 模块禁止各自实现。
 */
export function getComponentName(
  filePath: string,
  options: ComponentNameOptions = {},
): string {
  const { base, prefix = true, stripPrefix } = options

  const ext = extname(filePath)
  let nameWithoutExt = basename(filePath, ext)

  if (stripPrefix) {
    for (const p of stripPrefix) {
      if (nameWithoutExt.startsWith(p)) {
        nameWithoutExt = nameWithoutExt.slice(p.length)
        break
      }
    }
  }

  if (prefix && base) {
    const normalized = filePath.replace(/\\/g, '/')
    const baseNormalized = base.replace(/\\/g, '/').replace(/\/$/, '')
    const idx = normalized.indexOf(baseNormalized)
    if (idx >= 0) {
      const relative = normalized.slice(idx + baseNormalized.length + 1)
      const dir = relative.split('/').slice(0, -1).filter(Boolean)
      if (dir.length > 0) {
        return pascalCase([...dir, nameWithoutExt].join('-'))
      }
    }
  }

  return pascalCase(nameWithoutExt)
}

/**
 * 创建 MagicString 实例的便捷工厂。
 * 所有模块的代码修改必须通过 MagicString，禁止字符串拼接替换。
 */
export function createMagicString(code: string): MagicString {
  return new MagicString(code)
}

/**
 * 安全地在指定偏移处追加文本。
 */
export function appendLeft(ms: MagicString, index: number, content: string): void {
  ms.appendLeft(index, content)
}

/**
 * 安全地替换区间内容。
 */
export function overwrite(
  ms: MagicString,
  start: number,
  end: number,
  content: string,
): void {
  ms.overwrite(start, end, content)
}
