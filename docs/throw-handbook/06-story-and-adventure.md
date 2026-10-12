# 06 · 剧情与冒险内容

2026-10-12 当前规则：对决 v16 / 冒险 v10。第四幕、26件本体字段改装、金级同款材料且不限数量、自动出牌、三人独立配置见[ADR-0064](../design-log/decisions/ADR-0064-throw-millbrook-upgrades-and-autoplay.md)、[第四幕内容](../F9_THROW_MILLBROOK_2026-10-12.md)与[实测记录](../design-log/iterations/F9/2026-10-12-throw-millbrook-upgrades-and-autoplay.md)。下文此前版本的机制及证据有冲突时按本修订为准；历史结果不重写。


## 1. 内容与引擎分离

```
adventure-types.ts   ← 类型、旗标、版本号（改它要升版本，见 01）
graywick.ts          ← 第一幕：只有数据和两个小函数
bridgeport.ts        ← 第二幕：只有数据和两个小函数
westport.ts          ← 第三幕：职业联赛、泄密分支、诺拉系列赛和港口支线
millbrook.ts         ← 第四幕：三人联赛、斯坦过去与四条镇志支线
lodgings.ts          ← 各城市住所、巴士、伙伴室内热点
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
| `bus` | 首次通关用于换幕；第三幕后回访旧城市时进入真实巴士，不重演旧章节结算 |

规则：

- **人会动**：同一个角色可以在不同地图有不同热点，用 `when` 控制此刻在哪。例：艾达和比阿早场前在剧院，早场后在酒馆。
- 门是成对的：A 地图的门 `spawn` 要落在 B 地图的回程门旁边，回程门的 `spawn` 落回 A 的门口。
- `when` 只读状态，不能有副作用。
- 热点 x 之间至少 150 单位（见 04）。

- 普通热点名称只在交互范围内出现；任务图标由当前目标计算，常驻到目标完成。新任务必须同时给出本地图的目标热点或通往目标的可达出口，不能只更新文字任务栏。
- 主线标记金色、支线蓝色，两者统一用卷轴图标。目标必须从实际剧情状态推导，离开目标地图时标向可达出口，不在错误房间标出一个不可交互的人。

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

最后一行之后出现选项。动作包括：

| 动作 | 作用 |
|---|---|
| `{ type: 'close' }` | 关闭对话 |
| `{ type: 'battle', battle }` | 进入对决 |
| `{ type: 'panel', panel }` | 打开面板：`shop` / `shows` / `dossier` / `recruits` / `troupe` / `workshop` |
| `{ type: 'pay', price, flag, nextDialogue, poor }` | 付钱 → 设旗标 → 跳到 `nextDialogue` 对话；钱不够跳到 `poor` 对话。原子操作 |
| `{ type: 'goto', nextDialogue }` | 继续另一段对白，其效果在该段结束时执行 |
| `{ type: 'travel', act }` | 巴士驾驶席回访已经到过的城市；不重置已领物、伙伴或巡演时钟 |
| `{ type: 'rent-lodging', lodging }` | 在对应房屋管家的最后一行明确确认；检查位置、租约、租金，成功才扣费并自动退旧约 |

`bridgeport.ts` 顶部有现成的选项工厂：`close()`、`fight(battleId)`、`shop`、`dossier`、`shows`。**每组选项都要有一个 `close`**，玩家永远可以走开。

### 4.4 命名

对白只显示本行说话者的头像，位置固定：伊莱在左、NPC 在右（[ADR-0054](../design-log/decisions/ADR-0054-throw-scouting-and-onboarding-polish.md)）；两侧头像位常驻，换人时文本框不跳；旁白两侧都空。v12 表现修订要求 NPC 头像面向左，人物在框内以半身构图放大和上移，不能移动整个头像框。人物、地点、任务等关键信息用亮黄色；普通对白、场景引导和战斗教学共用 `DialogueText`，长短词重合时优先匹配完整名字。正文不插入 HTML；重点由表现层安全渲染。

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
  winFlags: ['champion'],                           // 获胜对白结束时设置（幂等）
  win: 'juno-win', loss: 'juno-loss', draw: 'juno-draw',   // 结果对话 id
  tip: '朱诺单张连发、专削护盾；持续伤害与攒好的大牌型是两种对策。', // 对决前的情报
},
// 其他可选字段：
//   terms: { deadlineMs: 64000 }          演出规矩，只约束玩家（见 07）
//   kit: { only: {...} } / { banFamilies: ['shield'] }   限制玩家的巡演箱
//   afterFlags: [...]                     无论输赢，结束后设置
```

规则：

- **首胜才发奖励**，结果确认时写入持久化 `pendingReward`；获奖对白结束才原子写入财产、`won` 和获奖旗标，并播放收获弹窗。不能在战报关掉时就先发物品。重打走复赛对白；第二幕街头演出有每周一次的少量复演费例外。
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

主线与支线单独呈现。现有姐妹后续邀请在早场艾达/比阿均已获胜且姐妹赌约尚未获胜时显示蓝色支线：去醉鹅旅店找比阿，跨地图指向正确出口，赌约获胜后消失。用已有 `won` 推导，所以旧档自然补齐，无需重打或额外旗标。该支线仍用既有单场挑战，不加入新的车轮战。

