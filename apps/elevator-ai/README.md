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
