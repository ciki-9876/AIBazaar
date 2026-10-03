# AI 生成卡牌：数据规范 v0

批准更新（2026-09-27）：用户已确认本版通过，并授权开发会话据此补充迭代，核心目标为建立卡牌设计与开发的底层框架。下文“待确认／建议”为审稿时措辞，现作为实施基线；数值仍需校准、性能仍需验证，文档通过不等于功能已实装或卡牌已平衡。见[批准与开发交接记录](./design-log/iterations/F9/2026-09-27-generated-card-framework-approved.md)。

日期：2026-09-27｜修订：draft-0.2｜状态：**根据用户批注修订；待审阅，仅文档，未实现**。

配套：[机制词库 v0](./F9_GENERATED_CARD_MECHANISM_LEXICON_V0_2026-09-27.md)。[本轮修订记录](./design-log/iterations/F9/2026-09-27-generated-card-spec-v02.md)。本文是数据合同设计，不是已接入的 JSON Schema，不替换现有存档。

## 1. 本次修订与责任边界

本版随词库增加独立攻击力、攻击力系数、控制与攻击力增减、有限连锁、随机多目标及特殊规则；将触发与条件统一到 `when`；时间单位统一为整数毫秒；腐化属于对局规则，不允许每张卡自行定义。

| 数据层 | 内容 | 写入者 |
| --- | --- | --- |
| GenerationRequest | 物品素材、意愿、规则与强度边界 | 系统组织；素材由玩家提供 |
| CardDraft | 展示文案、结构化机制、设计理由 | AI或人工提出 |
| CardBlueprint | 固化定义、稳定身份、版本、内容指纹 | 系统在审核后创建 |
| CardInstance | 拥有者、蓝图引用、实例身份、成长 | 游戏状态系统 |
| ValidationReport | 合法性、预算、模拟、描述一致性证据 | 校验器与模拟器 |
| BattleSnapshot | 实际使用的完整规则、卡牌、随机与战斗状态 | 游戏状态系统 |

模型不能自报验证通过、发行卡牌、修改对局规则或提交可执行脚本。未知创意保留在设计说明，不能伪装成已支持效果。本文不绑定 Laya 或其他模型。

## 2. 生成请求与版本

`GenerationRequest` 必填 `requestId`、`itemInput`、`preferences`、`context`，可选 `parentDraftRef`。素材、记忆和玩家要求只作为内容输入，不具备覆盖系统约束的权限。

`context` 包含 `schemaVersion`、`mechanismVersion`、`ruleProfileId`、`constraintsProfileId`、`allowedSizeCells`、`rarityTier`、`level`、`quality`、`budgetPolicyRef`。

本稿建议注册名：

- 数据版本：`f9-generated-card/0.2-draft`。
- 机制版本：`f9-card-lexicon/0.2-draft`。
- 对局配置：`generated-core-v0.2`。
- 生成约束：`generated-review-v0.2`。

这些注册项尚未实现。首轮 Lv0、品质0；稀有度由请求指定，取0～4。`budgetPolicyRef=null` 表示预算策略未建立，允许设计审阅，**不允许发布**，不能解释为无限预算。模型必须遵守请求中的版本与边界。

提交草案时，两个版本字段提升到草案顶层；其余约束保留在 `context`。系统按此映射与请求比对。

## 3. 卡牌草案

| 字段 | 说明与约束 |
| --- | --- |
| schemaVersion / mechanismVersion | 必须精确匹配请求 |
| context | 规则、约束、预算、等级与品质，不由模型提升 |
| presentation | name、flavorText、rulesTextDraft；纯展示，不驱动效果 |
| mechanics | sizeCells、rarityTier、baseAttack、cooldownMs、chainEntryAbilityId、abilities、specialRules |
| designNotes | 意图、预期配合、代价、未支持创意与待确认事项；不执行 |

