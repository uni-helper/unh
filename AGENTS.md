# unh

`@uni-helper/unh` 是 uni-app 命令的一层封装：`dev` / `build` 前先在子进程里触发 vite 插件把 `pages.json`、`manifest.json` 生成到磁盘，再转发成 `uni dev -p <platform>` / `uni build -p <platform>`，并在前后插入自定义 hook。另有 `unh deploy`，基于 `@uni-helper/deploy` 上传小程序体验版。

## 项目

- **语言与类型**：TypeScript，`tsconfig.json` 开 `strict` + `strictNullChecks`，`noEmit: true`，`moduleResolution: "Bundler"`，路径别名 `@/*` → `src/*`（tsdown 与 vitest 各自解析，运行时不生效）。`resolveJsonModule` 打开，`src/cli/index.ts` 直接从 `../../package.json` 读 `version`。
- **Node / pnpm**：`.node-version` 是 `26`，`packageManager` 是 `pnpm@12.18.0`。`package.json` 没有 `engines` 和 `devEngines`，这两个版本只约束开发环境。
- **构建**：tsdown（catalog `cli`）。`tsdown.config.ts` 有两个 entry（`index: 'src/index.ts'`、`cli: 'src/cli/index.ts'`），`dts: true`、`fixedExtension: true`、`clean: true`，产物是 `dist/index.mjs`、`dist/index.d.mts`、`dist/cli.mjs`、`dist/cli.d.mts`。
- **发布面**：`exports` 只有 `.`（`./dist/index.mjs`）和 `./package.json`；`bin` 是 `unh` → `dist/cli.mjs`；`files: ["dist"]`；`sideEffects: false`；`prepublishOnly` 先跑 `pnpm build`。运行时导出只有 `defineConfig`，类型导出 `UniHelperConfig`、`HookOptions`、`PlatformAlias`、`CliPathConfig`、`ManifestOptions`（由 `src/config/index.ts` 的 `export * from './types'` 带出）。
- **依赖**：全部走 `pnpm-workspace.yaml` 的 catalog，`package.json` 里写 `catalog:`。catalog 的分工：默认 catalog 放主包运行时依赖，`cli` 放构建与 lint 工具，`testing` 放 vitest，`types` 放 `@types/*`，`uni-app` 放 playground 整套 uni-app 依赖（`@dcloudio/*` 必须用同一份快照，`vue`、`vite` 跟着编译器版本走）。新增依赖先看能不能塞进现有 catalog，不要在 `package.json` 里写具体版本。`@uni-helper/deploy` 是 `unh deploy` 唯一的 SDK 依赖，其他命令不加载它。`deps.neverBundle` 里列了 `@antfu/utils`，但它不在依赖里，改 tsdown 配置时留意这一行是否还有意义。
- **workspace**：`pnpm-workspace.yaml` 的 `packages` 列了 `playground`、`docs`、`packages/*`、`examples/*`，实际只有 `playground/` 存在；发布包在仓库根目录。
- **发布**：`bumpp` 升版本打 `v*` tag，`.github/workflows/release.yml` 复用 `sxzz/workflows` 的 release 工作流（`publish: true`，OIDC）。
- **使用前提**：`unh` 只跑在 ESM 项目里，`assertEsmProject()` 在 CLI 入口做检查，非 ESM 直接 `process.exit(1)`。

## Commands

```bash
pnpm install                            # 安装依赖（根 + playground）
pnpm dev                               # tsdown --watch ./src，持续重建 dist
pnpm build                             # 产出 dist/*.mjs 与 dist/*.d.mts
pnpm lint                              # eslint .（含 markdown）
pnpm lint:fix                          # eslint --fix
pnpm test                              # vitest，watch 模式
pnpm vitest run                        # 只跑一遍
pnpm vitest run test/deploy.test.ts    # 只跑单个文件
pnpm typecheck                         # tsc，只做类型检查不出产物
pnpm -C playground run dev             # unh dev，playground 默认平台 mp-weixin
pnpm -C playground run dev:mode        # unh dev --mode dev
pnpm -C playground run build           # unh build
pnpm -C playground run build:mode      # unh build --mode uat
pnpm -C playground run type-check      # vue-tsc --noEmit
pnpm release                           # bumpp：升版本 + commit + tag + push（维护者用）
```

CI（`.github/workflows/ci.yml`）只有一个 `test` job，矩阵是 ubuntu / macos / windows × Node.js 22 / 24 / 26，依次跑 `build` → `lint` → `test` → `typecheck`。

## Architecture

