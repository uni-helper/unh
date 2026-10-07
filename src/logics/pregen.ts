import process from 'node:process'
import { sync } from 'cross-spawn'
import { yellow } from 'kolorist'
import { isPackageExists } from 'local-pkg'

/**
 * 预生成配置文件的子进程脚本。
 *
 * 借助 vite 的 resolveConfig 仅执行插件初始化钩子（不进入打包阶段），
 * 让 vite-plugin-uni-pages / vite-plugin-uni-manifest 在 configResolved
 * 中把真实的 pages.json、manifest.json、uni-pages.d.ts 写入磁盘。
 */
const PREGENERATE_SCRIPT = `
import { resolveConfig } from 'vite'
await resolveConfig({ root: process.cwd(), logLevel: 'silent' }, 'build', 'production')
// uni 编译器插件导入后会留下常驻句柄，必须显式退出
process.exit(0)
`

/**
 * 预生成配置文件（pages.json、manifest.json 等）。
 *
 * uni 在 vite config 钩子阶段读取磁盘上的 pages.json 计算编译期开关
 * （pages.json 只有 1 个页面时会关闭 __UNI_FEATURE_PAGES__，产物不再安装
 * vue-router，页面跳转 API 运行时报错），该时机早于插件重新生成配置的
 * configResolved 钩子。冷构建时磁盘上没有 pages.json，插件只能在配置
 * 加载阶段补一个占位文件（1 个空页面），会导致 uni 误判，因此先在子进程
 * 中执行一次配置解析，将真实配置写入磁盘后再执行 uni 命令。
 */
export function preGenerateConfigFiles(platform: string): void {
  const hasPagesPlugin = isPackageExists('@uni-helper/vite-plugin-uni-pages')
  const hasManifestPlugin = isPackageExists('@uni-helper/vite-plugin-uni-manifest')

  if (!hasPagesPlugin && !hasManifestPlugin) {
    return
  }

  // @uni-helper/uni-env 在模块导入时读取 UNI_PLATFORM，必须在子进程加载插件前设置
  const { status, stderr, error } = sync(
    process.execPath,
    ['--input-type=module', '-e', PREGENERATE_SCRIPT],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: Object.assign({}, process.env, { UNI_PLATFORM: platform }),
    },
  )

  // 预生成失败不阻断命令执行，退化为原有行为
  if (error || status !== 0) {
    console.warn(`${yellow('警告')}: 预生成配置文件失败，将继续以现有配置执行`)
    if (stderr) {
      process.stderr.write(stderr.toString())
    }
  }
}
