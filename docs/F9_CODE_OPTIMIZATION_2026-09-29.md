# F9 代码优化与产品分离交付记录

完成日期：2026-09-29。对应 [2026-09-28 审计](F9_CODE_AUDIT_2026-09-28.md) 第 6 节的五项落地顺序。审计保留为历史记录；本文件记录实际实施结果，不改变玩法设计。

## 1. 验证入口

- `scripts/test.mjs` 自动发现 `app/`、`lib/`、`scripts/`、`packages/` 下的测试。修复旧入口只覆盖部分测试的问题，同时支持按产品运行。
- 根目录增加完整类型检查、模块边界检查；CI 对电梯和卡牌分别执行 lint、类型检查、测试、构建并保留独立发布包。
- lint 排除各应用生成目录。仅 Node 测试文件关闭 `no-floating-promises`：`node:test` 的顶层 `test()` 是测试注册，完成与失败由测试运行器管理；生产代码规则保持开启。
- 原工作区中的未提交内容保留；此次修改前的本地备份位于 `outputs/refactor-baseline-2026-09-28/`。未创建提交，也未发布线上版本。

## 2. 清理与归档

- 删除审计中的 63 个无消费者文件：57 个 UI 脚手架组件、1 个闲置 hook、5 个历史 CSS，共 11,691 个原始物理行。
- 卸载 8 个无消费者直接依赖：`@shadcn/react`、`cmdk`、`date-fns`、`embla-carousel-react`、`input-otp`、`react-day-picker`、`react-resizable-panels`、`recharts`。依赖树同步移除 72 个包。
- 5 个旧模型／图集原样归档至 `experiments/archive/art-assets/`，从 public 与发布目录移出，共 10,644,778 字节（约 10.64 MB）。这不是首屏下载减量或运行内存的测量值。
- 在用 UI 基础组件、模型 v4/v5、明确要求保留的扩容电梯代码继续保留。

## 3. 模块与样式边界

| 归属 | 实现位置 |
| --- | --- |
| 电梯入口、配置、独立发布输出 | `apps/elevator/` |
| 电梯页面与规则 | `app/survival/`、`lib/survival-*` |
| 卡牌入口、配置、独立发布输出 | `apps/cards/` |
| 卡牌页面与规则 | `app/arena/`、`app/wandeng/`、`lib/cards/` 及 arena/wandeng/card-framework 等模块 |
| 无玩法状态的渲染基础 | `packages/render-kit/` |
| 实验路由入口 | `apps/experiments/` |

入口包装文件复用唯一的实现，不复制两套业务代码。原 `demo-cards`、`demo-combat`、`demo-card-rules` 明确归入 `lib/cards/`；回放时间推进移入同一目录。Atelier、后处理与画面预设脱离美术路由；实际使用的卡牌三维场景归入 `app/arena/render/`。

`check:boundaries` 从各产品全部正式入口递归检查本地运行时与类型依赖，禁止跨产品导入、正式产品依赖实验代码、公共模块反向依赖游戏，并检查运行时循环依赖。当前电梯检查覆盖 70 个依赖文件，卡牌 60 个，均通过。新增边界反例测试防止检查器失效。

根 `globals.css` 只保留基础重置、通用变量与基础主题。电梯、万灯城、战术桌各自收敛为一个 `theme.css`，按游戏根容器限定作用域，关键帧命名隔离，并保持原有覆盖顺序。只移除完全重复的声明，不盲删响应式或状态覆盖。旧全局业务样式限定在实验容器，waterworks 历史外观移至实验目录。

这是业务依赖、样式作用域、验证入口和发布产物的隔离，仍共享工作区 lockfile、React/Three.js 等工具链以及中立基础模块。并非两个互不相关的仓库；修改共享基础设施仍需要同时回归两边。

## 4. 运行与职责优化

