import { cardDef } from './cards/catalog.ts';
import { validateArenaBoard, simulateArenaDuel } from './arena-engine.ts';
import { makeArenaDuel, type ArenaLineup } from './arena-challenge.ts';
import { TRAINING_RULESETS, type TrainingRuleset } from './training-catalog.ts';
import type { FighterCard, Duel } from './cards/combat.ts';

function roster(prefix: string, slots: [string, number][]): FighterCard[] {
  return slots.map(([id, at], i) => ({
    uid: `${prefix}-${i}`,
    id,
    at,
    rarity: cardDef(id).rarity!,
    level: 0,
    quality: 0,
  }));
}
// Public commitment from the previous round, unchanged after the user's reveal.
export const LOCKED_ASSISTANT: ArenaLineup = {
  id: 'assistant-round-01',
  title: '炉火不熄',
  thesis: '左路灼烧充能，中路修幕反击，右路侵蚀消耗。',
  cards: roster('assistant-round-01', [
    ['arena-04', 0],
    ['arena-12', 1],
    ['arena-15', 2],
    ['arena-26', 3],
    ['arena-21', 5],
    ['arena-16', 6],
    ['arena-19', 8],
  ]),
  amps: ['amp-05', 'amp-07', 'amp-08'],
};
export const USER_TRAINING_CARDS = roster('user-keepsakes', [
  ['training-a', 0],
  ['training-b', 1],
  ['training-c', 3],
  ['training-d', 6],
  ['training-e', 7],
  ['training-f', 8],
]);
export const DEFAULT_TRAINING_AMPS = ['amp-01', 'amp-01', 'amp-06'];
export function makeTrainingDuel(
  version: TrainingRuleset = 'tuned-v1',
  amps: Array<string | null> = DEFAULT_TRAINING_AMPS,
): Duel {
  if (!TRAINING_RULESETS[version]) throw Error('未知训练场规则版本');
  validateArenaBoard(USER_TRAINING_CARDS);
  const duel = makeArenaDuel(
    structuredClone(USER_TRAINING_CARDS),
    structuredClone(LOCKED_ASSISTANT),
    [...amps],
  );
  duel.arena!.training = version;
  duel.name = '你的「借雨添灯」 vs 我的「炉火不熄」';
  return duel;
}
export const TRAINING_REPLAY_FORMAT = 'wandeng-training-v1';
export function exportTrainingDuel(duel: Duel) {
  return JSON.stringify({ format: TRAINING_REPLAY_FORMAT, duel }, null, 2);
}
export function parseTrainingDuel(raw: string): Duel {
  const value = JSON.parse(raw);
  const d = value?.duel as Duel;
  if (
    value?.format !== TRAINING_REPLAY_FORMAT ||
    !d?.arena?.training ||
    !TRAINING_RULESETS[d.arena.training]
  )
    throw Error('不是有效的训练场回放');
  if (
    !Array.isArray(d.maxHp) ||
    d.maxHp.some((v) => !Number.isFinite(v) || v <= 0 || v > 10000) ||
    !Array.isArray(d.barrierHp) ||
    d.barrierHp.length !== 2 ||
    d.barrierHp.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 3 ||
        row.some((v) => !Number.isFinite(v) || v <= 0 || v > 10000),
    )
  )
    throw Error('训练场生命或护幕输入无效');
  validateArenaBoard(d.player);
  validateArenaBoard(d.enemy);
  simulateArenaDuel(d);
  return d;
}
