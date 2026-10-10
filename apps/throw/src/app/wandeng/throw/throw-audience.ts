import { MAX_HP, type DuelEvent } from '../../../lib/cards/throw-duel.ts';

/** A real player hit, after shields, must strictly exceed a fifth of the opponent's presence cap (气场上限). */
export const deservesCheer = (event: DuelEvent, targetMaxHp = MAX_HP) =>
  event.type === 'hit' && event.side === 0 && (event.hpDamage ?? 0) > targetMaxHp * 0.2;
