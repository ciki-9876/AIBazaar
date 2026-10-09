# 2026-10-08 · 甩牌美术重构：聚光与丝绒

决定见 [ADR-0048](../../decisions/ADR-0048-throw-limelight-vector-art.md)。

## 改了什么

- 新增 `apps/throw/src/app/stage/`：`ticker.ts`（共享帧时钟）、`palette.ts`、`rig.tsx`（四个骨骼角色与胸像、头像裁切）、`card-art.tsx`（牌面与牌背）、`glyphs.tsx`（33 个物件图标）、`scene-kit.tsx`、`sets.tsx`（街区、工作室、剧院）、`stage-scene.tsx`（镜头、视差、平滑跟随）、`stage.css`（色板、字体与场景动画）。
- 重写 `globals.css`、`adventure.css`、`throw.css`、`throw-workbench.css`。冒险页、对决桌、布阵页与飞牌改用新组件，交互逻辑不变。
- 删除旧渲染器、位图图集（`public/art-assets/throw`）、`/art/vector` 页面与生成脚本，以及只服务旧图标的万灯城遗留模块；共 73 个文件。
- 新增 `stage-art.test.mjs`：检查每件道具和遗物都有图标、每个 NPC 都有骨骼、每张地图都有场景，以及项目不含位图。

## 验证

- `node --test` 跑 throw 的规则、冒险与美术测试：42/42 通过。
- 类型：沙箱无 `@types/react`，用最小类型垫片对 `apps/throw/src` 做 tsc 检查；新代码无类型错误（剩余报错均来自垫片对内联事件的推断）。
- 浏览器（Playwright + Chromium，esbuild 打包同一源码）：开场旁白 → 走路（步态、围巾飘动）→ 进入工作室 → 与里德对话 → 布阵 → 练习对决 → 选牌、甩牌、飞行、命中、道具点亮；地图弹窗；390×844 手机对决。截图审查后修正了尺度（人比门高）、对决 HUD 遮头、手机血量折行、对话框默认尺寸、地图虚线错位、头像裁切。

## 未验证

项目原生 `npm run build:throw:cards`、`npm run lint`；真机帧率；Safari；真人长期观感。
