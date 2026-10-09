# 09 · 测试、提交与发布

## 1. 测试在哪

`npm run test:throw:cards` 会运行 `apps/throw` 下所有 `*.test.mjs`（由 `scripts/test.mjs` 发现）。测试直接 import `.ts` 源码，用 Node 自带的 `node:test`，不需要构建。

| 文件 | 管什么 |
|---|---|
| `lib/cards/throw-duel.test.mjs` | 对决状态机：创建、出牌、抽牌、结算、确定性 |
| `lib/cards/throw-strategy.test.mjs` | 克制环的每条机制 + **平衡回归**（每条克制 ≥60%，均值 35–65%） |
| `lib/cards/throw-enchant.test.mjs` | 变种：效果、上限、牌匣校验、抽牌顺序不受影响 |
| `lib/cards/throw-terms.test.mjs` | 演出规矩：违规整手拒绝、血线、时限、结束原因 |
| `lib/adventure/magician-world.test.mjs` | 第一幕流程、引擎、存档 |
| `lib/adventure/bridgeport.test.mjs` | 第二幕：门槛、奖励只发一次、商店原子性、完整通关 |
| `lib/adventure/stage-art.test.mjs` | 美术约束：每个道具有图标、每个角色有骨骼、每张地图有场景、没有位图 |
| `lib/adventure/site-path.test.mjs` | 部署路径 |
| `app/wandeng/throw/throw-presentation.test.mjs` | 构筑提示与演出规矩；星光放映机五张门槛；实际生命伤害喝彩的严格 20% 边界 |

## 2. 写测试的规矩

- **断言状态，不只断言「没报错」。** 失败分支用 `assert.deepEqual(before, after)`。
- **固定种子。** 测试里的种子写死；需要多个就用 `1000 + i * 7919` 这样的序列。
- **脚本化通关。** 每一幕都有一个测试从开幕走到完结卡，只用玩家能做的动作（走路、交互、选选项、结束对决）。剧情改动后它最先报错。
- **不为了通过而改基线。** `tests/fixtures/replays-v1.json` 是兼容性证据，平衡回归的阈值是设计约束。测试失败说明设计变了——要么修代码，要么写 ADR 说明为什么接受新数值。
- 规则层 import 写 `.ts` 后缀（Node 直接运行需要）。

## 3. 提交前要跑的

```bash
npm run test:throw:cards        # 本项目测试
npm run lint                    # 改了 TS/React
npm run typecheck               # 全仓库类型检查
npm run check:boundaries        # 产品隔离
npm run check:determinism       # 规则层没有时钟和随机
npm run check:dependencies      # 依赖与 Knip；不要随手删 Knip 例外
npm run build:throw:cards       # 改了路由、配置或部署相关
```

PR 必须通过全仓库检查和三个正式产品的构建（电梯、共鸣、甩牌）。

## 4. 本地预览

```bash
npm run dev:throw:cards                                   # 开发模式，热更新
npm run build:throw:cards && npm run preview:throw:cards  # 生产构建预览，端口 4177
```

截图验收见 04 第 7 节。

## 5. 设计记录工作流

`docs/design-log/` 是项目的设计记忆。规则：

| 发生了什么 | 写什么 | 位置 |
|---|---|---|
| 做了一个设计决定（新机制、改方向、删功能） | ADR | `decisions/ADR-00xx-<slug>.md`，模板 `templates/DECISION.md` |
| 一轮调参、一轮改版 | iteration | `iterations/F9/<date>-<slug>.md`，模板 `templates/ITERATION.md` |
| 一次真人试玩 | playtest | `playtests/`，模板 `templates/PLAYTEST.md` |
| 规则现状变了 | 更新现状 | `03_CURRENT_DESIGN.md`，链接 ADR |
| 改了设计 DNA 层面的东西 | 更新 DNA | `01_DESIGN_DNA.md` |

- **事实、决定、假设、被否决的方案、证据要分开写**，读的人要能分清「这是测出来的」还是「这是我们猜的」。
- **历史决定不改写。** 推翻 ADR-0038？写 ADR-0052「取代 ADR-0038」，在旧的那条状态里标「已取代」并加链接。
- 普通 bug 不进设计记录，除非它揭示了一条设计规则（例：「只出红牌」演出被证明不可赢 → 这改变了规矩的设计原则，值得记）。
- 内容开发文档（一幕的落地、一个系统的设计）放 `docs/F9_THROW_*.md`，文件名带日期。

## 6. 分支、提交与 PR

- 不直接改 `main`。开功能分支：`design/<topic>`、`feat/<topic>`、`fix/<topic>`。
- 提交信息：第一行一句话说做了什么（英文或中文均可，保持一个 PR 内一致），正文说为什么和影响。
- 一个提交做一件事。美术、规则、文案混在一起的大提交很难回滚。
- PR 描述包括：
  - 改了什么、为什么（链接 ADR / iteration）；
  - 跑了哪些检查；
  - 平衡数据（如果动了数值）；
  - 截图（如果动了画面），桌面 + 手机；
  - 已知风险和没做完的部分。
- 不要提交：`.env`、`.env.local`、密钥、凭证、构建产物（`dist/`、`.vinext/`）、截图、模拟输出。

## 7. 发布

- `npm run publish:throw:cards` 生成发布包（`apps/throw/dist/client`，带 `f9-release.json` 清单）。
- 发布前确认：版本号、存档迁移、全量检查、手机截图。
- 发布说明用玩家听得懂的话写，不写内部术语。
