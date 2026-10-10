# 《最后一张王牌》内容开发手册

> 适用项目：`apps/throw`（甩牌对决 + 魔术师冒险）
> 适用版本：对决规则 `throw-duel-v7` · 冒险 `magician-adventure-v4`

当前修订见 [ADR-0052](../design-log/decisions/ADR-0052-throw-v6-vector-stage-and-tempo.md)：白热／落幕加快补牌、三张组合、默认 20 秒整理、单张入门，以及舞台／任务／对白反馈。旧剪纸与像素版已 [本机归档](../art/archives/README.md)，正式美术统一采用 SVG + CSS。v5 的历史平衡数据不能直接当作 v6 已验证结果。
> 维护方式：规范变化时直接改这里；**设计取舍**写进 `docs/design-log/`，这里只链接，不复述。

这份手册写给第一次接手《最后一张王牌》的人：策划、程序、美术、文案都适用。读完前两页就能跑起项目、看懂代码分层；之后按要做的事挑章节读。每一章都以「规则 → 做法 → 例子 → 检查清单」组织，例子取自现有代码，可以直接照抄改。

## 30 分钟上手

```bash
# Node.js ≥ 22.13
npm ci
npm run dev:throw:cards          # 本地开发：首页是冒险，/wandeng/throw 是对决练习场
npm run test:throw:cards         # 本项目全部测试（规则、冒险、美术约束）
```

然后按顺序做三件事：

1. **玩一遍**：第一幕（格雷维克）+ 第二幕（布里奇波特）。打开地图可以直接跳到第二幕。
2. **读四份设计文档**：`docs/design-log/00_START_HERE.md`、`01_DESIGN_DNA.md`、`03_CURRENT_DESIGN.md`，以及 `docs/F9_THROW_VOICE_GUIDE_2026-10-09.md`（文案风格）。
3. **读本手册的 01 架构**，再按任务挑章节。

## 目录

| 章节 | 什么时候读 |
|---|---|
| [01 架构与确定性](01-architecture.md) | 必读。代码分层、版本号、随机数、存档 |
| [02 规则功能开发](02-rules-and-features.md) | 改对决规则、加新机制、加「演出规矩」这类约束 |
| [03 卡牌、道具与变种](03-cards-items-variants.md) | 设计道具、遗物、预设卡组、牌的变种 |
| [04 美术与场景](04-art-scenes.md) | 画场景、画图标、做 UI 视觉、动效 |
| [05 角色与动画](05-characters-animation.md) | 加角色、改造型、调动作 |
| [06 剧情与冒险内容](06-story-and-adventure.md) | 写对话、搭地图、编排剧情、开新一幕 |
| [07 养成与经济系统](07-systems.md) | 演出费、商店、街头演出、对手档案、存档字段 |
| [08 平衡与模拟](08-balance-and-simulation.md) | 任何数值改动之前和之后 |
| [09 测试、提交与发布](09-testing-and-release.md) | 每次提交 PR 之前 |
| [10 检查清单](10-checklists.md) | 打印出来贴墙上 |

## 七条铁律

这七条是整个项目的地基，违反任何一条的改动都不会被合并。

1. **规则确定性**。对决和冒险规则里没有 `Date.now()`、没有 `Math.random()`、没有浮动帧率。种子和 tick 由外部显式传入。同一种子 + 同一输入 = 同一结果，回放和存档都靠这一点。
2. **原子操作**。失败的动作不能留下半截状态：买不起就什么都不扣，出牌违规就整手退回，布局放不下就不动。
3. **文字即规则**。道具、遗物、变种的 `text` 字段逐字对应代码效果；数值改了，文字同一次提交里改。俏皮话写在 `quip`，不要混进规则文字。
4. **稳定身份**。道具 id、角色 id、旗标名、战斗 id、变种 id 一旦发布就不改名。要废弃就新增，再做存档迁移。
5. **全部矢量，零位图**。美术是代码画的（SVG + CSS），仓库里不允许出现 png/jpg/webp/gif——测试会扫描。
6. **产品隔离**。`apps/throw` 不 import 电梯、共鸣、电梯 AI 的任何东西（类型也不行）；共享模块只能放 `packages/`。
7. **设计记录与实现分开**。设计决定写 ADR，迭代过程写 iteration，现状写 `03_CURRENT_DESIGN.md`；历史决定不改写，只能用新记录取代并链接。

