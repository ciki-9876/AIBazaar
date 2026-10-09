# 06 · 剧情与冒险内容

## 1. 内容与引擎分离

```
adventure-types.ts   ← 类型、旗标、版本号（改它要升版本，见 01）
graywick.ts          ← 第一幕：只有数据和两个小函数
bridgeport.ts        ← 第二幕：只有数据和两个小函数
magician-world.ts    ← 引擎：读数据、执行效果，不写任何剧情
```

写剧情的人**只改内容模块**。如果你发现写某段剧情必须改引擎，先停下来问：这是不是一个新的通用能力（比如「付钱后继续对话」的 `pay` 选项）？是，就把它做成引擎能力，再在内容里用；不要在引擎里写 `if (id === 'stan')`。

## 2. 一个内容模块包含什么

以 `bridgeport.ts` 为例：

| 导出 | 类型 | 作用 |
|---|---|---|
| `BRIDGEPORT_MAPS` | `Record<MapId, MapDefinition>` | 地图：尺寸、地面、热点 |
| `BRIDGEPORT_CAST` | `{ name, role }` | 角色名和一行身份描述 |
| `BRIDGEPORT_DIALOGUES` | `Record<string, Dialogue>` | 全部对话，按 id 索引 |
| `BRIDGEPORT_BATTLES` | `Record<BattleId, BattleDefinition>` | 全部对决 |
| `SHOWS` / `SHOP` / `GOSSIP` | — | 本幕系统的内容数据（见 07） |
| `bridgeportTalk(state, hotspotId)` | 函数 | **对话路由**：点了某个热点，根据当前状态返回哪段对话的 id |
| `bridgeportObjective(state)` | 函数 | **任务栏**：根据当前状态返回当前目标 |
| 进度辅助 | `morningDone`、`showsWon`、`isFinalist` | 让路由和门槛读起来像人话 |

## 3. 地图与热点

```ts
{ id: 'juno', x: 1620, label: '朱诺·贝尔', kind: 'npc', character: 'juno', when: (s) => !isFinalist(s) },
{ id: 'curios-door', x: 1880, label: '霍布斯旧货铺', kind: 'door', target: 'curios', spawn: 170 },
{ id: 'bridge-crate', x: 880, label: '桥头的旧木箱', kind: 'pickup', when: (s) => s.flags.hobbsAsked && !s.found.includes('pestle') },
```

| `kind` | 行为 |
|---|---|
| `door` | 有 `target` + `spawn` 时直接换地图，玩家出现在目标地图的 `spawn` 位置 |
| `npc` | 画出角色，交互走对话路由 |
| `pickup` | 拾取物，通常配 `when`，拾取后用 `find` 效果记录 |
| `board` | 告示板等物件，可以打开面板 |
| `bus` | 换幕的交通工具 |

规则：

- **人会动**：同一个角色可以在不同地图有不同热点，用 `when` 控制此刻在哪。例：艾达和比阿早场前在剧院，早场后在酒馆。
- 门是成对的：A 地图的门 `spawn` 要落在 B 地图的回程门旁边，回程门的 `spawn` 落回 A 的门口。
- `when` 只读状态，不能有副作用。
- 热点 x 之间至少 150 单位（见 04）。

## 4. 对话

### 4.1 格式

```ts
'stan-done': {
  lines: [
    { speaker: 'eli', text: '报纸。钥匙。剧院后台，左手第二个门。' },
    { speaker: 'stan', text: '……这是我这辈子收到过最好的礼物。别告诉我老婆。' },
    { speaker: 'narrator', text: '获得 15 演出费，以及传奇变种「♥4 · 下午四点」……' },
  ],
  effect: { set: ['stanDone'], reward: { fee: 15, variants: ['1-4:LH4'] }, once: 'stanDone' },
},
```

### 4.2 效果 `effect`（对话结束时执行）

| 字段 | 作用 |
|---|---|
| `set: FlagId[]` | 设置旗标 |
| `reward: Reward` | 发放演出费、道具、遗物、变种 |
| `once: FlagId` | 奖励只发一次：旗标已设就跳过奖励，然后设上。**所有奖励都要配 `once`**，否则反复对话可以刷钱 |
| `find: string` | 拾取一件物品（写进 `state.found`） |
| `complete: true` | 本幕结束，进入完结卡 |

### 4.3 选项 `choices`

最后一行之后出现选项。动作只有四种：

| 动作 | 作用 |
|---|---|
| `{ type: 'close' }` | 关闭对话 |
| `{ type: 'battle', battle }` | 进入对决 |
| `{ type: 'panel', panel }` | 打开面板：`shop` / `shows` / `dossier` |
| `{ type: 'pay', price, flag, then, poor }` | 付钱 → 设旗标 → 跳到 `then` 对话；钱不够跳到 `poor` 对话。原子操作 |

`bridgeport.ts` 顶部有现成的选项工厂：`close()`、`fight(battleId)`、`shop`、`dossier`、`shows`。**每组选项都要有一个 `close`**，玩家永远可以走开。

### 4.4 命名

对话 id 用 `角色-场合`：`stan-first`、`stan-waiting`、`stan-done`、`stan-after`。常用后缀：

| 后缀 | 何时 |
|---|---|
| `-first` | 第一次见面 |
| `-again` | 再次搭话，没有新进展 |
| `-waiting` | 玩家接了任务还没完成 |
| `-done` | 完成任务的那一刻（发奖励） |
| `-after` | 一切结束后的闲聊 |
| `-win` / `-loss` | 对决结果 |

### 4.5 对话路由

路由函数是剧情的「状态机」，每个 `case` 是一个热点，从**最晚的进度往前**判断：