`sizeCells` 取1、2、3，对应小中大。`baseAttack` 是独立属性，治疗卡也可有攻击力；攻击力为0的卡仍可提供充能或特殊效果。`cooldownMs` 是周期能力的基础冷却；无周期能力时为 `null`，不能用0表示无限触发。

每张卡最多一个 `cooldown_ready` 周期入口；其他能力通过事件触发。首轮建议最多4个能力，每个最多4个效果、整卡最多8个效果、最多1个特殊规则。这里是拟议复杂度限制，不是强度预算。

`chainEntryAbilityId` 指向公开给连锁调用的能力，或为 `null`。被指定能力不得依赖调用上下文中不存在的伤害字段；连锁触发重新选择目标、取自身攻击力快照，并遵守冻结、条件、次数与资源限制。它不消耗或重置自然冷却。

## 4. 统一能力结构与 when

每个能力包含 `id`、`when`、`delivery`、`effects`、`limits`。`id` 在蓝图内唯一且修订可追踪；`effects` 的数组顺序就是效果顺序。

| when 字段 | 含义 |
| --- | --- |
| event | 词库中的精确事件标识 |
| subjects | 监听对象选择器；全局事件为null |
| filters | 该事件允许的过滤字段；无过滤用空对象 |
| guards | 事件到来时检查的状态条件数组，全部满足才通过 |
| occurrence.everyNth | 每第N个合格事件触发一次，正整数，默认1 |

事件目录与词库一致：

- 时间与启动：`battle_started`、`time_reached`、`interval_elapsed`、`cooldown_ready`、`card_activated`、`chain_received`、`cooldown_advanced`。
- 伤害与恢复：`damage_dealt`、`damage_received`、`barrier_broken`、`healing_done`、`healing_received`、`repair_done`、`barrier_repaired`、`barrier_zero`、`barrier_grace_started`、`barrier_grace_ended`。
- 状态与全局：`status_applied`、`status_removed`、`status_expired`、`attack_changed`、`stat_crossed`、`corruption_started`、`corruption_pulse`、`battle_ended`。

`battle_ended` 仅用于记录，不能再产生战斗或奖励效果。弹药、变形、卡牌进出场等尚待模块支持的事件，不进入当前可发布枚举。

`filters` 按事件分型：`time_reached` 必须有 `atMs`；`interval_elapsed` 必须有 `firstAtMs`、`periodMs`；`card_activated` 可用 `activationKinds`（cycle/reactive/chain）；伤害事件可用 `damageKinds`（physical/burn/corrosion/corruption）；状态事件可用 `statusKinds`。`stat_crossed` 必须给 `stat`、`threshold`、`direction`，仅越过阈值时发生。其他不适用字段拒绝。

`guards` 使用登记的谓词，不接受自由表达式。例如 `barrier_state` 配合 `side`、`scope`、`states`；`stat_compare` 配合对象选择器、允许的属性、比较符和常数。允许属性仅为当前攻击力、护幕生命／比例、核心生命／比例、冷却剩余时间；比较符仅为 lt/lte/eq/gte/gt。每种谓词要求的字段必须完整，未知字段拒绝。更复杂条件先作为创意保留。

事件计数在过滤与条件通过后递增，内置冷却期间也计数；错过第N次不排队补发。周期到期即消费一次周期，条件不成立也不回滚时间；响应能力须条件通过且至少提交一个合法目标，才记为发动。合法效果实际收益为0，仍可消费发动次数。

非周期能力的 `limits` 必须明确 `internalCooldownMs` 与 `maxActivationsPerBattle`；周期能力可为null，若被公开为连锁入口则同样必须填写限制。响应与连锁共用该能力的次数和内置冷却，不能因调用来源不同规避。

`delivery` 取 `instant` 或 `projectile`；后者必须填写 `travelMs`，首轮建议1250。特殊模块安装不经过普通弹道。能力提交时冻结攻击力、条件和目标；抵达时读取目标承伤状态。目标失效则跳过并记原因，不重选、不重新随机。

## 5. 选择器