## 术语表

| 术语 | 含义 | 代码位置 |
|---|---|---|
| 甩牌 / 出手 | 从手牌选一组连续的牌甩出，按扑克牌型结算 | `throw-duel.ts` `launchThrow` |
| tick | 对决的时间单位，1 tick = 50 ms | `TICK_MS` |
| 巡演箱（trunk / bag） | 10 格的道具栏，道具有尺寸，相邻会互相增幅 | `throw-loadout.ts` `BAG_CELLS` |
| 道具 / 遗物 | 道具占格子、按出牌触发；遗物每人一件、改变全局规则 | `ITEMS` / `RELICS` |
| 预设（preset / style） | 六套竞技卡组：快甩、护灯、余烬、回甘、青苔、星光 | `PRESETS` / `COMPETITIVE_STYLES` |
| 克制环 | 四种状态之间的机制克制：闷火、净化、焦灼、毒发…… | `03-cards-items-variants.md` |
| 白热（heated） | 超过第 30 秒，基础补牌变为每 2 秒一次 | `HEATED_MS`、`battlePhase` |
| 落幕（curtain） | 第 60 秒起双方每秒受递增伤害；基础补牌每 1.5 秒一次 | `CURTAIN_MS`、`battlePhase` |
| 变种（variant / enchant） | 同一张扑克牌的附魔版本，分稀有/史诗/传奇 | `throw-enchant.ts` |
| 牌匣（deck book） | 「哪个牌位装哪个变种」的映射 | `DeckBook` |
| 演出规矩（terms） | 只约束玩家的出牌规则，用于街头演出 | `DuelTerms` |
| 内容模块 | 每一幕的数据文件：地图、角色、对话、战斗 | `graywick.ts`、`bridgeport.ts` |
| 热点（hotspot） | 地图上可交互的点：门、NPC、拾取物、告示板、巴士 | `Hotspot` |
| 旗标（flag） | 剧情进度布尔值 | `FLAGS` |
| 演出费（fee） | 第二幕货币，只能靠赢得 | `AdventureState.fee` |

## 文件地图

```
apps/throw/
├─ src/lib/cards/          规则层（纯函数，确定性，可在 Node 里直接跑）
│  ├─ throw-duel.ts        对决状态机：创建、预览、出牌、每 tick 推进、结算
│  ├─ throw-loadout.ts     道具、遗物、预设卡组、巡演箱布局
│  ├─ throw-enchant.ts     牌的变种与牌匣
│  └─ throw-poker.ts       扑克牌型判定与点数
├─ src/lib/adventure/      冒险层（纯数据 + 引擎）
│  ├─ adventure-types.ts   所有内容类型、旗标、版本号
│  ├─ graywick.ts          第一幕内容
│  ├─ bridgeport.ts        第二幕内容
│  └─ magician-world.ts    引擎：行走、交互、对话、战斗衔接、商店、存档
├─ src/app/stage/          美术层（矢量）
│  ├─ palette.ts           唯一色板
│  ├─ scene-kit.tsx        场景积木：灯、窗、幕布、长椅、光束……
│  ├─ sets.tsx / sets-bridgeport.tsx   每张地图的场景
│  ├─ rig.tsx              骨骼角色与造型
│  ├─ glyphs.tsx           道具/遗物图标
│  ├─ card-art.tsx         牌面
│  └─ ticker.ts            唯一的帧循环
├─ src/app/adventure/      冒险界面（React）
├─ src/app/wandeng/throw/  对决界面（React）
└─ tools/                  平衡与剧情模拟脚本（见 08）
```

## 求助顺序

1. 本手册 → 2. `docs/design-log/03_CURRENT_DESIGN.md` → 3. 相关 ADR（`docs/design-log/decisions/ADR-0035`～`0051` 与本项目有关）→ 4. 代码里的 JSDoc 注释（每个导出的类型都写了「为什么」）。
