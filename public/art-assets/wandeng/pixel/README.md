# 万灯城：精细像素素材

本目录用于 `/wandeng` 的现行像素美术，2026-09-27 按用户要求替换手绘素材。温馨可爱的氛围、人物身份和旧物题材保持。

| 文件 | 用途 | 规格 |
| --- | --- | --- |
| `items-atlas.png` | 12 件旧物，卡牌、图鉴、事件、行囊与结算共用 | 1086×1448，RGBA 真透明 |
| `intro-atlas.png` | 四格序章、师傅指导、启程与标题插画 | 1536×1024，3 列×2 行 |
| `generation.json` | 两张正式素材的完整提示词和来源 | 内置 image_gen 生成；未使用 CLI/API 回退 |

物品顺序：蓝色台灯、星轨放映机、铜茶壶、草叶药匣、补丁旧伞、旧缝纫盒、蓝木音乐盒、黄铜座钟、蓝叶风扇、拼布被、旧信匣、引火夜灯。原 50 张机制卡继续复用这 12 类形象，不代表新增 50 张独立插画。

图集的不等距留白通过 `app/wandeng/wandeng-cards.tsx` 的 `ITEM_SPRITES` 矩形定义裁切；坐标来自透明通道边界测量。不以完整等分格取样，避免相邻物品渗入卡面。以后更换图集时同时更新这些矩形。CSS 用 `image-rendering: pixelated` 保留像素轮廓。

字体使用仓库已有的 GNU Unifont 17.0.04 WOFF2，位于 `public/fonts/unifont/`；授权与来源保存在该目录。图标为 `wandeng-pixel-icons.tsx` 的原创整格路径，心灯和护幕为 `wandeng-symbols.tsx` 的代码图形。背景、品质框、控件与织纹由 `wandeng-pixel.css` 绘制。

完整过程和验证见 `docs/design-log/iterations/F9/2026-09-27-wandeng-pixel-art.md`。旧手绘图保留在上级目录供历史参考，当前万灯城界面不加载它们。
