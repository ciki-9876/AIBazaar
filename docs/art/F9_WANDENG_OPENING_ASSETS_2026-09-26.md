# 万灯城开场原型：生成素材记录

日期：2026-09-26。工具：内置 image_gen；模式：参考图风格生成新图集。未使用 CLI、Python 修图或程序化重绘。

用户参考：`D:/Temp/codex-clipboard-f0e05c18-d95a-4b0f-a5a6-d824cbb64c84.png`。输出原件保留于生成目录，复制到项目公开素材目录使用；通过 CSS background-position 切换单元，未改动位图。

## 开场叙事图集

- 项目：`public/art-assets/wandeng/intro-atlas.png`
- 原件：`C:/Users/CIKI/.codex/generated_images/01a0dbf7-8d01-76b0-ba21-97548d99a14b/exec-7d75ab2d-2b9a-482f-b188-ddff62edb6ba.png`
- 六格 3×2：前四格为漫画，后两格为教学与启程场景；对白由 HTML 排版。

### 实际提示

```text
Use case: illustration-story. Production illustration atlas for the opening of an original warm 2D card game called Wandeng. Exactly SIX equal rectangular panels in a perfect 3 columns by 2 rows grid, canvas landscape 3:2, no gutters, each panel has identical cream background at its edges, NO borders, NO text, no captions, no letters, no numbers, no word balloons. Each cell will be independently cropped by CSS, so keep all important characters and props inside the middle 85% of its own cell. Style reference image is ONLY for tactile colored pencil and fine ivory paper texture, charming bold charcoal hand-drawn contours and pastel colors. Warm clean storybook, not shiny, not oil painting, not anime rendering, not photoreal. Palette cream, sage green, faded sky blue, apricot, terracotta.
A consistent protagonist in all six panels: young adult human apprentice, short softly tousled dark brown hair, cream shirt with rolled sleeves, moss green repair apron, small brown satchel, kind curious expression, simple rounded hand-drawn proportions. Elder mentor: elderly human woman, silver hair in a bun, round glasses, muted blue shawl, warm smile. Tiny object souls appear as little golden musical strokes or lights, not animal mascots.
Panel row 1 column 1: apprentice repairing a little blue wooden music box with brass winding key at a cozy workshop bench, a careful hand and fine tool, sunlight and a little plant.
Panel row 1 column 2: same repaired music box passed between gloved merchant hands across a neat pale blue counter, several BLANK paper price tags and glass shelves, cool quiet mood, music box very small in the commerce around it.
Panel row 1 column 3: apprentice discovers the same faded blue music box returned to the bench, cracked paint, its faint gold musical spirit nearly silent, intimate concerned expression.
Panel row 2 column 1: apprentice leaning close to listen, a small warm gold glow rises from the open music box, expression changes from surprise to tenderness, soft cream negative space.
Panel row 2 column 2: elderly woman mentor in her warmly lit repair house, demonstrating to the apprentice THREE glowing paper cards laid in a row on a wooden table, a blue music box, a little clock and an old umbrella nearby, caring and instructional.
Panel row 2 column 3: apprentice carrying a sage travel bag and blue music box, holding a sealed cream envelope, stepping onto an arched bridge toward a whimsical lantern-lit Chinese-inspired riverside town at sunset. The town is welcoming, paper lamps and curved roofs, no complex signage.
Balanced scenes that read at medium game panel sizes, delicate paper grain, visible pencil fill, clean confident silhouettes, handmade warmth. Do not copy characters from the reference.
```

## 物品图集

- 项目：`public/art-assets/wandeng/items-atlas.png`
- 原件：`C:/Users/CIKI/.codex/generated_images/01a0dbf7-8d01-76b0-ba21-97548d99a14b/exec-16c9b477-b9e1-47bf-8302-6a510a710d2c.png`
- 十二格 3×4：台灯、放映机、茶壶、药匣、伞、缝纫盒、音乐盒、座钟、风扇、旧被、信匣、夜灯。
- 座钟与闹钟暂共用图，旧被为预留资产；不存在未实现的卡牌效果承诺。

### 实际提示

```text
Use case: illustration-story. Production sprite atlas for original 2D card game Wandeng, warm cute haunted everyday objects. EXACTLY 3 columns by 4 rows, 12 equal SQUARE cells, canvas aspect ratio 3:4. NO gutters, grid lines, text, numerals, UI or card borders. All cells same plain warm ivory background #f6f0df. Each object centered inside middle 72% of cell, fully visible, generous margins. Image is a STYLE REFERENCE for paper texture, hand-drawn dark charcoal contours, colored-pencil/wax-crayon fill, charming simple forms. Slightly irregular outlines, flat shadows, cream, sage, dusty blue, terracotta, lavender, honey. These are loving old objects with visible mends; no animal mascots, no weapons, no glossy metal, no 3D rendering, no bloomy jewels.
Row1 left: a small brass and faded blue desk lamp with fabric shade and tiny golden soul glow; center: a whimsical chunky lavender hand-cranked film projector with two reels and a few cut-paper stars; right: an old terracotta kettle and tiny blue stove with warm steam curls.
Row2 left: a rounded sage-green travel medicine box with cork bottles and a leaf; center: a folded patched blue umbrella with a curved wooden handle; right: a cream sewing box with thread spool, fabric patch and a needle.
Row3 left: a blue wooden music box with brass key and small gold musical marks; center: a little round sage alarm clock with pendulum and warm yellow face (no readable numerals); right: a small powder-blue desk fan with four broad rounded blades.
Row4 left: a thick comforting patchwork quilt folded over a low wooden stool; center: a mail tin with cream envelopes and a little spool of red thread; right: a tiny stained-glass night lantern with simple leaf decoration.
All 12 objects have consistent scale, illustrated three-quarter angle and a small flat pencil shadow. Tactile, simple, charming. This atlas is artwork only; all game text will be rendered separately.
```

## 观察边界

已目视确认人物、物品统一，背景为纸纹和彩铅质感；图集单元用 CSS 定位，较小卡面以物品本体为主。名称、规则、冷却、主属性全部在运行时渲染，图片不承载会变动的规则文本。仍待用户审美验收。

