# F9 两套浅色动物卡牌试玩

## 入口

- A+B 绘本伙伴：<http://localhost:4173/arena/2d/storybook>
- A+G 贴纸伙伴：<http://localhost:4173/arena/2d/sticker>
- 顶部切换即时生效，阵容、战斗进度、详情和档案不重置；刷新进入地址所标记的风格。默认 `/arena/2d` 为绘本版。

## 本轮文件

- `app/arena/arena-experience.tsx`：美术切换、共享流程、素材变量。
- `app/arena/arena-light.css`：浅色桌面、卡牌、详情、武装库、增幅器与复盘。
- `app/arena/collectible-card.tsx`：独立插画容器，按可用空间完整缩放。
- `app/arena/2d/page.tsx` 与 `storybook/page.tsx`、`sticker/page.tsx`：入口。
- `public/art-assets/arena-2d/animals-storybook.png`、`animals-sticker.png`：内置 image_gen 生成的两张原创 12 格 atlas。
- [完整素材提示词](./art/F9_ANIMAL_VARIANTS_PROMPTS_2026-09-26.md)。
- [决定与假设记录](./design-log/iterations/F9/2026-09-26-arena-light-variants.md)。

## 验证

- `npm test`：174 项通过；`npx tsc --noEmit` 通过。
- `npm run lint` 通过；`npm run build` 通过，两条独立路由可渲染。
- 1440 宽桌面：两套素材、1/2/3 格、复合数值、详情与增幅器面板已检查。
- 800 宽：武装库抽屉可开关；390 宽：页面无横向溢出，战场保留 780px 最小宽并独立横向滚动。
- 实际启动、暂停、拖动回放时间、换肤、详情、三路复盘可用。4.3 秒暂停状态切换前后整段战斗 UI 文本一致。
- 3 格牌放左路第 2 格拒绝且未留下卡牌，放第 1 格成功。
- 检查期间浏览器 error 日志为空。
- 实机截图：`outputs/arena-2d/storybook.png`、`outputs/arena-2d/sticker.png`。

## 边界

50 张卡依然按机制族共用 12 种动物，名称与原机械装备沿用。此次用于选择美术方向，不代表已经完成逐卡原画、动物世界观或手机专用战场；游戏机制没有修改。正式素材风格仍待用户选择。
