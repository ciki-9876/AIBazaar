import { cardDef, SCHOOLS, type School } from './demo-cards.ts';
import { rarityOf } from './demo-card-rules.ts';
import type { FighterCard, Duel } from './demo-combat.ts';
export const ARCHETYPES: {
  id: School;
  name: string;
  beats: School;
  core: string;
  weakness: string;
  variants: string[][];
}[] = [
  {
    id: 'rush',
    name: SCHOOLS.rush,
    beats: 'erosion',
    core: '前几轮高额弹道伤害，破路后由猎隙刃兑现宿主伤害。',
    weakness: '爆发增幅会耗尽；缓冲和修复拖过启动期后收益下降。',
    variants: [
      ['nailer', 'fuse', 'springbow', 'gapblade', 'nailer', 'gapblade'],
      ['springbow', 'fuse', 'nailer', 'gapblade', 'springbow', 'gapblade'],
    ],
  },
  {
    id: 'bastion',
    name: SCHOOLS.bastion,
    beats: 'rush',
    core: '缓冲减少高频打击，修复维持屏障，把实际承伤存成下一击伤害。',
    weakness: '侵蚀绕过缓冲并压低修复上限，无法靠修复永久维持防线。',
    variants: [
      ['recoil', 'rubber', 'recoil', 'sealant', 'counterweight', 'sealant'],
      [
        'counterweight',
        'rubber',
        'recoil',
        'sealant',
        'counterweight',
        'sealant',
      ],
    ],
  },
  {
    id: 'erosion',
    name: SCHOOLS.erosion,
    beats: 'bastion',
    core: '叠侵蚀压低屏障上限，催化加速叠层，培养皿在长局逐渐接管输出。',
    weakness: '第一轮输出低；需要多次发动，害怕屏障在成长前被突破。',
    variants: [
      ['acid', 'catalyst', 'culture', 'distiller', 'acid', 'distiller'],
      ['culture', 'catalyst', 'acid', 'distiller', 'culture', 'distiller'],
    ],
  },
];
export const PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
export function archetypeBoard(
  id: School,
  side: string,
  variant = 0,
  permutation = 0,
  quality = 0,
  level = 0,
): FighterCard[] {
  const ids = ARCHETYPES.find((a) => a.id === id)!.variants[variant % 2],
    lanes: FighterCard[][] = [[], [], []];
  let at = 0;
  for (const [i, id] of ids.entries()) {
    const c = cardDef(id);
    if (Math.floor(at / 3) !== Math.floor((at + c.size - 1) / 3))
      throw Error('流派预设跨路');
    lanes[Math.floor(at / 3)].push({
      id,
      uid: `${side}-${i}`,
      at,
      quality,
      level,
      rarity: rarityOf(id),
    });
    at += c.size;
  }
  return PERMUTATIONS[permutation % 6].flatMap((from, to) =>
    lanes[from].map((c) => ({ ...c, at: to * 3 + (c.at % 3) })),
  );
}
export function archetypeDuel(
  a: School,
  b: School,
  variantA = 0,
  variantB = 0,
  permA = 0,
  permB = 0,
  hp = 300,
  quality = 0,
  level = 0,
): Duel {
  return {
    player: archetypeBoard(a, 'p', variantA, permA, quality, level),
    enemy: archetypeBoard(b, 'e', variantB, permB, quality, level),
    maxHp: [hp, hp],
    weather: 0,
    weatherEnabled: false,
    layout: 0,
    name: SCHOOLS[b],
    kind: 'guardian',
    botId: null,
  };
}
