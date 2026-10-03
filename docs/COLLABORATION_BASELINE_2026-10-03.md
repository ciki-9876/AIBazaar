# 2026-10-03 协作维护基线

本记录描述工程交付，不修改设计日志中的历史决定或玩法规则。

## 结构与入门

正式产品为安泊电梯求生和万灯城卡牌；`apps/elevator`、`apps/cards` 是独立入口，唯一业务实现在 `app/survival`、`lib/survival-*` 与 `app/arena`、`app/wandeng`、卡牌相关 lib 模块。`apps/experiments` 保留历史 Demo 和原型。共享渲染基础位于 `packages/render-kit`，中立序列化和随机工具位于 `packages/core`。入口包装不会复制业务状态或规则。

维护者先读根 README、CONTRIBUTING.md 和 AGENTS.md。改玩法规则时按设计日志入口阅读当前系统记录。开发需要 Node 22.13+ 与 `npm ci`。

## 检查与发布

- `Repository checks` 在 PR 和推送上执行全量测试、lint、类型、边界、确定性和依赖检查。
- `Product (elevator)` / `Product (cards)` 各自执行边界、lint、类型、含共享检查的产品测试和独立构建。
- Pages 默认在 main 上发布，并在同一部署流程中重新通过全量检查及 Pages 构建后才部署。
- Cloudflare 保留为选择产品并明确开启 publish 的手动流程；该流程也先通过全量检查。发布脚本拒绝把带 Pages 路径前缀的包发布到根域名。
- 若仓库尚无分支保护，维护者应将上述三个 PR 检查设为 main 的必需状态检查；workflow 本身不能阻止拥有绕过权限的人合并。

边界检查从所有产品和共享源码出发，包括未被页面引用的模块；同时处理类型导入、静态动态导入、require 和本地工作区包名导入。计算式模块导入被拒绝。共享层不得反向依赖产品或实验，产品不能相互引用或引用实验。旧水处理站实现移入 `experiments/survival-waterworks`；旧试玩地址仍由实验入口保留。

测试发现覆盖 app、apps、lib、packages、components、hooks、scripts、tests 和 experiments，跳过 node_modules、构建包、生成资产和框架缓存。支持 `.test.mjs`、`.test.cjs`、`.test.js` 和 Node 可执行的 `.test.ts`。

## 确定性与原子性

模拟核心的 AST 检查禁止直接、索引或常见别名方式读取环境随机数／时间。时间戳与新局种子由适配层提供，旧 `newRun` 现在要求显式种子。模拟步长与现有随机序列保持兼容。命名随机流工具供新机制使用，不能直接替换旧规则的 RNG 而不做版本迁移。

为保持 v1 回放，已有排序使用明确的 English collation，并限制已有调用数量；新模块使用数字或代码单位排序。此兼容例外仍受 ICU 实现影响，严格跨引擎的排序迁移需新规则版本和旧版本读取策略。

属性测试使用固定种子生成非法操作，检查冻结原状态、资源、UID、RNG 和序号没有变化；包括缺少物品、非法目标、路费不足、重复结算及错误阶段。现有 reducer 的返回／异常接口保留。

五份黄金样本锁定完整战斗输出或电梯固定步长快照的 SHA-256，覆盖原竞技场、两版训练数值和两种电梯种子。它们在本次规则修改前捕获，不能为消除失败而重新生成。

## 存档与回放

新文件外层为 `{product, schemaVersion, rulesVersion, payload, checksum}`。信封 schemaVersion 为 1，卡牌规则标识 `f9-arena/1`，电梯标识 `f9-survival/6`。payload 保留各系统原有格式与版本。规则标识对应当前实际实现；不支持的标识明确拒绝。

中立序列化按对象键排序，保持数组、文本和 JSON 的可选字段语义；拒绝非有限数和循环引用。校验和为 UTF-8 canonical JSON 的 FNV-1a 32 位，用于发现偶发损坏，不是签名或防作弊措施。黄金回放使用独立 SHA-256。

电梯检查点、万灯城旅途、竞技场档案和训练／万灯城回放已接入信封。保留原 localStorage 键与旧 JSON 读取，并保留电梯 4→5→6 迁移。检查覆盖新旧格式往返、跨产品、未知规则、损坏、部分信封和回放结果一致性。版本 1 信封输出不保证能被旧部署版本读取；跨版本回退前需保留备份。

## 依赖

Knip 6.39.0 按工作区入口检查依赖；移除无消费者的 `@cloudflare/vite-plugin`、`@openai/sites-vite-plugin` 与子工作区重复的 lucide-react 声明。固定 Three.js 0.183.2 与类型定义 0.183.1。保留 vinext 需要的 React/RSC peer 依赖。

Knip 的例外均有真实消费者：shadcn、tw-animate-css、tailwindcss 来自 CSS／PostCSS；wrangler 由发布脚本通过安装路径调用；next 是 vinext 的兼容导入别名。它们不是待删除的闲置依赖。

## 本地验证

干净 `npm ci` 后，Node 24.14.0 环境下全量 **305/305** 测试通过，lint、类型、边界、确定性和依赖检查通过；边界覆盖电梯 88、卡牌 83 个依赖文件，确定性检查覆盖 72 个规则／共享模块。两个无前缀独立包、实验工作台和带 `/AIBazaar` 前缀的 Pages 合并包均构建通过；分别预渲染 3、8、35 个页面，无跳过。Pages 校验确认仅发布两个产品及兼容跳转。

远端 main 的六个竞技场提交已合并入本分支历史，恢复的较新实现和历史设计记录保留。构建继续存在既有 Three.js 大 chunk 和 vinext 内部静态／动态导入提示。本轮未进行浏览器人工试玩，也未宣称性能数值提升。GitHub Actions 使用 Node 22；远端检查结果应以 PR 状态为准。
