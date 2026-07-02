import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
  },
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    neverBundle: [
      '@uni-helper/unh-core',
      '@uni-helper/unh-pages',
      '@uni-helper/unh-layouts',
      '@uni-helper/unh-components',
      '@uni-helper/unh-manifest',
      '@uni-helper/unh-platform',
    ],
    dts: {
      neverBundle: [
        '@uni-helper/unh-core',
        '@uni-helper/unh-pages',
        '@uni-helper/unh-layouts',
        '@uni-helper/unh-components',
        '@uni-helper/unh-manifest',
        '@uni-helper/unh-platform',
        'postcss',
        'rollup',
        '@rollup/pluginutils',
      ],
    },
  },
})
