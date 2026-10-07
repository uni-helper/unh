import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { parse } from 'pathe'

export function ensureJsonSync(path: string, object: any = {}) {
  if (!existsSync(path)) {
    mkdirSync(parse(path).dir, { recursive: true })
    writeFileSync(path, JSON.stringify(object, null, 2))
  }
}

export function decodeGbk(input?: NonSharedBuffer) {
  const decoder = new TextDecoder('gbk')
  return decoder.decode(input)
}
