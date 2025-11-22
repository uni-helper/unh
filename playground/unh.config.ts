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
    prepare() {},
    dev({ platform, options, envData }) {},
    build({ platform, options, envData }) {},
    onBuildAfter({ platform, options, envData }) {},
  },
  autoGenerate: {
    pages: true,
    manifest: {
      commands: ['build'],
      minify: true,
    },
  },
  env: {
    root: 'envs'
  },
	devtools: {
		open: true,
	}
})
