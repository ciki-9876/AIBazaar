import { arenaCard } from './arena-catalog.ts';
import type { ArenaFrame } from './arena-engine.ts';
import type { Duel, FighterCard } from './cards/combat.ts';
import { trainingValues } from './training-catalog.ts';

// Presentation names only. Stable numeric rarity and saved card identities do not change.
export const CARD_RARITIES = ['普通', '稀有', '史诗', '传说', '炫彩'];
export const CORE_COLORS = {
  damage: '#e0e5ef',
  burn: '#ff983e',
  corrode: '#167047',
  shield: '#ffe15d',
  heal: '#75f58b',
} as const;
export type CoreKind = keyof typeof CORE_COLORS;
export type CoreStat = {
  key: string;
  kind: CoreKind;
  value: number;
  meaning: string;
};
export const CARD_ROLES: Record<string, string> = {
  damage: '武器 · 直击',
  burn: '武器 · 灼烧',
  corrode: '武器 · 侵蚀',
  shield: '支援 · 屏障',
  heal: '支援 · 恢复',
  tempo: '辅助 · 节奏',
  control: '干扰 · 控制',
  passive: '组件 · 联动',
};

// Base quantities, not forecasts of damage after defenses. Conditional/dynamic
// quantities stay in the canonical rules text unless the current state resolves them.
const direct: Record<number, number> = {
  1: 12,
  2: 20,
  3: 75,
  4: 7,
  5: 8,
  6: 26,
  7: 6,
  8: 27,
  9: 50,
  10: 5,
  13: 28,
  17: 7,
  18: 8,
  19: 10,
  20: 12,
  25: 9,
  26: 22,
  41: 26,
  43: 9,
  44: 23,
  46: 10,
  50: 38,
};
const repairs: Record<number, number> = {
  21: 14,
  27: 8,
  29: 8,
  30: 10,
  35: 6,
  36: 12,
};
const burn: Record<number, number> = { 11: 8, 12: 2, 14: 5, 15: 3 };

export function coreStats(
  card: FighterCard,
  frame?: ArenaFrame,
  side = 0,
  duel?: Duel,
): CoreStat[] {
  const def = arenaCard(card.id);
  if (!def) return [];
  const n = def.number,
    state = frame?.cardState?.[card.uid];
  const factor =
    (1 + card.level * 0.12 + card.quality * 0.15) * (1 + (state?.upgrade ?? 0));
  const scaled = (v: number) => Math.round(v * factor * 10) / 10;
  const lane = Math.floor(card.at / 3),
    barrier = frame?.barriers[side][lane];
  const stats: CoreStat[] = [];
  const add = (
    kind: CoreKind,
    value: number,
    meaning: string,
    key = kind as string,
  ) => {
    stats.push({ key, kind, value: Math.round(value * 10) / 10, meaning });
  };
  if (n >= 101 && n <= 106) {
    const v = trainingValues(duel?.arena?.training);
    if (n === 102)
      add(
        'damage',
        scaled(v.damage),
        '基础直伤；储能与映照加成在释放时计算。命中实际伤害等量修复本路护幕',
      );
    if (n === 105)
      add(
        'burn',
        scaled(v.burn),
        '额外攻击施加的基础灼烧层数，不是即时伤害；每3秒最多触发一次',
      );
    if (n === 106)
      add(
        'shield',
        scaled(v.repair),
        '每秒基础修幕量；满幕无额外储存，破幕不可重建',
      );
    return stats;
  }
  if (direct[n] !== undefined) {
    let base = direct[n];
    if (n === 6 && state && (state.activations + 1) % 3 === 0) base = 52;
    if (n === 50 && state && state.overdrive > 0) base = 56;
    if (duel && [41, 46].includes(n)) {
      const allies = side ? duel.enemy : duel.player;
      if (allies.filter((c) => Math.floor(c.at / 3) === lane).length === 1)
        base = n === 41 ? 48 : 30;
    }
    // Engine adds stored damage before upgrade scaling and growth afterwards.
    const stored =
      n === 26
        ? (frame?.stored[card.uid] ?? 0) * (1 + (state?.upgrade ?? 0))
        : 0;
    add(
      'damage',
      Math.round(
        (scaled(base) + stored + (n === 7 ? 0 : (state?.growth ?? 0))) * 10,
      ) / 10,
      n === 2
        ? '每发基础直伤；一次发动最多两发，命中结果受屏障和减伤影响'
        : '基础直伤；条件加成、增幅器、减伤与实际损失见规则和战斗记录',
    );
  }
  if (repairs[n] !== undefined) {
    const amount =
      n === 29 && barrier && barrier.hp < barrier.maxHp * 0.4 ? 30 : repairs[n];
    add(
      'shield',
      scaled(amount),
      '单次修复量；条件满足时生效，不超过屏障当前上限，破屏不能重建',
    );
  }
  if (burn[n] !== undefined)
    add(
      'burn',
      scaled(burn[n]),
      '基础灼烧施加层数，不是已造成伤害；成长小数由引擎累计',
    );
  if (n === 16) {
    add(
      'corrode',
      scaled(3),
      '本路基础侵蚀施加层数，不是已造成伤害',
      'corrode-main',
    );
    add(
      'corrode',
      scaled(2),
      '相邻较弱路线的基础侵蚀施加层数',
      'corrode-adjacent',
    );
  }
  if (n === 17) add('corrode', scaled(1), '基础侵蚀施加层数，不是已造成伤害');
  if (n === 28)
    add('heal', scaled(20), '单次生命恢复量；实际恢复不超过缺失生命');
  if (n === 47) {
    const unlocked =
      !!state && state.questHits >= 2 && state.questAbsorbed >= 45;
    add(
      unlocked ? 'damage' : 'shield',
      scaled(unlocked ? 30 : 8) + (unlocked ? (state?.growth ?? 0) : 0),
      unlocked ? '工序已完成：基础直伤' : '工序未完成：基础修复量',
    );
  }
  if (n === 48) {
    const repairing =
      !!barrier && !barrier.broken && barrier.hp <= barrier.maxHp * 0.5;
    add(
      repairing ? 'shield' : 'damage',
      scaled(repairing ? 24 : 28) + (repairing ? 0 : (state?.growth ?? 0)),
      repairing
        ? '当前为修复形态'
        : '当前为攻击形态；完整屏障不高于50%时改为修复',
    );
  }
  return stats;
}

// Twelve original illustrations shared by mechanism families; no rendered UI/text in assets.
export function cardIllustration(id: string) {
  const card = arenaCard(id),
    n = card?.number ?? 1;
  if ([3, 6, 8, 9, 13, 41, 44, 50].includes(n)) return 1;
  if ([11, 12, 14, 15].includes(n)) return 2;
  if ([16, 17, 19, 20, 27].includes(n)) return 3;
  if (n === 18) return 4;
  if ([21, 29, 30, 35, 36].includes(n)) return 5;
  if ([23, 24, 25, 28].includes(n)) return 6;
  if ([31, 32, 33, 38, 39].includes(n)) return 7;
  if ([34, 40].includes(n)) return 8;
  if ([22, 26, 47, 48].includes(n)) return 9;
  if ([2, 37].includes(n)) return 10;
  if ([7, 42, 45, 49].includes(n)) return 11;
  return 0;
}

export function sampleFighter(id: string): FighterCard {
  return {
    id,
    uid: `catalog-${id}`,
    at: 0,
    rarity: arenaCard(id)?.rarity ?? 0,
    level: 0,
    quality: 0,
  };
}
