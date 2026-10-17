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

`unh deploy` 基于 [`@uni-helper/deploy`](https://uni-helper.js.org/deploy) 的 SDK 能力，在构建完成后上传体验版、生成预览二维码或打开开发者工具。

```bash
# 上传体验版（默认动作），未指定平台时使用配置中已配置的全部平台
unh deploy

# 指定平台，支持别名（wx）、逗号分隔
unh deploy wx
unh deploy mp-weixin,mp-alipay
unh deploy -p wx

# 指定动作
unh deploy preview wx
unh deploy -a open wx
```

各平台的官方 CI 依赖体积较大，需要按需安装，例如微信小程序：

```bash
pnpm i -D miniprogram-ci
```

### 配置

小程序部署配置写在 `unh.config.ts` 的 **`deploy` 字段**下，与 [`@uni-helper/deploy`](https://uni-helper.js.org/deploy) 的配置**完全一致，可直接复用**，字段含义、环境变量与优先级都相同：

```ts
export default defineConfig({
  platform: { default: 'mp-weixin' },
  // unh 自身的配置
  hooks: {},
  // @uni-helper/deploy 的配置，原样复用
  deploy: {
    'version': '1.0.0',
    'desc': '本次发布内容',
    'mp-weixin': {
      appid: 'wx1234567890',
      privateKeyPath: 'key/private.appid.key',
      robot: 1,
    },
    'mp-alipay': {
      appid: '支付宝小程序 appid',
      toolId: '工具 id',
      privateKeyPath: 'key/pkcs8-private-pem',
    },
  },
})
```

`deploy` 字段之外的配置不会被部署命令读取，因此可以与 `platform`、`hooks` 等配置共存。全部配置项、各平台字段说明、环境变量（如 `MP_WEIXIN_PRIVATE_KEY`）与产物目录约定，请查阅 [`@uni-helper/deploy` 文档](https://uni-helper.js.org/deploy)。

### 命令参数

| 参数 | 说明 |
| --- | --- |
| `[action] [platform...]` | 位置参数，动作可省略。如 `unh deploy preview wx` |
| `-p, --platform <platform>` | 目标平台，多个用逗号分隔，支持平台别名。缺省时取配置中已配置的平台 |
| `-a, --action <action>` | 部署动作：`upload`（默认）/ `preview` / `open` |
| `--cwd <dir>` | 工作目录，默认为当前目录 |
| `--config <path>` | 自定义配置文件路径，传 `false` 表示不读取配置文件 |
| `--app-version <version>` | 版本号，覆盖配置中的 `version` |
| `--desc <desc>` | 版本描述，覆盖配置中的 `desc` |
| `--project-path <path>` | 构建产物目录，覆盖配置中的 `projectPath` |

> [!NOTE]
> 位置参数与 `-p`/`-a` 等价，二者同时使用时动作以 `-a` 为准，平台取并集；动作名称（`upload`/`preview`/`open`）位于首项时会被识别为动作，其余位置参数均视为平台。


> [!NOTE]
> `pages.json`、`manifest.json`、`uni-pages.d.ts` 等配置文件无需手动创建或提交，unh 会在 `dev`/`build` 前自动触发 `vite-plugin-uni-pages`、`vite-plugin-uni-manifest` 生成真实配置。
> 原 `autoGenerate` 配置项已废弃，保留时不会产生任何效果，并会输出废弃警告提示删除。

