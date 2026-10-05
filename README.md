# F9 / AIBazaar

仓库维护三个独立正式项目：安泊电梯求生、万灯城共鸣卡牌、万灯城甩牌对决。另有独立的电梯 AI 实验区；实验完成后再把验证通过的实现并入电梯主项目。历史 Demo 与美术工作台归档在 `experiments/legacy-workbench`，不参与产品发布。

新维护者先阅读 [贡献指南](CONTRIBUTING.md) 和 [开发约定](AGENTS.md)。电梯规则位于 `app/survival/`、`lib/survival-*`；共鸣和甩牌的页面、规则分别自包含于 `apps/resonance/src/`、`apps/throw/src/`。电梯 AI 位于 `apps/elevator-ai/`。`packages/` 保存中立共享基础设施。三个正式项目和 AI 实验之间不能互相引用；共享层不能反向依赖项目。

## 本地开发与验证

共鸣美术试演：启动共鸣服务后访问 `/art`（SUMMERHOUSE 方向，像素行走）或 `/art/storybook`（火山的女儿方向，立绘对话），各自可进入同风格的音乐战斗。正式首页提供「美术试演」入口。[素材、提示词与验收记录](docs/F9_RESONANCE_ART_DEMOS_2026-10-04.md)。

Node.js 22.13+，先运行 `npm ci`。

| 操作 | 电梯 | 共鸣卡牌 | 甩牌对决 | 电梯 AI 实验 |
| --- | --- | --- | --- | --- |
| 开发 | `npm run dev:elevator` | `npm run dev:resonance:cards` | `npm run dev:throw:cards` | `npm run dev:elevator-ai` |
| 测试 | `npm run test:elevator` | `npm run test:resonance:cards` | `npm run test:throw:cards` | `npm run test:elevator-ai` |
| 类型检查 | `npm run typecheck:elevator` | `npm run typecheck:resonance:cards` | `npm run typecheck:throw:cards` | `npm run typecheck:elevator-ai` |
| 构建 | `npm run build:elevator` | `npm run build:resonance:cards` | `npm run build:throw:cards` | `npm run build:elevator-ai` |
| 查看发布包 | `npm run preview:elevator`（4175） | `npm run preview:resonance:cards`（4176） | `npm run preview:throw:cards`（4177） | `npm run preview:elevator-ai`（4178，本地实验包） |

同时启动开发服务时，可在命令后加 `-- --port 4173` 至 `4176` 指定端口。`npm run dev` 默认进入电梯。电梯 AI 只在本地实验区运行，不进入正式产品构建、GitHub Pages 或 Cloudflare 发布。

全量验证：`npm test`、`npm run lint`、`npm run typecheck`、`npm run check:boundaries`、`npm run check:determinism`、`npm run check:dependencies`。测试递归覆盖三个项目、组件、hooks、规则、共享包、脚本和归档实验源码，跳过生成目录；正式产品测试也包含共享检查。`npm run build` 只生成三个正式项目；AI 实验需单独运行 `npm run build:elevator-ai`。

工程结构、已完成优化和验证记录见 [优化交付记录](docs/F9_CODE_OPTIMIZATION_2026-09-29.md)。
协作基线、存档兼容及本轮检查说明见 [维护基线](docs/COLLABORATION_BASELINE_2026-10-03.md)。

在线试玩：https://ciki-9876.github.io/AIBazaar/

## 发布

推送到 `main` 后，GitHub Actions 自动构建并部署到 GitHub Pages。
GitHub Pages 是默认合并发布目标；Cloudflare Pages 保留为明确选择某个产品的手动发布流程。
合并前应通过 PR 的全量测试、lint、类型检查、边界检查和三个正式项目构建。Pages 部署也必须通过检查与构建后才能执行。
本地运行 `npm ci`、`npm run build:pages` 可生成同样的 `dist/client` 静态站点。
`NEXT_PUBLIC_BASE_PATH` 默认是 `/AIBazaar`；普通开发与独立构建使用根路径。
Pages 将三个独立包放在 `/elevator/`、`/resonance/`、`/throw/` 下，保留 `/survival/`、`/wandeng/`、`/wandeng/rhythm/`、`/wandeng/throw/`、`/arena/` 的旧入口跳转，不发布 AI 实验。独立包输出在各自的 `apps/<project>/dist/client`。

`products.yml` 分别验证和上传三个正式项目的发布包，一方失败不取消另一方。`product-release.yml` 可单独构建某个正式项目；默认仅产出包。主动选择发布时，使用各项目独立的 Cloudflare Pages 项目与环境配置。详见交付记录。

Pages 构建脚本补齐目录首页、清理无对应文件的可选预加载提示，并校验 HTML 的本地资源与链接。
游戏规则、物品身份和原存储键保持兼容。新存档／回放增加产品、信封版本、规则版本和校验和；读取仍支持旧 JSON 与已有电梯检查点迁移。跨产品、未知规则版本及校验失败的信封会被拒绝。旧站存档需先导出，再在支持该格式的新站入口导入；不同来源的站点不共享浏览器本地存档。
