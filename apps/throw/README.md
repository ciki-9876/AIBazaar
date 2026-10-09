# 最后一张王牌 · 魔术师之旅

独立正式项目。首页进入魔术师冒险，`/wandeng/throw` 保留甩牌对决；页面、世界状态与确定性对决规则均在 `src/`。项目不依赖电梯或共鸣源码。

启动：`npm run dev:throw:cards`；测试：`npm run test:throw:cards`；构建：`npm run build:throw:cards`。输出位于 `apps/throw/dist/client`。

对决使用 `throw-duel-v3`，包含策略选牌、单槽遗物与配置工作台。

美术全部由代码绘制，位于 `src/app/stage/`（色板、骨骼角色、场景、牌面、物件图标），项目不发布位图。方向与取舍见 ADR-0048；规则相关记录见 ADR-0035 至 ADR-0043。
