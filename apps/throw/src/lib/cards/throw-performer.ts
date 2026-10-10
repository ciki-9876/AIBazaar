/**
 * Performers (ADR-0057): who is on stage. Every performer has the same life
 * and stats; identity comes only from rules — a passive talent, one active
 * sleight with a cooldown, and a signature deck book.
 */
import type { DeckBook } from './throw-enchant.ts';
import type { Style } from './throw-loadout.ts';

export type PerformerId = 'eli' | 'juno' | 'rosie' | 'stan';
export type SleightId = 'peek' | 'boomerang' | 'stoke' | 'switch';

/** Eli · 压箱底: emptying your hand with a throw adds this much damage. */
export const EMPTY_HAND_BONUS = 3;
/** Juno · 街头削盾: her single cards spend this much shield per point stopped (everyone else: SHRED). */
export const JUNO_SHRED = 1.4;
/** Rosie · 火上浇油: share of the target's burn settled at once, and the least burn it needs. */
export const STOKE_SHARE = 0.5;
export const STOKE_MIN_BURN = 4;
/** The built-in AI stokes once the target carries at least this much burn. */
export const STOKE_AI_BURN = 8;
/** Stan · 中途下车: the first time his life drops below half, he draws this many cards. */
export const ALIGHT_DRAW = 2;
/** The built-in AI switches a card only if its lowest card is at most this rank. */
export const SWITCH_AI_RANK = 5;

export type Performer = {
  id: PerformerId;
  name: string;
  /** AI play style when this performer is computer-controlled. */
  style: Style;
  talent: { name: string; text: string };
  sleight: { id: SleightId; name: string; text: string; cooldownMs: number };
  /** Signature deck; the hero's is whatever the player has collected. */
  book: DeckBook;
};

export const PERFORMERS: Record<PerformerId, Performer> = {
  eli: {
    id: 'eli',
    name: '伊莱·维尔',
    style: 'quick',
    talent: { name: '压箱底', text: `这一手打空手牌时：直伤 +${EMPTY_HAND_BONUS}。` },
    sleight: {
      id: 'peek',
      name: '假洗',
      text: '亮出下一轮要发的 2 张；不想要，可以把它们埋到牌堆底。',
      cooldownMs: 18000,
    },
    book: {},
  },
  juno: {
    id: 'juno',
    name: '朱诺·贝尔',
    style: 'quick',
    talent: { name: '街头削盾', text: `她的单张每被挡下 1 点，削掉对手 ${JUNO_SHRED} 点护盾（别人是 1.1）。` },
    sleight: {
      id: 'boomerang',
      name: '回旋飞牌',
      text: '下一张单张命中后，回到她手里。',
      cooldownMs: 20000,
    },
    book: {
      '0-11': 'LSJ',
      '0-14': 'gold',
      '1-14': 'gold',
      '2-14': 'gold',
      '3-14': 'gold',
      '0-3': 'edge',
      '1-3': 'edge',
      '2-3': 'edge',
      '3-3': 'edge',
    },
  },
  rosie: {
    id: 'rosie',
    name: '罗茜·费恩',
    style: 'burn',
    talent: { name: '厨房出身', text: '着火时出手不会烫手。' },
    sleight: {
      id: 'stoke',
      name: '火上浇油',
      text: `对手身上至少 ${STOKE_MIN_BURN} 层灼烧时：一半立刻结算为伤害（护盾可挡），并移除这些层数。`,
      cooldownMs: 15000,
    },
    book: {
      '3-2': 'seal',
      '3-3': 'seal',
      '3-4': 'seal',
      '3-5': 'seal',
      '3-6': 'seal',
      '3-7': 'seal',
      '3-8': 'seal',
      '3-13': 'LDK',
    },
  },
  stan: {
    id: 'stan',
    name: '司机斯坦',
    style: 'quick',
    talent: { name: '中途下车', text: `生命第一次跌破一半时：立刻抽 ${ALIGHT_DRAW} 张。` },
    sleight: {
      id: 'switch',
      name: '换牌',
      text: '把手里点数最小的一张换成牌堆顶的那张；换下的牌放到牌堆底。',
      cooldownMs: 12000,
    },
    // He has never won. He has never wanted to. White cards suit him.
    book: {},
  },
};
export const PERFORMER_IDS = Object.keys(PERFORMERS) as PerformerId[];
export const isPerformer = (id: unknown): id is PerformerId =>
  typeof id === 'string' && Object.hasOwn(PERFORMERS, id);
