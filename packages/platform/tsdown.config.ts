import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    neverBundle: [
      '@uni-helper/unh-core',
      '@uni-helper/uni-env',
      '@vue/compiler-core',
      '@vue/compiler-dom',
      'magic-string',
      'hookable',
    ],
  },
})
