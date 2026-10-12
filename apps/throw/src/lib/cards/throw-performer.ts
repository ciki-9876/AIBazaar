/**
 * Performers (ADR-0057): who is on stage. Every performer has the same life
 * and stats; identity comes only from rules — a passive talent, one active
 * sleight with a cooldown, and a signature deck book.
 */
import type { DeckBook } from './throw-enchant.ts';
import type { Style } from './throw-loadout.ts';

export type PerformerId = 'eli' | 'juno' | 'rosie' | 'stan' | 'molly' | 'pip' | 'holt' | 'edith' | 'oswald';
export type SleightId = 'quick-draw' | 'peek' | 'boomerang' | 'stoke' | 'switch' | 'remedy' | 'encore';

/** Eli alone can pull up to five extra cards without disturbing the normal deal clock. */
export const QUICK_DRAW_COUNT = 5;

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
/** Rosie resists the body's burn tick, without strengthening an existing shield. */
export const ROSIE_BURN_RESIST = 2;
export const MOLLY_HEART_HEAL = 3;
export const MOLLY_REMEDY = 24;

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
  pip: { id: 'pip', name: '小号手皮普', style: 'guard', talent: { name: '接住尾音', text: '每次出牌至少 2 张：护盾 +4。' }, sleight: { id: 'remedy', name: '深呼吸', text: '治疗 24，按治疗规则净毒。冷却 18 秒。', cooldownMs: 18000 }, book: { '0-4': 'lining', '0-8': 'lining', '1-9': 'mint' } },
  holt: { id: 'holt', name: '阿瑟·霍尔特', style: 'combo', talent: { name: '整团的节拍', text: '含对子牌型的出手：护盾 +4。' }, sleight: { id: 'quick-draw', name: '续幕', text: '补抽最多 5 张，冷却 15 秒。', cooldownMs: 15000 }, book: {} },
  edith: { id: 'edith', name: '伊迪丝·霍尔特', style: 'guard', talent: { name: '织布手', text: '每次甩出单张：护盾 +4。' }, sleight: { id: 'boomerang', name: '回针', text: '下一张单张命中后回到手中，冷却 20 秒。', cooldownMs: 20000 }, book: {} },
  oswald: { id: 'oswald', name: '奥斯瓦尔德', style: 'burn', talent: { name: '炉膛余温', text: '每次出牌含方块：额外灼烧 +1。' }, sleight: { id: 'stoke', name: '添煤', text: '对手至少 4 层灼烧时：一半立刻结算并移除。冷却 15 秒。', cooldownMs: 15000 }, book: {} },

  eli: {
    id: 'eli',
    name: '伊莱·维尔',
    style: 'quick',
    talent: { name: '压箱底', text: `这一手打空手牌时：直伤 +${EMPTY_HAND_BONUS}。` },
    sleight: {
      id: 'quick-draw',
      name: '快抽',
      text: '立即抽 5 张牌，最多补到手牌上限；满手时不可用。冷却 15 秒。',
      cooldownMs: 15000,
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
    talent: { name: '厨房出身', text: `每秒灼烧对气场造成的伤害减少 ${ROSIE_BURN_RESIST}，最低为 0；闷火烧盾不减。` },
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
    talent: { name: '中途下车', text: `气场第一次跌破一半时：立刻抽 ${ALIGHT_DRAW} 张。` },
    sleight: {
      id: 'switch',
      name: '换牌',
      text: '把手里点数最小的一张换成牌堆顶的那张；换下的牌放到牌堆底。',
      cooldownMs: 12000,
    },
    // He has never won. He has never wanted to. White cards suit him.
    book: {},
  },
  molly: {
    id: 'molly',
    name: '午夜莫莉',
    style: 'mend',
    talent: { name: '夜班照护', text: `每次甩出含红心的牌：治疗 ${MOLLY_HEART_HEAL}，并按治疗规则净毒；每次出手只触发一次。` },
    sleight: {
      id: 'remedy', name: '夜班急救',
      text: `治疗 ${MOLLY_REMEDY} 并净化 ${MOLLY_REMEDY / 2} 层剧毒；灼烧或重创时治疗降至六成。冷却 18 秒。`,
      cooldownMs: 18000,
    },
    book: { '1-4': 'mint', '1-8': 'mint', '1-12': 'mint' },
  },
};
export const PERFORMER_IDS = Object.keys(PERFORMERS) as PerformerId[];
export const isPerformer = (id: unknown): id is PerformerId =>
  typeof id === 'string' && Object.hasOwn(PERFORMERS, id);
