# 巡回器具师联赛：纸纹彩铅美术原型

日期：2026-09-26。模式：内置 imagegen；静态美术原型，非实机截图。

## 用户方向与范围

用户提供带有纸张纹理、手绘可爱卡通主图的参考，要求三种尺寸卡牌与对战桌面。沿用巡回器具师联赛题材；参考人物不成为卡牌角色设定。此轮不替换当前游戏皮肤，不修改战斗或卡牌规则。

- 背景：浅奶油纸张，少量薄荷与淡紫彩铅笔触；没有重金属边框或大面积流光。
- 主图：手绘器具，深色略不规则轮廓、简化体块、平面彩铅上色。
- 信息：卡名与定位在上，机制区在下，独立冷却；底部连续数值区用数字颜色区分效果，允许换行，不以尺寸限定效果数量。
- 桌面：双方各三路九格，共用核心与分路屏障，优先检查全局可读性。

## 文件

- [三尺寸卡牌 v1](../../outputs/league-paper-art/2026-09-26/cards-v1.png)
- [对战桌面 v2（当前选稿）](../../outputs/league-paper-art/2026-09-26/battle-table-v2.png)
- [桌面 v1（保留修订前对照）](../../outputs/league-paper-art/2026-09-26/battle-table-v1.png)

卡名、机制文字和数值均为美术排版占位，不加入正式卡池。三张卡都展示五项核心效果用于压力验证，不能由此推导正式牌效或五项上限。静态图的宽度比例、字号、颜色与换行只能目视比较，不等于程序布局已通过验证。

## 最终目视检查与限制

- 卡牌 v1：可区分的 1/2/3 格宽度与同高外框；三件器具；每张五项核心数值，窄卡两行；卡名、定位、描述、独立冷却和连续数值底带均已呈现。
- 桌面 v2：上方五件、下方六件器具，按三列路线布置；六组屏障读数、双方各一个共用核心、准备阶段与开始按钮均可辨识。图中底部左路为 1+2、中路为 3、右路为 1+1+1 的示意组合。
- 定向修订已去掉无效零数值；两张摆轮均以「相邻充能」描述机制，保留独立冷却；三张复合效果示例牌仍有完整五项。
- 顶部路线已改为潮汐港、钟摆城、青穹园、霓电街，并突出第一城；文字仍是生成图中的手写效果，实装应采用真实字体。
- 宽度比例与字号存在静态生成误差，不作为精确 1:2:3 或像素规范；桌面小卡信息经过简化，实际机制可读性、不同分辨率与长描述需在代码中校准。当前纹理较丰富，实装建议降低信息区域颗粒对比度。
- 已检查输出文件与文档链接；本轮无运行代码修改，未运行游戏测试，也未进行平衡验证。

## 卡牌完整生成提示词

