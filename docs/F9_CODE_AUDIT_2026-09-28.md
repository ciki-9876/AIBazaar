# F9 全项目代码盘点与解耦审计

日期：2026-09-28。对象：`D:\CodexGames` 当前工作区，分支 `codex/card-language`，包含现有未提交代码。

本轮为评估，未删除、搬迁或修改业务代码、依赖、存档及历史设计记录。本文件是工程审计，不构成新的玩法决策。

## 结论

**新版电梯与新版卡牌已经实现玩法规则和存档的分离，但没有实现工程、样式、构建与发布的完全隔离。**

项目的主要负担是历史原型仍作为可访问页面保留、未接入的 UI 脚手架、逐轮追加的样式覆盖，以及少数承担过多职责的页面。不能把所有带 `demo`、`art` 的文件一律删掉；当前产品仍使用其中一些规则和渲染基础设施。

- 静态扫描确认有 **63 个低风险清理候选文件，11,691 个物理行，304,925 字节**：57 个未接入 UI 组件、1 个只被闲置组件使用的 hook、5 个无引用历史样式。
- 另有 **2 个当前无入口的扩容电梯文件**，设计文档明确要求保留，不能当作垃圾代码删除。
- 5 个旧版本模型／图集共 **10,644,778 字节，约 10.64 MB**，没有发现当前程序加载路径，适合移出发布目录归档；需保留历史追溯材料。
- 最值得先优化的运行工作是主电梯页面的无消费者标签投影，以及拾取完的临时掉落记录持续积累。
- 当前没有自动阻止两个方向重新互相依赖的边界检查。

## 1. 范围与证据强度

扫描 `app/`、`lib/`、`components/`、`hooks/`、`scripts/` 及两个构建配置，覆盖 353 个代码、样式和脚本文件、107,152 个物理行，27 个页面入口、43 个测试文件。`public/` 有 71 个文件，共 94,319,321 字节，约 94.32 MB。

不将 `node_modules`、构建产物、忽略目录、文档行数算入代码体量。JSON 数据、资源清单和发布配置另行检查，不包含在上述 353 个文件中。扫描器识别到的 `lib/archetype-report.json` 是实际存在的数据依赖，不是缺失模块。

使用 TypeScript AST 追踪静态导入、再导出、字面量动态导入，并区分纯类型依赖；从框架入口、测试和脚本计算可达性。另做运行时依赖环、函数体完全重复、CSS 跨文件重复选择器、资源体积与哈希检查，人工核查当前玩法、旧原型与文档保留意图。

这是全目录依赖盘点和重点实现审查，**不是逐行形式验证，也不是浏览器性能实测**。无静态引用表示清理候选，不表示已经通过删除后的构建、交互或外部 URL 兼容验证。函数重复检测只覆盖规范化后完全相同的函数体，不能识别所有语义重复。

原始证据位于 `outputs/code-audit-2026-09-28/`：`audit.mjs`、`inventory.json`、`summary.json`、`css-layers.json` 与验证日志。该目录被 Git 忽略；本报告保存主要结果与清单。

## 2. 两个方向究竟解耦到哪一层

| 层次 | 结果 | 证据与含义 |
| --- | --- | --- |
| 新版业务规则 | 已分开 | 当前 `/survival` 与 `/wandeng`、`/arena` 的传递依赖中，没有互相导入对方玩法模块 |
| 内存状态／物品规则 | 已分开 | 电梯使用 `survival-*`；卡牌使用 `wandeng-*`、`arena-*` 及旧卡牌基础模块。10 格装备规则没有接入卡牌战斗状态 |
| 存档命名空间 | 已分开 | 三套独立键，见下表；电梯检查点不读取卡牌存档 |
| 公共页面与样式 | 未完全分开 | 共用根布局、`globals.css` 和同一个应用；全局元素样式能影响两边 |
| 旧原型依赖 | 未清理完成 | 卡牌仍依赖 `demo-cards`、`demo-combat`；电梯依赖 `app/art/showcase/kit.ts` |
| 构建／类型检查／依赖／发布 | 未分开 | 单一 package、锁文件、tsconfig、Vite 配置、Pages 流水线 |
| 防止回退的约束 | 缺少 | `@/*` 可访问整个仓库，没有禁止跨方向导入的自动检查 |

