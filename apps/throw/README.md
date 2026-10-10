# 最后一张王牌 · 魔术师之旅

独立正式项目。首页进入魔术师冒险，`/wandeng/throw` 保留甩牌对决；页面、世界状态与确定性对决规则均在 `src/`。项目不依赖电梯或共鸣源码。

**新协作者从 [内容开发手册](../../docs/throw-handbook/README.md) 开始**：架构、规则功能、卡牌与变种、美术场景、角色动画、剧情、系统、平衡模拟、测试发布，各有规范和检查清单。平衡与剧情模拟脚本在 `tools/`。

启动：`npm run dev:throw:cards`；测试：`npm run test:throw:cards`；构建：`npm run build:throw:cards`。输出位于 `apps/throw/dist/client`。

对决使用 `throw-duel-v8`（v7 重做遗物与变种，见 ADR-0053；v8 改为发牌轮，见 ADR-0055）：每轮发 2 张，开场每 6 秒一轮；超过 30 秒进入白热，每 4 秒一轮；60 秒起「落幕」，每 3 秒一轮，双方每秒受到递增伤害。顺子与同花从 3 张起判定；整理手牌默认开放、冷却 20 秒。每张牌可以装备变种（`throw-enchant.ts`，练习场里的「牌匣」）；四花色锁定四种状态（♠ 护盾、♥ 治疗、♣ 剧毒、♦ 灼烧），六套竞技卡组靠机制互相克制，平衡回归测试位于 `throw-strategy.test.mjs`。冒险使用 `magician-adventure-v4`：数据化引擎 `src/lib/adventure/magician-world.ts`，每一幕一个内容模块（`graywick.ts`、`bridgeport.ts`）；第一幕带逐步引导（`throw-coach.tsx`），第二幕有演出费、分类旧货铺、街头演出、对手档案与本地存档；支持迁移 v3 存档中的旧整理遗物引用。

美术全部由代码绘制，位于 `src/app/stage/`（色板、骨骼角色、场景、牌面、物件图标），项目不发布位图。方向与取舍见 ADR-0048；规则相关记录见 ADR-0035 至 ADR-0043，以及 ADR-0049（克制环、第一章、文案风格）、ADR-0050（落幕、牌的变种）、ADR-0051（第二幕）。

最新修订见 [ADR-0052](../../docs/design-log/decisions/ADR-0052-throw-v6-vector-stage-and-tempo.md) 与 [验证记录](../../docs/design-log/iterations/F9/2026-10-09-throw-v6-stage-and-tempo.md)：构筑策略提示、大伤害喝彩、胜利鼓掌和彩带、阶段特效、就近名称与常驻任务图标、对白重点及固定头像位置。历史剪纸／Godot／Aseprite 像素资料见 [本机归档索引](../../docs/art/archives/README.md)。录制观众音频的来源与许可见 [音频署名](../../public/audio/throw/CREDITS.md)。
