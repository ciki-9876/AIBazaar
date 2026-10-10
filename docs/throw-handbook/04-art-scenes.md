# 04 · 美术与场景

美术方向叫 **「Limelight & Velvet」（聚光灯与天鹅绒）**：二十世纪中叶英国小镇剧院的旧海报感。孔雀蓝的夜、骨白的灯光、黄铜与漆红做点缀。一切都由代码绘制（SVG + CSS），不发布任何位图。方向与取舍见 ADR-0048。

2026-10-09 用户确认采用这套正式美术接口，旧剪纸／Godot／Aseprite 像素源已转入 [历史归档](../art/archives/README.md)。舞台反馈与信息规则见 [ADR-0052](../design-log/decisions/ADR-0052-throw-v6-vector-stage-and-tempo.md)。零位图规范针对视觉资产，录制观众声音可以使用有明确许可与来源的音频文件。

## 1. 为什么全矢量

- 任意分辨率清晰，手机和 4K 屏同一套资源。
- 角色、场景、图标都能随剧情状态变化（灯亮灯灭、人物换位置），不用出多张图。
- 体积小，无需美术资源管线。
- 测试 `stage-art.test.mjs` 会扫描整个 `apps/throw`，发现 png/jpg/webp/gif 直接失败。

## 2. 色板

**场景与道具绘制只用 `src/app/stage/palette.ts` 里的颜色。** 需要新颜色时，先在色板里加具名常量，并写一句用途。对白关键词的亮黄色 `#ffe45c` 是本轮指定的 UI 语义色，在 `adventure.css` 的 `.rg-key-term` 中定义，不作为场景材质色扩散使用。

| 常量 | 色值 | 用途 |
|---|---|---|
| `INK` | `#0b1e26` | 最深的夜、描边、阴影 |
| `PEACOCK` / `PEACOCK_MID` | `#123543` / `#1d4b58` | 主背景、远景建筑 |
| `MIST` | `#33656f` | 雾、远景 |
| `VERDIGRIS` / `VERDIGRIS_LIGHT` | `#4fa39a` / `#9ad6c9` | 铜绿：金属件、辅助色、可交互提示 |
| `BONE` | `#efe7d6` | 骨白：文字、窗框、高光 |
| `LIMELIGHT` | `#f7e6b0` | 聚光灯光 |
| `BRASS` / `BRASS_DARK` | `#c9a25a` / `#86662f` | 黄铜：招牌、画框、灯具、演出费 |
| `LACQUER` / `LACQUER_DARK` | `#b3263a` / `#741525` | 漆红：幕布、强调、危险 |
| `PLUM` | `#2b2133` | 室内暗部 |
| `AMETHYST` / `SILVER` / `GILT` | `#9a7fd1` / `#c9d3d6` / `#f1d892` | 变种稀有度：史诗 / 稀有 / 传奇 |

搭配原则：

- 一个画面里**暖光只有一处主光源**（路灯、舞台灯、壁炉），其余都是冷色。
- 漆红是「重要」的颜色，一屏里不超过两处大面积使用。
- 文字永远是骨白压深色底，或墨色压骨白底；对比度 ≥ 4.5:1。

## 3. 场景的结构

### 3.1 世界坐标

每张地图在 `MAPS`（冒险层）里声明尺寸和地面：

```ts
bridgeport: { width: 2560, height: 1080, floor: 875, cameraY: 250, ... }
curios:     { width: 1280, height: 810,  floor: 604, ... }
```

- 坐标单位是**世界单位**，原点在左上角。
- `floor` 是人物脚底的 y 值；场景里所有落地的物件都以它为基准，不要写死数字。
- 成年角色身高约 154 世界单位（骨骼 192 × `FIGURE_SCALE 0.8`）；门高约 1.35 倍人高，即 ~210。
- 街景宽 2560，室内宽 1280–1440。热点之间至少留 150 单位，否则标签会叠在一起。

### 3.2 景深平面 `ScenePart`

一张场景是一个 `ScenePart[]`，每一项是一个绘制平面：

```ts
export type ScenePart = { depth: number; node: ReactNode };
```

`depth` 是这个平面跟随镜头移动的比例。常用档位：

| depth | 内容 |
|---|---|
| `0.08` | 天空、远山、月亮——几乎不动 |
| `0.22` | 远景天际线（`Skyline`） |
| `0.45` | 中景建筑、桥 |
| `1` | 主平面：人物走的街道、店面、可交互的门。**热点必须在这一层** |
| `>1`（可选） | 前景遮挡物（灯柱、栏杆），比人物移动更快 |

每个平面会成为独立的 GPU 图层（`translate3d`），所以层数控制在 6 层以内。

### 3.3 写一个新场景

1. 在 `sets.tsx`（第一幕）或 `sets-bridgeport.tsx`（第二幕）里写 `export function XxxSet(): ScenePart[]`。新的一幕建议新开一个 `sets-<town>.tsx`。
2. 函数开头声明 `const F = <floor>; const W = <width>;`，和 `MAPS` 里一致。
3. 需要随机摆放（书架上的瓶子、天际线的窗户）时用 `scatter(seed)`，**不要用 `Math.random()`**——每次渲染都要一样。
4. 在 `stage-scene.tsx` 的 `SETS` 里注册：`curios: CuriosSet`。测试会检查每张地图都有对应场景。
5. 截图检查（见第 7 节）。

### 3.4 场景积木 `scene-kit.tsx`

优先用积木拼，不要重画：

