# AIBazaar 游戏设计迭代日志

2026-10-05 AI第五轮：[搜索训练实测](../F9_AI_TRAINING_ROUND5_SEARCH_REPORT_2026-10-05.md)冻结旧战斗并训练新搜索头；相同72局清场66→72、遮挡6→12/12，局部通过但未接网页。[里程碑与规则刷新](../F9_AI_MILESTONES_AND_RULE_REFRESH_2026-10-05.md)区分专项人工反馈、统一选手、三场景与双端验证、首版合入和后续补训，按正式有限赛季更新目标。见[本轮记录](./iterations/F9/2026-10-05-ai-training-search-and-milestones.md)，未覆盖项和教师对照保留。

2026-10-05 AI第四轮：[战斗智能实测](../F9_AI_TRAINING_ROUND4_COMBAT_REPORT_2026-10-05.md)新增独立战斗训练模块，72局清场60局、零死亡、安全移动诱聚48/60，但遮挡清场1/12和失踪目标循环阻止晋升。[记录](./iterations/F9/2026-10-05-ai-training-combat-round.md)追加用户自由创造实验内容、独立战斗指标和token要求，网页模型保持。

2026-10-05 甩牌画风已选定／SVG试验：用户接受0046的报刊插画；[SVG与量产报告](../F9_THROW_VECTOR_PRODUCTION_TRIAL_2026-10-05.md)提供独立对照和可玩切片，8道具＋主角分部件母版／两配色／16姿势。混合生产链为助手建议，未全量替换；[迭代证据](./iterations/F9/2026-10-05-throw-vector-art-trial.md)区分已实装与未测效率、FPS和骨骼方案。

2026-10-05 电梯战斗扩展：[环境元素怪物与杀戮模式草案](../F9_COMBAT_ENVIRONMENT_ELEMENTS_MONSTERS_AND_KILLING_MODE_DESIGN_2026-10-05.md)承接用户环境续航、原创元素反应、状态属性、怪物行为与默认绿灯快捷开红灯要求。提出四元素六反应、八环境、十四怪物和来源可追溯的杀戮许可，修订此前工作草案的PvP方向。见[范围记录](./iterations/F9/2026-10-05-elevator-combat-atomic-extension.md)；参数与机制待验证，现行v9、AI隔离和历史记录保持。

2026-10-04 共鸣双美术试演：[ADR-0047](./decisions/ADR-0047-resonance-presentation-comparison.md)实现用户的 SUMMERHOUSE 像素行走与火山的女儿手绘对话方案，两版都有完整战斗换装；[素材、调研与验收](../F9_RESONANCE_ART_DEMOS_2026-10-04.md)。属于比较原型，最终表现形式未选定，大纲仍独立维护。

2026-10-04 AI第三轮：[训练前后对照](../F9_AI_TRAINING_ROUND3_CONTEXT_REPORT_2026-10-04.md)解释1152／1472参数并记录每轮报告要求；60组死亡2→0、搜获121→53，健康空包退出阻止晋升。见[记录](./iterations/F9/2026-10-04-ai-training-context-round.md)，邮件／离屏未训练或重测。

2026-10-04 甩牌报刊插画：[ADR-0046](./decisions/ADR-0046-throw-editorial-illustration.md)参考用户News Tower录屏，统一平滑人物、建筑、道具、纸张界面和左右舞台；接替0045像素表现，保留原子资产、成人尺度和动态光。四种战斗视口、实际飞牌命中及真实练习失败返回见[本轮证据](./iterations/F9/2026-10-04-throw-editorial-illustration.md)；[严格验收](../F9_THROW_EDITORIAL_ART_ACCEPTANCE_2026-10-04.md)保留CPU强制回退、FPS和长期体验未验证项，剧情／规则保持。

2026-10-04 电梯持续内容：[挑战环境与道具经济草案](../F9_CHALLENGE_ENVIRONMENT_AND_ITEM_ECONOMY_DESIGN_2026-10-04.md)承接用户自动技能割草、道具配装与商店为主的养成、五类探索物资要求；提出14项挑战原子、条件耗电强化与有限商店闭环。[本轮范围](./iterations/F9/2026-10-04-elevator-challenges-and-shop-economy.md)区分官方调研、用户约束与候选细则；未改规则、未实装或验证平衡。

