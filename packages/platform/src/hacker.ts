/**
 * 对 @dcloudio/uni-cli-shared 的 monkey-patch。
 *
 * 解决以下问题：
 * 1. MP 和 APP 平台页面文件不存在时不继续执行
 * 2. 非页面文件不存在时无法 resolve
 *
 * **风险**：uni-app 框架更新可能导致此 hack 失效。
 * 封装为独立函数，便于后续维护和版本检测。
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parse, resolve } from 'node:path'
import { customScript, isApp, isAppX, inputDir as uniInputDir, platform as uniPlatform } from '@uni-helper/uni-env'

export const platform = customScript || uniPlatform

// 兼容 ESM 和 CJS 的 require
const _require = typeof require === 'function' ? require : createRequire(import.meta.url)

/**
 * 应用 monkey-patch 到 @dcloudio/uni-cli-shared。
 *
 * 如果模块不存在（如非 uni-app 环境），静默跳过。
 */
export function applyHacks(): void {
  let uniUtils: any
  let uniResolve: any
  let constants: any

  try {
    uniUtils = _require('@dcloudio/uni-cli-shared/dist/utils.js')
    uniResolve = _require('@dcloudio/uni-cli-shared/dist/resolve.js')
    constants = _require('@dcloudio/uni-cli-shared/dist/constants.js')
  }
  catch {
    // 非 uni-app 环境或模块不存在，跳过 hack
    return
  }

  // 解决 MP 和 APP 平台页面文件不存在时不继续执行的问题
  // 优先匹配平台特定文件，避免 uni-app 同时注册基础文件和平台文件导致页面重复
  uniUtils.normalizePagePath = function (pagePath: string, platform: string) {
    const absolutePagePath = resolve(uniInputDir ?? '.', pagePath)
    let extensions = isAppX ? constants.X_PAGE_EXTNAME : constants.PAGE_EXTNAME
    if (isApp)
      extensions = isAppX ? constants.X_PAGE_EXTNAME_APP : constants.PAGE_EXTNAME_APP

    for (let i = 0; i < extensions.length; i++) {
      const extname = extensions[i]

      const withPlatform = `${absolutePagePath}.${platform}${extname}`
      if (existsSync(withPlatform))
        return `${pagePath}.${platform}${extname}`

      if (existsSync(absolutePagePath + extname))
        return pagePath + extname
    }
    console.error(`${pagePath} not found`)
  }

  // 解决非页面文件不存在时无法 resolve 的问题
  const requireResolve = uniResolve.requireResolve
  uniResolve.requireResolve = function (filename: string, basedir: string) {
    try {
      return requireResolve(filename, basedir)
    }
    catch {
      const { ext, base, dir } = parse(filename)
      filename = `${dir}/${base}.${platform}${ext ? `.${ext}` : ''}`
      return requireResolve(filename, basedir)
    }
  }
}
