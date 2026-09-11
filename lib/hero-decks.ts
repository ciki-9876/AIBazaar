import type { HeroId } from './hero-cards.ts';
import { ALL_CARDS, cardDef } from './demo-cards.ts';
import { rarityOf } from './demo-card-rules.ts';
import { heroOwner } from './heroes.ts';
import { PERMUTATIONS } from './demo-archetypes.ts';
import type { Duel, FighterCard } from './demo-combat.ts';
export type HeroDeck = {
  id: string;
  hero: HeroId;
  name: string;
  idea: string;
  lanes: string[][];
};
export const HERO_DECKS: HeroDeck[] = [
  {
    id: 'c-heavy',
    hero: 'breaker',
    name: '重型破拆 · 4 张',
    idea: '两台三格重机分别开路，提速留给破障雷；开路后的英雄充能继续推进。',
    lanes: [['c-ram'], ['c-ram'], ['c-burst', 'c-spark']],
  },
  {
    id: 'c-mixed',
    hero: 'breaker',
    name: '工地混编 · 6 张',
    idea: '中立钉枪和引信抢开场，专属破障雷与切割片接续突破。',
    lanes: [
      ['c-punch', 'c-spark'],
      ['c-burst', 'c-cut'],
      ['nailer', 'fuse'],
    ],
  },
  {
    id: 'c-light',
    hero: 'breaker',
    name: '随身工具 · 9 张',
    idea: '多张小牌快速发动，治疗保住开路时间；代价是对缓冲更敏感。',
    lanes: [
      ['c-cut', 'c-pacer', 'c-spark'],
      ['c-cut', 'c-pacer', 'c-spark'],
      ['knife', 'c-pacer', 'c-rope'],
    ],
  },
  {
    id: 'b-heavy',
    hero: 'mender',
    name: '移动工坊 · 5 张',
    idea: '三格维修站守一路，两路防守转输出。修复空转时大卡的占格代价尤其明显。',
    lanes: [['b-cart'], ['b-hammer', 'b-rivet'], ['b-return', 'b-gasket']],
  },
  {
    id: 'b-mixed',
    hero: 'mender',
    name: '攻防检修 · 6 张',
    idea: '反击、维持屏障、修复提速分别成路，中立蓄热砖补足直接爆发。',
    lanes: [
      ['b-return', 'b-gasket'],
      ['b-hammer', 'b-staple'],
      ['brick', 'b-wrench'],
    ],
  },
  {
    id: 'b-light',
    hero: 'mender',
    name: '零件网络 · 8 张',
    idea: '小卡持续制造有效修复，手摇电芯供应能量，中立跨路线圈寻找突破口。',
    lanes: [
      ['b-rivet', 'b-staple', 'b-wrench'],
      ['b-rivet', 'b-staple', 'b-gasket'],
      ['coil', 'cell'],
    ],
  },
  {
    id: 'w-heavy',
    hero: 'archivist',
    name: '双柜归档 · 4 张',
    idea: '两张三格成长柜集中追击已侵蚀的一路，小路负责准备标记。',
    lanes: [['w-cabinet'], ['w-cabinet'], ['w-ink', 'w-index']],
  },
  {
    id: 'w-mixed',
    hero: 'archivist',
    name: '档案流水线 · 6 张',
    idea: '蚀液与培养皿接入档案回响，目录驱动全场摆钟，复写侵蚀加快启动。',
    lanes: [
      ['acid', 'catalyst'],
      ['culture', 'distiller'],
      ['w-clock', 'w-index'],
    ],
  },
  {
    id: 'w-light',
    hero: 'archivist',
    name: '快速抄录 · 8 张',
    idea: '小卡积累记录，水果刀、标本与旧档案分别成为三路的复写目标。',
    lanes: [
      ['knife', 'w-pen', 'w-pen'],
      ['w-label', 'w-index', 'w-vial'],
      ['w-tome', 'w-vial'],
    ],
  },
];
export function heroBoard(
  deck: HeroDeck,
  side: string,
  permutation = 0,
  quality = 0,
  level = 0,
): FighterCard[] {
  return PERMUTATIONS[permutation].flatMap((from, lane) => {
    let col = 0;
    return deck.lanes[from].map((id, i) => {
      const c = cardDef(id),
        at = lane * 3 + col;
      col += c.size;
      if (col > 3) throw Error('卡牌跨路');
      return {
        id,
        uid: `${side}-${from}-${i}`,
        at,
        rarity: rarityOf(id),
        quality,
        level,
      };
    });
  });
}
export function heroDuel(
  a: HeroDeck,
  b: HeroDeck,
  p = 0,
  q = 0,
  hp = 300,
  quality = 0,
  level = 0,
): Duel {
  return {
    player: heroBoard(a, 'p', p, quality, level),
    enemy: heroBoard(b, 'e', q, quality, level),
    heroes: [a.hero, b.hero],
    maxHp: [hp, hp],
    weather: 0,
    layout: 0,
    name: b.name,
    kind: 'guardian',
    botId: null,
  };
}
export const heroPool = (id: HeroId) =>
  ALL_CARDS.filter((c) => !heroOwner(c.id) || heroOwner(c.id) === id);