2026-10-04 AI第二轮：[Sol裁判实测](../F9_AI_TRAINING_ROUND2_SOL_REVIEW_2026-10-04.md)完成30状态偏好标注、真实权重更新和48组配对；数值通过，追击中换目标问题阻止替换现用模型。邮件／离屏12条纠错语料已存，Qwen未微调；[记录](./iterations/F9/2026-10-04-ai-training-sol-judge-round.md)注明非独立盲评。

2026-10-04 AI已启动：[首轮实测](../F9_AI_TRAINING_ROUND1_REPORT_2026-10-04.md)完成战术权重更新、独立种子评测与token统计；候选未过晋升，旧模型保持。邮件／离场仍为未微调基线，见[范围记录](./iterations/F9/2026-10-04-ai-training-first-round.md)，接替下方提案时的未训练状态。

2026-10-04 共鸣故事共创：[ADR-0044](./decisions/ADR-0044-resonance-outline-authoring.md)落实用户「先写完大纲，再选表现形式」的顺序；网站新增 `/outline`，七章草稿、情节点排序、待讨论问题、通读与本地项目保存。共同维护的数据源和验证见[本轮记录](./iterations/F9/2026-10-04-resonance-outline-authoring.md)，表现形式未选定。

2026-10-04 甩牌像素 V2：[ADR-0045](./decisions/ADR-0045-throw-atomic-pixel-scenes.md)将当前场景改为原子资产、统一成人／家具尺度、整数像素倍率、共同实时光照与人物帧动画；剧情和 `throw-duel-v3` 保持。[本轮证据](./iterations/F9/2026-10-04-throw-pixel-atomic-lighting.md)区分资产检查、实机截图与操作结果；[严格标准](../F9_THROW_PIXEL_V2_ACCEPTANCE_2026-10-04.md)保留软件回退等未验证项。

2026-10-04 AI训练补充：[内容开发期间的训练与补训建议](./iterations/F9/2026-10-04-ai-incremental-training-proposal.md)区分基础能力先训练、同机制内容先评测、新机制补执行和输入、核心改版重新训练；未启动训练。

2026-10-04 AI训练提案：[三场景训练闭环方案](../F9_AI_TRAINING_LOOP_PLAN_2026-10-04.md)参考「f9-电梯方向v2」现行正式票制与有限救援，提出统一选手、真实后果训练、封存评测、自动晋升与用户试玩门槛；[范围与证据](./iterations/F9/2026-10-04-ai-training-loop-proposal.md)明确未训练、未改变规则。

2026-10-04 甩牌现代西方 RPG 开场：[ADR-0043](./decisions/ADR-0043-throw-western-pixel-rpg-opening.md)落实用户指定的西方现代奇幻、像素横版、无跳跃行走、建筑与NPC交互。[新版剧本](../F9_THROW_WESTERN_MAGICIAN_RPG_V1_2026-10-04.md)保留个人夺冠目标；旧剧院街、导师练习、资格赛与启程已接通，后四幕仍为设计。五张生成资产、真实战斗返回、测试和浏览器证据见[本轮记录](./iterations/F9/2026-10-04-throw-western-rpg-opening.md)。

2026-10-04 AI实验：[完整邮件、目标保持与离屏成长](./iterations/F9/2026-10-04-ai-mail-and-offscreen.md)移除模板正文和旁白，新增本地模型离屏探索／建设／升层；记录真实推理、确定性重放、小模型失误与未集成边界。

最新共鸣方向：[ADR-0042 音乐治愈师与多心魔](./decisions/ADR-0042-resonance-healing-monsters.md)、[主线剧本](../F9_RESONANCE_HEALER_STORY_2026-10-04.md)。新版只保留玩家演奏，敌群独立行动；旧双歌曲对决保留历史入口。

