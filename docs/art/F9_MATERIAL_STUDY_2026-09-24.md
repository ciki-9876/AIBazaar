# 非像素材质标杆 · 本地验收

访问：<http://localhost:4173/art/chamber>。本地服务启动命令：`npm run dev -- --host 127.0.0.1 --port 4173`。

这是第一人称房间里的局部美术升级。`/art/rooms` 仍是原箱庭演示；`/art/slice` 保留原版装备库与镜头。没有替换正式冒险或发布生产站点。

## 如何验收

1. 先看入口：木柜、桌面、墙脚与地面。
2. 右上角「材质对照」→「卷簧弩」或「缓冲垫」，在同一个桌面近看实物；「返回房间」恢复原视点，不发放物品，不改变阵容。
3. 切换「房间灯光 / 中性灯光」，检查材质在不同照明下的表现。
4. 切换「原版材质 / 新版材质」比较旧版与新版资产、表面和布光。两版均为非像素输出；这是版本对照，包含形体和照明调整，并非严格只改变单一材质变量。战斗进行中禁止切换资产版本和物件近看，允许改变照明。
5. 完整流程：开柜→收取缓冲垫→走向装备台→拖到中路→战斗→拿起战利品→收进行囊→起身→出口。

## 实际改变

- 恢复全尺寸画布、抗锯齿与线性纹理过滤，纹理各向异性最高 8；去掉扫描线，减轻暗角。
- 房间接入颜色、OpenGL 法线、ARM（遮蔽/粗糙度/金属度）图像。木材、粉化灰泥、磨损金属漆和水泥使用按尺寸投影的 UV，避免薄板侧面把完整纹理拉伸。
- 桌面分为八块实木板，增加接缝、钉头、局部前缘磨损；房间近景物件增加小倒角。
- Blender v5 保留原根节点及可动画部件名字。卷簧弩增加导轨紧固件、轴心、握柄包裹和扳机护圈；缓冲垫重建带四处压陷的表面、包边和贴合表面的细缝线。
- 新增受控环境反射、斜向照明、物体和家具的柔和接触暗化；保留实时投射阴影。木料与皮革收敛大面积亮斑，保留粗糙度图的区域差异。
- 模型采用已有 CC0 图像材质直接导出 glTF；本轮没有把材质完全程序化重绘，也没有完成房间的离线间接光烘焙。
- 柜中实物沿深度后移，修正关门时略微穿出门板的问题。

## 文件与可复现来源

- `app/art/slice/materials.ts`：PBR 表面库、尺寸 UV、接触暗化纹理。
- `app/art/slice/chamber.ts`：桌板与表面、灯光、近看机位、柜内位置。
- `app/art/slice/scene.tsx`：非像素输出、环境反射、v4/v5 选择、照明切换和性能观察。
- `app/art/chamber/page.tsx` / `chamber.css`：对照工具与物件近看，保留原可玩流程。
- `scripts/art-battle/fetch-materials.mjs`：下载选定纹理并校验 MD5。
- `scripts/art-battle/build-material-study.py`：从已有 `outputs/battle-slice/battle-slice-v4.blend` 生成 v5，不覆盖 v4。
- `outputs/battle-slice/battle-slice-v5.blend`：本轮可继续编辑的 Blender 源文件。
- `public/art-assets/battle-slice/equipment-library-v5.glb`：浏览器使用的新资产。
- `public/art-assets/material-study/sources.json`：每张图的原始 URL、大小、校验值及许可证；`model-report.json`：导出报告。

材质来自 [Poly Haven](https://polyhaven.com/license)，CC0：wood_table_001、brown_leather、grey_plaster_02、blue_metal_plate、concrete_floor_worn_001、metal_plate_02。物件几何沿用项目原创模型并在 Blender 中修改。

## 工程检查

- `npm test`：126 项通过。没有修改战斗、奖励、布阵或存档规则。
- `npm run lint`、`npx tsc --noEmit`、`npm run build`：通过。构建仍有既有的部分 chunk 超过 500 kB 提示。
- GLB 检查：8 个根节点保留，5 类主要材质包含法线和粗糙度图；Elastic、Bow string、两组 Spiral spring 均保留。
- 浏览器无错误。原 `/art/slice` 的独立入口和画面另做视觉回归。

## Agent 定向 UI 复测

- 1280×720 和 800×900 的实际截图均已检查，不以 DOM 文本替代视觉验收。
- 原版/新版切换、中性/房间光、两件近看、返回原房间视点：通过。
- 开柜、拿取、指针拖动中路上阵、自动战斗、详情暂停/恢复、2×、战利品、起身、离开：通过。
- 本次同一配置结果：敌方损伤 82、我方投影损伤 26、缓冲垫实际减伤 20，与此前切片一致。
- 近景修正了过强木面亮斑、缝线被新表面埋住/过粗，以及关门时物件穿出。

这属于 Agent 定向复测；不是独立新玩家测试，也不代表用户已接受美术品质。

## 体积与性能边界

- v5 GLB：8,659,228 字节，约 8.66 MB。
- 房间实际加载的 12 张外部表面图：3,680,428 字节，约 3.68 MB。主要新资产合计约 12.34 MB，不含 JS、文字贴图等。
- GLB 的 12 张图与房间 12 张图均为 1024²；按 RGBA8 + 完整 mipmap 估算约 128 MiB。这个数字不含阴影、反射、画布附件及其他贴图，也不是实际 GPU 显存测量。
- 当前桌面浏览器观察到的稳态平均帧间隔约 16.7 ms；近看缓冲垫时 185 次绘制、40 张已分配纹理。它是 requestAnimationFrame 间隔和 renderer 计数，不是 GPU 耗时或所有设备的帧率保证。
- 尚未验证手机、集显低档设备和慢网。后续若采用此标准，需要继续做贴图压缩、合批和质量档；本轮不以扩充引擎为前提。

## 截图

- [原入口](../../outputs/material-study/before-entry.png) / [新版入口](../../outputs/material-study/after-entry.png)
- [原版缓冲垫](../../outputs/material-study/cushion-before.png) / [新版缓冲垫](../../outputs/material-study/cushion-neutral.png)
- [卷簧弩近景](../../outputs/material-study/springbow-room.png)
- [柜内实物](../../outputs/material-study/cabinet.png)
- [窄窗战斗](../../outputs/material-study/battle-800.png) / [战斗结果](../../outputs/material-study/victory.png)

## 验收清单

- [x] 正常分辨率和抗锯齿，取消像素放大。
- [x] 木材、金属、皮革可观察到不同的表面和反光。
- [x] 近景与正常战斗距离均实际检查。
- [x] 原版/新版、两种照明可在页面内切换。
- [x] 新模型不改变装备身份、合法位置与战斗结果。
- [x] 原冒险存档不读写，生产站点未发布。
- [ ] 用户确认材质的粗糙程度、色调与磨损尺度。
- [ ] 用户确认将此标准扩展至其他房间与核心生物。
- [ ] 低性能设备、手机与慢网实测。

本轮未重做全部家具、核心皮肤和屏障材质；主要物件仍是风格化几何。待标杆验收后再决定扩展范围。
