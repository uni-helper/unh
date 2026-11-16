<a href="https://uni-helper.js.org/unh"><img src="https://cdn.jsdelivr.net/gh/uni-helper/unh@main/banner.svg" alt="banner" width="100%"/></a>

# @uni-helper/unh

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/uni-helper/unh@main/logo.svg" alt="logo" width="256" height="256"/>
</p>

<p align="center">
  <a href="https://github.com/uni-helper/unh/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/uni-helper/unh?style=for-the-badge&labelColor=005947&color=eee" alt="License"></a>
  <a href="https://github.com/uni-helper/unh/stargazers"><img src="https://img.shields.io/github/stars/uni-helper/unh?style=for-the-badge&labelColor=005947&color=eee" alt="Stars"></a>
  <a href="https://npmx.dev/package/@uni-helper/unh"><img src="https://img.shields.io/npm/v/@uni-helper/unh?style=for-the-badge&labelColor=005947&color=eee" alt="NPM Version"></a>
  <a href="https://npmx.dev/package/@uni-helper/unh"><img src="https://img.shields.io/npm/dm/@uni-helper/unh?style=for-the-badge&labelColor=005947&color=eee" alt="NPM Downloads"></a>
</p>

<p align="center">
  <a href="https://github.com/FliPPeDround"><img src="https://img.shields.io/badge/Author%20%26%20Maintainer-FliPPeDround-blue?style=for-the-badge" alt="Author & Maintainer"></a>
</p>

对 uni-app 命令的一层封装：`dev` / `build` 前先把 `pages.json`、`manifest.json` 生成好，再转发成 `uni dev -p <platform>`；另外带平台别名、自定义 hooks、环境变量加载、开发者工具自动打开和小程序部署。

不想看文档？直接问 AI 🤖 <a href="https://deepwiki.com/uni-helper/unh"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>