- 主电梯页不再每帧计算无人使用的 DOM 标签投影；使用标签的历史页面仍可按需开启。
- 已拾空的临时脑浆／手动丢弃散落物，从状态和场景对象映射中一起回收。实体箱柜、未取回的死亡背包、未拿完或背包满导致拿不走的物品继续保留。
- 临时掉落拥有独立的几何体／材质生命周期，回收时释放自己拥有的资源，不释放共享材质。场景重置同步清理怪物资源。
- 物品 UID、拾取反馈、背包与安全容器、存档键和确定性规则保持不变。测试覆盖 240 次连续拾取的身份守恒、满背包、部分拾取、死亡包保留，以及渲染对象只释放一次。
- 拆出 `use-opening-controller`、`use-opening-checkpoint`、`cache-layer`、`scene-markers`、`use-arena-playback`。装备基础规则单独提取，移除房间与转移模块之间的运行时循环。
- 检查点状态未变化时跳过重复序列化；写入失败不会误记为已保存，下次继续重试。

此轮解决明确的无用计算与长期增长路径，没有声称或测量具体 FPS 提升，也未引入对象池、GPU 实例化等额外改造。

## 5. 构建、预览与发布

- `npm run build:elevator` → `apps/elevator/dist/client`，首页与 `/survival`。
- `npm run build:cards` → `apps/cards/dist/client`，首页、万灯城、训练场及战术桌各形态。
- `npm run build:experiments` → `apps/experiments/dist/client`，保留旧 Demo、美术、设计工具及工作台内的产品交叉预览入口。正式产品包不包含这些实验路由。
- 每个应用只复制显式资产清单。实验工作台保留全部仍在 public 的资源，包括旧页面下载的说明文档。
- `npm run preview:elevator`、`preview:cards`、`preview:experiments` 直接预览静态发布包，默认端口 4175/4176/4177。命令末尾可追加数字端口。
- `npm run build:pages` 将两个正式包放入同一 Pages 站点的独立子路径，并生成旧游戏入口跳转。独立域名发布前需要重新执行对应的无前缀构建；发布脚本会拒绝把带 Pages 前缀的包误发至根域名。
- `scripts/static-build.mjs` 使用已安装版本的 Vite/vinext 构建 API，并等待 Node 正常退出，绕开 vinext beta CLI 在 Windows 上的原生句柄退出崩溃。每次清理的仅为校验过路径的生成目录；遇到失败、跳过的预渲染或缺失页面时构建失败。
- 发布前校验 HTML 本地链接与资源，补齐目录首页，移除无对应文件的可选预加载提示。

独立线上发布使用 `product-release.yml`，选择 elevator 或 cards。默认只生成 artifact；开启 publish 后才调用对应 Cloudflare Pages 项目。环境 `f9-elevator` / `f9-cards` 需要配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，及各自的 `F9_ELEVATOR_PAGES_PROJECT` / `F9_CARDS_PAGES_PROJECT`。这些是部署目标配置，本轮没有设置凭据或执行线上发布。原 GitHub Pages 仍是合并发布入口，独立产品发布不依赖该流程。

## 验证与剩余限制

- 全量测试 **286/286 通过**（原完整基线 281 项，新增 5 项）。包括新手流程、GM 检查点、物品操作、死亡回收、卡牌规则和回放等既有测试。
- 根 lint、根类型检查、两个产品各自 lint / 类型检查、边界检查均通过。
- 两个正式独立包、实验包、带 `/AIBazaar` 前缀的 Pages 包均构建通过。分别预渲染 3 / 8 / 35 个页面（含 404）。HTML 资源和链接校验通过。
- 对静态发布包进行了浏览器核验：电梯初始入口、暂停与 GM 面板、二层场景及引导；卡牌首页、训练场导航、战斗时间推进；三维战术桌模型与布阵界面。电梯和训练场未观察到控制台错误，战术桌无错误但仍有 Three.js 既有阴影弃用／环境贴图采样警告。
- 构建仍提示部分 Three.js 场景 chunk 较大，以及框架内部重复静态／动态导入；它们未阻断构建。本轮未升级渲染框架或改变资源品质。
- 浏览器验证是关键流程抽查，不等于所有关卡与全部交互的人工验收；长局性能仍需专门录制和测量。

日志保存在本地 `outputs/refactor-baseline-2026-09-28/`，不进入发布包。
