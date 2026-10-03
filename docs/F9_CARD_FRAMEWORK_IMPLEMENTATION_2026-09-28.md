# 结构化卡牌框架：首个可执行版本

依据用户已批准的[机制词库](./F9_GENERATED_CARD_MECHANISM_LEXICON_V0_2026-09-27.md)、[数据规范](./F9_GENERATED_CARD_DATA_SPEC_V0_2026-09-27.md)及[开发交接](./design-log/iterations/F9/2026-09-27-generated-card-framework-approved.md)。这是独立沙盒执行内核，**未完成全部规范扩展，也未获平衡认证**。万灯城原50卡、六张训练牌和旧回放没有被迁移。

## 入口与一次完整验证

统一代码入口 `lib/card-framework/index.ts`。运行 `node --experimental-strip-types scripts/card-framework-demo.mjs` 会：

1. 编译留温杯、火星盒、伴行小铃、余光护罩四张文档样例。
2. 从同一份结构化定义生成规则文字，生成蓝图内容指纹及编译报告。
3. 创建双方实例并执行真实对局。
4. 在6310毫秒保存包含在途效果的完整状态，再恢复并比较最终事件和战果。
5. 将输入、报告、中途及最终快照写入 `outputs/card-framework/`。

这条验证不需要模型、账号、网络或Laya。人工填写和未来模型输出共用 `compileDraft`，不能根据文案直接执行，也没有卡牌ID对应的特殊效果分支。

最小用法：

```ts
import {
  compileDraft, createBattle, runBattle, advanceBattle,
  saveBattle, loadBattle, PROFILE,
} from './lib/card-framework/index.ts';
import { WARM_CUP, SPARK_BOX } from './lib/card-framework/samples.ts';

const cup = await compileDraft(WARM_CUP, { blueprintId: 'my-cup' });
const spark = await compileDraft(SPARK_BOX, { blueprintId: 'my-spark' });
if (!cup.blueprint || !spark.blueprint) throw Error('检查报告中的拒绝原因');
const initial = await createBattle({
  profileId: PROFILE.id,
  seed: 123,
  blueprints: [cup.blueprint, spark.blueprint],
  instances: [
    { instanceId: 'cup-1', blueprintId: 'my-cup', revision: 1,
      side: 0, at: 0, level: 0, quality: 0 },
    { instanceId: 'spark-1', blueprintId: 'my-spark', revision: 1,
      side: 1, at: 0, level: 0, quality: 0 },
  ],
});
const halfway = advanceBattle(initial, 6310);
const restored = await loadBattle(saveBattle(halfway));
const result = runBattle(restored);
```

新增卡只需新建 `CardDraft` 的表现、属性、when、效果、目标与限制，再调用编译器；不需要改调度器。新增**机制类型**必须登记结构、校验、执行及描述，并增加行为测试；未知类型被拒绝。已有版本禁止原地改语义，修订创建新蓝图版本。

## 当前支持矩阵

| 系统 | 已执行 | 本版明确拒绝／未接通 |
| --- | --- | --- |
| 数据 | 请求边界校验、严格字段、稳定蓝图和实例身份、规范化SHA-256、独立内容／机制指纹 | 发布库、审核后台、持久化收藏系统 |
| 数值 | 独立ATK，固定／攻击力系数／事件实际量系数，0.01伤害精度 | 未登记数值表达式和自由脚本 |
| 基础效果 | 物理、灼烧、侵蚀、修屏、治疗、加速、减速、冻结、充能、连锁、ATK修改 | 弹药、储能、复制、变形、持续光环模块 |
| 触发 | 开战、指定时间、间隔、周期、发动、连锁、充能、实际伤害／恢复、护幕状态、状态施加／到期、ATK变化、腐化 | `stat_crossed`、`status_removed`；`battle_ended`只写日志，不能作效果入口 |
| 条件 | `barrier_state`、`stat_compare`及合格事件第N次；能力间隔／次数 | 词库宽泛创意中未提供结构的谓词，不猜测执行 |
| 目标 | 敌我／双方、真实邻接、投影相邻、对位、指定／相邻路线、尺寸／状态／冷却筛选、多目标、极值、固定随机监听、每次效果随机 | 动态进出场和重选失效弹道目标 |
| 连锁 | 根事件账本、已访问能力、深度8、每根64次；充能到期继承原根；持续伤害路径合并 | 未定义资源消耗、任意入口脚本 |
| 特殊模块 | `barrier_break_grace/1-draft`：一次保护、最长提供者、修回正血、到期优先、溢出正常 | 原10种增幅器的结构化适配；特殊护幕暂不装到旧棋盘 |
| 时间 | 10毫秒固定逻辑，定点冷却，表现层 `cooldownView` 插值函数 | 旧训练场仍为旧步长；新内核尚未接入页面战桌渲染 |
| 终局 | 90秒开始、91秒第一轮、双方每路n伤害、同时死亡平局、工程上限报错 | 不把300秒工程超时伪装成平局 |
| 保存 | 完整定义／规则快照、事件队列、冷却、来源、随机计数与监听集合、保护状态、因果账本；中途恢复一致 | 旧牌自动迁移；恢复验证当前采用重放比对，未优化长回放加载 |
| 预算 | 明确 `balance_pending`、报告未执行项、发布硬阻断 | 校准权重、环境胜率、可发布认证、AI图片上传与生成界面 |

