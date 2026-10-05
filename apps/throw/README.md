# 最后一张王牌 · 魔术师之旅

独立正式项目。首页进入魔术师冒险，`/wandeng/throw` 保留甩牌对决；页面、世界状态与确定性对决规则均在 `src/`。项目不依赖电梯或共鸣源码。

启动：`npm run dev:throw:cards`；测试：`npm run test:throw:cards`；构建：`npm run build:throw:cards`。输出位于 `apps/throw/dist/client`。

对决使用 `throw-duel-v3`，包含策略选牌、单槽遗物与配置工作台。冒险入口、像素/插画候选及 `/art/vector`、`/art/vector/play` 属于当前原型与美术试验，未代表完整长期成长已完成。相关设计与验收见仓库 `docs/F9_THROW_*` 和 ADR-0035 至 ADR-0046 中的甩牌记录。