| 组件 | 用途 |
|---|---|
| `Glow` / `Beam` | 光晕和光束，`tone`：`lime`（聚光）、`warm`（室内）、`cool`（月光）、`red`（警示） |
| `Pane` | 窗户，可选亮灯和窗帘 |
| `StreetLamp` / `Bench` / `Bulbs` | 路灯、长椅、灯泡串 |
| `Curtain` | 舞台幕布 |
| `TopHat` / `PlayingCardProp` / `Frame` | 魔术主题小道具与画框 |
| `Motes` | 光里的浮尘 |
| `Skyline`（`sets.tsx`） | 程序生成的远景天际线 |
| `Rain` / `Bunting` / `Stall`（`sets-bridgeport.tsx`） | 雨、彩旗、集市摊位 |
| `SharedDefs` | 共享渐变（`glow-*`、`beam-*`、`pool`、`vignette-floor`），每页只放一次 |

一个积木在两个场景里被复制粘贴时，就该提到 `scene-kit.tsx`。

### 3.5 热点让位

热点（门、NPC、告示板）的标签由界面层画在热点上方：NPC 约 176 px，门约 244 px。场景里的**招牌、挂画、灯具不要放在热点正上方 ±90 单位的范围里**。第二幕出过的问题：酒馆招牌和报刊亭招牌叠在一起；剧院售票员的招牌被标签挡住；对阵表被落幕的幕布挡住。都是截图才发现的。

名称默认隐藏，只在角色处于该热点的可交互范围内显示；范围应使用冒险引擎的交互规则，不能另设一个视觉阈值。当前任务目标单独显示常驻任务图标，图标位于名称位置上方，远处名称隐藏时也保留图标。任务状态改变后重新计算目标：离开当前地图的任务指向可达的出口，进入目标地图后指向人物／地点，完成后移除旧图标。

对白只显示当前说话者的头像：玩家在左侧，NPC 在右侧，位置不随说话人变；旁白不显示头像。道具与遗物的触发不再用舞台中央的大框，改为从触发者头顶上飘的特殊飘字（效果名 + 数值）。关键人名、地名、任务名等采用亮黄色，词表来自实际角色、地图与任务内容，不能高亮无关标点或把整段对白统一染黄。

## 4. 动效

### 4.1 两种动效

| 类型 | 做法 | 例子 |
|---|---|---|
| **环境动效**（循环、和状态无关） | CSS `@keyframes`，类名 `st-*`，写在 `stage.css` | `st-lamp` 灯闪、`st-rain` 雨、`st-sway` 招牌摇、`st-curtain` 幕布、`st-neon` 霓虹 |
| **跟随状态的动效**（人物行走、镜头、受击） | `ticker.ts` 的 `subscribeFrame`，直接改 DOM 的 `transform` | 骨骼角色、镜头跟随 |

### 4.2 规则

- 整个页面**只有一个**帧循环（`ticker.ts`）。不要自己写 `requestAnimationFrame`（对决界面里推进 tick 的那个循环是唯一例外）。
- 平滑过渡用 `approach(from, to, delta, half)`：与帧率无关的指数逼近。
- 帧循环里不调 React `setState`，直接 `setAttribute('transform', …)`。
- 只动 `transform` 和 `opacity`，不动 `width`、`top`、`filter`。
- **减少动态效果**：`stage.css` 末尾的 `@media (prefers-reduced-motion: reduce)` 会关掉 `.st-scene` 里所有 CSS 动画；JS 动效读 `reducedMotion()` 停住循环相位。新动效必须两条都覆盖。

### 4.3 战斗与声音反馈

- 白热（超过 30 秒）与落幕（60 秒起）分别有阶段特效，读取 `battlePhase`，只提示阶段名称。
- 玩家单次命中实际扣除对手生命大于 `MAX_HP ×0.2` 才播放观众喝彩。320 最大生命对应严格大于 64；吸收于护盾的伤害、持续状态与落幕伤害不计入。
- 玩家胜利播放鼓掌，彩带从屏幕底部向上飘；战败和平局不触发。对局重开时反馈状态重置，同一事件或结果只播一次。
- 声音使用已有开关及用户交互后的浏览器音频权限；录制素材必须保存来源和许可，不能因为是音频就省略出处。
- 特效只影响 SVG/CSS/音频，不能写回规则状态。减少动态效果时保留胜负与阶段的静态提示。

## 5. 道具与遗物图标

- 位置：`glyphs.tsx` 的 `icons(A)`，键是道具/遗物 id。
- 画布 48×48，单线描边（`stroke="currentColor"`，线宽 2.1，圆头圆角），不填充，留 6 单位边距。
- 每个图标**只用一处强调色** `A`（家族色），画在最能说明功能的部位：飞牌修缮箱的那张牌、双响茶壶的声波。
- 画的是「那件东西」而不是「那个效果」：画伞，不画盾牌符号。
- 底色由家族决定（`FAMILY_COLOR`），图标本身不画底。

## 6. 牌面

`card-art.tsx` 的 `CardFace`。牌面布局固定，变种通过边框和角标表现稀有度：稀有银、史诗紫、传奇金（`SILVER` / `AMETHYST` / `GILT`）。新增稀有度表现时只改这里。

## 7. 截图验收

每个美术改动都要截图看过才算完成：

1. `npm run build:throw:cards && npm run preview:throw:cards`（端口 4177），或直接 `npm run dev:throw:cards`。
2. 用 Playwright 截两个尺寸：桌面 **1440×900**，手机 **390×844**（`device_scale_factor=2`）。
3. 要看的东西：
   - 热点标签有没有和招牌、人物重叠；
   - 文字有没有被裁；
   - 人物脚是否踩在地面上（没有悬空或陷地）；
   - 暗部是否糊成一片；
   - 减少动态效果模式下画面是否完整。
4. 截图放进 PR 描述。不要提交截图文件到仓库。

Playwright 最小脚本：

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.goto('http://127.0.0.1:4177/<basePath>/')
    pg.wait_for_timeout(1500)
    pg.screenshot(path='shot.png')
```
