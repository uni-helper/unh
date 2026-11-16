# 参与贡献

感谢你对 `@uni-helper/unh` 的兴趣。本文介绍怎么把仓库跑起来、代码放在哪、提交前要做哪些检查。

## 前置条件

| 依赖 | 版本 | 位置 |
| --- | --- | --- |
| Node.js | 26 | `.node-version` |
| pnpm | 12.18.0 | `package.json` 的 `packageManager` |

`package.json` 没有 `engines`，这两个版本只约束开发环境，不影响使用方。建议开 corepack 自动切版本：`corepack enable`。

## 仓库结构

```text
.
├── src/
│   ├── cli/                    # CLI 入口、命令实现、配置容器
│   │   ├── index.ts            # bin 入口，用 cac 注册命令
│   │   ├── config.ts           # ConfigManager 单例，读 unh.config.ts
│   │   ├── types.ts            # 命令类型、全局配置类型
│   │   └── commands/           # dev / build / prepare / deploy / info / platform / help
│   ├── config/                 # defineConfig 与 UniHelperConfig 等对外类型
│   ├── constants/              # 平台清单、终端输出过滤规则、部署平台与动作
│   ├── libs/devtools/          # 小程序开发者工具启动器与平台 handler
│   ├── logics/                 # 平台别名、uni 子进程、env、预生成、部署、ESM 校验
│   └── utils/                  # 时间格式化、logger、JSON 文件写入
├── test/                       # vitest 用例
├── playground/                 # uni-app 集成示例（workspace 成员，不发布）
├── tsdown.config.ts            # 构建配置
├── vitest.config.ts            # 把 @ 别名指向 src
├── pnpm-workspace.yaml         # workspace 与 catalog
└── package.json
```

`dist/` 由 `pnpm build` 生成，已在 `.gitignore` 里，不提交。

## 本地开发

```bash
pnpm install        # 安装依赖（根和 playground）
pnpm dev            # tsdown --watch src，改完自动重建 dist
pnpm build          # 产出 dist/index.mjs、dist/cli.mjs 和对应的 .d.mts
```

`playground/` 是真实的 uni-app 项目，通过 `workspace:*` 引用本包并读 `dist/`，所以改完 `src/` 要先跑 `pnpm dev` 或 `pnpm build` 才能在 playground 里看到效果。

```bash
pnpm -C playground run dev         # unh dev，playground 的默认平台是 mp-weixin
pnpm -C playground run dev:mode    # unh dev --mode dev
pnpm -C playground run build       # unh build
pnpm -C playground run build:mode  # unh build --mode uat
pnpm -C playground run type-check  # vue-tsc --noEmit
```

`playground/unh.config.ts` 打开了 hooks、env 和 devtools，验证这几块功能时改它。

## 依赖版本管理

依赖版本都写在 `pnpm-workspace.yaml`，`package.json` 里只写 `catalog:` 或 `workspace:`，不要直接写版本号。五个 catalog 各管一段：

| catalog | 内容 |
| --- | --- |
| 默认 `catalog` | 主包运行时依赖，如 `cac`、`dotenv`、`cross-spawn` |
| `cli` | 构建与 lint 工具，如 `tsdown`、`eslint`、`typescript` |
| `testing` | `vitest` 与 `vitest-package-exports` |
| `types` | `@types/*` |
| `uni-app` | playground 整套 uni-app 依赖；`@dcloudio/*` 必须用同一份快照，`vue`、`vite` 跟着编译器版本走 |

升级依赖改对应 catalog 条目，然后跑 `pnpm install` 重新生成 lockfile。pnpm 12 会把低于最小发布年龄的版本记进 `minimumReleaseAgeExclude`，等版本过了一定时间可以删掉那条。

## 测试与检查

```bash
pnpm test                              # vitest，watch 模式
pnpm vitest run                        # 只跑一遍
pnpm vitest run test/deploy.test.ts    # 只跑单个文件
pnpm typecheck                         # tsc，只做类型检查不出产物
pnpm lint                              # eslint .
pnpm lint:fix                          # eslint --fix
```

CI（`.github/workflows/ci.yml`）只有一个 `test` job，矩阵是 ubuntu、macos、windows × Node.js 22 / 24 / 26，依次跑 `build` → `lint` → `test` → `typecheck`。CI 里 vitest 检测到环境后只跑一遍，不进 watch。

### 测试说明

`vitest.config.ts` 把 `@` 别名指向 `src`，测试里可以直接 `import ... from '@/logics'`。用例按被测模块分文件，外部依赖都 mock 掉，不启动真实进程：

