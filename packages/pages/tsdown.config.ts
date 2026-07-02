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
      'hookable',
      'chokidar',
      'tinyglobby',
      'magic-string',
      'scule',
      'ast-kit',
      'comment-json',
      'proper-lockfile',
      'write-file-atomic',
      'debug',
      'lodash.groupby',
      'detect-indent',
      'detect-newline',
      'unconfig',
      '@babel/generator',
      '@babel/types',
      '@uni-helper/uni-env',
      '@uni-helper/uni-pages-types',
      'typescript',
      'yaml',
    ],
  },
})
