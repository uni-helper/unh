import process from 'node:process'
import { red } from 'kolorist'
import { loadPackageJSONSync } from 'local-pkg'

/**
 * 校验当前项目为 ESM 环境，CommonJS 环境直接报错中断。
 *
 * vite 会依据最近的 package.json 的 type 字段决定以 ESM 还是 CJS 加载
 * 用户的 vite 配置，CJS 环境会触发已废弃的 Vite CJS Node API 导致预生成
 * 失败，因此在 CLI 入口统一拦截并提示用户迁移到 ESM。
 */
export function assertEsmProject(): void {
  const packageJson = loadPackageJSONSync(process.cwd())

  if (packageJson?.type === 'module') {
    return
  }

  console.error(`${red('错误')}: 检测到当前项目为 CommonJS 环境，unh 仅支持 ESM 项目`)
  console.error('请在 package.json 中添加 "type": "module" 后重试')
  process.exit(1)
}
