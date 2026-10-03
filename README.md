# F9 / AIBazaar

同仓库维护两个独立产品：安泊电梯求生、万灯城卡牌。旧混合 Demo、美术样板和设计工具保留在实验工作台。

新维护者先阅读 [贡献指南](CONTRIBUTING.md) 和 [开发约定](AGENTS.md)。电梯实现位于 `app/survival/`、`lib/survival-*`，卡牌实现位于 `app/arena/`、`app/wandeng/`、`lib/cards/` 等模块；`apps/` 提供独立产品入口。`packages/` 保存中立共享基础设施。产品之间不能互相引用，也不能引用实验代码；共享层不能反向依赖产品。

## 本地开发与验证

Node.js 22.13+，先运行 `npm ci`。

| 操作 | 电梯 | 卡牌 |
| --- | --- | --- |
| 开发 | `npm run dev:elevator` | `npm run dev:cards` |
| 测试 | `npm run test:elevator` | `npm run test:cards` |
| 类型检查 | `npm run typecheck:elevator` | `npm run typecheck:cards` |
| 构建 | `npm run build:elevator` | `npm run build:cards` |
| 查看发布包 | `npm run preview:elevator`（4175） | `npm run preview:cards`（4176） |

同时启动开发服务时，用 `-- --port 4173`、`-- --port 4174` 指定不同端口。`npm run dev` 保留原有全项目开发入口，首页进入电梯。`npm start` 预览已构建的电梯发布包。

全量验证：`npm test`、`npm run lint`、`npm run typecheck`、`npm run check:boundaries`。`npm run build` 分别生成两个正式产品；实验工作台使用 `npm run dev:experiments` / `npm run build:experiments`。

工程结构、已完成优化和验证记录见 [优化交付记录](docs/F9_CODE_OPTIMIZATION_2026-09-29.md)。

在线试玩：https://ciki-9876.github.io/AIBazaar/

## 发布

推送到 `main` 后，GitHub Actions 自动构建并部署到 GitHub Pages。
合并前应通过 PR 的全量测试、lint、类型检查、边界检查和两个产品构建。Pages 部署也必须通过检查与构建后才能执行。
本地运行 `npm ci`、`npm run build:pages` 可生成同样的 `dist/client` 静态站点。
`NEXT_PUBLIC_BASE_PATH` 默认是 `/AIBazaar`；普通开发与独立构建使用根路径。
Pages 将两个独立包放在 `/elevator/`、`/cards/` 下，保留 `/survival/`、`/wandeng/`、`/arena/` 的旧入口跳转，不发布实验页面。独立包输出在 `apps/elevator/dist/client` 和 `apps/cards/dist/client`。

`products.yml` 分别验证和上传两个产品的发布包，一方失败不取消另一方。`product-release.yml` 可单独构建某个产品；默认仅产出包。主动选择发布时，使用各产品独立的 Cloudflare Pages 项目与环境配置。详见交付记录。

Pages 构建脚本补齐目录首页、清理无对应文件的可选预加载提示，并校验 HTML 的本地资源与链接。
游戏规则、存档格式保持不变。旧站存档需先导出，再在新站导入；不同域名不共享浏览器本地存档。
