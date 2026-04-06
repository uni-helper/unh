<a href="https://uni-helper.js.org/unh"><img src="./banner.svg" alt="banner" width="100%"/></a>

<a href="https://github.com/uni-helper/unh/stargazers"><img src="https://img.shields.io/github/stars/uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge"></a>
<a href="https://www.npmjs.com/package/@uni-helper/unh"><img src="https://img.shields.io/npm/dm/@uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge"></a>
<a href="https://www.npmjs.com/package/@uni-helper/unh"><img src="https://img.shields.io/npm/v/@uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge"></a>
<br/>

# 由 [uni-helper](https://uni-helper.js.org) 封装的uni命令

## 安装

```bash
pnpm i -D @uni-helper/unh
```

## 使用

📖 **请阅读[完整文档](https://uni-helper.js.org/uni)了解完整使用方法！**

```bash
pnpm dev wx
```

```json
// package.json
{
  "scripts": {
    "dev": "unh dev",
    "build": "unh build",
    "prepare": "unh prepare"
  }
}
```

```ts
// unh.config.ts
import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: {
    // 默认平台
    default: 'h5',
    // 平台别名
    alias: {
      'h5': ['w', 'h'],
      'mp-weixin': ['wx'],
    },
  },
  hooks: {
    prepare() {},
    dev({ platform, options, envData }) {},
    onDevAfter({ platform, options, envData }) {},
    build({ platform, options, envData }) {},
    onBuildAfter({ platform, options, envData }) {},
  },
  autoGenerate: {
    pages: true,
  },
  env: true,
  devtools: {
    open: true,
  },
})
```
