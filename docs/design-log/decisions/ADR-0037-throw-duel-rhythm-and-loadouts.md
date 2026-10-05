# ADR-0037：甩牌节奏、十格构筑与连续选区

**状态：用户指定的抽牌节奏和交互规则已实现；助手提出的物品联动与数值待验证。**

自动抽牌每三秒一张，满手时停止计时。点击只单选，框选总是连续区间；对手遵守相同选择约束。战前十格行囊安放一至三格物品，并可携带至多一件遗物。物品相邻关系、空格和左右端点影响实际效果。规则版本为 `throw-duel-v3`。

规则与表现由 `apps/throw/src/` 单独拥有；暂停冻结模拟，失败安放保持原布局。故事结合仍是待讨论提案。九套预设、二十三件物品和十件遗物是可试玩方案，不代表已经平衡。完整数值、验证证据和未验证风险见[分支 ADR-0029](../archives/throw-card-duel-branch/design-log/decisions/ADR-0029-throw-duel-rhythm-layout-and-strategies.md)及[实现记录](../archives/throw-card-duel-branch/design-log/iterations/F9/2026-10-04-throw-duel-strategies.md)。
