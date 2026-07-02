import process from 'node:process'
import { sync } from 'cross-spawn'

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent)
    return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')

  return {
    name: pkgSpecArr[0] || 'npm',
    version: pkgSpecArr[1],
  }
}

export function composeCommand(
  command: string,
) {
  const { name, version } = pkgFromUserAgent(process.env.npm_config_user_agent)!
  const isYarn1 = name === 'yarn' && version.startsWith('1.')

  let pkgManager = 'npx'
  if (name === 'pnpm')
    pkgManager = 'pnpm dlx'
  if (name === 'yarn')
    pkgManager = 'yarn dlx'
  if (name === 'bun')
    pkgManager = 'bun x'

  return `${pkgManager} ${command}${isYarn1 ? '' : '@latest'}`
}

export function runPkg(name: string) {
  const fullCustomCommand = composeCommand(name)
  const [command, ..._args] = fullCustomCommand.split(' ')
  const { error } = sync(command, [..._args], {
    stdio: 'inherit',
  })

  if (error)
    throw new Error(`Error executing command: ${error.message}`)
}
/**
 * 组合uni命令
 * @param command uni命令
 * @param platform 平台
 * @param options 选项
 * @returns uni命令
 */
export function composeUniCommand(
  command: 'dev' | 'build',
  platform: string,
  options: string[],
) {
  return `uni ${command} -p ${platform} ${options.join(' ')}`.trim()
}