2026-10-04 甩牌主线已选：[ADR-0041](./decisions/ADR-0041-throw-magician-personal-championship.md)记录用户选择流浪魔术师个人英雄主义：落寞魔术之乡出身、开场受嘲讽、乡村到世界冠军。[详细剧本](../F9_THROW_MAGICIAN_HERO_STORY_V0_2026-10-04.md)含四部作品调研、六格开场、17个关键场景与冠军返乡；人物、对白和赛事组织为草案，尚未实装。接替0038的世界观未选择状态，旧候选保留。

2026-10-04 共鸣歌曲实验：[ADR-0040](./decisions/ADR-0040-resonance-song-heroes.md)落实双方装备歌曲、歌曲能力与独立节拍、只播放我方音乐、发动音符。原创器乐《归途的小灯》及100 BPM变奏已接入独立共鸣首页；每格两拍与能力数字是助手首版细则，新版回放独立，旧版结果保持。[实现与操作证据](./iterations/F9/2026-10-04-resonance-song-heroes.md)区分已验证同步与待试听／平衡体验。

2026-10-04 电梯完整非AI赛季已实现：[ADR-0039](./decisions/ADR-0039-elevator-complete-season-with-finite-rescue.md)承接用户按SPEC全量开发授权，落实三层首票、四层集结广播、五层开赛、有限私人资源、十层共享金票、扔下、真实仓库救援与永久死亡，覆盖100层终局。[执行规格](../F9_ELEVATOR_FULL_FLOW_IMPLEMENTATION_2026-10-04.md)和[验收证据](./iterations/F9/2026-10-04-elevator-complete-season-acceptance.md)区分浏览器操作、全百层路线测试与待试玩平衡；AI自主决策未接入，旧版本兼容。下面0033为形成提案时的历史状态。

2026-10-04 甩牌整备优化：[ADR-0038](./decisions/ADR-0038-throw-workbench-and-world-candidates.md)落实全宽十格拖放、单遗物弹窗确认装备、红黑花色与少文本；规则保持。[五个世界观候选](../F9_THROW_WORLD_DIRECTIONS_2026-10-04.md)尚未选择，新主线未实装；[验证记录](./iterations/F9/2026-10-04-throw-workbench-and-worlds.md)明确浏览器验收被策略阻挡。

2026-10-04 项目边界调整：[ADR-0034](./decisions/ADR-0034-three-project-boundaries.md)确立三个独立正式项目（电梯、共鸣卡牌、甩牌）和一个本地电梯 AI 实验区。AI 完成前不进入电梯主项目或正式发布；旧混合工作台移入归档。详见[当前状态](./03_CURRENT_DESIGN.md)。

2026-10-04 甩牌规则承接：[ADR-0035](./decisions/ADR-0035-throw-card-duel-baseline.md)、[ADR-0036](./decisions/ADR-0036-throw-duel-selection-and-relic.md)、[ADR-0037](./decisions/ADR-0037-throw-duel-rhythm-and-loadouts.md)承接主动甩牌、单选／连续框选、遗物和十格行囊规则；分支原始记录完整保存在[归档目录](./archives/throw-card-duel-branch/)。

2026-10-04 卡牌玩法脑暴：[十套共鸣线套路候选](./iterations/F9/2026-10-04-wandeng-ten-rhythm-archetypes.md)回应用户允许创造机制的要求，含完整九格道具组、胜法、观看高潮和弱点。全部为未实装提案；没有把设计探索写成规则批准或平衡结论。

2026-10-04 电梯完整流程：[SPEC草案](../F9_ELEVATOR_FULL_FLOW_SPEC_2026-10-04.md)梳理三层引导、四层安全集结、五层开赛、私人楼层与共享据点、N减X金票和资源死亡。[ADR-0033](./decisions/ADR-0033-elevator-staging-golden-passes-and-mortality.md)区分用户流程约束与助手的有限救援、单人兑换、异步名册建议；新规则未实装，死亡和配额方案待选，历史竞速记录保留。[分析与证据](./iterations/F9/2026-10-04-elevator-full-flow-spec.md)。

2026-10-04 卡牌战斗呈现：[ADR-0032](./decisions/ADR-0032-wandeng-rhythm-combat-visuals.md)落实上下阵地、固定心灯与长血条、清晰弹道及伤害／治疗反馈；参考官方画面层级，演出参数自行设计。[证据与边界](./iterations/F9/2026-10-04-wandeng-rhythm-combat-visuals.md)区分可见性检查与待试玩体验，共鸣规则和回放不变。