统一字段为 `entity`、`side`、`scope`、`excludeSelf`、`filters`、`selection`、`sampling`。

| 字段 | 取值／约束 |
| --- | --- |
| entity | card / barrier / core / lane |
| side | ally / enemy / both，相对于能力拥有者 |
| scope | 结构化对象，见下表 |
| excludeSelf | 是否排除来源卡；非卡实体须false |
| filters | sizes、hasCooldown、barrierStates、statusKinds；仅使用实体适用字段 |
| selection | mode 为 all / first / random / highest / lowest；除all外填写count，极值选择还须metric |
| sampling | 普通效果用at_submit；随机监听集合与特殊模块安装用battle_start |

| scope.kind | 适用范围 |
| --- | --- |
| self | 来源卡自身，仅card、ally |
| same_lane / adjacent_lanes | 来源所在路／相邻路，适用于card、barrier、lane |
| fixed_lanes | 必填lanes，取left/center/right，适用于card、barrier、lane |
| adjacent_left / adjacent_right / adjacent_both | 卡牌占格边缘相邻；敌方按同路投影位置计算 |
| opposing_overlap | 对面同路与来源占格相交的卡；仅enemy、card |
| all | 指定阵营全部合法实体 |
| event_source / event_target | 当前事件指向的实体；必须与entity类型匹配 |

极值指标只允许与实体匹配的 `attack`、`cooldownRemainingMs`、`healthRatio`。排序平局按阵营、路、占格起点、实例UID稳定排序。多格卡只算一次；核心每方只算一个，不能因三路重复选中。

随机为等概率、不放回，数量不足取全部。先形成稳定候选列表，再用对局种子、事件ID、效果ID与抽样序号派生随机流；算法版本必须冻结，禁止使用墙上时间。监听对象的随机集合在开战时固定；效果随机目标在每次提交时抽取。具体随机算法与无偏抽样实现须后续登记和测试，算法未注册时不能运行或发布。

`distribution` 为 `per_target`（每个目标完整数值）或 `split_total`（总量均分）。仅数值型伤害、施加灼烧／侵蚀、修屏、治疗支持均分；控制、充能、连锁、攻击力修改必须为per_target。均分按0.01精度向下分配，余量依稳定顺序补齐。

## 6. 效果与数值来源

效果字段为 `id`、`kind`、`target`、`distribution`，再根据kind填写 `magnitude` 或 `params`；不适用字段禁止出现。

| kind | 数值／参数 | 合法目标 |
| --- | --- | --- |
| physical_damage | magnitude | lane、barrier、core |
| apply_burn | magnitude，表示新增强度 | lane |
| apply_corrosion | magnitude，表示新增强度 | lane |
| repair_barrier | magnitude | barrier |
| heal_core | magnitude | core |
| haste / slow | params.rateBps、durationMs | card |
| advance_cooldown | params.amountMs | 有周期冷却的card |
| trigger_chain | params为空对象 | 具备公开连锁入口的其他card |
| freeze | params.durationMs | card |
| modify_attack | params.mode（flat/percent）、delta、durationMs | card |

三种 magnitude：

- `fixed`：`value`，非负固定数值。
- `attack_ratio`：`ratioBps` 与可空的 `cap`，读取本次提交时来源卡当前攻击力。
- `event_ratio`：`field`、`ratioBps` 与可空的 `cap`，读取当前事件实际生效量。

10000基点＝100%；系数可高于100%。`event_ratio.field` 限 `barrierLoss`、`coreLoss`、`totalLoss`、`effectiveAmount`；前3个仅用于伤害事件，最后一个仅用于治疗／修屏事件。以实际扣血／恢复计算，不能使用过量伤害或过量治疗；充能毫秒不能当作伤害数值。事件不提供相应字段即拒绝，不能默认为0。

攻击力计算、状态叠加及持续伤害按配套词库：固定增减后乘百分比增减之和，最低0；同源状态刷新，不无限叠加。冻结暂停新周期、响应及连锁，不抹去已经提交的弹道或持续伤害。