- `test/deploy.test.ts`、`test/deploy-command.test.ts`：部署平台/动作解析与命令组装，`@uni-helper/deploy` 的 `deploy` 用 mock 替换。
- `test/pregen.test.ts`：mock `cross-spawn` 和 `local-pkg`，断言预生成脚本调用参数和失败时的降级行为。
- `test/esm.test.ts`：mock `local-pkg` 的 `loadPackageJSONSync`，覆盖 ESM、CJS、缺 `package.json` 三种情况。
- `test/config.test.ts`：mock `unconfig`，断言 `autoGenerate` 废弃警告。
- `test/parser.test.ts`：平台别名解析。

## 代码架构

一次 `unh dev wx` / `unh build wx` 走完下面这些步骤：

1. `src/cli/index.ts` 先 `assertEsmProject()`，当前项目不是 ESM 就直接退出，再做别的。
2. `loadCliConfig()` 读 `unh.config.ts` 并与默认值合并；配置里还有 `autoGenerate` 时输出废弃警告。
3. 命令处理函数（`src/cli/commands/`）把平台参数交给 `resolveTargetPlatform()`，别名在这里解析成完整平台名，结果写进全局配置。
4. 开了 `env` 时 `loadEnv()` 按平台和 mode 拼出 `.env*` 路径，过滤前缀、合并到 `process.env`，再写类型声明文件。
5. `composeUniCommand()` 拼出 `uni dev -p <platform> <其余参数>`，命令行里的其他参数原样带过去。
6. `preGenerateConfigFiles()` 起一个子进程跑 vite 的 `resolveConfig`，让 pages / manifest 插件把真实配置文件写盘。
7. 跑前置 hook（`hooks.dev` / `hooks.build`）→ 执行 uni 命令 → 跑后置 hook（`hooks.onDevAfter` / `hooks.onBuildAfter`）。

dev 和 build 执行 uni 命令的方式不同：`dev` 用 `pipe` 接管 stdout，等输出里出现 `ready in` 就 resolve，然后跑 `onDevAfter`，输出会过一遍 `TERMINAL_OUTPUT_PROCESSORS` 重写成更短的样式；`build` 用 `cross-spawn` 的 `sync` 阻塞到命令结束，再跑 `onBuildAfter`。

`unh deploy` 是另一条独立链路：平台和动作先在 `src/logics/deploy.ts` 里校验（`src/constants/deploy.ts` 存了一份可部署平台清单，避免为了校验去加载部署 SDK），通过后才 `await import('@uni-helper/deploy')` 调 SDK，结果由 `reportDeployResults` 汇总，有失败就把 `process.exitCode` 设成 1，不抛异常。

`src/libs/devtools/` 是个小的 handler 注册表：`MPDevtoolsLauncher` 按平台找 handler，handler 自己负责 `detect()`、`getCliPath()`、`launch()`。目前只注册了 `WechatDevtoolsHandler`，加平台就是加一个 handler 再注册进去。

## 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)，前缀用 `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`chore`：

```text
feat(deploy): 支持钉钉小程序
fix(env): 修复 mode 为 local 时的报错信息
docs: 补充部署配置说明
```

仓库没有挂 git hook。提交前请在本地跑一遍和 CI 一致的检查：

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

## Pull Request 指南

- 一个 PR 处理一个问题，顺手改的内容单独开。
- 改了命令行为或配置项，同步更新 `README.md`；文档站正文在 [uni-helper/website](https://github.com/uni-helper/website) 仓库的 `content/unh/` 目录，需要另外提 PR。
- 等 CI 的 lint 与 test 两个 job 通过。涉及预生成和部署的改动注意路径差异，test job 在 macOS 和 Windows 上也会跑。
- 方案不确定时先开 issue 讨论，别直接写完再提。

## 发布

发布由维护者完成：

```bash
pnpm release
```

`bumpp` 会升版本、提交、打 `v*` tag 并推送。tag 触发 `.github/workflows/release.yml`（`sxzz/workflows` 的 release 工作流，`publish: true`），发布前 `prepublishOnly` 会跑一次 `pnpm build`。

## 行为准则

参与本项目即表示你同意遵守 [uni-helper 组织行为准则](https://github.com/uni-helper/.github/blob/main/CODE_OF_CONDUCT.md)。

---

有疑问或想先讨论方案，请开 [GitHub Issue](https://github.com/uni-helper/unh/issues)。