| 文件 | 职责 |
| --- | --- |
| `src/index.ts` | 包的唯一入口，`export * from './config'`。新增对外导出必须经过这里，否则消费者拿不到。 |
| `src/cli/index.ts` | `bin` 入口（带 shebang）。顺序是 `assertEsmProject()` → `loadCliConfig()` → 用 cac 注册命令 → `cli.help(customHelp)`。`deploy` 用 `[...targets]` 收位置参数，其余命令是 `[platform]`。 |
| `src/cli/config.ts` | `ConfigManager` 单例。`loadCliConfig()` 用 unconfig 读 `unh.config` 并与 `DEFAULT_CONFIG` 浅合并，配置里出现 `autoGenerate` 时输出废弃警告；`getCliConfig()` 在未加载时返回 `null`，但函数用 `as UniHelperConfig` 断言，先调 `loadCliConfig()` 是隐式前提。`setGlobalConfig` 保存当前 `type` 与 `platform`，供 devtools 判断用。 |
| `src/cli/commands/` | 每个命令一个文件。`dev.ts` / `build.ts` 是同一套流程的两份实现，顺序见下。`deploy.ts` 只做参数解析、校验和 SDK 调用。`help.ts` 把 cac 的英文段落替换成中文并挂文档链接。`info.ts` 走 `runPkg('@create-uni/info')`，`platform.ts` 直接 `console.table` 平台清单。 |
| `src/logics/` | 不接触 cac 的逻辑层。`index.ts` 再导出 `cli` / `composeCommand` / `deploy` / `env` / `esm` / `platform` / `pregen`；`terminal.ts` 和 `devtools.ts` 由 `cli.ts` 直接 import，不在 barrel 里。 |
| `src/logics/cli.ts` | `resolveTargetPlatform`、hook 执行、uni 子进程（`executeUniCommandOnDev` / `executeUniCommandOnBuild`）、`getRawOptions`。 |
| `src/logics/pregen.ts` | `preGenerateConfigFiles(platform)`：`process.execPath --input-type=module -e '<script>'` 起子进程跑 vite `resolveConfig`，让插件在 `configResolved` 里写盘；env 注入 `UNI_PLATFORM`（`@uni-helper/uni-env` 在模块导入时就读它）。没装 pages / manifest 插件直接 return，失败只警告。 |
| `src/logics/deploy.ts` | `resolveDeployPlatforms`、`resolveDeployAction`、`splitDeployTargets`、`resolveDeployConfigFile`、`reportDeployResults`。平台名先过 `resolvePlatformAlias`，再对着 `DEPLOY_PLATFORMS` 校验；动作缺省是 `upload`。 |
| `src/logics/esm.ts` | `assertEsmProject()`：`loadPackageJSONSync(process.cwd())` 的 `type` 不是 `module` 就报错退出，CJS 会让 vite 走废弃的 CJS Node API，预生成必挂。 |
| `src/logics/composeCommand.ts` | 拼命令并执行。`composeCommand` 按 `npm_config_user_agent` 选 `pnpm dlx` / `yarn dlx` / `bun x` / `npx`，并给非 yarn1 的包名补 `@latest`；`composeUniCommand` 拼 `uni <cmd> -p <platform> <args>`。 |
| `src/logics/env.ts` | `loadEnv(platform, mode, envConfig)`：按顺序找 `.env`、`.env.local`、`.env.<mode>`、`.env.<mode>.local`（`usePlatformDir` 时插一层平台子目录），按 `prefixes` 过滤，`expand` 后按需写进 `process.env` 并生成 dts。 |
| `src/logics/platform.ts` | `resolvePlatformAlias`：线性扫 `alias`，字符串和数组都支持，未命中返回原值，不校验是否属于 `PLATFORM`。 |
| `src/logics/terminal.ts` | `TERMINAL_OUTPUT_PROCESSORS` 重写 uni 的终端输出（例如把 `Watching for changes` 换成带时间戳的 `hmr update`，重排 `ready in` 那段），匹配过程中顺带调 `openMPDevtools`。去 ANSI 用 `node:util` 的 `stripVTControlCharacters`，不要引第三方包。 |
| `src/libs/devtools/` | handler 注册表。`MPDevtoolsLauncher` 按平台找 `DevtoolsHandler`，handler 自己实现 `detect()` / `getCliPath()` / `launch()`。目前只注册了 `WechatDevtoolsHandler`。`utils/findSoftware.ts` 在 Windows 查注册表（PowerShell `-EncodedCommand`）和兼容性助手，在 macOS 查 `/Applications` 与 `~/Applications`，输出用 GBK 解码。 |
| `src/constants/platform.ts` | `PLATFORM_DESCRIPTIONS`（平台 → 中文说明）与 `MP_PLATFORMS`（小程序平台 → 短名）。新增平台改这里，`unh platform` 的输出跟着变。 |
| `src/constants/deploy.ts` | `DEPLOY_PLATFORMS`、`DEPLOY_ACTIONS`、`DEFAULT_DEPLOY_ACTION` 与两套中文标签。为了不加载部署 SDK 单独抄了一份平台清单，改的时候要和 `@uni-helper/deploy` 对齐。 |
| `src/constants/terminal.ts` | `TERMINAL_SKIP_OUTPUTS`（整段丢弃的输出）与 `TERMINAL_DEV_FLAG`（`'ready in'`）。 |
| `src/config/` | `defineConfig`（原样返回参数）与 `UniHelperConfig` 等对外类型，配置项默认值的注释都写在类型上。`autoGenerate` 类型还在但标了 `@deprecated`，留着只为兼容。 |
| `src/utils/` | `ensureJsonSync`（不存在才写）、`decodeGbk`、`formatTime12Hour`、`logger`（consola，关掉日期）。 |

