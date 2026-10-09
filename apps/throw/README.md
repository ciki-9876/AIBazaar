# 最后一张王牌 · 魔术师之旅

独立正式项目。首页进入魔术师冒险，`/wandeng/throw` 保留甩牌对决；页面、世界状态与确定性对决规则均在 `src/`。项目不依赖电梯或共鸣源码。

启动：`npm run dev:throw:cards`；测试：`npm run test:throw:cards`；构建：`npm run build:throw:cards`。输出位于 `apps/throw/dist/client`。

对决使用 `throw-duel-v5`：第 60 秒起「落幕」，双方每秒受到递增伤害；每张牌可以装备变种（`throw-enchant.ts`，练习场里的「牌匣」）；四花色锁定四种状态（♠ 护盾、♥ 治疗、♣ 剧毒、♦ 灼烧），六套竞技卡组靠机制互相克制，平衡回归测试位于 `throw-strategy.test.mjs`。冒险使用 `magician-adventure-v2`，第一章带逐步引导（`throw-coach.tsx`）与按剧情解锁的道具。

美术全部由代码绘制，位于 `src/app/stage/`（色板、骨骼角色、场景、牌面、物件图标），项目不发布位图。方向与取舍见 ADR-0048；规则相关记录见 ADR-0035 至 ADR-0043，以及 ADR-0049（克制环、第一章、文案风格）、ADR-0050（落幕、牌的变种）。