2026-10-04 电梯首页优化：[ADR-0031](./decisions/ADR-0031-elevator-action-first-console.md)落实用户“少文本”约束，首页直接选层、缺票返回找票、显示暂停与审查条件；升级改为材料进度与选中后的消耗预览。[实际操作与检查](./iterations/F9/2026-10-04-elevator-console-clarity.md)区分可操作证据和待验证理解效率，玩法规则保持。

2026-10-03 卡牌最新修订：[首扫保底与独立共鸣线demo](./decisions/ADR-0030-wandeng-rhythm-first-entry-demo.md)已获用户批准并实装：每圈首次扫到卡立即发动、重置线冷却，速度与间隔分别调整；11卡、四套预设、排位与回放位于 `/wandeng/rhythm`。[执行与验证记录](./iterations/F9/2026-10-03-wandeng-rhythm-demo.md)区分规则事实与待校准数字；旧对局保留，观看体验待试玩。下方0028为历史提案状态。

2026-10-03 电梯最新修订：[仓库、分次投喂与销毁](./decisions/ADR-0029-elevator-warehouse-and-incremental-feeding.md)已接入。初始4×6格，首版每级增加4格；复用黑孔累计材料，齐备后升级；永久删除需明确确认。[迭代证据](./iterations/F9/2026-10-03-warehouse-and-interaction-polish.md)包含拖动、任务、视野、结算与节目广告优化。数值和平衡待试玩，既有配方、通行规则和历史回放保留。

2026-10-03 卡牌候选推进：用户指定深入细化双方节奏线，允许移除三路和屏障，见[ADR-0028](./decisions/ADR-0028-wandeng-rhythm-scan-direction.md)。[规则提案](./iterations/F9/2026-10-03-wandeng-rhythm-scan-proposal.md)讨论扫格、尺寸、拍点与有限联动；九格同步1秒等细则为助手建议，未批准、未实装，旧对局保持原版本。

2026-10-03 最新电梯实现：[百层竞速与通行证](../F9_RACE_AND_PASSES_IMPLEMENTATION_2026-10-03.md)已接入节目揭晓、共享签发、跨层支付、十层审查、晋级／淘汰及GM。见[ADR-0027](./decisions/ADR-0027-race-and-pass-prototype.md)。AI仍在独立分支，数字与竞争体验待试玩；下方“具体规则待选”是此前快照。

2026-10-03 本地模型后续：[Laya与F9专用模型方案](../F9_LOCAL_DECISION_MODEL_PROPOSAL_2026-10-03.md)核对开放权重和领域微调，建议先验证再蒸馏；用户明确Windows客户端与浏览器均须支持。双端约束已明确，模型、训练及完全离线范围未定，无模型下载／训练或玩法变更。见[记录](./iterations/F9/2026-10-03-local-decision-model.md)。

2026-10-03 Jev 调研：[可行性与预算](../F9_JEV_FEASIBILITY_2026-10-03.md)核实 TypeSafe 官方能力与弱项，建议优先验证为主要实时战术模型，并保留生成式策略层。用户尚未选择，1–2Hz 为实验起点，国内延迟与博弈能力未测，无 API 接入。见 [本轮记录](./iterations/F9/2026-10-03-jev-feasibility.md)。

2026-10-03 百层竞速：用户明确与AI竞争、抢先抵达100层的大目标，见[ADR-0026](./decisions/ADR-0026-race-to-floor-100.md)。[上升规则比较](../F9_ASCENT_RACE_RULES_PROPOSAL_2026-10-03.md)建议通行资源决定跨层、电梯升级负责长期能力、必经节点承载竞争；两种用户脑洞和具体规则尚未选定，未实装。见[记录](./iterations/F9/2026-10-03-ascent-race-rules.md)。

