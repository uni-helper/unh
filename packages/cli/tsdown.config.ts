import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    // CLI 不打包这些依赖，保持 external
    neverBundle: [
      'cac',
      'consola',
      'cross-spawn',
      'dotenv',
      'dotenv-expand',
      'kolorist',
      'local-pkg',
      'pathe',
      'std-env',
      'strip-ansi',
      'unconfig',
    ],
  },
})
