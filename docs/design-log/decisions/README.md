# 设计决策记录

- [ADR-0047：共鸣夏日像素与手绘叙事试演](./ADR-0047-resonance-presentation-comparison.md)：两种可操作故事样本与对应战斗美术，独立复用横向控制方法；当前规则、大纲保持，最终画风未选定。

- [ADR-0046：报刊插画与左右舞台对战](./ADR-0046-throw-editorial-illustration.md)：用户录屏为广义美术参考，接替像素表现但保留原子资产、尺度、帧动画和动态光；正常渲染与真实练习已测，CPU回退和长期观感待验证。

- [ADR-0044：共鸣先完成故事大纲](./ADR-0044-resonance-outline-authoring.md)：用户与助手通过网站共同维护世界、章节与问题；表现形式留待大纲完成后决定，本地项目保存与静态浏览器草稿明确区分。

- [ADR-0045：原子像素场景、共同尺度与实时光照](./ADR-0045-throw-atomic-pixel-scenes.md)：甩牌场景与人物美术 V2，复用资产、整数倍率、合理家具尺度与帧动画；剧情／规则保持，主要视口和动作已有实测证据，软件回退待测。

- [ADR-0043：现代西方奇幻与横版魔术师RPG](./ADR-0043-throw-western-pixel-rpg-opening.md)：街区行动、原创像素人物、建筑／NPC、真实甩牌结果与资格推进已接通；新版剧本保留个人夺冠，后续城市未开发。

- [ADR-0042 音乐治愈师与非对称心魔战斗](./ADR-0042-resonance-healing-monsters.md)：用户新世界与敌群模型已实装，保留玩家编排与歌曲；六场剧本切片、新v3与旧回放隔离。

- [ADR-0041 甩牌魔术师个人夺冠主线](./ADR-0041-throw-magician-personal-championship.md)：用户选择落寞魔术之乡到世界冠军的个人英雄故事；详细剧本、人物和赛制为草案，未实装新剧情。

- [ADR-0040：装备歌曲的节拍与核心能力](./ADR-0040-resonance-song-heroes.md)：原创曲、双方独立节拍、只播放我方音乐、音符与重拍能力已实装；新版本保留旧回放，速度预算和听觉体验待验证。

- [ADR-0039：完整非AI赛季、金票守恒与真实库存救援](./ADR-0039-elevator-complete-season-with-finite-rescue.md)：用户按SPEC开发授权已落实至100F，新规则9与旧季兼容；浏览器及全流程自动化证据单列，AI竞争和平衡待验证。

- [ADR-0038：甩牌布阵界面与世界观候选](./ADR-0038-throw-workbench-and-world-candidates.md)：全宽拖放、遗物草稿／装备提交、红黑花色和少文本已实装；新叙事五选未定，实际界面验收待完成。

- [ADR-0034：三个正式项目与电梯 AI 实验区](./ADR-0034-three-project-boundaries.md)：共鸣与甩牌独立拆分；AI 独立实验，完成验证后再并回电梯；历史混合工作台归档。

- [ADR-0035：甩牌对决独立规则基线](./ADR-0035-throw-card-duel-baseline.md)：主动发射、扑克牌型和本体命中保持为独立玩法。
- [ADR-0036：甩牌选牌与单遗物槽](./ADR-0036-throw-duel-selection-and-relic.md)：单击单选、一次连续框选、整理按钮、遗物槽与反馈边界。
- [ADR-0037：甩牌节奏、十格构筑与连续选区](./ADR-0037-throw-duel-rhythm-and-loadouts.md)：每三秒抽牌、十格位置构筑和对手可执行选区。

- [ADR-0033：准备层与金票资源淘汰流程](./ADR-0033-elevator-staging-golden-passes-and-mortality.md)：用户流程明确；完整SPEC区分资格和死亡、阻断反复搬票与免费恢复，有限救援和异步名册为待选择建议，新规则未实装。

- [ADR-0032：上下阵地与心灯命中反馈](./ADR-0032-wandeng-rhythm-combat-visuals.md)：用户要求更清晰的共鸣对战；固定核心／生命、弹道和治疗承伤反馈已实装，规则不变，观看体验待试玩。

- [ADR-0031：电梯出发决策与少文本首页](./ADR-0031-elevator-action-first-console.md)：用户批准一轮优化，路线与直接出发、暂停和审查状态、选择后的投喂消耗；玩法规则保持，理解效率待试玩。

- [ADR-0030：首扫保底与共鸣线demo](./ADR-0030-wandeng-rhythm-first-entry-demo.md)：用户批准每圈首扫立即触发、重置线冷却；独立九格／两心灯demo已接11卡和回放，数值与观看体验待验收。

- [ADR-0029：电梯仓库与分次投喂](./ADR-0029-elevator-warehouse-and-incremental-feeding.md)：用户要求已实装，24格起始、累计升级材料、确认永久销毁；每级4格等首版细则待试玩。

- [ADR-0028：深入探索归物师节奏线对决](./ADR-0028-wandeng-rhythm-scan-direction.md)：用户指定连续扫描、按线的间隔发动当前卡牌；允许移除三路和屏障。细则待讨论，未实装、未迁移旧对局。

- [ADR-0027：百层竞速与通行证首版](./ADR-0027-race-and-pass-prototype.md)：已实现共享签发、跨层成本、升级跨度、公开审查时间与结果演出；数字待试玩，AI独立分支。

- [ADR-0026：与AI竞争抢先抵达100层](./ADR-0026-race-to-floor-100.md)：用户长期目标明确；升级开层与通行证跨层仍待选择，未实装新规则。

- [ADR-0025：大模型竞争者与晋级／淘汰体验](./ADR-0025-llm-contestants-and-elimination-experience.md)：综艺候选的用户核心要求已明确；具体执行架构与赛事仍为提案。

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
