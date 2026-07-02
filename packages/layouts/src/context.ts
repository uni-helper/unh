import type { Node } from '@babel/types'
import type { UnhContext } from '@uni-helper/unh-core'
import type { AttributeNode, DirectiveNode, ElementNode, SimpleExpressionNode } from '@vue/compiler-core'
import type { FSWatcher, ResolvedConfig, ViteDevServer } from 'vite'
import type { Layout, Page, ResolvedOptions } from './types'
import { isMp } from '@uni-helper/uni-env'
import { babelParse, walkAST } from 'ast-kit'
import MagicString from 'magic-string'
import { kebabCase } from 'scule'
import { normalizePath } from 'vite'
import { scanLayouts } from './scan'
import { getTarget, parseSFCViaCtx } from './utils'

/**
 * Layouts 插件上下文。
 *
 * **Unh 改造点**：
 * 1. 不再从 `pages.json` 文件读取页面列表，改为监听 `pages:extend` hook
 *    获取 pages 模块产出的路由信息。
 * 2. SFC 解析通过 `parseSFCViaCtx` 共享 unh-core 的 SFC 缓存。
 * 3. 布局文件扫描通过 `scanLayouts` 使用 unh-core 的共享扫描缓存。
 * 4. 布局列表就绪后触发 `layouts:extend` hook，供其他模块消费。
 */
export class LayoutContext {
  config!: ResolvedConfig
  options: ResolvedOptions
  pages: Page[]
  layouts: Layout[]
  /** Unh 共享上下文（用于 hooks 通信和缓存共享） */
  unhCtx: UnhContext
  private _server?: ViteDevServer
  private _initialized = false

  constructor(options: ResolvedOptions, unhCtx: UnhContext) {
    this.options = options
    this.unhCtx = unhCtx
    this.pages = []
    this.layouts = []

    // 监听 pages:extend hook，替代原先的 loadPagesJson 文件读取。
    // pages 模块在路由解析完成后触发此 hook，layouts 据此更新页面列表。
    this.unhCtx.hooks.hook('pages:extend', (pages: any[]) => {
      this.pages = pages.map(p => ({
        path: p.path,
        layout: p.layout,
      })) as Page[]
    })
  }

  /**
   * 异步初始化：扫描布局文件并触发 layouts:extend hook。
   * 应在 Vite configResolved 钩子中调用。
   */
  async init(): Promise<void> {
    if (this._initialized)
      return
    this._initialized = true

    this.layouts = await scanLayouts(
      this.options.layoutDir,
      this.options.cwd,
      this.unhCtx,
    )

    // 通知其他模块当前布局列表
    await this.unhCtx.hooks.callHook('layouts:extend', this.layouts as any)
  }

  setupViteServer(server: ViteDevServer) {
    if (this._server === server)
      return

    this._server = server
    this.setupWatcher(server.watcher)
  }

  /**
   * 设置文件监听。
   *
   * **Unh 改造点**：不再监听 pages.json 变化（页面数据通过 hook 传递）。
   * 仅保留布局文件变更监听，用于重新扫描布局。
   */
  async setupWatcher(watcher: FSWatcher) {
    watcher.on('add', async (path) => {
      if (this.isLayoutFile(path))
        await this.refreshLayouts()
    })
    watcher.on('unlink', async (path) => {
      if (this.isLayoutFile(path))
        await this.refreshLayouts()
    })
  }

  private isLayoutFile(path: string): boolean {
    const layoutDir = normalizePath(
      `${this.options.cwd}/${this.options.layoutDir}`,
    )
    return normalizePath(path).startsWith(layoutDir) && path.endsWith('.vue')
  }

  /** 重新扫描布局并触发 hook */
  private async refreshLayouts(): Promise<void> {
    this.layouts = await scanLayouts(
      this.options.layoutDir,
      this.options.cwd,
      this.unhCtx,
    )
    await this.unhCtx.hooks.callHook('layouts:extend', this.layouts as any)
  }

