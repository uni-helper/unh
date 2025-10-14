import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { globby } from 'globby'
import { exec } from 'tinyexec'
import { parse, stringify } from 'yaml'
import { UNI_APP_DEPENDENCIES } from '@/constant'

type Tag = 'latest' | 'alpha'

function updateVersion(dependencies: Record<string, string>, versionMap: Record<string, string>, version: Tag | string) {
  for (const name in dependencies) {
    if (!UNI_APP_DEPENDENCIES.includes(name) || dependencies[name].startsWith('catalog')) {
      continue
    }
    dependencies[name] = version.startsWith('3') || version.startsWith('2') ? version : getUniAppVersion(dependencies[name], versionMap, version as Tag)
  }
}

async function getLatestVersion(packageName: string, tag: Tag | string) {
  // if the version is 3.x.x or 2.x.x, return the version
  if (tag.startsWith('3') || tag.startsWith('2')) {
    return tag
  }
  const commands = ['npm view', packageName, tag === 'alpha' ? 'version' : 'versions']
  if (tag === 'latest') {
    commands.push('--json', `| jq '.[] | select(contains("alpha") | not)' | tail -1`)
  }
  try {
    const { stdout } = await exec(commands.join(' '))
    return JSON.parse(stdout)
  }
  catch (error) {
    throw new Error(`Failed to get latest version of ${packageName}`, { cause: error })
  }
}

function getUniAppVersion(version: string, versionMap: Record<string, string>, tag: Tag) {
  if (version.startsWith('3')) {
    return tag === 'alpha' ? versionMap.vue3Alpha : versionMap.vue3Latest
  }
  if (version.startsWith('2')) {
    return tag === 'alpha' ? versionMap.vue2Alpha : versionMap.vue2Latest
  }
  throw new Error(`Invalid version: ${version}`)
}

export async function handleUpdateCommand(version: string) {
  const vue3LatestVersion = await getLatestVersion('@dcloudio/vite-plugin-uni', version)
  const vue3AlphaVersion = await getLatestVersion('@dcloudio/vite-plugin-uni', version)
  const vue2LatestVersion = await getLatestVersion('@dcloudio/vue-cli-plugin-uni', version)
  const vue2AlphaVersion = await getLatestVersion('@dcloudio/vue-cli-plugin-uni', version)

  const versionMap = {
    vue3Latest: vue3LatestVersion,
    vue3Alpha: vue3AlphaVersion,
    vue2Latest: vue2LatestVersion,
    vue2Alpha: vue2AlphaVersion,
  }

  const workspacePath = path.join(process.cwd(), 'pnpm-workspace.yaml')
  // update catalog and catalogs in pnpm-workspace.yaml
  if (fs.existsSync(workspacePath)) {
    const data = parse(fs.readFileSync(workspacePath, 'utf-8'))
    updateVersion(data.catalog, versionMap, version)
    for (const key in data.catalogs) {
      updateVersion(data.catalogs[key], versionMap, version)
    }
    fs.writeFileSync(workspacePath, stringify(data))
  }

  const packageJsonPaths = await globby(['package.json', 'packages/**'], { cwd: process.cwd(), deep: 2 })
  // update dependencies and devDependencies in package.json
  for (const packageJsonPath of packageJsonPaths) {
    const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    updateVersion(data.dependencies, versionMap, version)
    updateVersion(data.devDependencies, versionMap, version)
    fs.writeFileSync(packageJsonPath, JSON.stringify(data, null, 2))
  }
}
