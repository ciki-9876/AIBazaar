# 2026-09-27：探索交互与主题怪物优化

## 决定与事实

用户提出怪物并存上限、主动物品使用、主题鬼怪、清晰拾取反馈、手动对话及电梯首页等要求。[ADR-0022](../../decisions/ADR-0022-survival-interaction-and-theme-creatures.md) 记录设计含义；动机调研独立为提案，不作为已确认世界观。

## 实现范围

- `lib/survival-item-traits.ts`：完整多选词条、使用效果、装备与探索被动；`survival-room`、`world`、`opening`、`afterlight` 接入主动使用、结算记录与并存上限；`checkpoint` 修正旧面包存档。
- `app/survival/dialogue.tsx` 与 opening：共享气泡、点击推进、自动开关，野外剧情时钟与战斗时钟分离。强制确认动作不被快进替代。
- cargo/inventory-drag：保护盾图标、物品词条、使用按钮、防文本框选；lift-system/base-upgrade/refinement.css：电梯首页、常驻升级账目、像素暗纹和气泡。
- scene/creatures/pickup-icon/effects/pickup-text：各层随身照明、禁止门模型点行走返程、弱光手势、飘字 1.5 倍与对应堆叠间距。
- `pavilion-creatures`、`survival-theme-assets`、`survival-pavilion`：四种中国鬼怪归入主题包；`app/art/pavilion` 新增“鬼怪”观察页签。
- 新图 `public/art-assets/survival/demon-pixel-v4.png` 经内置 imagegen 编辑并复制到项目，旧图保留，加载器指向新图。完整提示词与来源为相邻的 `demon-pixel-v4.source.json`。

## 验证证据

- `npm test`：240/240 通过（含新增七项：完整词条、主动使用原子性、手动补给结算、并存与待刷预算、对话点击/手动等待、野外不暂停、旧面包存档兼容）。
- 本轮 survival 与 pavilion 文件的定向 lint、TypeScript 检查通过；生产构建通过。
- 全库 `npm run lint` 执行后仍报告并行变动的 wandeng 文件三项问题（两个原生 img、一个 group 语义标签），不属于本轮修改，未擅自修改。
- 浏览器实际验证：开场独白停留等待点击并进入看手机；F 打开电梯主页；主动饮水从 48 到 93、减少一瓶；拖拽水瓶从第六格到第一格，网页选区为空；点击二层电梯门模型仍留在探索场景，点击明确的“回到电梯”按钮才返程。
- 实际画面确认：二层角色周围有光、两处手势标识可见；首页所有升级字段无需滚动即可看见；中国鬼怪预览四种造型完整可见。新打开的验证窗口无渲染错误日志。
- 截图在 `outputs/survival-opening/refinement-lift-home.png`、`refinement-floor2.png`、`refinement-spirits.png`。该输出目录为本地验证产物，不提交构建输出。

## 仍待评价

并存数字是首轮可调参数，尚未做长时强度平衡；新怪物外观不会同时改掉现有攻击行为。剧情提案尚未实装。最高开放楼层仍为第三层。
