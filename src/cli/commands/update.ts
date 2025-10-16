import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { globby } from 'globby'
import { exec } from 'tinyexec'
import { parse, stringify } from 'yaml'
import { UNI_APP_DEPENDENCIES } from '@/constant'

type Tag = 'latest' | 'alpha'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface PnpmWorkspace {
  catalog?: Record<string, string>
  catalogs?: Record<string, Record<string, string>>
}

class VersionManager {
  constructor(private versionMap: Record<string, string>) {}

  private shouldUpdatePackage(name: string, currentVersion: string): boolean {
    return UNI_APP_DEPENDENCIES.includes(name) && !currentVersion.startsWith('catalog')
  }

  private getTargetVersion(currentVersion: string, target: Tag | string): string {
    if (target.startsWith('3') || target.startsWith('2')) {
      return target
    }

    const isVue3 = currentVersion.startsWith('3')
    const key = isVue3
      ? (target === 'alpha' ? 'vue3Alpha' : 'vue3Latest')
      : (target === 'alpha' ? 'vue2Alpha' : 'vue2Latest')

    return this.versionMap[key]
  }

  updateDependencies(dependencies: Record<string, string> | undefined, target: Tag | string): void {
    if (!dependencies)
      return

    for (const [name, currentVersion] of Object.entries(dependencies)) {
      if (this.shouldUpdatePackage(name, currentVersion)) {
        dependencies[name] = this.getTargetVersion(currentVersion, target)
      }
    }
  }
}

async function getLatestVersion(packageName: string, tag: Tag): Promise<string> {
  const commands = [
    'npm view',
    packageName,
    tag === 'alpha' ? 'version' : 'versions',
    ...(tag === 'latest' ? ['--json', `| jq '.[] | select(contains("alpha") | not)' | tail -1`] : []),
  ]

  try {
    const { stdout } = await exec(commands.join(' '))
    return tag === 'latest' ? JSON.parse(stdout) : stdout.trim()
  }
  catch (error) {
    throw new Error(`Failed to get ${tag} version of ${packageName}`, { cause: error })
  }
}

async function buildVersionMap(version: Tag | string): Promise<Record<string, string>> {
  if (version.startsWith('3') || version.startsWith('2')) {
    return {
      vue3Latest: version,
      vue3Alpha: version,
      vue2Latest: version,
      vue2Alpha: version,
    }
  }

  const [vue3Latest, vue3Alpha, vue2Latest, vue2Alpha] = await Promise.all([
    getLatestVersion('@dcloudio/vite-plugin-uni', 'latest'),
    getLatestVersion('@dcloudio/vite-plugin-uni', 'alpha'),
    getLatestVersion('@dcloudio/vue-cli-plugin-uni', 'latest'),
    getLatestVersion('@dcloudio/vue-cli-plugin-uni', 'alpha'),
  ])

  return { vue3Latest, vue3Alpha, vue2Latest, vue2Alpha }
}

async function updatePnpmWorkspace(versionManager: VersionManager, target: Tag | string): Promise<void> {
  const workspacePath = path.join(process.cwd(), 'pnpm-workspace.yaml')

  try {
    const content = await fs.readFile(workspacePath, 'utf-8')
    const data: PnpmWorkspace = parse(content)

    versionManager.updateDependencies(data.catalog, target)

    if (data.catalogs) {
      for (const catalog of Object.values(data.catalogs)) {
        versionManager.updateDependencies(catalog, target)
      }
    }

    await fs.writeFile(workspacePath, stringify(data))
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

async function updatePackageJsonFiles(versionManager: VersionManager, target: Tag | string): Promise<void> {
  const packageJsonPaths = await globby([
    'package.json',
    'packages/**/package.json',
  ], {
    cwd: process.cwd(),
    deep: 2,
  })

  await Promise.all(
    packageJsonPaths.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const data: PackageJson = JSON.parse(content)

        versionManager.updateDependencies(data.dependencies, target)
        versionManager.updateDependencies(data.devDependencies, target)

        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      }
      catch (error) {
        console.warn(`Failed to update ${filePath}:`, error)
      }
    }),
  )
}

export async function handleUpdateCommand(version: Tag | string): Promise<void> {
  try {
    const versionMap = await buildVersionMap(version)
    const versionManager = new VersionManager(versionMap)

    await Promise.all([
      updatePnpmWorkspace(versionManager, version),
      updatePackageJsonFiles(versionManager, version),
    ])

    console.log('✅ All dependencies updated successfully')
  }
  catch (error) {
    console.error('❌ Failed to update dependencies:', error)
    throw error
  }
}
