# 2026-09-27：生存终端、GM、面包与选层

规则决策见 [ADR-0019](../../decisions/ADR-0019-terminal-tabs-meal-and-floor-selection.md)，本页记录实现和证据。

## 可直接试玩

入口 `/survival`。按 Esc → GM · 引导阶段；可搜索并选择 62 个阶段，每项有描述。重点检查点为“你饿了吧”“黑孔吐面包”“吃掉面包”“选择二层”。切换会替换本地当前试玩进度。

点击左屏／F 默认打开任务页；行囊、电梯、楼层通过 Tab 切换。任务页已移除路线节点图。面包只有一份，选中后点击“吃掉”；吃完自动收起行囊，主屏显示饱食／饮水，屏幕提示去二层找水。第二次及后续按 E 必须先选二层。

## 主要改动文件

- `lib/survival-opening.ts`、`survival-afterlight.ts`、`survival-room.ts`、`survival-checkpoint.ts`：发面包、显式消费、HUD 解锁、选层状态、旧存档兼容。
- `lib/survival-gm.ts`、`survival-rehearsal.ts`：62 阶段目录与独立检查点。
- `app/survival/opening-demo.tsx`、`gm-panel.tsx`：设置入口、切换、统一入口与饥渴 HUD。
- `lift-system.tsx`、`lift-terminal.tsx`、`base-upgrade.tsx`、`console.css`：单容器 Tab、任务目标、紧凑布局与局部滚动。
- `cargo.tsx`、`equipment.tsx`、`pixel-gear.tsx`：必要文字、选中详情、面包吃掉按钮和像素图标。
- `panel-text.ts`、`elevator.ts`：字符串生成的几何字形，数字随实际楼层更新，无图片拉伸。
- `terminal-screen.ts`、`lift-atmosphere.ts`、`scene.tsx`：等级条与机器人留白、黑孔与面包实体动画、餐食时看向屏幕。
- `lib/survival-gm.test.mjs` 及既有 afterlight／homecoming 测试：新规则验证。

## 验证

- 完整 `npm test`：215 项通过。
- `npm run lint`、`npx tsc --noEmit`：通过。
- `npm run build`：33 条路线预渲染完成；保留现有大包体积提示。
- 浏览器：首次投喂已在统一电梯 Tab 中验证，错误材料保留，正确核心仅扣一次；实体面包从黑孔吐出的画面已截取。GM 搜索与切换；吃面包扣除实体并解锁主屏状态；E 打开选层，选二层进入实际维保廊；早返后再次按 E 仍需选层。
- 1280×800 装备／背包两套详情同时显示无外框滚动；1280×680 只压缩背包格子视口并在其中滚动，操作栏不遮挡。390×844 页面宽度无溢出，十格装备可横滚。
- 62 个 GM 检查点全部通过存档读取验证，并逐一验证同样输入产生相同后续；返回副本相互独立。
- 发面包的满包延迟、腾格重试、重复发放防护、错误消费和安全区消费拒绝均覆盖；初次及重返后选择无效楼层均无副作用。

本地截图：`outputs/survival-opening/26-gm-stages.png`、`27-terminal-clearance.png`、`28-compact-inventory.png`、`29-panel-text.png`、`30-floor-selection.png`、`31-bread-emission.png`、`32-unified-task.png`。此目录被忽略，非构建产物提交。

## 边界

目前只有二层作为常规出发目的地，首层不可返回／三层未接通；未新增扩容经济。GM 的后段战斗样本补满生命仅用于调试。没有把自动检查通过视为玩法平衡或引导情绪节奏已获验证。
