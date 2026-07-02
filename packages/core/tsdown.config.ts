import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  fixedExtension: true,
  clean: true,
  deps: {
    neverBundle: ['@vue/compiler-sfc', 'hookable', 'chokidar', 'tinyglobby', 'magic-string', 'scule', 'ast-kit'],
  },
})
