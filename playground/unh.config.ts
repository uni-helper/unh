import {defineConfig} from '@uni-helper/unh'

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
      console.log('install')
    },
    build() {
      console.log('build')
    },
    dev(param: string) {
      console.log('-----dev-----', param)
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
    enabled: false,
    platforms: ['h5', 'mp-weixin'],
  }
})
