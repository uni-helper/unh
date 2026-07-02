import type { UnhContext } from '@uni-helper/unh-core'
import type { SFCDescriptor } from '@vue/compiler-sfc'
import type { TabBarItem } from './config'
import type { PageContext } from './context'
import type { PageMetaDatum, PagePath, UserPageMeta } from './types'
import fs from 'node:fs'
import { extname } from 'node:path'
import * as t from '@babel/types'
import { parseSFC } from '@uni-helper/unh-core'
import { babelParse, isCallOf } from 'ast-kit'
import { normalizePath } from 'vite'
import { babelGenerate, debug, parseCode } from './utils'

/**
 * Page class representing a Vue page file
 *
 * Responsibilities:
 * 1. Read page file content
 * 2. Parse page metadata defined by definePage macro
 * 3. Provide tabBar configuration information
 * 4. Track page file change status
 *
 * **Unh 改造点**：SFC 解析改为通过 `ctx.parseSFC()`（UnhContext 共享缓存），
 * 避免与 layouts / platform-modifier / components 等模块重复解析同一文件。
 */
export class Page {
  /** Unh 上下文，提供 SFC 解析缓存等共享能力 */
  unhCtx: UnhContext
  /** Page context instance */
  ctx: PageContext

  /** Page path information containing relative and absolute paths */
  path: PagePath
  /** Page URI used for pages.json path field */
  uri: string

  /** Whether the page has changed, used for incremental update judgment */
  changed: boolean = true

  /** Raw JSON string of page metadata for change detection */
  private raw: string = ''
  /** Parsed page metadata */
  private meta: UserPageMeta | undefined

  /**
   * Create a page instance
   * @param ctx - Page context instance
   * @param path - Page path information
   * @param unhCtx - Unh 上下文（用于 SFC 解析缓存）
   */
  constructor(ctx: PageContext, path: PagePath, unhCtx: UnhContext) {
    this.ctx = ctx
    this.unhCtx = unhCtx
    this.path = path
    this.uri = normalizePath(path.relativePath.replace(extname(path.relativePath), ''))
  }

  /**
   * Get page metadata
   * Parse configuration defined by definePage macro and return metadata for pages.json
   *
   * @param forceUpdate - Whether to force update, ignoring cache
   * @returns Page metadata object
   */
  public async getPageMeta(forceUpdate = false): Promise<PageMetaDatum> {
    if (forceUpdate || !this.meta) {
      await this.read()
    }

    const { path, tabBar: _, ...others } = this.meta || {}

    return {
      path: path ?? this.uri,
      ...others,
    }
  }

  /**
   * Get page tabBar configuration
   * Extract tabBar related configuration from definePage macro
   *
   * @param forceUpdate - Whether to force update, ignoring cache
   * @returns tabBar configuration object, or undefined if page doesn't define tabBar
   */
  public async getTabBar(forceUpdate = false): Promise<TabBarItem & { index: number } | undefined> {
    if (forceUpdate || !this.meta) {
      await this.read()
    }

    const { tabBar } = this.meta || {}

    if (tabBar === undefined) {
      return undefined
    }

    return {
      ...tabBar,
      pagePath: tabBar.pagePath || this.uri,
      index: tabBar.index ?? 0,
    }
  }

  /**
   * Check if the page has changed
   * @returns Whether the page has changed
   */
  public hasChanged() {
    return this.changed
  }

  /**
   * Read page file and parse metadata
   * Extract configuration defined by definePage macro from Vue SFC
   */
  public async read() {
    let meta: UserPageMeta
    try {
      meta = await this.readPageMetaFromFile()
    }
    catch (err: any) {
      debug.error(err)
      return // break if read fail
    }

    let raw = ''
    try {
      raw = JSON.stringify(meta)
    }
    catch {
      // ignore stringify error
    }

    this.changed = this.raw !== raw
    this.meta = meta
    this.raw = raw
  }

