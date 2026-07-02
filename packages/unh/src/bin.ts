#!/usr/bin/env node

/**
 * `@uni-helper/unh` bin 入口（shim）。
 *
 * CLI 实现位于 `@uni-helper/unh-cli`，此处仅触发其 bin 模块执行。
 * 安装 `@uni-helper/unh` 即可获得 `unh` 命令。
 *
 * 显式调用 `runCli()` 而非依赖副作用导入，避免被 tree-shaking
 * （cli 包声明了 `sideEffects: false`）。
 */
import process from 'node:process'
import { runCli } from '@uni-helper/unh-cli/bin'

runCli().catch((error) => {
  console.error(error)
  process.exit(1)
})