当前两个新版方向的运行时文件依赖交集只有 `lib/site-path.ts`、`app/layout.tsx`、`app/globals.css`。这里不计共同使用的第三方包，并把根布局与全局 CSS 视作隐式页面依赖。

**需要精确区分：电梯依赖的是美术实验目录中的通用渲染工具，不是新版卡牌业务。不能据此声称两套新版玩法仍共享战斗引擎。**

| 用途 | 键 | 位置 |
| --- | --- | --- |
| 电梯新手／探索检查点 | `f9-survival-opening-v4` | `lib/survival-checkpoint.ts:8` |
| 万灯城流程 | `f9-wandeng-run-v1` | `lib/wandeng-game.ts:7` |
| 竞技场归档 | `f9-arena-matches-v1` | `lib/arena-archive.ts:5` |
| 旧混合 Demo | `f9.elevator.demo1.local` | `lib/demo-engine.ts:46` |

这些键虽然独立，仍处于同站点浏览器存储及容量环境中，不等于不同应用／域名的物理隔离。不要为目录整理而随意改键或删除迁移。

### 具体耦合点

1. **首页仍是旧混合 Demo**：`app/page.tsx:1` 直接导出 `./demo/page`。根布局的默认标题、描述仍同时提及电梯与三路卡牌。产品入口尚未与新方向整理一致。
2. **全局样式仍带旧业务**：`app/layout.tsx:2` 加载 `app/globals.css`，其中有未限定作用域的 `button`、`svg`、标题等规则和大量旧游戏类名。它们不是纯重置样式。
3. **电梯依赖实验路由目录**：例如 `app/survival/scene.tsx:15`、`creatures.ts:6` 引用 `../art/showcase/kit`。Atelier 应提取为不属于页面的渲染基础模块，再决定哪些展示页归档。
4. **卡牌依赖旧命名基础模块**：`lib/wandeng-game.ts:1` 与 `lib/arena-engine.ts:1` 使用 `demo-cards`；`app/arena/arena-experience.tsx:43` 仍实际调用 `demo-combat` 的模拟函数。类型依赖之外也存在运行时依赖，不能直接删旧战斗代码。
5. **部署验证是整包运行**：`.github/workflows/pages.yml:26` 只有整包 lint 和 Pages build，没有分别针对两个方向的验证／发布任务。

## 3. 可删除、可归档与必须保留

### A. 低风险清理候选：63 个文件

| 类别 | 文件数 | 物理行 | 原因 |
| --- | ---: | ---: | --- |
| `components/ui` 未接入组件 | 57 | 7,325 | 当前路由、测试、脚本的依赖闭包不可达 |
| `hooks/use-mobile.ts` | 1 | 22 | 仅由闲置 sidebar 引用 |
| 历史 CSS | 5 | 4,344 | 当前页面与样式入口没有引用 |
| 合计 | 63 | 11,691 | 约占本轮扫描物理行的 10.9% |

目前仍被使用的 UI 基础组件为 `button.tsx`、`dialog.tsx`、`progress.tsx`，不在删除清单中。5 个历史 CSS 是 `app/design/design.css`、`detail.css`、`v03.css`、`v04.css` 及 `app/heroes/heroes.css`。当前 design 页面使用 `current.css`；heroes 页面转向 lab。

这部分删除主要降低维护和工具上下文负担。未引用代码可能本来就不进入页面包，因此不能把删除 11,691 行直接换算成加载速度或 FPS 提升。

### B. 旧资源：优先移出发布目录归档

