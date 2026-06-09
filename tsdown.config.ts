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
    neverBundle: ['@antfu/utils'],
  },
})
