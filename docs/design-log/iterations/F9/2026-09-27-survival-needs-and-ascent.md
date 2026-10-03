# 饥渴、精神力、二层重构与三层上升

日期：2026-09-27。对应 [ADR-0020](../../decisions/ADR-0020-survival-needs-guidance-and-ascent.md)。

## 用户决定与落实

生活值驱动探索风险，分时揭示精神力与 50 阈值；机器人通用强／弱引导；更小、更灰暗、矮墙重组的二层；怪物角质化和命中反馈；有进度的探索任务；手动确认结算后教跨区拖拽，再升级电梯并单向进入三层。

## 实现位置

- `lib/survival-guidance.ts`、`survival-opening.ts`、`survival-afterlight.ts`：固定步长引导、事件解锁、实际物资结算和新流程。
- `survival-transfer.ts`：双格区原子移动／交换；`survival-ascent.ts`：升级支付、第三层清单；`survival-checkpoint.ts`、`survival-gm.ts`：v6 迁移与调试阶段。
- `app/survival/tutorial-guide.tsx`、`inventory-drag.tsx`、`lift-system.tsx`、`opening-demo.tsx`：指向提示、拖拽、任务和常驻数值。
- `scene.tsx`、`environment.ts`、`dunes.ts`、`creatures.ts`、`effects.ts`：软边界、矮墙、暗灰光、沙岩入口、怪物轮廓、闪白和飘字。

## 验证与边界

新增 `survival-expedition.test.mjs` 覆盖双生活值触发、强引导真正暂停、50 阈值连续数值、矮墙可视与可走区分、跨区交换原子性、手动结算、失败损失及初始核心恢复、升级支付和单向楼层锁。

真实浏览器已验证模块从背包拖到装备、装备间交换、相邻生效、第三层进入、归零后结算，以及进入三层后一／二层禁用。最终 `npm test` 228/228 通过，`npm run lint`、`npx tsc --noEmit`、`npm run build` 通过。69 个 GM 阶段均验证存档往返与确定性续跑；390 像素窄屏弹窗无横向溢出。截图存于 `outputs/survival-opening/`（忽略目录）。

旧地图快照保留，因此新版二层的面积和布局请从新进度或 GM 的“维保廊入口”体验。升级价格、失败应急补给、新层怪物节奏仍需用户试玩反馈；第三层是通路与主题起点，未宣称完成丰富的沙漠关卡。多主题生成架构仅为[讨论提案](../../../F9_MULTIVERSE_FLOOR_GENERATION_PROPOSAL_2026-09-27.md)。