| 文件 | 字节 |
| --- | ---: |
| `public/art-assets/battle-slice/equipment-library.glb` | 2,169,984 |
| `public/art-assets/battle-slice/equipment-library-v2.glb` | 1,251,448 |
| `public/art-assets/battle-slice/equipment-library-v3.glb` | 1,235,932 |
| `public/art-assets/wandeng/intro-atlas.png` | 3,583,207 |
| `public/art-assets/wandeng/items-atlas.png` | 2,404,207 |

当前模型加载处选择 v4／v5，万灯城使用 `pixel/` 下的新版图集。上述 5 项没有发现现行程序消费者，但可能仍承担历史直接链接、比较样本的作用，适合归档而非无备份销毁。

大于 10 KB 的 public 文件未发现 SHA-256 完全重复项。这是版本留存问题，不是找到一批字节相同的重复文件。约 94.32 MB 是全部 public 资源大小，不是电梯首次进入就会下载的大小。

恶魔 v3 仍被 `app/survival/design-system.tsx:82` 和资源清单使用，实际终端使用 v4；应统一样板与正式版本之后再考虑归档 v3，不能现在将其列为无引用文件。

### C. 有意保留／仍被使用，不能直接删

- `app/survival/elevator-expanded.ts` 与 `lib/survival-lift-expanded.ts`：431 行。ADR-0010「现实尺度的初始电梯与出门运镜」明确将旧 6.9×6.8 米营地保留为未来扩容候选。可标记或迁入实验区。
- `app/demo`、`app/design`、`app/lab`、`app/legacy`、各 `app/art` 页面：仍有路由入口，不是死代码。是否保留在线访问属于产品入口取舍。
- `demo-cards`、`demo-combat`、`demo-card-rules`：当前卡牌传递依赖，需先明确归属、提取接口，再退休旧原型。
- `lib/card-framework/`：独立的结构化卡牌内核，有测试和演示脚本；文档明确旧万灯城卡池尚未迁移，属于正在推进的新内核，不能按“未接到游戏页”删除。
- 存档校验／迁移、确定性回放测试、物品 UID 和原子操作校验：有兼容和行为价值，不属于冗余防御代码。

## 4. 依赖包整理

移除闲置 UI 后，以下 8 个直接依赖可进入卸载验证清单：`@shadcn/react`、`cmdk`、`date-fns`、`embla-carousel-react`、`input-otp`、`react-day-picker`、`react-resizable-panels`、`recharts`。

理由是当前程序可达模块不使用它们，现有源码消费者主要在闲置 UI。实际卸载应同时验证锁文件、peer dependency、CSS 入口及完整构建，而不是只搜索包名。

特别保留判断：`vinext` 是实际框架／CLI；`react-server-dom-webpack` 是其 RSC 配套依赖，即使业务代码没有直接 import 也不能据此删；`shadcn` 的 Tailwind CSS 被全局样式引用；`@base-ui/react` 及样式辅助包仍支持正在使用的 UI 组件。构建开发依赖也不采用“页面未 import 就删除”的判断。

## 5. 优化优先级

### P1：优先处理明确多余的运行工作和增长点

**主电梯页的悬浮标签投影无人消费。** `app/survival/opening-demo.tsx:406` 的 markers 回调是空函数，但 `scene.tsx:879` 起仍每帧遍历所有缓存点、做可见性判断、创建向量并投影。旧 waterworks 页面确实使用这些标签。建议将投影能力设为可选，只为存在消费者的页面计算；不要全局删除旧场景仍使用的标签系统。

**捡完的临时掉落持续积累。** `lib/survival-room.ts:769` 每次击杀新增脑浆 cache；`:649` 拾取仅清空内容并标为 opened，没有删除临时散落物记录。`:897` 每模拟步复制全部 caches，场景也遍历并保留相应对象映射。长时间留在同一房间会随累计击杀增加工作量，怪物同时存在上限不能限制这部分增长。建议在保留拾取事件／稳定身份记录的前提下，移除已经拿空的临时散落物，并释放对应渲染对象；实体箱柜及未取回的死亡背包继续保留。此处是代码可证实的增长路径，尚未测量长局帧耗时。

