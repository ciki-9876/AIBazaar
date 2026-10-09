import { MAX_HP, type DuelEvent } from '../../../lib/cards/throw-duel.ts';

/** A real player hit, after shields, must strictly exceed a fifth of the opponent's maximum life. */
export const deservesCheer = (event: DuelEvent) =>
  event.type === 'hit' && event.side === 0 && (event.hpDamage ?? 0) > MAX_HP * 0.2;
