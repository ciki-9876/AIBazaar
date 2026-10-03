# F9 原创动物双版本素材

工具：内置 image_gen，未使用 CLI fallback。两次生成均为原创 atlas，3 列 × 4 行；直接复制到项目，CSS 选择格子，未裁改原图。

- 绘本素材：`public/art-assets/arena-2d/animals-storybook.png`
- 贴纸素材：`public/art-assets/arena-2d/animals-sticker.png`

## A+B 完整提示词

```text
Use case: illustration-story. Production game asset: a perfectly aligned 3-column by 4-row illustration atlas, exactly 12 equal square cells, entire canvas aspect ratio 3:4. No gutters, no lines between cells. Every cell has the SAME solid very pale warm ivory background #f5f5ef. Every subject is fully inside its cell, centered, occupying middle 65%, with generous blank margins. No text, no letters, no numbers, no UI, no card frames, no watermarks. Original cute animal companions paired with equipment to communicate card function. All subjects charming, confident, playful; no existing franchise characters.
Row1 left: a small tan hamster holding a tiny blue dart launcher; center: a round blue-grey hippo standing beside a chunky compact cannon; right: a red-orange fox carrying a little lantern with a single flame.
Row2 left: a green frog tending two mushrooms; center: a mint penguin carrying an ice cube; right: a brown beaver carrying a yellow shield and tiny repair wrench.
Row3 left: a cream rabbit holding a green first-aid leaf; center: a yellow squirrel holding a small blue battery; right: a lavender owl beside a little alarm clock.
Row4 left: a tortoise with a shell shaped like a shield; center: a raccoon holding two small blue pistols pointed down; right: a hedgehog carrying a little sprout.
Consistent animal scale and front-three-quarter views. Absolutely avoid photorealism, shiny metal, glossy plastic, cinematic lights, bloom, rainbow effects, complex scenery, particles, dense texture. This is an atlas for small on-screen cards: clear silhouettes and one primary animal per square.
Style version B: warm hand-drawn children's storybook cartoon. Confident dark charcoal organic outlines, expressive faces, gently irregular shapes, flat muted pigments with ONE simple hand-painted shadow plane, extremely subtle paper grain inside colored shapes only. Appealing expressive poses, a little whimsical detail in costume/equipment, but uncluttered. Comparable clarity to independent illustrated card battlers. The 12 cells must align exactly into a seamless 3x4 grid for CSS sprite positioning.
```

## A+G 完整提示词

```text
Use case: illustration-story. Production game asset: a perfectly aligned 3-column by 4-row illustration atlas, exactly 12 equal square cells, entire canvas aspect ratio 3:4. No gutters, no lines between cells. Every cell has the SAME solid very pale warm ivory background #f5f5ef. Every subject is fully inside its cell, centered, occupying middle 65%, with generous blank margins. No text, no letters, no numbers, no UI, no card frames, no watermarks. Original cute animal companions paired with equipment to communicate card function. All subjects charming, confident, playful; no existing franchise characters.
Row1 left: a small tan hamster holding a tiny blue dart launcher; center: a round blue-grey hippo standing beside a chunky compact cannon; right: a red-orange fox carrying a little lantern with a single flame.
Row2 left: a green frog tending two mushrooms; center: a mint penguin carrying an ice cube; right: a brown beaver carrying a yellow shield and tiny repair wrench.
Row3 left: a cream rabbit holding a green first-aid leaf; center: a yellow squirrel holding a small blue battery; right: a lavender owl beside a little alarm clock.
Row4 left: a tortoise with a shell shaped like a shield; center: a raccoon holding two small blue pistols pointed down; right: a hedgehog carrying a little sprout.
Consistent animal scale and front-three-quarter views. Absolutely avoid photorealism, shiny metal, glossy plastic, cinematic lights, bloom, rainbow effects, complex scenery, particles, dense texture. This is an atlas for small on-screen cards: clear silhouettes and one primary animal per square.
Style version G: ultra simple flat vector-like animal stickers. Thick clean dark charcoal outlines, rounded geometric bodies, dot eyes and tiny mouths. Only 3 to 5 flat solid colors per animal. No texture, no painted shading, no gradients, no detailed fur, no clothing except the specified simple equipment. Cute emoji-like silhouettes but original expressive animals, polished graphic design. Same plain ivory backdrop throughout. The 12 cells must align exactly into a seamless 3x4 grid for CSS sprite positioning.
```