资格赛教学的固定首副牌由对决层显式应用；气泡的出现条件仍读取实时手牌和已装备道具。编写任何行动指令前，先确认那个动作在本步实际可执行。

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
   - 当前前三幕仍显式分支。新增城市时必须逐处接线，不能只添加地图数据就宣称可玩。
5. **界面**（`magician-adventure.tsx`）：默认巡演箱（参照 `BRIDGEPORT_LOADOUT`）、完结卡、头像逻辑。
6. **美术**：场景（04）、角色（05）。
7. **测试**：参照 `bridgeport.test.mjs`——开幕状态、每个门槛、奖励只发一次、存档往返、**完整通关**（脚本化地走完整幕）。
8. **难度**：`story-sim.mjs` 跑每场对决。
9. **设计记录**：ADR + iteration + 更新 `03_CURRENT_DESIGN.md` + 更新大纲文档的「已实装」标记。

## 9. 第三幕当前可玩范围（2026-10-11）

现行故事锚点是 [城市大纲 v2 的 2.3](../F9_THROW_STORY_OUTLINE_CITIES_2026-10-10.md)，主线顺序为：抵达韦斯特港 → 朱诺带路至旧灯塔看守屋 → 与管家确认一次免费借住 → 诺拉登记 → 两场联赛 → 栈桥追查菲利克斯 → 揭发或传递假箱子 → 诺拉拒绝偷来的情报 → 广播采访 → 诺拉三局两胜 → 第三幕结章。声明与采访均有真实门槛；没有强迫玩家输的姐妹招募教程。

| 场次 ID | 内容与完成条件 |
|---|---|
| `wp-entry` | 维尔，联赛首轮；胜利开启侦察局 |
| `wp-counter` | 对手根据玩家上一场公开出牌倾向准备克制配置；换构筑可利用其预判 |
| `wp-nora-1` | 诺拉第一局，公开的黑桃护盾笔记诚实有效 |
| `wp-nora-2` | 诺拉第二局；广播宣布蓄牌会使她改带快攻配置，否则使用剧毒 |
| `wp-nora-3` | 一比一时才需要的决胜局；任一方先胜两局结束系列赛 |
| `wp-brannigan` | 先向船长问旧事、找西奥查报道，再回栈桥补完那场逃脱戏 |
| `wp-molly-1` / `2` / `3` | 三首点歌依次使用治疗、护盾、剧毒配置；三次首胜共 60 好感，之后另行邀请莫莉 |
| `wp-relay` | 地铁双人团体赛，伊莱与可上场伙伴对基特和维尔；同场双方各一名替补 |
| `wp-coast-1` … `7` | 海边七场，依次解锁，最后一场结清支线；第一场限单张，其余轮换六种构筑 |

共 **17 个战斗定义**。诺拉系列赛并非固定打满三场；结局失败可以重新开始，胜利后保留镇内探索。系列未结束时战报“重来”会进入下一局准备，不能重复第一局累计两胜。

七处城市地图为 `westport`、`league`、`radio`、`docks`、`subway`、`westshop`、`wp-pub`，另有三城各自住处和可进入的 `bus-interior`。港口酒馆有斯坦招募板及罗茜客座厨师，莫莉在广播塔完成自己的支线后加入。回访旧城通过巴士驾驶席完成，旧章节巴士不会重置时钟或再次发结章奖励。

**当前限制**：这是一套内容闭环，尚不等于原大纲估计的 7.5–8.5 小时实测时长。海边档期实现为七场可随时继续的节目，没有强制连续七个自然日；反情报目前有一个公开打法分类和一个广播分支，没有逐格偷看玩家当前私有布阵；系列赛当前仅诺拉一组，不另设半决赛系列；第四幕米尔布鲁克仍是下一站预告。第三章人物声音、经济节奏和整章真人胜率还需要持续试玩，不能用规则流程测试代替。

`westport.test.mjs` 覆盖两条主线分支、2:0/2:1/失利重赛、所有支线、莫莉邀请、双人名单、三城实体住处回访、改装失败原子性、未读奖励存档与一次领取。`stage-art.test.mjs` 校验所有人物和地图都有对应矢量表现。


### v9：先安家，再报名；在地点里完成搬家

第三幕新进度先指向港口街尽头的旧灯塔看守屋。朱诺说明这是朋友阿尔弗雷德借出的屋子，管家明确说明免费规则，玩家选择「接过钥匙」才建立租约并完成 `westHomeGuided`。诺拉/维尔在这之前不接受登记，不以隐形按钮卡住流程。已经登记过的 v8 存档迁移时视为完成该引导，不收回旧租约、不移动角色、不重发免费权益。

`Hotspot.functions` 是功能标识的权威来源，与任务卷轴并排显示；`LODGING_ENTRANCES` 定义三城九幢房屋的真实门口，另有三个城市的巴士。每处门指定 `lodgingId`；共享室内地图用 `viewedLodging` 区分正在看哪一套房，`lodging` 只表示当前生效租约。房名、美术取前者；气场、费用、排练收益取后者。只有已租下的房屋显示伙伴与团务桌。

每个建筑内都有管家，租约确认只接受对应室内、管家附近、对应对白末行的动作。中途离开、钱不足、跨城/远程调用、欠租未清均不能部分搬家或扣钱。租用成功一次性变更租约、扣首周费用，旧址随后不再显示伙伴。剧团管理面板只展示当前住处与管理行为，不能从列表遥控搬家。
