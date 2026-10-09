# 01 · 架构与确定性

## 1. 三层结构

```
┌──────────────────────────────────────────────┐
│ 表现层  src/app/**        React、SVG、CSS、音效  │  可以用时钟、帧率、动画、浏览器存储
├──────────────────────────────────────────────┤
│ 冒险层  src/lib/adventure  内容数据 + 引擎     │  纯函数，确定性
├──────────────────────────────────────────────┤
│ 规则层  src/lib/cards      对决状态机          │  纯函数，确定性
└──────────────────────────────────────────────┘
```

依赖只能**向下**：表现层可以 import 冒险层和规则层；冒险层可以 import 规则层的类型和数据；规则层什么都不 import（只有本项目的 `src/packages/core/random.ts`）。

判断一段代码放哪一层，问一个问题：**「这件事会不会影响谁赢、谁拿到什么、存档里写什么？」** 会，就放规则层或冒险层；不会（看起来怎样、动得怎样、听起来怎样），就放表现层。

| 例子 | 层 |
|---|---|
| 落幕伤害每秒加 1 | 规则层 `throw-duel.ts` |
| 落幕时舞台幕布往下降 | 表现层 `throw-table.tsx` + `throw.css` |
| 赢了艾达得 10 演出费 | 冒险层 `bridgeport.ts`（数据）+ `magician-world.ts`（发放） |
| 演出费数字跳动动画 | 表现层 |
| 第一章教学的提示气泡 | 表现层 `throw-coach.tsx`（只看规则状态，不改规则） |

## 2. 规则层：对决状态机

核心类型 `ThrowDuel`（`throw-duel.ts`）。所有改变状态的入口：

| 函数 | 作用 |
|---|---|
| `createThrowDuel(seed, items, enemyStyle, relic, enemyRelic, layout?, books?, options?)` | 创建一局。`books = { player, enemy }` 是牌匣；`options = { enemyItems, terms }` |
| `previewThrow(...)` | 纯计算：这手牌甩出去会发生什么。UI 的伤害预览和 AI 决策都用它 |
| `launchThrow(state, side, uids)` | 出牌。违规（不连续、违反演出规矩、冷却中）就**原样返回**，不产生任何副作用 |
| `reorderThrow` / `arrangeThrow` | 整理手牌（遵守理牌冷却） |
| `stepThrowDuel(state)` | 推进 1 tick（50 ms）：抽牌、持续伤害、落幕、AI、结算 |
| `*InPlace` 变体 | 模拟与 AI 使用的可变版本，避免大量拷贝；UI 只用不可变版本 |

**时间**：规则层只认 tick。浏览器端由 `throw-table.tsx` 用 `requestAnimationFrame` 累计真实时间，每满 50 ms 派发一次 `tick`。页面隐藏时不累计——所以切走标签页不会「被偷时间」。

**事件**：规则层把发生的事写进 `state.events`（伤害、护盾、治疗、状态、抽牌、结束原因……），表现层读事件来播放飘字、动画和音效。**表现层永远不自己推算结果**，只播事件。

**结束**：`finish()` 用 `end(winner, reason)` 统一出口，判定顺序是：击倒 → 演出规矩（血线、时限）→ 120 秒总时限。`endReason` 可能是 `knockout | time | deadline | floor`，双方同时倒下算平局。

## 3. 随机数

- 唯一的随机源是 `randomStream(seed, name)`（`src/packages/core/random.ts`，是仓库共享 core 的项目内副本）。
- 每个随机用途一条**具名流**。现有流：`throw-duel/{side}/deck/{cycle}`——每一方、每一轮整副牌一条。
- **不要改现有流的名字或消耗顺序**，否则所有已存的回放和测试基线都会变。新机制需要随机，就开一条新名字的流，例如 `throw-duel/{side}/encore/{n}`。
- 冒险层的随机只来自 `state.seed`；每场战斗的种子由冒险种子和 `nextBattleId` 派生。