> **请考虑持续[赞助](https://afdian.com/a/flippedround)以维持该项目的持续健康发展，非常感谢！🙏**

## 目录

- [简介](#简介)
- [安装](#安装)
- [快速开始](#快速开始)
- [命令](#命令)
- [配置](#配置)
- [部署](#部署)
- [API 参考](#api-参考)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 简介

`uni` 在 vite 配置阶段就会读磁盘上的 `pages.json`。只有一个页面时它会关掉 `__UNI_FEATURE_PAGES__`，产物里不再装 vue-router，页面跳转在运行时报错。用 [vite-plugin-uni-pages](https://github.com/uni-helper/vite-plugin-uni-pages) 这类插件时，冷构建的磁盘上本来就没有 `pages.json`，uni 读到的是占位内容。

unh 在 `dev` / `build` 之前先在子进程里跑一次 vite 的 `resolveConfig`，只触发插件初始化钩子、不进打包阶段，让插件把真实的 `pages.json`、`manifest.json`、`uni-pages.d.ts` 写到磁盘，然后再执行 `uni` 命令。

`unh deploy` 基于 [`@uni-helper/deploy`](https://github.com/uni-helper/deploy) 上传小程序体验版、生成预览二维码或打开开发者工具。

## 安装

```bash
pnpm i -D @uni-helper/unh
```

只支持 ESM 项目。`unh` 启动时会检查当前目录最近一层 `package.json` 的 `type` 是不是 `module`，不是就直接报错退出：

```text
错误: 检测到当前项目为 CommonJS 环境，unh 仅支持 ESM 项目
请在 package.json 中添加 "type": "module" 后重试
```

## 快速开始

把 `package.json` 里的 `uni` 换成 `unh`：

```json
{
  "scripts": {
    "dev": "unh dev",
    "build": "unh build",
    "prepare": "unh prepare",
    "deploy": "unh deploy"
  }
}
```

项目根目录放一个 `unh.config.ts`，不写也能跑：

```ts
import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: {
    // 不指定平台时用它
    default: 'h5',
    // 平台别名
    alias: {
      'h5': ['w', 'h'],
      'mp-weixin': ['wx'],
    },
  },
  env: true,
  devtools: {
    open: true,
  },
})
```

运行：

```bash
pnpm dev wx
```

`pages.json`、`manifest.json`、`uni-pages.d.ts` 不用手动创建或提交，装了对应插件的话 unh 会在 `dev` / `build` 前触发它们生成。

## 命令

| 命令 | 说明 |
| --- | --- |
| `unh dev [platform]` | 开发。加载配置和环境变量、预生成配置文件、跑 `hooks.dev`，执行 `uni dev -p <platform>`，输出 `ready in` 后再跑 `hooks.onDevAfter`。 |
| `unh build [platform]` | 构建。流程同上，走 `hooks.build` 和 `hooks.onBuildAfter`，同步等 `uni build` 结束。 |
| `unh prepare` | 只跑 `hooks.prepare`，适合放在 `package.json` 的 `prepare` 脚本里。 |
| `unh deploy [targets]` | 部署小程序构建产物，详见[部署](#部署)。 |
| `unh info` | 用当前包管理器临时执行 `@create-uni/info`，打印项目信息。 |
| `unh platform` | 用表格列出内置平台和对应说明。 |
| `unh -h`、`unh --version` | 帮助信息和版本号。 |

`[platform]` 省略时取 `platform.default`；写别名会先解析成完整平台名。其余参数原样透传给 `uni`，所以 `unh build mp-weixin --mode uat` 等于 `uni build -p mp-weixin --mode uat`。

## 配置

| 配置 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `platform.default` | `Platform` | `'h5'` | 未指定平台时使用 |
| `platform.alias` | `Record<Platform, string \| string[]>` | `{}` | 平台别名，一个平台可以配多个 |
| `hooks` | `{ prepare, dev, onDevAfter, build, onBuildAfter }` | — | 命令前后执行的自定义逻辑 |
| `env` | `true` 或选项对象 | 不开启 | 按平台和模式加载环境变量，并生成类型声明 |
| `devtools` | `{ open, cliPath }` | `open: false` | 自动打开小程序开发者工具 |
| `deploy` | `DeployUserConfig` | — | 部署配置，字段与 `@uni-helper/deploy` 完全一致 |

完整示例：

```ts
import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: { default: 'mp-weixin' },
  hooks: {
    prepare() {},
    dev({ platform, options, envData }) {},
    onDevAfter({ platform, options, envData }) {},
    build({ platform, options, envData }) {},
    onBuildAfter({ platform, options, envData }) {},
  },
  env: {
    root: 'envs',
    usePlatformDir: true,
    prefixes: ['VITE_', 'UNI_'],
    intoProcess: true,
    dts: 'uni-env.d.ts',
  },
  devtools: {
    open: true,
    cliPath: {
      'mp-weixin': '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    },
  },
})
```

几个行为需要知道：

- `env` 的 `mode` 不能写成 `local`，会直接报错。
- `devtools.open` 只对 `mp-*` 平台生效，目前能自动打开的开发者工具只有微信开发者工具。没配 `cliPath` 时会去系统里找安装路径。
- 预生成只在项目里装了 `@uni-helper/vite-plugin-uni-pages` 或 `@uni-helper/vite-plugin-uni-manifest` 时执行；生成失败只会打印警告，不阻断命令。
- `autoGenerate` 已经废弃，配了不会有任何效果，只会输出一条提示删除的警告。

各配置项的详细说明见[完整文档](https://uni-helper.js.org/unh)：[平台别名](https://uni-helper.js.org/unh/alias)、[自定义 hooks](https://uni-helper.js.org/unh/hooks)、[环境变量](https://uni-helper.js.org/unh/env)、[小程序开发者工具](https://uni-helper.js.org/unh/devtools)。

## 部署

```bash
unh deploy                # 上传体验版（默认动作）
unh deploy wx             # 指定平台，支持别名与逗号分隔
unh deploy preview wx     # 指定动作：upload（默认）/ preview / open
```

| 动作 | 作用 |
| --- | --- |
| `upload` | 上传代码作为体验版 |
| `preview` | 上传代码作为开发版并生成预览二维码 |
| `open` | 打开小程序开发者工具 |

可部署的平台是 `mp-weixin`、`mp-alipay`、`mp-toutiao`、`mp-baidu`、`mp-jd`、`mp-dingtalk`。`h5`、`mp-qq`、`mp-xhs` 这些没有部署能力，传进去会报错。

常用选项：`-p, --platform`、`-a, --action`、`--cwd`、`--config`（传 `false` 表示不读配置文件）、`--app-version`、`--desc`、`--project-path`。

各平台官方的 CI 包是 `@uni-helper/deploy` 的可选 peer 依赖，按平台安装即可，例如微信小程序：

```bash
pnpm i -D miniprogram-ci
```

部署配置写在 `unh.config.ts` 的 `deploy` 字段下，字段与 `@uni-helper/deploy` 完全一致：

```ts
export default defineConfig({
  deploy: {
    'mp-weixin': {
      appid: 'wx1234567890',
      privateKeyPath: 'key/private.appid.key',
    },
  },
})
```

全部配置项、各平台字段与优先级见 [`@uni-helper/deploy` 仓库](https://github.com/uni-helper/deploy)。

## API 参考

### `defineConfig`

```ts
function defineConfig(config: UniHelperConfig): UniHelperConfig
```

把配置原样返回，作用是在 `unh.config.ts` 里拿到类型提示。

### 类型

`UniHelperConfig`、`HookOptions`、`PlatformAlias`、`CliPathConfig`、`ManifestOptions` 从包入口导出：

```ts
import type { HookOptions, UniHelperConfig } from '@uni-helper/unh'
```

## 参与贡献

项目结构、本地调试和提交规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE.md)