2026-10-03 内容开发承接：用户明确AI在另一个分支，本会话继续电梯内容。[现状评估与开发建议](../F9_GAME_CONTENT_ASSESSMENT_2026-10-03.md)核对教学／探索已有实现、成长止于居所2与听雨庭目标缺口；建议先完成正式三层及返程成长，再补构筑与生成。顺序未定、未实装；本轮107项电梯相关测试及边界／确定性检查通过。见[记录](./iterations/F9/2026-10-03-game-content-assessment.md)。

2026-10-03 实时落地讨论：用户认可大模型选手与晋级／淘汰的整体方向，具体规则继续展开。[房间行动、实时性与费用](../F9_REALTIME_LLM_CONTROL_AND_COST_2026-10-03.md)提出短战术与30Hz本地动作、离屏抽象模拟和官方API预算；架构未批准、未接入，延迟未实测。见 [本轮记录](./iterations/F9/2026-10-03-realtime-llm-control-and-cost.md)。

2026-10-03 后续：用户明确综艺候选必须以真正的大模型竞争者博弈与残酷晋级／淘汰为核心。见 [ADR-0025](./decisions/ADR-0025-llm-contestants-and-elimination-experience.md) 与 [深化方案](../F9_LLM_CONTESTANTS_AND_ELIMINATION_PROPOSAL_2026-10-03.md)。体验要求已明确；分层架构、有限名额、审查仪式等仍为未实装提案，整体主线尚未正式替换。

2026-10-03：用户要求探索“综艺大逃杀”候选，尚未选择替换主线。[八部作品调研与方案](../F9_DEATH_GAME_SHOW_PROPOSAL_2026-10-03.md)建议电梯休息室、主题赛场、公开晋级与倒下／淘汰分离；外勤额度、AI 选手和合同均待验证、未实装。见 [本轮记录](./iterations/F9/2026-10-03-death-game-show-proposal.md)。下方已接受题材保留历史状态，当前进入候选比较。

2026-09-30：用户接受电梯主线“我被取代了”的方向，要求持续攀爬动力、自洽替身原理、真实关系冲突与玩法联动。见 [ADR-0024](./decisions/ADR-0024-replacement-mystery-direction.md)。[底层框架推演](../F9_REPLACEMENT_FRAMEWORK_PROPOSAL_2026-09-30.md)中的现实修复设施、章节行动窗口和人物例子仍为提案，未实装。

2026-09-28 生存最新修订：[ADR-0023](./decisions/ADR-0023-survival-sight-brains-and-recovery.md) 实装死亡背包追回、四品质脑浆／20堆叠、怪物视野与脱战、双高度遮挡、16格背包和升级演出。取代旧的永久销毁背包、角色跟随灯和净水自动使用。

2026-09-28：[通用卡牌框架首个执行内核](./iterations/F9/2026-09-28-generated-card-framework-runtime.md)已接入结构化定义、严格校验、自动描述、10毫秒独立模拟、因果及快照恢复。见[入口和支持矩阵](../F9_CARD_FRAMEWORK_IMPLEMENTATION_2026-09-28.md)；旧对局未迁移，发布仍受未校准预算阻断。

2026-09-27 卡牌新入口：[六件新旧物与对战训练场](./iterations/F9/2026-09-27-wandeng-six-keepsakes-training.md)，独立 `/wandeng/training` 已接入用户六牌、原始／调校版本和锁定对手。实验不改变原50卡或旧回放；与随后批准的通用生成框架分开版本。

2026-09-27 新修订：[ADR-0022](./decisions/ADR-0022-survival-interaction-and-theme-creatures.md) 实装并存怪物预算、物品多选词条与主动补给、手动对话、电梯首页与主题鬼怪；[探索动机提案](../F9_SURVIVAL_ESCAPE_MOTIVATION_PROPOSAL_2026-09-27.md) 仅为待讨论建议。

2026-09-27 后续更新：[ADR-0021](./decisions/ADR-0021-themed-kits-and-jiangnan-sample.md) 采纳主题资产包复用方向，实装“听雨庭”江南样板与三套配色／陈设。新第三层使用雨夜庭院；旧沙岩快照保留。通用随机关卡生成器仍待后续。