### P1：修补验证入口

- `package.json:14` 只匹配 `lib/*.test.mjs`，漏掉 `app/art/playback.test.mjs` 和 `app/art/base/base-state.test.mjs`，合计 7 项测试。
- Pages 流水线没有显式运行 `npm test` 或 TypeScript 检查。当前 lint 脚本也不扫描 `components/`、`hooks/`。
- 补齐测试发现和 CI，再做清理／移动目录，比一次性大规模重写稳妥。

### P2：样式收敛与作用域

电梯主页面连续加载 7 份 CSS，源文件共 109,983 字节；万灯城加载 6 份，共 107,086 字节。相同选择器出现在多份文件中的数量分别为 19、131。

这些重复包括有意的响应式和主题覆盖，并不全是可删除规则。但也说明当前外观依赖加载顺序。建议按组件和状态整理当前生效样式，保留实际主题变体；旧风格迁到实验页面。根 `globals.css` 仅保留必要 reset、字体和跨应用基础变量，游戏具体样式限定在各自根容器或 CSS Modules。

### P2：拆职责，不以行数为目的重写

| 文件／函数 | 当前体量 | 建议 |
| --- | ---: | --- |
| `app/demo/page.tsx` | 3,170 行 | 旧产品先定是否归档；不优先花时间美化将退休的原型 |
| `lib/demo-engine.ts` | 2,968 行 | 先分离当前卡牌仍需要的能力，再处理旧综合规则 |
| `app/survival/scene.tsx` 的场景组件 | 931 行 | 分离场景生命周期、镜头、拾取物、怪物、标记和输入控制 |
| `app/survival/opening-demo.tsx` 的主组件 | 857 行 | 分离模拟时钟、暂停／焦点、存档、对话、终端协调 |
| `app/arena/arena-experience.tsx` 的主组件 | 1,025 行 | 分离编辑器、回放、挑战与存档协调 |

检测到一处实际运行时依赖环：`survival-room.ts → survival-transfer.ts → survival-room.ts`。后者只需要 fits、isEquipment 等基础规则及类型，适合把类型、装备摆放规则提到基础模块，让引擎单向调用转移操作。目前测试通过，不把此环描述为已发生的运行错误。

### P3：测量之后再做的性能优化

- 游戏以 30 Hz 固定步更新，主 React 状态随逻辑步提交；可拆 UI 订阅，避免静态面板跟随世界 tick 全量参与更新。不要降低模拟频率或引入非确定性时间。
- 迷雾每 3 tick／跨格时重算，分配 96×80 数组，并对视野内格子检查障碍。可预索引遮挡物、缓存障碍 footprint，使用可序列化边界明确的紧凑数据；不能直接跳过静止帧而忽略视野装备和遮挡变化。
- 2.5 秒一次完整检查点 JSON 序列化，在掉落记录增多时成本会增长；先处理无效记录，再评估脏标记或检查点压缩。
- 渲染循环中的临时向量、重复查找子对象可缓存。是否值得进一步分批绘制、降阴影和后处理，应由目标设备 GPU／CPU 数据决定。

现有有益优化需要保留：固定步＋显示插值、按世界缓存行走掩码、最多 16 个目标的寻路场缓存、怪物模板复用、单怪受击材质隔离及销毁、静态几何合并、场景卸载时资源释放。这不是一份要求推倒重写渲染器的审计。

## 6. 推荐的解耦目标与落地顺序

“绝对解耦”建议落成可验收标准，而不是把所有公共代码复制两份：

1. 电梯业务不能导入卡牌业务，卡牌业务也不能导入电梯业务；自动检查正反两个方向。
2. 公共模块只包含无玩法状态的渲染／平台能力，不反向依赖任一游戏。
3. 各自拥有规则、类型、数据、资源、样式、存档版本和测试；存档键维持兼容。
4. 任一方向修改／构建失败不应阻止另一方向独立测试、构建和发布。
5. 旧实验有明确入口清单与归档位置，不默认混进正式产品发布。