```ts
case 'stan':
  if (!f.stanAsked) return 'stan-first';
  if (f.stanDone) return 'stan-after';
  return f.stanPaper && f.stanKey ? 'stan-done' : 'stan-waiting';
```

返回 `'panel:shows'` 这样的字符串可以直接打开面板；返回 `null` 表示没反应。

### 4.6 写对白

- 遵守 `docs/F9_THROW_VOICE_GUIDE_2026-10-09.md`：规则先说清楚，笑话后讲；一句一个笑点；不嘲笑玩家。
- 每行不超过 60 个汉字，手机上三行以内。
- 每段对话 2–5 行。超过 6 行就拆成两段，或删。
- 获得物品时，旁白用一句话**直说规则**：「获得传奇变种『♥4 · 下午四点』：甩出时净化自身 5 层剧毒和 5 层灼烧。」
- 角色声音表在文案指南第 3 节；新角色先在那里加一行，再写对白。

## 5. 对决

```ts
juno: {
  act: 2,
  title: '布里奇波特公开赛 · 决赛',
  opponent: 'juno',
  style: 'quick',                                   // AI 风格：决定思考节奏和出牌偏好
  items: ['quick', 'compass', 'tempo', 'needle', 'stride', 'draw', 'pair'],  // 不写就用预设
  relic: 'relay',
  book: { '0-11': 'LSJ', '0-14': 'gold', /* … */ '3-13': 'edge' },        // 敌人的牌匣
  reward: { fee: 40, items: ['stride', 'tempo', 'needle'], relics: ['relay'], variants: ['0-11:LSJ'] },
  winFlags: ['champion'],                           // 赢了设置（每次都设，幂等）
  win: 'juno-win', loss: 'juno-loss', draw: 'juno-draw',   // 结果对话 id
  tip: '朱诺单张连发、专削护盾……她怕两样：火，和攒满的大牌型。',   // 对决前的情报
},
// 其他可选字段：
//   terms: { deadlineMs: 64000 }          演出规矩，只约束玩家（见 07）
//   kit: { only: {...} } / { banFamilies: ['shield'] }   限制玩家的巡演箱
//   afterFlags: [...]                     无论输赢，结束后设置
```

规则：

- **首胜才发奖励**，记在 `state.won`；重打走 `-again` / 复赛对白。
- 输了不惩罚：不扣钱，不丢东西，可以立刻重打或去改装巡演箱。
- 强敌之前**一定要给情报**：`tip`、对手档案、或某个 NPC 的八卦。知道对手是谁 → 换道具，是核心乐趣。
- 剧情敌人如果玩家此时已经能拿到变种，敌人也要带同档次的牌匣，否则会一边倒。
- 每场对决都要跑剧情模拟确认难度（见 08）。

## 6. 任务栏

`*Objective(state)` 返回 `{ title, detail, target }`：

- `title` 直说目标：「赢下早场两场」。
- `detail` 可以开玩笑：「艾达在砌墙，比阿在泡茶。」
- `target` 是一个热点 id，地图上会标出方向。

任务栏必须**永远有下一步**。写完一幕，从头走一遍，确认每个状态下任务栏都指向一个可达的热点。

## 7. 门槛模式

| 模式 | 写法 | 例子 |
|---|---|---|
| 登记 | 某个对话设旗标，其他人检查它 | 多丽丝登记 → `metDoris` → 早场开放 |
| 计数 | 进度辅助函数 | `showsWon(s) >= 3` 才能开主厅 |
| 集齐 | 列表 + `found` | 霍布斯的三件旧物 |
| 全胜 | `GROUP.every(won)` | 小组赛四场全胜才有决赛 |
| 付费 | `pay` 选项 | 报刊亭的报纸 2 演出费 |

被门槛挡住时，**挡人的角色要说明原因**，而不是没反应。

## 8. 开新的一幕

1. **先写设计文档**：参照 `docs/F9_THROW_ACT2_BRIDGEPORT_2026-10-09.md` 的结构——流程图、门槛表、场景与人物出没表、系统、美术、难度。对齐故事大纲 `docs/F9_THROW_STORY_OUTLINE_30H_2026-10-09.md`。
2. **类型**（`adventure-types.ts`）：`ActId`、`MapId`、`CharacterId`、`FLAGS`、`BattleId` 加新值。**这是存档结构变化：升 `ADVENTURE_VERSION`，写迁移。**
3. **内容模块**：新建 `<town>.ts`，导出 MAPS / CAST / DIALOGUES / BATTLES / Talk / Objective。
4. **引擎接线**（`magician-world.ts`），目前按幕分支的位置：
   - `MAPS`、`CHARACTERS`、`DIALOGUES`、`BATTLES` 的合并；
   - `ACTS` 列表（章节跳转）；
   - `narratorFor(act)`；
   - `interactAdventure` 里的路由选择；
   - `adventureObjective`；
   - `travelOn` / 开幕函数（参照 `beginActTwo`）；
   - `restoreAdventure` 的幕号校验。
   - 建议开第三幕时顺手把这些分支改成按幕号查表的注册表，以后每加一幕只加一行。
5. **界面**（`magician-adventure.tsx`）：默认巡演箱（参照 `BRIDGEPORT_LOADOUT`）、完结卡、头像逻辑。
6. **美术**：场景（04）、角色（05）。
7. **测试**：参照 `bridgeport.test.mjs`——开幕状态、每个门槛、奖励只发一次、存档往返、**完整通关**（脚本化地走完整幕）。
8. **难度**：`story-sim.mjs` 跑每场对决。
9. **设计记录**：ADR + iteration + 更新 `03_CURRENT_DESIGN.md` + 更新大纲文档的「已实装」标记。
