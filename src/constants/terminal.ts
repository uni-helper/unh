import { bold, cyan, gray, green } from 'kolorist'
import { getPackageInfoSync } from 'local-pkg'
import moment from 'moment'

export const TERMINAL_SKIP_OUTPUTS = [
  '正在编译中...',
  '开始差量编译...',
  '请注意运行模式下，因日志输出、sourcemap 以及未压缩源码等原因，性能和包体积，均不及发行模式。',
] as const

export const TERMINAL_REPLACE_OUTPUTS = [
  // {
  //   from: 'npx @dcloudio/uvm@latest',
  //   to: '使用 unh update 命令升级到最新版本\n',
  // },
  {
    from: 'DONE  Build complete.',
    to: () => `${gray(moment().format('hh:mm:ss A'))} ${cyan(bold('[vite]'))} ${green('hmr update')}\n`,
  },
  {
    from: /运行方式：打开 (.+), 导入 (.+) 运行。\n.*ready in (.+)\n/,
    to: (match: RegExpMatchArray) => {
      const packageInfo = getPackageInfoSync('@dcloudio/vite-plugin-uni')
      const compilerVersion = packageInfo?.packageJson['uni-app'].compilerVersion
      const devtools = match[1]
      const outputDir = match[2]
      const readyTime = match[3]
      return `
  ${cyan(`uni v${compilerVersion}`)} ${green('dev output directory:')}

  ${bold(green('➜'))} ${(bold(`${devtools}:`))}  ${outputDir}

  ${cyan(`ready in ${readyTime}`)}

`
    },
  },
] as const
