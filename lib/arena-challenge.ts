import { cardDef } from './demo-cards.ts';
import { simulateDuel, type Duel, type FighterCard } from './demo-combat.ts';
import type { ArenaOptions } from './arena-engine.ts';

export type ArenaLineup = { id: string; title: string; thesis: string; cards: FighterCard[]; amps: Array<string | null> };
type Slot = [string, number];
const build = (id: string, title: string, thesis: string, slots: Slot[], amps: Array<string | null>): ArenaLineup => ({
  id, title, thesis, amps,
  cards: slots.map(([cardId, at], i) => ({ uid: `enemy-${id}-${i}`, id: cardId, at, rarity: cardDef(cardId).rarity ?? 0, quality: 0, level: 0 })),
});

export const OPENING_LINEUP = build('opening', '三路试探', '左路抢屏、中路灼烧、右路修复，观察你愿意在哪一路投入。', [
  ['arena-01', 0], ['arena-05', 1], ['arena-11', 3], ['arena-12', 5], ['arena-21', 6], ['arena-43', 7],
], ['amp-04', 'amp-05', 'amp-01']);

const candidates: ArenaLineup[] = [
  build('breach', '破屏追击', '用贯芯与即时直击压过单路厚屏。', [['arena-09', 0], ['arena-04', 3], ['arena-46', 4], ['arena-03', 6]], ['amp-04', 'amp-08', 'amp-04']),
  build('attrition', '热蚀消耗', '两种持续伤害分路压低屏障，再由培养槽放大后期输出。', [['arena-14', 0], ['arena-16', 3], ['arena-17', 5], ['arena-18', 6]], ['amp-05', 'amp-03', 'amp-04']),
  build('bulwark', '三线固守', '屏障缓冲、复机与治疗换取长期优势。', [['arena-30', 0], ['arena-23', 3], ['arena-21', 5], ['arena-47', 6], ['arena-21', 8]], ['amp-06', 'amp-01', 'amp-07']),
  build('tempo', '钟摆压制', '控制敌方关键冷却，同时促发自己的伤害牌。', [['arena-33', 0], ['arena-06', 1], ['arena-34', 3], ['arena-43', 5], ['arena-31', 6], ['arena-41', 7]], ['amp-09', 'amp-08', 'amp-04']),
  build('burst', '火力合围', '双弹道与增幅器积累穿透前的火力。', [['arena-02', 0], ['arena-37', 2], ['arena-13', 3], ['arena-11', 6]], ['amp-04', 'amp-04', 'amp-05']),
  build('counter', '承伤反击', '把承伤换成储能与反击，惩罚高频进攻。', [['arena-26', 0], ['arena-22', 3], ['arena-41', 6], ['arena-35', 8]], ['amp-07', 'amp-02', 'amp-10']),
];

export function makeArenaDuel(player: FighterCard[], enemy: ArenaLineup, playerAmps: Array<string | null>): Duel {
  return {
    player, enemy: enemy.cards, maxHp: [300, 300], barrierHp: [[90, 90, 90], [90, 90, 90]],
    weather: 0, weatherEnabled: false, layout: 0, name: enemy.title, kind: 'guardian', botId: null,
    arena: { version: 1, amplifiers: [playerAmps, enemy.amps] } as ArenaOptions,
  };
}

export type CounterReport = { lineup: ArenaLineup; tested: number; enemyWins: number; playerHp: number; enemyHp: number; counterFound: boolean };
export function chooseCounter(player: FighterCard[], playerAmps: Array<string | null>, excludeId: string): CounterReport {
  const mirrorCards = player.map((card, i) => ({ ...card, uid: `enemy-reflect-${i}` }));
  const reflect = (id: string, title: string, amps: string[]): ArenaLineup => ({ id, title,
    thesis: '读取你的三路布阵后，以相同位置建立对位压力，并改变屏障增幅器配置。',
    cards: mirrorCards, amps });
  const adaptive = [
    reflect('reflect-armor', '对位加固', ['amp-01', 'amp-01', 'amp-01']),
    reflect('reflect-buffer', '对位缓冲', ['amp-02', 'amp-02', 'amp-02']),
    reflect('reflect-clock', '对位抢速', ['amp-08', 'amp-08', 'amp-08']),
    reflect('reflect-resist', '对位抗性', [0, 1, 2].map((lane) => {
      const laneCards = player.filter((card) => Math.floor(card.at / 3) === lane);
      if (laneCards.some((card) => cardDef(card.id).kind === 'corrode')) return 'amp-03';
      if (laneCards.some((card) => ['control', 'charge'].includes(cardDef(card.id).kind))) return 'amp-09';
      if (laneCards.some((card) => cardDef(card.id).kind === 'damage')) return 'amp-02';
      return 'amp-01';
    })),
  ];
  const ranked = [...candidates, ...adaptive].filter((x) => x.id !== excludeId).map((lineup) => {
    const result = simulateDuel(makeArenaDuel(player, lineup, playerAmps));
    const last = result.frames.at(-1)!;
    return { lineup, enemyWins: result.winner === 1 ? 1 : 0, playerHp: last.hp[0], enemyHp: last.hp[1] };
  }).sort((a, b) => b.enemyWins - a.enemyWins || a.playerHp - b.playerHp || b.enemyHp - a.enemyHp || a.lineup.id.localeCompare(b.lineup.id));
  const best = ranked[0];
  return { ...best, tested: ranked.length, counterFound: !!best.enemyWins };
}
