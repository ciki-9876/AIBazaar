/** Production products. Experiments have a separate manifest and never enter release builds. */
export const PRODUCTS = {
  elevator: {
    title: '安泊 · 电梯求生',
    home: 'app/survival/page.tsx',
    assets: ['fonts', 'art-assets/survival', 'art-assets/showcase'],
  },
  resonance: {
    title: '万灯城 · 共鸣卡牌',
    home: 'app/page.tsx',
    assets: ['fonts', 'art-assets/wandeng'],
  },
  throw: {
    title: '最后一张王牌 · 魔术师之旅',
    home: 'app/page.tsx',
    // All throw art is drawn in code (apps/throw/src/app/stage); no bitmap assets.
    assets: ['audio/throw'],
  },
};

/** Research builds are runnable, but are never included in production deployment. */
export const EXPERIMENTS = {
  'elevator-ai': {
    title: '电梯 AI · 实验区',
    home: 'app/page.tsx',
    assets: ['fonts', 'art-assets/survival'],
  },
};

export const PRODUCTION_PRODUCTS = Object.keys(PRODUCTS);
export const EXPERIMENTAL_PROJECTS = Object.keys(EXPERIMENTS);
export const PROJECTS = [...PRODUCTION_PRODUCTS, ...EXPERIMENTAL_PROJECTS];