## 4. 版本号

| 常量 | 当前值 | 什么时候升 |
|---|---|---|
| `RULES_VERSION`（`throw-duel.ts`） | `throw-duel-v6` | 同样的种子和输入会得出**不同结果**时：改数值、改结算顺序、加新机制 |
| `ADVENTURE_VERSION`（`adventure-types.ts`） | `magician-adventure-v4` | 存档**结构**变化时：新增/删除旗标、新增状态字段、改字段含义 |

升版本时同时：

1. 写一条 ADR（为什么升、和上一版的区别）。
2. 在 `03_CURRENT_DESIGN.md` 更新「当前版本」。
3. 冒险版本升级要写**存档迁移**（见下），并为迁移写测试。
4. 不要重新生成 `tests/fixtures/replays-v1.json` 来让测试通过——那是兼容性证据。

纯表现改动（换颜色、改动画、改文案的俏皮话 `quip`）**不升版本**。改规则文字 `text` 但数值不变，也不升。

## 5. 存档

- 存储键：`aibazaar.throw.adventure`（`SAVE_KEY`），每个产品一个，不要复用别的产品的键。
- 信封：`{ product: 'throw-adventure', version, state, loadout }`。`loadout` 是玩家上次的巡演箱布局，属于表现偏好。
- `restoreAdventure(json)` **先验后用**：产品名不对、版本不对、任何字段越界（地图不存在、旗标数量不符、拥有的道具 id 不存在……）都返回 `null`，界面退回新游戏。
- 注意：旗标列表的**长度**也会校验。新增旗标 = 存档结构变化 = 升冒险版本 + 写迁移函数（把旧存档补上新旗标的默认值）。迁移只接受明确支持的旧版本，其余拒绝。
- 写存档只在表现层（`magician-adventure.tsx` 的 effect 里），规则层不碰 `localStorage`。

v4 支持从 v3 迁移：旧「三息理线盒」的 `order` 遗物引用移为 `null`，恢复后的玩家仍能使用默认整理机制。v3 原来隐式解锁的道具转入拥有列表，保留玩家已取得的历史物品；新建冒险按单张入门的顺序开放道具。对手档案与返场坐标必须完整校验，不能把外部 JSON 的嵌套字段直接当作可信状态。

## 6. 产品边界

- `npm run check:boundaries` 会扫描 import：本项目不能引用 `apps/elevator`、`apps/resonance`、`apps/elevator-ai`，类型也不行。
- 想复用别的产品的东西？先问：它是不是中性的基础设施？是，就提到 `packages/`；不是，就在本项目里重写一份适合自己的。

## 7. 运行时的几个固定参数

| 参数 | 值 | 位置 |
|---|---|---|
| 对决 tick | 50 ms | `TICK_MS` |
| 冒险行走 tick | 20 ms，每 tick 5 世界单位 | `WALK_TICK_MS`、`WALK_DISTANCE` |
| 最大生命 / 护盾 / 力量 | 320 / 160 / 30 | `MAX_HP` / `MAX_SHIELD` / `MAX_POWER` |
| 手牌上限 | 10（遗物可改） | `handLimit(relic)` |
| 基础抽牌间隔 | 开场 3 秒；超过 30 秒 2 秒；60 秒起 1.5 秒 | `drawInterval`、`battlePhase` |
| 白热开始 | 超过 30 秒，即 tick 601（30.05 秒） | `HEATED_MS`、`battlePhase` |
| 落幕开始 | 60 秒，每秒伤害 +1 | `CURTAIN_MS`、`CURTAIN_RAMP` |
| 默认整理冷却 | 20 秒，不需要遗物 | `REORDER_MS`、`arrangeThrow`、`reorderThrow` |
| 总时限 | 120 秒 | `finish()` |
| 巡演箱 | 10 格 | `BAG_CELLS` |
