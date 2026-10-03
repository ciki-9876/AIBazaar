/** Explicit release manifests. Experiments never enter either production route tree. */
export const PRODUCTS = {
  elevator: {
    title: '安泊 · 电梯求生',
    home: 'app/survival/page.tsx',
    routes: { survival: 'app/survival/page.tsx' },
    assets: ['fonts', 'art-assets/survival', 'art-assets/showcase'],
  },
  cards: {
    title: '万灯城 · 归物师',
    home: 'app/wandeng/page.tsx',
    routes: {
      wandeng: 'app/wandeng/page.tsx',
      'wandeng/training': 'app/wandeng/training/page.tsx',
      arena: 'app/arena/page.tsx',
      'arena/2d': 'app/arena/2d/page.tsx',
      'arena/2d/sticker': 'app/arena/2d/sticker/page.tsx',
      'arena/2d/storybook': 'app/arena/2d/storybook/page.tsx',
    },
    assets: [
      'fonts',
      'art-assets/wandeng',
      'art-assets/arena-2d',
      'art-assets/battle-slice',
      'art-assets/material-study',
    ],
  },
};
