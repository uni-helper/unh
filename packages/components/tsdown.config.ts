import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/resolvers.ts'],
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    neverBundle: [
      '@uni-helper/unh-core',
      'hookable',
      'chokidar',
      'tinyglobby',
      'magic-string',
      'scule',
      'ast-kit',
      'debug',
      'local-pkg',
      'picomatch',
      '@rollup/pluginutils',
    ],
  },
})