建议先在现仓库建立清晰模块归属、样式隔离和边界检查，再拆为两个应用。若要求构建和发布也完全独立，可以保留一个仓库，结构如下：

```text
apps/elevator/          电梯应用、规则、UI、场景、专属资源
apps/cards/             卡牌应用、规则、UI、专属资源
packages/render-kit/   无玩法依赖的美术基础能力
packages/platform/     少量无业务状态的公共能力
experiments/           原型与美术对照，独立构建或离线保留
```

共享基础包仍需版本或兼容约束。若要求连共享包更新都不能影响另一产品，则需要固定各应用依赖版本，发布也分别进行；仅改目录名做不到。

推荐实施顺序：

1. 补测试／类型检查入口，建立现有页面、存档和回放回归基线。
2. 清理 63 个静态无消费者文件，验证后卸载相应闲置依赖；旧资源移出发布目录。
3. 提取 Atelier，明确旧卡牌核心的归属；隔离全局样式，增加禁止交叉依赖检查。
4. 修掉空标签投影、临时掉落积累，分离场景与新手流程职责。
5. 按正式入口清单拆独立构建／发布，将旧混合 Demo 与美术实验转入实验产品。

## 7. 本轮验证与限制

| 检查 | 结果 |
| --- | --- |
| `npm test` | 274／274 通过 |
| 补跑两个 art 测试文件 | 7／7 通过 |
| `npm run lint` | 通过；范围按现有脚本 |
| `npx tsc --noEmit --incremental false` | 通过 |
| 额外启用 noUnusedLocals／noUnusedParameters | 4 项未使用声明诊断，不是现有编译配置失败 |

4 项额外诊断为 `app/art/base/base-scene.tsx:344` 的 pad 参数、`components/ui/scroll-area.tsx:3` 的 React 导入、`lib/card-framework/runtime.ts:152` 与 `:153` 的 s／c 参数。它们规模很小，并非主要维护负担；可以去除或用明确的未使用参数约定处理。

本轮没有修改路由、配置或运行代码，因此未重打生产包，也没有在浏览器中测量帧时间或逐页视觉验收。后续真正删除和迁移时仍需完整构建，并验证：新手流程、背包原子移动、死亡掉落与取回、旧存档读取、卡牌确定性对局和回放。

## 附录 A：静态无消费者的 63 个清理候选

以下清单由本轮依赖扫描生成；已经剔除明确保留的 2 个扩容电梯原型。