2026-09-27 最新更新：[ADR-0020](./decisions/ADR-0020-survival-needs-guidance-and-ascent.md) 已接入饥渴／精神力强弱引导、50 阈值效果、二层半面积与矮墙、手动返程结算及拖拽教学、升级与单向第三层。生成方案单列为待讨论提案，旧地图快照保留。


2026-09-27 后续更新：[ADR-0019](./decisions/ADR-0019-terminal-tabs-meal-and-floor-selection.md) 接入统一系统 Tab、极简行囊、62 阶段 GM，以及“黑孔吐面包 → 主动吃掉 → 解锁饥渴 → E 选二层”。第二次及后续出发均须先选层；当前只接通二层。局部取代 ADR-0018 的直接出发及战后首次显示饥渴。

2026-09-27 更新：[ADR-0018](./decisions/ADR-0018-pixel-terminal-and-second-expedition.md) 已接入细像素 UI、黑脸红眼恶魔、电梯系统、顶灯及 18–34 维保廊引导。可选保护、真实相邻、提前返回和本地继续已接通；未来升级仍是预览。


## 2026-09-27：归物师最新 UI

后续[战斗可读性与首轮公开组牌](./iterations/F9/2026-09-27-wandeng-readability-and-first-deck.md)：数字与飘字加粗，桌面/卡面降亮，弹道加强；助手已锁定「炉火不熄」，等待用户阵容。

最新视觉方向：[精细像素美术](./iterations/F9/2026-09-27-wandeng-pixel-art.md)已替换现有插画、中文字体、图标与材质，保留温馨可爱氛围和原战斗。素材及完整生成提示词位于 `public/art-assets/wandeng/pixel/`。

后续已实装[护幕、心灯与战斗反馈](./iterations/F9/2026-09-27-wandeng-soul-battle-feedback.md)：数字背后的效果图标、五档品质材质、同路垂直弹道和越界飘字。此修订局部取代下方纯数字与仅色点区分品质的表现，玩法基线不变。

`/wandeng` 已按用户新参考实装奶油纸、暖棕圆润文字、白边物品卡与收藏册图鉴。视觉方向与边界见 [本轮记录](./iterations/F9/2026-09-27-wandeng-cozy-ui.md)，战斗规则仍以下方恢复基线为准。

## 2026-09-27：先看战斗基线恢复

用户明确卡牌方向只换二维表现，继续采用 50 卡与每路增幅器的原战斗。见 [ADR-0017](./decisions/ADR-0017-wandeng-arena-baseline.md) 和 [实装核对](./iterations/F9/2026-09-27-wandeng-combat-restoration.md)。后续 [自制卡脑暴](../F9_WANDENG_CUSTOM_CARDS_BRAINSTORM_2026-09-27.md) 仅为提案，尚未实现。


当前电梯生存入口：[`/survival` 返程与首次开灯](./decisions/ADR-0016-lift-host-and-first-light.md)，取代此前 1 X 修复流程；[后续 18–34 步方案](../F9_SURVIVAL_AFTER_LIGHTS_DESIGN_2026-09-26.md)尚未实装。


当前归物师实装入口：[`/wandeng` 开场与三程旅途](../F9_WANDENG_PROTOTYPE_2026-09-26.md)。规则按 [ADR-0014](./decisions/ADR-0014-wandeng-ransom-and-opening.md)：玩家战败用路费赎回全部伙伴；不指定物品、不在途中赠送，只在终局统一送达。旧 v0 的途中归家与玩家掉牌已被局部取代。

这套日志不是聊天记录的备份，而是给未来的设计者、开发者和 Agent 使用的“可执行设计知识库”。目标是：一个不了解 AIBazaar 的新 Agent，只阅读本目录和被引用的系统文档，就能理解我们为什么这样设计，并据此设计出具有相似体验目标、但不必复制具体内容的新游戏。

## 先读什么

1. [设计 DNA](./01_DESIGN_DNA.md)：稳定的设计原子，以及由多个原子组成的完整机制组合。
2. [玩家体验模型](./02_PLAYER_EXPERIENCE.md)：玩家每一阶段应该感受到什么、做什么决定、承担什么代价。
3. [当前设计状态](./03_CURRENT_DESIGN.md)：区分已实现、已决定、提案和仍未验证的内容。
4. [决策记录](./decisions/README.md)：为什么选择某条规则，以及放弃了什么。
5. [迭代记录](./iterations/README.md)：每次设计/原型迭代改变了什么，证据是什么。
6. [测试记录](./playtests/README.md)：真实玩家或结构化试玩产生了什么证据。