特别注意：25%攻击力灼烧在本稿表示新增灼烧强度。攻击力40得到强度10，独立结算10、9……1共55，绝非总伤害10。预算必须计入完整持续收益。该解释仍待用户确认。

物理选择lane表示先护幕再溢出核心；选择barrier表示只伤护幕、不溢出；选择core表示绕过护幕，必须在描述和预算中明确。灼烧、侵蚀只选lane，不自动获得直击核心能力。

工程边界与平衡分开：所有数值须有限、类型正确，不接受NaN、负伤害或无穷值；时间为10毫秒整倍数且冷却必须正数。具体数值最大值由版本化约束表登记，未登记时不能发布。词库中的状态持续上限、灼烧／侵蚀强度上限和连锁上限都是待校准建议，不可代替强度预算。

## 7. 特殊规则模块

`specialRules` 中每项包含 `id`、`specialId`、`version`、`target`、`params`。模块必须预先登记参数结构、适用实体、介入阶段、状态字段、与其他规则的优先级、文本模板及测试。AI只可选择已开放模块，不能发明脚本、钩子名称或执行顺序。

“护幕零血延缓破损”示例片段：

```json
{
  "id": "grace",
  "specialId": "barrier_break_grace",
  "version": "1-draft",
  "target": {
    "entity": "barrier", "side": "ally", "scope": { "kind": "same_lane" },
    "excludeSelf": false, "filters": {},
    "selection": { "mode": "first", "count": 1 }, "sampling": "battle_start"
  },
  "params": { "durationMs": 5000, "usesPerBarrier": 1 }
}
```

这是拟议模块，尚未注册实现。开战时安装在一个护幕；在 `before_barrier_break` 阶段介入，不能用事后的普通事件倒转破损。

运行态须记录 `state`（intact/pending_break/broken）、`graceExpiresAtMs`、`graceUsesConsumed`、`graceProviderRef`。零血进入pending_break，仍保留增幅器身份，但零血护幕不吸收伤害；原次溢出与后续路伤害进入核心。延缓期间修到正血可恢复intact，保护次数不退；到期仍零血则破损。到期先于同刻修屏结算。同一护幕每战共一次，多来源取最长时长再按稳定身份决胜，不能逐个轮流续命。

## 8. 对局规则配置：细时间与腐化

下列是对局配置示意，不是卡牌可生成的字段。具体数值为待确认建议：

```json
{
  "id": "generated-core-v0.2",
  "timing": { "stepMs": 10, "defaultProjectileMs": 1250 },
  "numericPrecision": 2,
  "chain": { "maxDepth": 8, "maxAbilityCommitsPerRoot": 64, "oncePerAbilityPerRoot": true },
  "corruption": {
    "enabled": true,
    "startsAtMs": 90000,
    "firstPulseAtMs": 91000,
    "periodMs": 1000,
    "firstDamagePerLane": 1,
    "damageIncrementPerPulse": 1,
    "sides": "both",
    "routing": "each_lane_barrier_then_core"
  },
  "safety": { "maxSimulationMs": 300000, "onLimit": "SIMULATION_BUDGET_EXCEEDED" }
}
```

100Hz逻辑与界面逐帧插值分开，性能需要验证；加减速后的冷却进度用定点精度累计，不能逐步取整导致慢速永不推进。渲染帧率与后台暂停不得改变战果。

第n次腐化每路伤害为1+(n−1)，双方三路共6个伤害包。护幕全破后，每方核心该秒共承受3n；这不是“每方总共n伤害”。腐化无来源卡，不受攻击力影响、不触发来源卡吸血／造成伤害事件，也不削减护幕上限；显式订阅corruption的承伤能力可响应。每轮只发一次 `corruption_pulse`。

90秒启动压力，不判平；同批双方致死才判平。达到工程模拟上限返回错误，不伪装成平局或胜负。词库规定的到期、伤害、破损、因果响应、新周期与死亡裁决顺序必须随规则版本冻结，不能由数组遍历顺序偶然决定。

