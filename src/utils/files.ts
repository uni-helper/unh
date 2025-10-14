import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function writeFileSync(path: string, content: string) {
  fs.writeFileSync(path, content, { encoding: 'utf-8' })
}

export interface GenerateJsonFileOptions {
  outDir: string
  name: string
  json: string
  force: boolean
}

export function generateJsonFile(options: GenerateJsonFileOptions) {
  const resolvedJSONPath = path.join(process.cwd(), options.outDir, `${options.name}.json`)

  if (!options.force && fs.existsSync(resolvedJSONPath)) {
    return
  }

  writeFileSync(resolvedJSONPath, options.json)
}
