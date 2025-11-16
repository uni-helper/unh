import { join } from 'node:path'
import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: {
    default: 'mp-weixin',
    alias: {
      h5: ['h5', 'html'],
      'mp-weixin': ['wx'],
    },
  },
  hooks: {
    prepare() {
      console.log('prepare:')
    },
    dev({ cliOptions, platform, mode, envData }) {
      console.log('dev:', platform, mode)
      console.table(cliOptions)
      console.table(envData)
    },
    build({ cliOptions, platform, mode, envData }) {
      console.log('build:', platform, mode)
      console.table(cliOptions)
      console.table(envData)
      // 所有命令行参数，可以做更多事情，也可以修改或追加一些`uni`命令行参数
      if (cliOptions) {
        if (!cliOptions.outDir) {
          cliOptions.outDir = join('dist', mode || 'build', platform ?? '')
        }
      }
    },
    onBuildAfter({ cliOptions, platform, mode, envData }) {
      console.log('onBuildAfter:', platform, mode)
      console.table(cliOptions)
      console.table(envData)
    },
  },
  autoGenerate: {
    pages: true,
    manifest: {
      commands: ['build'],
      minify: true,
    },
  },
  ui: {
    platforms: ['h5', 'mp-weixin'],
  },
  env: {
    root: 'envs'
  }
})
