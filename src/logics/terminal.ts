import { bold, cyan, gray, green } from 'kolorist'
import { getPackageInfoSync } from 'local-pkg'
import moment from 'moment'
import { openDevtools, shouldOpenDevtools } from './devtools'

export const TERMINAL_OUTPUT_PROCESSORS = [
  // {
  //   from: 'npx @dcloudio/uvm@latest',
  //   to: '使用 unh update 命令升级到最新版本\n',
  // },
  {
    from: 'Watching for changes',
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

      // 打开开发者工具
      shouldOpenDevtools() && openDevtools(outputDir)

      return `
  ${cyan(`uni v${compilerVersion}`)} ${green('dev output directory:')}

  ${bold(green('➜'))} ${(bold(`${devtools}:`))}  ${outputDir}

  ${cyan(`ready in ${readyTime}`)}

`
    },
  },
] as const

/**
 * 应用输出处理规则
 */
export function applyOutputProcessors(output: string): string {
  let processedOutput = output

  for (const replaceRule of TERMINAL_OUTPUT_PROCESSORS) {
    const { from, to } = replaceRule

    // 处理正则表达式规则
    if (from instanceof RegExp) {
      const match = processedOutput.match(from)
      if (match) {
        processedOutput = to(match)
      }
    }
    // 处理字符串规则
    else if (typeof from === 'string' && processedOutput.includes(from)) {
      processedOutput = to()
    }
  }

  return processedOutput
}