一次 `unh dev` / `unh build` 的顺序：ESM 校验 → 读配置 → 解析平台（含别名）→ `setGlobalConfig` → 加载 env → `composeUniCommand` → `preGenerateConfigFiles` → 前置 hook → 执行 uni 命令 → 后置 hook。

几个改动时容易踩的点：

- **dev 和 build 执行子进程的方式不同。** `executeUniCommandOnDev` 用 `stdio: 'pipe'`，在 stdout 里匹配到 `ready in` 就 resolve，`onDevAfter` 因此只触发一次；匹配不到就永远不 resolve（dev server 一直跑，属于正常状态）。`executeUniCommandOnBuild` 用 `cross-spawn` 的 `sync` + `stdio: 'inherit'`，命令结束后才跑 `onBuildAfter`。
- **预生成必须在此之前设置 `UNI_PLATFORM`。** `@uni-helper/uni-env` 在模块导入时就把平台定成常量，所以 `pregen.ts` 把它塞进子进程的 env，父进程不共享。
- **子进程 env 里强制写了 `FORCE_COLOR: true` 和 `UNI_HBUILDERX_LANGID: 'zh-CN'`**，改这块会影响 uni 的输出格式和语言。
- **`composeUniCommand` 用空格拼参数，`buildCommandOptions` 再按空格切开**，所以透传的参数值不能含空格。
- **`getRawOptions(cli, platform)` 必须传用户原样输入的平台参数**，它靠 `rawArgs[1] === platform` 判断要不要跳过第二个参数。传解析后的平台名会让平台参数被当成透传参数重复带给 uni。
- **部署 SDK 是动态 import 的**（`handleDeployCommand` 里 `await import('@uni-helper/deploy')`），别把它挪到文件顶层，否则每个 `unh dev` 都要加载二维码相关依赖。部署失败走 `process.exitCode = 1`，不抛异常。
- **`loadEnv` 里 `mode === 'local'` 直接抛错**，这是 dotenv 的模式名冲突，不是 bug。
- **`shouldOpenDevtools`** 要求 `devtools.open` 为真且当前平台以 `mp` 开头；`registerHandler` 会把 launcher 的 config 注进 handler，所以 handler 里读 `this.config` 才是生效的配置。`WechatDevtoolsHandler.launch` 在项目缺 `project.config.json` 时会先补一个（`appid: 'touristappid'`）。
- **`loadCliConfig()` 之前调 `getCliConfig()`** 会拿到 `null`，但类型层面被断言成 `UniHelperConfig`，不会报错。

## Conventions

- **注释和文档一律写中文**，对外配置项在类型上用 JSDoc 写清默认值和副作用，不要复述代码。
- **lint** 用 `@antfu/eslint-config`（`type: 'lib'`、`pnpm: true`），忽略 `playground`、`src/manifest.json`、`src/pages.json`。不要用 `eslint-disable` 绕过规则。markdown 也在检查范围内，README 和 CONTRIBUTING 的代码块会被一起 lint。
- **`dist/` 不进 git**（在 `.gitignore` 里），由 `pnpm build` 和 `prepublishOnly` 产出。playground 读的就是 `dist/`，改完 `src/` 先构建。
- **提交信息**遵循 Conventional Commits，实际用过 `chore` / `refactor` / `feat` / `docs` / `fix` / `ci`。仓库不挂 git hook，提交前自己跑 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
- **子进程统一用 `cross-spawn`**，不要换成 `node:child_process`：`uni`、`pnpm dlx`、微信开发者工具的 `cli.bat` 在 Windows 上都是 `.cmd` / `.bat`，原生 `spawn` 直接调会失败。`executeUniCommandOnDev` 还需要按 chunk 监听 stdout（多行正则匹配 + 在 `ready in` 处 resolve），`tinyexec` 这类行级异步迭代器替不了。
- **依赖版本只改 `pnpm-workspace.yaml` 的 catalog 条目**，不要在 `package.json` 里写死具体版本。
- **测试用 mock 隔离外部进程**（`cross-spawn`、`local-pkg`、`unconfig`、`@uni-helper/deploy`），不要改成真起子进程或真发请求。`test/commands.test.ts` 和 `test/parser.test.ts` 里的 `command Validation` 部分只断言测试自己构造的字面量，没有调用被测代码，别拿它们当覆盖依据。
- **改配置项或命令行为**要同步 `README.md`；文档站正文在另一个仓库 [uni-helper/website](https://github.com/uni-helper/website) 的 `content/unh/`。
