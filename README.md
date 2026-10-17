<a href="https://uni-helper.js.org/unh"><img src="./banner.svg" alt="banner" width="100%"/></a>

<div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
  <a href="https://github.com/uni-helper/unh/stargazers"><img src="https://img.shields.io/github/stars/uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge" alt="stars"></a>
  <a href="https://www.npmjs.com/package/@uni-helper/unh"><img src="https://img.shields.io/npm/dm/@uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge" alt="downloads"></a>
  <a href="https://www.npmjs.com/package/@uni-helper/unh"><img src="https://img.shields.io/npm/v/@uni-helper/unh?colorA=005947&colorB=eee&style=for-the-badge" alt="npm"></a>
</div>

<div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
  <a href="https://deepwiki.com/uni-helper/unh"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</div>

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
    "prepare": "unh prepare",
    "deploy": "unh deploy"
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
  env: true,
  devtools: {
    open: true,
  },
  // 小程序部署配置，与 @uni-helper/deploy 完全一致
  deploy: {
    'mp-weixin': {
      appid: '微信小程序 appid',
      privateKeyPath: 'key/private.appid.key',
    },
  },
})
```

## 部署

`unh deploy` 基于 [`@uni-helper/deploy`](https://uni-helper.js.org/deploy) 的 SDK 能力，上传体验版、生成预览二维码或打开开发者工具。

```bash
unh deploy                # 上传体验版（默认动作）
unh deploy wx             # 指定平台，支持别名与逗号分隔
unh deploy preview wx     # 指定动作：upload（默认）/ preview / open
```

各平台的官方 CI 依赖体积较大，需要按需安装，例如微信小程序：

```bash
pnpm i -D miniprogram-ci
```

部署配置写在 `unh.config.ts` 的 **`deploy` 字段**下，与 `@uni-helper/deploy` 的配置**完全一致，可直接复用**：

```ts
export default defineConfig({
  // @uni-helper/deploy 的配置，原样复用
  deploy: {
    'mp-weixin': {
      appid: 'wx1234567890',
      privateKeyPath: 'key/private.appid.key',
    },
  },
})
```

📖 **全部配置项、各平台字段、环境变量与命令参数，请阅读 [`@uni-helper/deploy` 文档](https://uni-helper.js.org/deploy)。**


> [!NOTE]
> `pages.json`、`manifest.json`、`uni-pages.d.ts` 等配置文件无需手动创建或提交，unh 会在 `dev`/`build` 前自动触发 `vite-plugin-uni-pages`、`vite-plugin-uni-manifest` 生成真实配置。
> 原 `autoGenerate` 配置项已废弃，保留时不会产生任何效果，并会输出废弃警告提示删除。