```text
Use case: ui-mockup. Create an original high fidelity art-direction prototype sheet for a 2D card autobattler about a traveling artisan league. Input image 1 is a STYLE REFERENCE ONLY, not a UI or character to copy. Match its tactile colored-pencil / wax-crayon marks, softly stippled ivory and butter-yellow paper, occasional pale mint and lavender strokes, irregular confident dark ink outlines, and charming simplified storybook shapes. No rabbit, no animal heroes. Subjects are delightful handmade magical tools. Avoid oily digital painting, gloss, shiny metal, bloomy lighting, elaborate ornament, distressed brown parchment, photorealism, sci-fi HUDs and 3D toy render.
One landscape image, roughly 2400x1350, generous margins, beautiful editorial spacing. Present EXACTLY THREE front-facing flat collectible cards arranged horizontally, vertically aligned, ALL SAME HEIGHT. Their occupied widths must be exactly 1:2:3. Example geometric dimensions 240x560, 480x560, 720x560 with equal gutters. This is essential: a narrow portrait one-slot card, an almost square two-slot card, a wide landscape three-slot card. Thin paper edges and very slight offset paper shadow only, no exaggerated perspective.
Outside background: warm cream paper with fine visible reference-style fiber and stippling, sparse sweeping mint and lavender crayon strokes, gentle texture. Subtle large heading at upper left "巡回器具师联赛", subtitle "卡牌美术原型". Small labels under the three cards exactly "1 格", "2 格", "3 格". Tiny bottom corner caption "数值仅作排版示意".
All three cards use the same intelligent adaptable UI template: rounded imperfect charcoal ink outline, thin muted rarity color inset line (first gray, second muted cornflower blue, third muted plum purple), creamy paper surface. Top aligned compact card title and a smaller role line. Central illustration occupies the most space. Lower area has calm pale paper for a short mechanism sentence, a clearly separate dark outlined small stopwatch pill with cooldown. Bottom INSIDE each card is one continuous soft charcoal ink-wash strip containing colored NUMERALS ONLY. All effects use the SAME font size across the three cards. NO individual circles, boxes, sockets or badges around each number. NO icons or words next to the core numbers. Numeric content naturally flows horizontally and WRAPS on the narrow card into two rows, with the strip growing upward to accommodate content; this is a flowing area rather than five fixed slots. Five effects appear on EVERY card, including the 1-slot card. Do not crop or omit any. Numeral order and colors: silver-gray direct damage; orange burn; deep emerald-green poison; bright lime-green healing; golden yellow barrier repair. Deep emerald must remain readable on charcoal using a fine pale keyline; make bright lime distinctly lighter. No color legend inside the cards.
Card 1, title "旅行药匣", role "复合 · 支援": an original compact rounded sage-green travel medicine toolbox with stitched cream strap, a few softly colored cork vials, a tiny leaf sprig and a brass latch. Enchantingly cute proportions, NO face, no animal. Simple lavender and cream pencil backdrop. Rules text "发动后强化相邻器具。" wrapping naturally. Independent cooldown "4.0 s". Bottom five colored numbers: silver 18, orange 4, dark emerald 2, lime 6, yellow 8. Wrap these as 3 above + 2 below at an unchanged comfortable font size.
Card 2, title "晴雨茶炉", role "复合 · 联动": a chunky powder-blue travel kettle combined with a tiny warm terracotta burner and folded leaf-patterned umbrella, steam drawn as two broad pencil curls. Adorable handmade object, NO face. Pale apricot and mint vignette. Rules text "发动后强化相邻器具。" Independent cooldown "6.0 s". Bottom flowing single row: silver 24, orange 8, dark emerald 4, lime 12, yellow 18.
Card 3, title "星轨放映机", role "复合 · 蓄能": a whimsical lavender and muted blue hand-cranked film projector, two charming imperfect reels, a brass handle, projecting a broad warm pencil-colored beam containing a few flat cut-paper stars and planets. Spacious flat illustration, no glossy jewels, NO face. Rules text "发动后强化相邻器具。" Independent cooldown "8.0 s". Bottom flowing single row: silver 48, orange 12, dark emerald 6, lime 18, yellow 30.
Keep Chinese text accurate and limited to the supplied strings. The dominant impression is tactile, light, cute, readable, an original illustrated indie game. Illustrations retain visible hand-colored marks; interface information is crisp and calm. No existing brand logos, no watermark.
```

## 桌面定向修订提示词

```text
Use case: precise-object-edit. Edit this existing paper-and-colored-pencil card battle UI prototype. Preserve its composition, all eleven tool illustrations, tactile art style, card colors, two rows, exactly three lane columns, six shield bars, both shared core bars, footer and harbor scenery. Make ONLY these corrections:
1. Remove every zero-valued placeholder in card stat strips. This UI has a FLOWING LIST OF EXISTING EFFECTS, never a fixed five-column stat panel. After removal, compactly center the remaining numerals with normal equal spacing. No empty sockets, no zeroes, no new symbols or effect words beside numerals.
EXACT remaining stats: top-left broad "潮汐护幕": silver 36, deep emerald 12, yellow 24. Top-middle "汽笛壶": silver 28, orange 8, yellow 12. Top-right "补片胶": ONLY yellow 18. Top-right "灯塔线圈": silver 32 and yellow 16. Bottom-right "补片胶": ONLY yellow 18. Bottom-right "引火线": silver 12 and orange 8.
Both tiny "摆轮" pendulum cards, one in each row, have NO core damage/heal/shield numbers at all: remove their entire dark numeral strip and replace this lower part with ordinary quiet cream card paper and the concise mechanism text "相邻充能". Retain the existing separate cooldown pill "4.0 s". This mechanic is NOT a colored core-output statistic.
Keep all five existing nonzero stats on bottom-left "旅行药匣", bottom-left "晴雨茶炉" and bottom-middle "星轨放映机" completely unchanged, including their colors and the toolbox two-row wrapping. Do not make any new zeroes.
2. Correct only the four CITY labels in the top route strip, left to right: "潮汐港", "钟摆城", "青穹园", "霓电街". Highlight the FIRST city as the current stop, not the third. The existing separate current-location tag remains "潮汐港 · 会馆挑战". These are the only city labels. Keep all other UI text and the 300 / 300 and 90 / 90 unchanged.
Do not redesign, add cards, replace the tools with characters, alter the screen crop, or make shiny surfaces. Preserve the charming handmade screen while making these precise rule-display corrections.
```

## 桌面完整生成提示词

