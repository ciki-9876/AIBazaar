# 电梯 AI · 实验区

独立、本地实验项目。首页提供三个可点击入口：

- `/survival/ai-demo`：三名倾向、八种共享资源冲突；浏览器 Worker 中的合成模仿 MLP 选择战术行动。
- `/survival/ai-mail`：真实本地 Qwen 回信；赠水、零件换水、合作打守卫和预先承诺的欺骗进入同一角色状态与执行器。
- `/survival/ai-campaign`：离屏导播；本地模型决定探索、带回、建设、补给和升层，也可明确切换规则对照。暂停后写信询问当前选手计划。

实验源码独立维护在 `src/`，由原 AI 工作区的实验切片与其所需渲染／规则快照迁入。相对导入全部限定在本项目，不依赖电梯、共鸣或甩牌源码。快照不自动跟随主游戏的新规则；正式赛事、通行证与多人长期关系尚未接入。项目仍不进入正式产品发布。

启动网页：`npm run dev:elevator-ai -- --port 4192`。启动 Windows 邮件模型：`./apps/elevator-ai/ai-lab/start-mail-model.ps1`；首次缺少模型时加 `-Download`。模型、运行库、凭证仅在忽略的 `work/ai-mail` 中。模型使用 Qwen3-4B-Instruct-2507 Q4_K_M 和 llama.cpp Vulkan；服务绑定本机 4194，浏览器经开发服务代理访问，不携带模型凭证。

验证：`node scripts/test.mjs elevator-ai`、`npm run typecheck:elevator-ai`、`npm run build:elevator-ai`。真实模型取样可运行 `node apps/elevator-ai/ai-lab/evaluate-mail.mjs`（约定）、`evaluate-chat.mjs`（开放追问）、`evaluate-campaign.mjs`（离屏成长），结果保存在忽略目录。构建的静态文件不自带推理服务，试玩使用上述本地开发服务。

新邮件直接显示完整模型正文及来源，先识别请求范围，再生成、校验约定和机制；校验失败会重写或报错，不用固定正文替代。程序仍限制可执行条款并校验真实资源，不能保证小模型的任意自然语言绝对无误。现场战术v2增加目标保持和路径受阻恢复；旧存档迁移、旧v1回放保留。

离屏为6层的宏观因果模拟，并非后台跑三维战斗；物资预先按种子生成、探索后才揭示。模型等待期间该选手生活值冻结。现场和离屏是不同的实验样本，持久状态交接、正式百层赛事和长期联盟尚未接入。设计与观察见[迭代记录](../../docs/design-log/iterations/F9/2026-10-04-ai-mail-and-offscreen.md)。

After the experiment is complete, move only validated implementation into `apps/elevator` through an explicit integration change.

第四轮增加独立的离线战斗训练环境 `combat-lab.ts`：走位、自动范围攻击、快怪、远程预警与遮挡地形。新的1152参数战斗模块实际完成一轮训练；72局清场60局，但遮挡地形仅1/12，复核未通过，网页仍使用原模型。详见[训练报告](../../docs/F9_AI_TRAINING_ROUND4_COMBAT_REPORT_2026-10-05.md)。它没有接入上述三个试玩入口，不能将报告中的离线成绩当作网页AI已升级。

训练工具为 `ai-lab/combat-round.mjs`，依次执行 `prepare`、填写有证据的 `session-review.json`、`train`、`evaluate`、`audit`、填写复核与检查记录、`finalize`。各阶段接受一个新输出目录作为第二个参数，拒绝覆盖已有证据；回放输入含显式种子、动作和步数。当前课程的数值教师只有1.2秒分支观察，裁判复核在当前Sol会话完成，不伪装成付费API或独立盲评。

第五轮保留第四轮战斗模块，新增 `combat-search.ts` 与1152参数搜索头；工具为 `ai-lab/search-round.mjs`，阶段顺序同上，默认独立证据目录为 `work/ai-training/round-2026-10-05-search`。搜索教师使用公共地图覆盖与自己曾见敌人的线索，不是第四轮分支教师；所有墙体几何仍公共，未验证迷雾中的未知地图。新种子同局清场66→72/72、遮挡6→12/12；仅工程未训练65/72，规则教师也72/72，未证明网络胜过规则搜索。详见[第五轮报告](../../docs/F9_AI_TRAINING_ROUND5_SEARCH_REPORT_2026-10-05.md)。

现有三个入口可做旧基线的人工实验，最新搜索候选**尚未桥接网页**；不能把第五轮离线通过写成网页升级。[里程碑与规则刷新](../../docs/F9_AI_MILESTONES_AND_RULE_REFRESH_2026-10-05.md)要求下一步候选专项试玩、统一选手5–20F票／救援、三场景和双端验收，最后才考虑主游戏合入。现有离屏模型等待冻结单选手代谢是实验限制，正式赛季统一状态时须修正。

旧工作区独有的独立决策烟雾管线已迁入本项目 `src/lib/survival-ai/`；`ai-lab/run.mjs`、`serve.mjs`、`fixtures.ts`、`worker.ts` 和初版 encounter 训练工具保留其原有用途。运行 `node apps/elevator-ai/ai-lab/run.mjs` 生成忽略目录内的烟雾训练与浏览器基准包；它不代表当前三个试玩入口已切换模型。
