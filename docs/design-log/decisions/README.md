# 设计决策记录

- [ADR-0024：采纳被取代的归途方向](./ADR-0024-replacement-mystery-direction.md)：确认题材及动机、自洽性、人物与玩法联动要求；具体系统仍待讨论。

- [ADR-0023：死亡背包、脑浆与怪物视野](./ADR-0023-survival-sight-brains-and-recovery.md)：可追回背包、品质经验、堆叠、领地／突袭脱战、双高度视野，局部取代0020与0022。

- [ADR-0022：探索交互、对话节奏与主题鬼怪](./ADR-0022-survival-interaction-and-theme-creatures.md)：并存预算、物品规范、电梯首页、手动台词；动机研究单列提案。

- [ADR-0021：主题构件集与中国风样板](./ADR-0021-themed-kits-and-jiangnan-sample.md)：用户采纳资产包，同主题配色和陈设复用，听雨庭接入新第三层。

- [ADR-0020：饥渴、精神力与单向上升](./ADR-0020-survival-needs-guidance-and-ascent.md)：事件式教学、返程拖拽、二层重构与三层入口。

- [ADR-0019：统一终端、第一顿饭与主动选层](./ADR-0019-terminal-tabs-meal-and-floor-selection.md)：显式吃面包解锁饥渴，每次出发前选层，GM 检查点。

- [ADR-0017：归物师恢复 50 卡与每路增幅器基线](./ADR-0017-wandeng-arena-baseline.md)：二维换表现不重做战斗。


- [ADR-0016：终端人格、投喂核心与第一次开灯](./ADR-0016-lift-host-and-first-light.md)：用户返程 17 步、真实结算与供能、界面系统；局部取代 ADR-0015 的 1 X 修复与立即相邻教学。


这里记录“为什么选择 A 而不是 B”。决策记录不是需求清单，也不是实现日志。

## 当前决策主题

- [ADR-0014：归物师以路费赎回伙伴，终局统一送达](./ADR-0014-wandeng-ransom-and-opening.md)：不指定物品、不在途中赠送，漫画与师傅教学接入卡片式三程旅途；局部取代 ADR-0012 的玩家掉牌和途中归家提案。

- [ADR-0015：荒原迷雾与首次电梯修复](./ADR-0015-wasteland-fog-and-first-lift-repair.md)：即时材料与全拾取反馈，真实升级和相邻教学，局部取代 ADR-0013 的返程终点。
- [ADR-0013：梦中醒来、物品觉醒与第一次返程](./ADR-0013-dream-wasteland-opening.md)：按用户 20 步实装首段，小荒原、三怪、延迟装备栏与升级材料；后续教学和长期成长保留待定。

- [ADR-0012：万灯城的物灵、归家与灵魂对决](./ADR-0012-wandeng-souls-and-homecoming.md)：用户转向温情归物与两派设定，确认血量外包装和随机掉落；数量与恢复细则仍为提案，局部取代联赛方向。

- [ADR-0011：电梯内信息实体化与阴暗氛围](./ADR-0011-diegetic-lift-and-darkness.md)：空间开门引导、门缝黑烟、左墙电子屏和局部照明；明确去 UI 的执行范围与未来操作系统边界。

- [ADR-0010：现实尺度初始电梯与出门运镜](./ADR-0010-human-scale-lift-and-camera.md)：第一人称小轿厢、走出后拉升俯视，后期扩容方向与待定经济分开。

- [ADR-0010：巡回器具师联赛与单局成长边界](./ADR-0010-circuit-league-and-run-boundaries.md)：世界观、60–90 分钟目标与局外图鉴/新选择已接受；关卡、经济与养成细则另列为提案。

- [ADR-0009：容器翻找与真实背包格子](./ADR-0009-survival-containers-cargo.md)：快慢搜刮、多件与剩余保留、4×2 运输包；电梯美术独立为待讨论提案。

- [ADR-0008：手绘工业生存、大房间与十格装备](./ADR-0008-survival-art-fog-equipment.md)：美术方向与五项实装约束；区分用户决定、背包分工的实现选择和待验证平衡。

- [ADR-0007：核心效果数量独立于占格尺寸](./ADR-0007-flexible-core-stat-layout.md)：用户否决固定角位；以每张卡五项共存验证可换行列表，实际自适应布局尚未实现。

- [ADR-0006：融入卡面的纯彩色输出数字](./ADR-0006-integrated-colored-numbers.md)：输出数字融入底边／底角，无数值旁文字或图标，数字字色代表效果；明确记录“无文本描述”的执行范围解释。

- [ADR-0005：卡牌稀有度与信息分区](./ADR-0005-card-rarity-and-information-layout.md)：四档稀有度、顶部名称／定位、描述区独立冷却和类型色输出贴片；示意数字不属于正式规则。

- [ADR-0004：立体展示的炫彩收藏卡](./ADR-0004-collectible-card-showcase.md)：街机背景接受，卡带外壳换为薄收藏卡；3D 展示与最高级流光已明确，当前产物为静态概念图。

- [ADR-0003：独立卡牌方向回归 2D 与开放题材](./ADR-0003-independent-2d-card-direction.md)：2D 和脱离电梯题材已决定；街机卡带外观为待验收概念。

机制组合的初始定义和当前边界集中在 [设计 DNA](../01_DESIGN_DNA.md)；后续任何改变组合顺序、输入输出、不变量或玩家张力的讨论，都应建立新的 ADR。

- [ADR-0001：电梯实时搜打撤方向与已确认约束](./ADR-0001-elevator-survival-extraction.md)：整体提案；区分已确认的失败背包规则、用户方向偏好与待验证建议。

- [ADR-0002：纯单机定位、效率驱动上楼与竞争者动机](./ADR-0002-single-player-ascent-and-rivals.md)：纯单机已决定；统一效率成长、AI 竞争者与共同逃生背景为待讨论建议。

## ADR 规则

- 文件名使用 `ADR-####-短标题.md`。
- 必须写背景、问题、选项、决定、理由、影响和证据状态。
- “已接受”不代表“已证明好玩”；设计决定和可玩性证据分开写。
- 被取代的 ADR 保留原文，顶部标注 `Superseded by ADR-####`。
- 小的文字修正可以直接改；改变设计含义必须新建 ADR。

## 模板

[DECISION.md](../templates/DECISION.md)

- [ADR-0018：像素终端与第二次自主出勤](./ADR-0018-pixel-terminal-and-second-expedition.md)
