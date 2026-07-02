import type { UnhContext } from '@uni-helper/unh-core'
import type { ResolvedOptions } from './types'
import fs from 'node:fs'
import { scanFiles } from '@uni-helper/unh-core'
import lockfile from 'proper-lockfile'
import { globSync } from 'tinyglobby'
import writeFileAtomic from 'write-file-atomic'
import { FILE_EXTENSIONS } from './constant'
import { debug, extsToGlob, sleep } from './utils'

/**
 * Resolves the files that are valid pages for the given context.
 *
 * **Unh 改造点**：优先使用 unh-core 的 `scanFiles(ctx, ...)` 共享扫描缓存
 * （带 chokidar 事件失效）。若 ctx 未提供（兼容独立调用场景），
 * 回退到 `globSync` 直接扫描。
 */
export async function getPageFiles(path: string, options: ResolvedOptions, ctx?: UnhContext): Promise<string[]> {
  const { exclude } = options
  const ext = extsToGlob(FILE_EXTENSIONS)
  const pattern = `**/*.${ext}`

  if (ctx) {
    return scanViaCtx(ctx, path, pattern, exclude)
  }
  return globSyncFallback(path, pattern, exclude)
}

/** 通过 UnhContext 共享扫描缓存获取文件列表 */
async function scanViaCtx(ctx: UnhContext, path: string, pattern: string, exclude: string[] | undefined): Promise<string[]> {
  // unh-core 的 scanFiles 是异步的，返回相对 cwd 的路径数组，
  // 并通过 chokidar 事件自动失效缓存（参见 project_memory 教训）。
  return scanFiles(ctx, [pattern], {
    cwd: path,
    ignore: exclude,
    absolute: false,
  })
}

/** 回退：直接使用 tinyglobby 同步扫描 */
function globSyncFallback(path: string, pattern: string, exclude: string[] | undefined): string[] {
  return globSync(pattern, {
    ignore: exclude,
    onlyFiles: true,
    cwd: path,
  })
}

/**
 * Check the pages.json file at the specified path, create an empty pages.json file if it doesn't exist or is not a valid file
 * @param path - File path to check
 * @returns boolean - Whether the operation was successful
 */
export function checkPagesJsonFileSync(path: fs.PathLike): boolean {
  /**
   * Create an empty pages.json file
   * @param path - File path
   * @returns boolean - Whether the creation was successful
   */
  const createEmptyPage = (path: fs.PathLike): boolean => {
    try {
      fs.writeFileSync(
        path,
        JSON.stringify({ pages: [{ path: '' }] }, null, 2),
        { encoding: 'utf-8' },
      )
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Delete the file at the specified path
   * @param path - File path
   * @returns boolean - Whether the deletion was successful
   */
  const unlinkPage = (path: fs.PathLike): boolean => {
    try {
      fs.unlinkSync(path)
      return true
    }
    catch {
      return false
    }
  }

  try {
    // Check if file exists
    try {
      fs.accessSync(path, fs.constants.F_OK)
    }
    catch {
      // File does not exist, create new file
      return createEmptyPage(path)
    }

    // Check if it's a file
    const stat = fs.statSync(path)
    if (!stat.isFile()) {
      // Not a file, try to delete and recreate
      if (!unlinkPage(path)) {
        return false
      }
      return createEmptyPage(path)
    }

    // Check read/write permissions
    try {
      fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK)

      return true
    }
    catch {
      // Insufficient permissions, try to delete and recreate
      if (!unlinkPage(path)) {
        return false
      }
      return createEmptyPage(path)
    }
  }
  catch {
    // Other errors occurred, try to create file
    return createEmptyPage(path)
  }
}

/**
 * Run a task while holding an exclusive file lock.
 *
 * Unlike {@link writeFileWithLock}, this protects the whole read-modify-write
 * critical section. The lock is held from the moment `task` starts until it
 * resolves, so concurrent processes cannot observe or overwrite a half-written
 * state. This is required by pages.json generation, where the new content
 * depends on the current content (other platforms' `#ifdef` blocks).
 *
 * @param path - File path used as the lock target
 * @param task - Async work to run inside the lock; return value is forwarded
 * @param retry - Number of retries when lock acquisition fails, defaults to 3
 * @returns The value resolved by `task`, or `undefined` if the lock could not be acquired
 */
export async function withFileLock<T>(path: string, task: () => Promise<T>, retry = 3): Promise<T | undefined> {
  if (retry <= 0) {
    debug.error(`${path} Failed to acquire file lock, task aborted`)
    return undefined
  }

  let release: () => Promise<void> | undefined

  try {
    try {
      release = await lockfile.lock(path, { realpath: false })
    }
    catch {
      // Failed to acquire file lock, retry after backoff
      await sleep(500)
      return withFileLock(path, task, retry - 1)
    }
    return await task()
  }
  finally {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error'
    if (release) {
      await release() // Release file lock
    }
  }
}

/**
 * Safely write file using file lock
 * Avoid data corruption caused by concurrent writes through file lock
 * Use atomic write to ensure file write integrity
 *
 * Note: this only makes the *write* atomic. Callers that need to read the
 * current content before computing the new one must use {@link withFileLock}
 * so the read and write belong to the same critical section.
 *
 * @param path - File path
 * @param content - File content
 * @param retry - Number of retries when lock acquisition fails, defaults to 3
 */
export async function writeFileWithLock(path: string, content: string, retry = 3) {
  return withFileLock(path, async () => {
    await writeFileAtomic(path, content)
  }, retry)
}