| 文件 | 物理行 |
| --- | ---: |
| `app/design/design.css` | 773 |
| `app/design/detail.css` | 2109 |
| `app/design/v03.css` | 631 |
| `app/design/v04.css` | 532 |
| `app/heroes/heroes.css` | 299 |
| `components/ui/accordion.tsx` | 79 |
| `components/ui/alert-dialog.tsx` | 188 |
| `components/ui/alert.tsx` | 77 |
| `components/ui/aspect-ratio.tsx` | 23 |
| `components/ui/attachment.tsx` | 208 |
| `components/ui/avatar.tsx` | 110 |
| `components/ui/badge.tsx` | 53 |
| `components/ui/breadcrumb.tsx` | 123 |
| `components/ui/bubble.tsx` | 129 |
| `components/ui/button-group.tsx` | 88 |
| `components/ui/calendar.tsx` | 232 |
| `components/ui/card.tsx` | 104 |
| `components/ui/carousel.tsx` | 243 |
| `components/ui/chart.tsx` | 374 |
| `components/ui/checkbox.tsx` | 29 |
| `components/ui/collapsible.tsx` | 22 |
| `components/ui/combobox.tsx` | 301 |
| `components/ui/command.tsx` | 194 |
| `components/ui/context-menu.tsx` | 273 |
| `components/ui/direction.tsx` | 7 |
| `components/ui/drawer.tsx` | 229 |
| `components/ui/dropdown-menu.tsx` | 273 |
| `components/ui/empty.tsx` | 105 |
| `components/ui/field.tsx` | 239 |
| `components/ui/hover-card.tsx` | 52 |
| `components/ui/input-group.tsx` | 159 |
| `components/ui/input-otp.tsx` | 87 |
| `components/ui/input.tsx` | 21 |
| `components/ui/item.tsx` | 202 |
| `components/ui/kbd.tsx` | 27 |
| `components/ui/label.tsx` | 21 |
| `components/ui/marker.tsx` | 72 |
| `components/ui/menubar.tsx` | 285 |
| `components/ui/message-scroller.tsx` | 131 |
| `components/ui/message.tsx` | 93 |
| `components/ui/native-select.tsx` | 66 |
| `components/ui/navigation-menu.tsx` | 172 |
| `components/ui/pagination.tsx` | 134 |
| `components/ui/popover.tsx` | 91 |
| `components/ui/radio-group.tsx` | 39 |
| `components/ui/resizable.tsx` | 51 |
| `components/ui/scroll-area.tsx` | 56 |
| `components/ui/select.tsx` | 203 |
| `components/ui/separator.tsx` | 26 |
| `components/ui/sheet.tsx` | 138 |
| `components/ui/sidebar.tsx` | 727 |
| `components/ui/skeleton.tsx` | 14 |
| `components/ui/slider.tsx` | 53 |
| `components/ui/spinner.tsx` | 17 |
| `components/ui/switch.tsx` | 33 |
| `components/ui/table.tsx` | 117 |
| `components/ui/tabs.tsx` | 83 |
| `components/ui/textarea.tsx` | 19 |
| `components/ui/toast.tsx` | 230 |
| `components/ui/toggle-group.tsx` | 90 |
| `components/ui/toggle.tsx` | 46 |
| `components/ui/tooltip.tsx` | 67 |
| `hooks/use-mobile.ts` | 22 |

## 附录 B：当前页面入口

页面入口存在只说明框架可访问，不代表已确定要继续保留为正式产品。

| 路径 | 文件 |
| --- | --- |
| `/arena/2d` | `app/arena/2d/page.tsx` |
| `/arena/2d/sticker` | `app/arena/2d/sticker/page.tsx` |
| `/arena/2d/storybook` | `app/arena/2d/storybook/page.tsx` |
| `/arena` | `app/arena/page.tsx` |
| `/art/base` | `app/art/base/page.tsx` |
| `/art/base/refined` | `app/art/base/refined/page.tsx` |
| `/art/cards` | `app/art/cards/page.tsx` |
| `/art/chamber` | `app/art/chamber/page.tsx` |
| `/art/direction` | `app/art/direction/page.tsx` |
| `/art/maintenance` | `app/art/maintenance/page.tsx` |
| `/art` | `app/art/page.tsx` |
| `/art/pavilion` | `app/art/pavilion/page.tsx` |
| `/art/rooms` | `app/art/rooms/page.tsx` |
| `/art/showcase` | `app/art/showcase/page.tsx` |
| `/art/slice` | `app/art/slice/page.tsx` |
| `/art/styles` | `app/art/styles/page.tsx` |
| `/demo` | `app/demo/page.tsx` |
| `/design` | `app/design/page.tsx` |
| `/design/[module]` | `app/design/[module]/page.tsx` |
| `/heroes` | `app/heroes/page.tsx` |
| `/lab` | `app/lab/page.tsx` |
| `/legacy` | `app/legacy/page.tsx` |
| `/` | `app/page.tsx` |
| `/survival` | `app/survival/page.tsx` |
| `/survival/waterworks` | `app/survival/waterworks/page.tsx` |
| `/wandeng` | `app/wandeng/page.tsx` |
| `/wandeng/training` | `app/wandeng/training/page.tsx` |
