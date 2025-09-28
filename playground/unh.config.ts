import {defineConfig} from '@uni-helper/uni'

export default defineConfig({
  platform: {
    default: 'mp-weixin',
    alias: {
      h5: ['h5', 'html'],
      'mp-weixin': ['wx'],
    },
  },
  prepare: {
    install() {
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
    manifest: true,
  },
  ui: {
    enabled: true,
    platforms: ['h5', 'mp-weixin'],
  }
})
