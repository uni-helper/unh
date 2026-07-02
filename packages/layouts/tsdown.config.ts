import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    neverBundle: [
      '@uni-helper/unh-core',
      '@vue/compiler-sfc',
      '@vue/compiler-core',
      'hookable',
      'chokidar',
      'tinyglobby',
      'magic-string',
      'scule',
      'ast-kit',
      '@babel/types',
      '@uni-helper/uni-env',
    ],
  },
})