## 9. 因果、运行态与回放

事件信封至少包含 `eventId`、`rootEventId`、`parentEventId`、`depth`、`visitedAbilities`、`atMs`、`sourceRef`、`targetRefs`、`payload`。所有身份由系统产生。

同一能力实例在同一根事件中最多发动一次；达到词库深度／总次数上限，抑制后续能力并记录明确原因。普通因果抑制属于规则结果；异常事件爆量属于错误，不能吞掉错误后宣称正常胜负。

充能直接引出的周期沿用原根事件，自然时间推进后新的周期才开新根。持续伤害保存贡献来源与路径，后续滴答不能清空路径绕过环路检测；混合来源时按词库归因与路径合并规则处理。延迟事件未结算完，不能提前丢弃根事件账本。

运行态至少保存：冷却进度、能力次数／内置冷却／第N次计数、状态来源与到期、护幕保护状态、弹道、持续伤害贡献、监听随机集合、事件队列及稳定次序、根事件账本、随机算法版本与计数器、腐化轮次。静态定义与运行态分开。

开战快照嵌入本局完整蓝图及规则／模块／随机算法的版本和内容指纹，不能只存外部URL。中途续局还需保存上述运行态；种子本身不足以恢复已进行一半的战斗。保存抽样目标用于诊断，并通过确定性重放比对。

## 10. 完整草案示例：留温杯

以下是待审阅草案，数值不是平衡结论，`budgetPolicyRef` 为空，因此不可发布。

```json
{
  "schemaVersion": "f9-generated-card/0.2-draft",
  "mechanismVersion": "f9-card-lexicon/0.2-draft",
  "context": {
    "ruleProfileId": "generated-core-v0.2",
    "constraintsProfileId": "generated-review-v0.2",
    "allowedSizeCells": [1, 2, 3],
    "rarityTier": 0, "level": 0, "quality": 0,
    "budgetPolicyRef": null
  },
  "presentation": {
    "name": "留温杯",
    "flavorText": "留一点温热，等你回来。",
    "rulesTextDraft": "每6秒治疗我方核心，数值为攻击力的100%；若本路护幕完整或处于延缓破损状态，再修复护幕，数值为攻击力的75%。"
  },
  "mechanics": {
    "sizeCells": 1, "rarityTier": 0, "baseAttack": 8,
    "cooldownMs": 6000, "chainEntryAbilityId": null,
    "abilities": [
      {
        "id": "warmth",
        "when": {
          "event": "cooldown_ready",
          "subjects": {
            "entity": "card", "side": "ally", "scope": { "kind": "self" },
            "excludeSelf": false, "filters": {}, "selection": { "mode": "all" }, "sampling": "at_submit"
          },
          "filters": {}, "guards": [], "occurrence": { "everyNth": 1 }
        },
        "delivery": { "kind": "instant" },
        "effects": [
          {
            "id": "heal", "kind": "heal_core", "distribution": "per_target",
            "target": {
              "entity": "core", "side": "ally", "scope": { "kind": "all" },
              "excludeSelf": false, "filters": {}, "selection": { "mode": "all" }, "sampling": "at_submit"
            },
            "magnitude": { "kind": "attack_ratio", "ratioBps": 10000, "cap": null }
          },
          {
            "id": "repair", "kind": "repair_barrier", "distribution": "per_target",
            "target": {
              "entity": "barrier", "side": "ally", "scope": { "kind": "same_lane" },
              "excludeSelf": false, "filters": { "barrierStates": ["intact", "pending_break"] },
              "selection": { "mode": "all" }, "sampling": "at_submit"
            },
            "magnitude": { "kind": "attack_ratio", "ratioBps": 7500, "cap": null }
          }
        ],
        "limits": null
      }
    ],
    "specialRules": []
  },
  "designNotes": {
    "intent": "稳定恢复，兼顾本路护幕",
    "tradeoff": "无直接攻击，修屏要求本路护幕仍可修复",
    "unsupportedIdeas": [],
    "reviewNotes": ["数值待预算与模拟校准"]
  }
}
```