  async transform(code: string, path: string) {
    // no layouts
    if (!this.layouts.length)
      return
    // no pages — pages:extend hook may not have fired yet
    if (!this.pages?.length)
      return

    const page = getTarget(
      path,
      this.pages,
      this.options.layout,
      this.config?.root || this.options.cwd,
    )

    // is not page
    if (!page)
      return

    let pageLayoutName: string | undefined | false = page.layout
    let pageLayout: Layout | undefined
    const pageLayoutProps: string[] = []

    if (typeof pageLayoutName === 'boolean' && pageLayoutName)
      pageLayoutName = 'default'

    if (typeof pageLayoutName === 'string') {
      // layout name is empty
      if (!pageLayoutName)
        return
      pageLayout = this.layouts.find(l => l.name === pageLayoutName)
      // can not find layout
      if (!pageLayout)
        return
    }
    const disabled = typeof pageLayoutName === 'boolean' && !pageLayoutName

    // Unh 改造点：通过共享缓存解析 SFC
    const sfc = parseSFCViaCtx(this.unhCtx, path, code)
    const ms = new MagicString(code)
    const setupCode = sfc.scriptSetup?.loc.source
    // check has uniLayout ref
    if (setupCode) {
      const setupAst = babelParse(setupCode, sfc.scriptSetup?.lang)
      walkAST<Node>(setupAst, {
        enter(node) {
          if (node.type === 'VariableDeclarator') {
            const hasUniLayoutVar
              = node.id.type === 'Identifier' && node.id.name === 'uniLayout'
            const isRef
              = node.init?.type === 'CallExpression'
                && node.init.callee.type === 'Identifier'
                && node.init.callee.name === 'ref'
            if (hasUniLayoutVar && isRef)
              pageLayoutProps.push('ref="uniLayout"')
          }
        },
      })
    }

    if (disabled) {
      // find dynamic layout
      const uniLayoutNode = sfc.template?.ast.children.find(v => v.type === 1 && kebabCase(v.tag) === 'uni-layout') as ElementNode
      // not found
      if (!uniLayoutNode)
        return

      ms.overwrite(uniLayoutNode.loc.start.offset, uniLayoutNode.loc.end.offset, this.generateDynamicLayout(uniLayoutNode))
    }
    else {
      if (sfc.template?.loc.start.offset && sfc.template?.loc.end.offset)
        ms.overwrite(sfc.template?.loc.start.offset, sfc.template?.loc.end.offset, `\n<layout-${pageLayout?.kebabName}-uni ${pageLayoutProps.join(' ')}>${sfc.template.content}</layout-${pageLayout?.kebabName}-uni>\n`)
    }

    if (ms.hasChanged()) {
      const map = ms.generateMap({
        source: path,
        file: `${path}.map`,
        includeContent: true,
      })
      return {
        code: ms.toString(),
        map,
      }
    }
  }

  async virtualModule() {
    const imports: string[] = []
    const components: string[] = []
    const _exports = this.layouts.map((v) => {
      imports.push(
        `import Layout_${v.pascalName}_Uni from "${normalizePath(v.path)}"`,
      )
      components.push(
        `app.component("layout-${v.kebabName}-uni", Layout_${v.pascalName}_Uni)`,
      )
      return `Layout_${v.pascalName}_Uni,`
    })
    return `${imports.join('\n')}
export const layouts = {
  ${_exports.join('\n')}
}
export default {
  install(app) {
    ${components.join('\n')}
  }
}`
  }

  generateDynamicLayout(node: ElementNode) {
    const staticLayoutNameBind = node.props.find(
      v => v.type === 6 && v.name === 'name' && v.value?.content,
    ) as AttributeNode
    const dynamicLayoutNameBind = node.props.find(
      v => v.type === 7 && v.name === 'bind' && v.arg?.type === 4 && v.arg?.content === 'name' && v.exp?.type === 4 && v.exp.content,
    ) as DirectiveNode
    const slotsSource = node.children.map(v => v.loc.source).join('\n')
    const nodeProps = node.props.filter(prop => !(prop === dynamicLayoutNameBind || prop === staticLayoutNameBind)).map(v => v.loc.source)

    if (!(staticLayoutNameBind || dynamicLayoutNameBind))
      console.warn('[unh-layouts] Dynamic layout not found name bind')

    if (isMp) {
      const props: string[] = [...nodeProps]
      if (staticLayoutNameBind) {
        const layout = staticLayoutNameBind.value?.content
        return `<layout-${layout}-uni ${props.join(' ')}>${slotsSource}</layout-${layout}-uni>`
      }

      const bind = (dynamicLayoutNameBind.exp as SimpleExpressionNode).content
      const defaultSlot = node.children.filter((v) => {
        if (v.type === 1 && v.tagType === 3) {
          const slot = v.props.find(v => v.type === 7 && v.name === 'slot' && v.arg?.type === 4) as any
          if (slot)
            return slot.arg.content === 'default'
        }
        return v
      })
      const defaultSlotSource = defaultSlot.map(v => v.loc.source).join('\n')
      const layouts = this.layouts.map((layout, index) => `<layout-${layout.kebabName}-uni v-${index === 0 ? 'if' : 'else-if'}="${bind} ==='${layout.kebabName}'" ${props.join(' ')}>${slotsSource}</layout-${layout.kebabName}-uni>`)
      layouts.push(`<template v-else>${defaultSlotSource}</template>`)

      return layouts.join('\n')
    }
    else {
      const props: string[] = [...nodeProps]
      if (staticLayoutNameBind)
        props.push(`is="layout-${staticLayoutNameBind.value?.content}-uni"`)
      else
        props.push(`:is="\`layout-\${${(dynamicLayoutNameBind.exp as SimpleExpressionNode).content}}-uni\`"`)
      return `<component ${props.join(' ')}>${slotsSource}</component>`
    }
  }

  async importLayoutComponents(code: string, id: string) {
    const ms = new MagicString(code)
    const imports: string[] = []
    const components: string[] = []
    for (const v of this.layouts) {
      imports.push(
        `import Layout_${v.pascalName}_Uni from "${normalizePath(v.path)}"`,
      )
      components.push(
        `app.component("layout-${v.kebabName}-uni", Layout_${v.pascalName}_Uni);\n`,
      )
    }
    ms.append(imports.join('\n'))
    ms.replace(
      /(createApp[\s\S]*?)(return\s\{\s*app)/,
      `$1${components.join('')}$2`,
    )
    const map = ms.generateMap({
      source: id,
      file: `${id}.map`,
      includeContent: true,
    })
    code = ms.toString()
    return {
      code,
      map,
    }
  }
}