```text
Use case: ui-mockup. Create one complete original playable-looking 2D battle preparation screen for "巡回器具师联赛", a traveling artisan card autobattler. High fidelity art prototype, landscape 16:9, roughly 2560x1440. Image 1 is the original STYLE REFERENCE: tactile fine paper fibers, light ivory/butter yellow background with pale mint strokes, cute hand-colored pencil and slightly irregular dark ink outlines. Image 2 is our CARD DESIGN REFERENCE: preserve the illustrated toolbox, blue kettle with umbrella, lavender film projector, card UI hierarchy, outlined paper cards, restrained rarity lines and continuous dark colored-number area. This is a new complete game screen, not a collage of the reference screenshots.
Art direction: light, charming, hand-drawn travel sketchbook with modern readable UI discipline. Cute rounded handmade TOOLS, no animal protagonists and no faces on the tools. Grain should be perceptible mainly in the outer backdrop and the object illustrations; text panels and small numerals stay much smoother. Warm cream paper, pale mint, washed sky blue, lilac, muted terracotta. Dark charcoal hand-ink strokes, flat colored-pencil shadows only. Absolutely no oily rendering, glossy plastic, cinematic 3D, fake metal trim, heavy bloom, sepia antique parchment, garish gradients or franchise logos.
CRITICAL FUNCTIONAL LAYOUT: exactly THREE combat lanes, labelled "左路", "中路", "右路", in three equal columns. ENEMY CARDS across the upper row, PLAYER CARDS across the lower row. Each lane contains exactly THREE equal slot-widths per side, so each side has NINE slots total. A 1-slot card occupies one unit, 2-slot card exactly two units, 3-slot card exactly three units; all cards within a row have exactly equal heights. No tall differently scaled hero cards. Wider cards are wider physical paper rectangles, not enlarged portrait images. The player and opponent each have ONE shared core HP indicator, plus ONE shield meter PER lane on each side (six shield meters total). DO NOT replace the board with a single row of ten cards, and DO NOT put a separate character HP in each lane.
Composition: use most of the screen for the paired card rows and three clear lane columns. Top slim header with game title at left and a small four-city journey progress strip with stamp-like dots toward right; current city text "潮汐港 · 会馆挑战". Below header ONE enemy core bar, label "港口会馆主", value "300 / 300". Three enemy groups on a softly blue-tinted paper mat, then a generous slim central gutter carrying lane labels and the three pairs of shield meters, upper shields blue and lower shields mint, each clearly "90 / 90". Then the player card groups on a softly mint-tinted paper mat. Fine dotted pencil seams mark the three lane boundaries; tiny faint slot guides under cards make 1+2 and 3 and 1+1+1 readable. Below lower row ONE player core bar with label "我的器具", value "300 / 300". Footer left a small supply case icon and "储备 3", currency "24", at right a broad understated charcoal-outlined butter yellow paper button exactly "开始对战". A smaller label "准备阶段" makes this a PRE-BATTLE screen, so no projectiles or random effect explosions.
Exact player arrangement: left lane contains 1-slot "旅行药匣" sage green medicine/toolbox then 2-slot "晴雨茶炉" powder blue kettle, terracotta burner and leaf umbrella; middle lane contains ONE 3-slot "星轨放映机", the lavender film projector shooting an illustrated pencil beam within its own card art; right lane contains THREE distinct 1-slot cards: "摆轮" a tiny clockwork pendulum, "补片胶" a rounded yellow repair glue bottle, "引火线" a small spool of orange fuse. No extra cards below these and no empty tenth slot.
Exact enemy arrangement: left lane ONE 3-slot card "潮汐护幕" illustrated broad rounded blue folding protective machine; middle lane ONE 2-slot "汽笛壶" a whimsical steam whistle kettle plus ONE 1-slot "摆轮" pendulum; right lane ONE 1-slot "补片胶" glue bottle plus ONE 2-slot "灯塔线圈" a simple little lighthouse-shaped coil device. Exactly 5 enemy card objects and 6 player card objects, total 11 card objects occupying all 18 slots.
Cards inherit Image 2 style but at gameplay scale: name at top, cute apparatus illustration in middle, a calm lower rule area with brief Chinese copy only if space allows, a distinct "4s" / "6s" / "8s" cooldown pill, and an INTEGRATED continuous charcoal wash band with core NUMBERS ONLY. Numerals colored by effect: silver-gray direct damage, orange burn, darker emerald poison, bright lime healing, yellow barrier repair. No effect names, no icons next to these core numbers, no individual badges or five fixed sockets. Narrow multi-effect cards wrap core numbers into two rows without shrinking font. The toolbox must retain all five sample numbers 18 silver, 4 orange, 2 emerald, 6 lime, 8 yellow in two rows; the kettle shows 24 silver, 8 orange, 4 emerald, 12 lime, 18 yellow; the projector shows 48 silver, 12 orange, 6 emerald, 18 lime, 30 yellow. Other cards show only their relevant sample numbers and never empty number sockets.
Quiet travel atmosphere in the OUTER MARGINS only: a faint hand-penciled harbor skyline, a folded route-map corner, one tiny ticket or workshop stamp. These must not compete with the cards. Flat screen capture composition viewed straight-on, no monitor bezel, no physical room, no tilted tabletop. Avoid oversized presentation titles, explanatory callouts, lore paragraphs, technical diagrams, fake lorem ipsum and watermark. Deliver a credible game UI art prototype with very clear hierarchy, welcoming paper texture and original cute illustrated tools.
```