效果目标过滤只影响该效果：护幕破损会跳过修屏，不能连带取消治疗。禁止把该过滤提升为整项能力的guard。

词库其他样例对应：火星盒 baseAttack=40、cooldownMs=6000，物理ratioBps=10000、灼烧ratioBps=2500，目标敌方same_lane；伴行小铃监听己方adjacent_both的card_activated且activationKinds=[cycle]，目标己方fixed_lanes=[left]、hasCooldown=true、random取2，每目标充能500ms，内置冷却3000ms、每战30次；余光护罩 baseAttack=0、cooldownMs=null、abilities为空，仅安装第7节特殊模块。它们仍是未通过预算的设计样例。

## 11. 定稿、身份与生命周期

生命周期：`draft → structurally_valid → balance_pending → review_ready → approved → published`；失败记为rejected并保留原因。当前没有预算策略与模拟证据，最多进入balance_pending，不能越级。用户确认文档设计不等于批准任何样例牌发行。

蓝图由系统添加 `blueprintId`、`revision`、`parentRevisionRef`、`mechanicsHash`、`contentHash`、`validationReportRefs` 与发布状态。修订创建新版本，不原地改写已发行定义；卡牌实例保存独立 `instanceId` 与精确蓝图版本引用。

规范化序列化须固定键序、数值表达、Unicode处理及哈希算法版本；效果数组等有意义顺序不能随意排序。禁止把临时时间戳或模型措辞混进机械身份。mechanicsHash包括机制及规则依赖，contentHash包含展示内容；不能仅改能力ID或展示文字就绕过重复检测／强度限制。

发布、领取与资源扣减采用一次原子提交；失败不部分消耗库存、货币、次数或生成额度。重试用requestId和提交幂等键去重，不能重复发卡。

旧版0.25秒单位、既有50卡和训练牌不自动迁移；需要明确迁移映射与行为对照。旧回放继续使用原版本，不能因为新解释器增加攻击力或腐化而改变旧战果。

## 12. 验证报告与强度预算

报告至少记录 `reportId`、蓝图草案指纹、规则／词库／约束／预算版本、校验器版本、模拟器版本、种子集、检查项及结果、warnings、blockingReasons、生成时间。没有真实执行的检查标not_run，不标passed。

顺序为：结构合法 → 引用与字段类型 → 语义及可达性 → 描述一致性 → 静态预算 → 固定场景模拟 → 回放一致性 → 人工审阅。运行失败与数据拒绝都需可读原因。

预算必须考虑频率、目标数、split_total/per_target、攻击力放大、完整持续伤害、充能与控制、连锁收益、跨路／绕盾、特殊保护及条件的真实覆盖率。稀有度不是超预算豁免；不能只按伤害除冷却比较恢复或控制。具体权重尚未建立，不能宣称已保证平衡。

后续必须覆盖的情景：

- 攻击力0、百分比削弱超过100%、同源刷新与异源叠加、到期同刻发动。
- 随机不足目标、目标失效、多格去重、双方核心去重、多目标均分余量。
- A→B→A、充能即时到期、冻结与连锁同时发生、持续伤害延迟回环。
- 护幕零血延缓、溢出核心、期间修复、到期同刻修复、多来源争抢保护。
- 90000ms仅启动、91000ms首轮腐化、三路溢出、同轮双方致死及工程超时。
- 相同快照与种子产生相同事件、抽样和战果；中途存取后与连续运行一致。

## 13. 本轮待确认

优先确认词库提出的六项：灼烧系数解释、攻击力加减顺序（以及状态叠加）、10毫秒时间粒度、连锁约束、护幕延缓承伤、三路腐化数值。数据结构随这些语义固化；本轮不实现模型接入、解释器或验证器，不把建议写成现行规则。