运行时注册表 `registry.ts` 的 `SUPPORT` 可由后续编辑器读取。此清单的“已执行”表示有通路，不代表每个组合已穷举证明平衡或完成全部设备性能验收。

## 冻结的语义与实现取舍

- `generated-core-v0.2 / implementation-1` 与旧 `arena.version=1`、训练 `original-v1/tuned-v1`完全分开。新框架没有引用旧模拟器或将旧卡伪装成已认证适配器。
- 伤害以整数百分之一单位计算；百分比用基点，冷却进度用毫秒×10000累加。显示插值只读取状态，最大插值10毫秒，不提交技能。
- ATK先加减固定值，再乘百分比加总。攻击提交时锁定数值与目标。同源同效果状态刷新；同能力中的不同效果保留独立身份，避免误合并。
- 物理lane先幕再核心；barrier只伤幕；core绕幕。灼烧／侵蚀绑定路线。每次伤害包只产生一次实际受伤通知，目标列表可包含护幕和核心，损失字段分开；持续伤害的来源贡献按实际损失分摊，不重复计分。
- 持续伤害对齐全局500／1000毫秒刻度；护幕归零钩子先决定待破／破损，再发布通知。待破不会吸收不存在的生命，期间修复耗掉的保护不会退回。
- 状态和待破到期先处理；已经提交的伤害与持续伤害批次、因果响应结算后，再推进自然周期。双方周期先收集到期集合，再提交效果。已致死核心不补发新的自然周期；同批已承诺攻击仍结算。正式判定胜负前，同批合法响应治疗可以挽救零血核心；胜负写入后停止模拟。
- 周期到期即消费冷却并发出一次周期发动通知，即使条件不成立；响应没有合法目标不消费发动额度。内部间隔中的合格事件继续计数，错过第N次不补发。
- 没有通过预算策略时只允许沙盒编译和试打；即使有人填写一个“预算已过”的字符串，也不能跳过校验或调用发布成功。样例本身同样不可发布。
- 主动移除状态、阈值跨越事件、变化方向过滤等尚未接通的字段直接拒绝。原规范的开放目录不是所有机制已经完成的证明。

## 文件与验证边界

- `types.ts`：外部草案、蓝图／实例和运行态合同。
- `registry.ts`：版本化规则、工程边界、效果／事件目录与支持矩阵。
- `validation.ts`：严格合法性、语义和引用检查，编译、报告与发布阻断。
- `canonical.ts`：规范化序列化、SHA-256、整数分摊及登记的无偏伪随机抽样。
- `describe.ts`：从定义生成规则，草案文案不驱动执行。
- `selectors.ts`：几何、阵营、过滤、稳定顺序及抽样。
- `runtime.ts`：确定性调度、机制执行、因果、特殊护幕、腐化、保存恢复与插值接口。
- `samples.ts`：四张批准文档样例及测试辅助构造。
- `lib/card-framework.test.mjs`：机制和故障边界测试；随 `npm test` 一起运行。
- `scripts/card-framework-demo.mjs`：开发者可重复运行的纵向验收入口。

下一阶段应先补齐被拒绝的规范事件与方向过滤，再制作可观察战桌适配器，并逐卡对照迁移旧机制；不能先替换旧引擎再期待历史回放碰巧一致。旧六张训练牌中的蓄能不是本规范已认证的基础效果，需要另登记储能模块后再迁移。