## 这套日志记录什么

记录会影响以下内容的讨论：

- 玩家目标、核心乐趣、节奏、决策压力和失败体验；
- 设计原子：单个可复用的规则、反馈、资源或决策模式；
- 设计机制组合：一段完整玩法循环中，哪些机制按什么顺序协作，以及为什么这样组合；
- 规则、数值、信息呈现、奖励结构、成长和风险回收方式的变化；
- 对“好不好玩”的假设、证据和仍未验证的风险。

普通 debug、构建日志和不改变设计理解的技术细节不进入这里。只有当 bug 暴露了一个设计规则、证明了某个设计假设，或迫使我们改变玩家体验时，才建立迭代或决策记录。

## 记录机制

每次设计讨论结束时，先判断讨论产物：

| 产物 | 写入位置 | 规则 |
| --- | --- | --- |
| 稳定原则、可迁移规则 | `01_DESIGN_DNA.md` | 只保留已经接受的规则；有争议的内容放决策记录 |
| 一套完整玩法循环的协作方式 | `01_DESIGN_DNA.md` 的“机制组合” | 必须写清顺序、输入/输出、组合理由、约束和证据 |
| 一次选择或取舍 | `decisions/ADR-*.md` | 不删除旧决策，用新 ADR 取代并互相链接 |
| 一次设计实验、版本迭代 | `iterations/<版本或主题>/*.md` | 写目标、改动、观察、结论和下一步 |
| 玩家试玩、可玩性验证 | `playtests/*.md` | 把观察事实与设计解释分开 |
| 当前实现/提案快照 | `03_CURRENT_DESIGN.md` | 只做导航和状态汇总，不代替历史记录 |

## 写作约束

- 明确区分“事实”“决定”“假设”“证据”“风险”和“待验证问题”。
- 不把实现细节自动当作设计价值；要写清它为玩家带来了什么选择或反馈。
- 不只列机制名称，要记录机制之间的因果链：前一步产生什么，为什么交给下一步，下一步如何反过来改变前一步。
- 机制组合必须写出可迁移的结构，但同时标明 AIBazaar 的具体实现，避免未来 Agent 只会机械复刻。
- 任何重要数字都写明来源：已测量、暂定、设计占位，或待验证。

## 当前导航

- [电梯生存：返程与首次修复](./iterations/F9/2026-09-26-survival-homecoming-refinement.md)：迷雾、电筒视野、即时材料、相邻教学与携物再出发；接续首次返程。
- [电梯生存：梦中荒原开场](./iterations/F9/2026-09-26-survival-dream-opening.md)：用户指定 20 步、真实首次战斗和返程；与独立卡牌世界观分开。

- [当前：万灯城归物师核心骨架](../F9_WANDENG_SOULS_CORE_DESIGN_V0_2026-09-26.md)：物灵、修复、同行、对决失散与归家；区分用户世界设定和玩法提案。
- [归物委托机制组合 MC-05](./01_DESIGN_DNA.md#mc-05-归物委托中的收集修复同行与归家)
- [独立卡牌联赛核心骨架](../F9_CIRCUIT_LEAGUE_CORE_DESIGN_V0_2026-09-26.md)：巡回器具师、60–90 分钟、局外图鉴与局内培养；区分已定方向与系统提案。
- [巡回联赛机制组合 MC-04](./01_DESIGN_DNA.md#mc-04-巡回联赛中的收集与单局成长)
- [F9 相关设计文档索引](./iterations/F9/INDEX.md)
- [战斗机制组合](./01_DESIGN_DNA.md#mc-01-战斗机制组合)
- [卡牌机制组合](./01_DESIGN_DNA.md#mc-02-卡牌机制组合)
- [电梯楼层机制组合](./01_DESIGN_DNA.md#mc-03-电梯楼层机制组合)