  private async readPageMetaFromFile(): Promise<UserPageMeta> {
    try {
      const content = await fs.promises.readFile(this.path.absolutePath, { encoding: 'utf-8' })

      // Unh 改造点：通过 UnhContext 的共享 SFC 缓存解析，避免重复解析
      const sfc = parseSFCViaCtx(this.unhCtx, this.path.absolutePath, content)

      const meta = await tryPageMetaFromMacro(sfc)
      if (meta) {
        return meta
      }

      return { type: 'page' }
    }
    catch (err: any) {
      throw new Error(`Read page meta fail in ${this.path.relativePath}\n${err.message}`)
    }
  }
}

/**
 * 通过 UnhContext 的共享 SFC 缓存解析 Vue SFC。
 *
 * 优先使用 unh-core 的 `parseSFC(ctx, filePath, code)`，
 * 该函数通过 code 对比自动失效缓存，并触发 `sfc:parse` hook。
 *
 * 兼容 @vue/compiler-sfc 不同版本的返回结构。
 */
export function parseSFCViaCtx(unhCtx: UnhContext, filePath: string, code: string): SFCDescriptor {
  // unh-core 的 parseSFC 返回 { code, result, timestamp }，result 是 compiler-sfc 的解析结果
  const entry = parseSFC(unhCtx, filePath, code)
  const result = entry.result as any
  // compiler-sfc 3.x 返回 { descriptor }；2.7 直接返回 descriptor
  return result.descriptor || result
}

/**
 * Try to extract page metadata defined by definePage macro from SFC
 * Support using definePage in script setup or regular script
 *
 * @param sfc - Vue SFC descriptor
 * @returns Page metadata object, or undefined if definePage is not found
 */
export async function tryPageMetaFromMacro(sfc: SFCDescriptor): Promise<UserPageMeta | undefined> {
  const sfcScript = sfc.scriptSetup || sfc.script

  if (!sfcScript) {
    return undefined
  }

  const ast = babelParse(sfcScript.content, sfcScript.lang || 'js', {
    plugins: [['importAttributes', { deprecatedAssertSyntax: true }]],
  })
  const macro = findMacro(ast.body, sfc.filename)
  if (macro) {
    const imports = findImports(ast.body).filter(imp => !!imp.specifiers.length).map(imp => babelGenerate(imp).code)

    const [macroOption] = macro.arguments
    const code = babelGenerate(macroOption).code

    const parsed = await parseCode({
      imports,
      code,
      filename: sfc.filename,
    })

    const res = typeof parsed === 'function'
      ? await Promise.resolve(parsed())
      : await Promise.resolve(parsed)

    return {
      type: 'page',
      ...res,
    }
  }
  return undefined
}

/**
 * Find definePage macro call in AST
 * Support function expressions, arrow functions and object expressions as arguments
 *
 * @param stmts - AST statement array
 * @param filename - Filename for error reporting
 * @returns definePage call expression, or undefined if not found
 */
export function findMacro(stmts: t.Statement[], filename: string): t.CallExpression | undefined {
  let macro: t.CallExpression | undefined

  for (const stmt of stmts) {
    let node: t.Node = stmt
    if (stmt.type === 'ExpressionStatement')
      node = stmt.expression

    if (isCallOf(node, 'definePage')) {
      macro = node
      break
    }
  }

  if (!macro)
    return

  // 提取 macro function 内的第一个参数
  const [opt] = macro.arguments

  // 检查 macro 的参数是否正确
  if (opt && !t.isFunctionExpression(opt) && !t.isArrowFunctionExpression(opt) && !t.isObjectExpression(opt)) {
    debug.definePage(`definePage() 参数仅支持函数或对象：${filename}`)
    return
  }

  return macro
}

/**
 * Extract all import declarations from AST
 * Used to provide necessary imports when executing definePage arguments
 *
 * @param stmts - AST statement array
 * @returns Import declaration array
 */
export function findImports(stmts: t.Statement[]): t.ImportDeclaration[] {
  const imports: t.ImportDeclaration[] = []
  for (const stmt of stmts) {
    if (t.isImportDeclaration(stmt)) {
      imports.push(stmt)
    }
  }
  return imports
}
