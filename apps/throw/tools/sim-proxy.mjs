// Shared proxy player for balance tools. It plays side 0 with the same
// helpers the built-in AI uses for side 1, so presets meet on equal terms.
import {
  aiArrange,
  aiReady,
  aiThinkMs,
  createThrowDuel,
  handLimit,
  launchThrowInPlace,
  recommendCards,
  stepThrowDuelInPlace,
  termsAllow,
} from '../src/lib/cards/throw-duel.ts';
import { PRESETS } from '../src/lib/cards/throw-loadout.ts';

/**
 * One duel. `player` is { style, items, relic, book? }; `enemy` is
 * { style, items?, relic?, book?, terms? }. Returns 1 for a win, 0.5 draw, 0 loss,
 * plus the duel length in seconds.
 */
export function playDuel(player, enemy, seed) {
  const terms = enemy.terms;
  const s = createThrowDuel(
    seed,
    [...player.items],
    enemy.style,
    player.relic ?? null,
    enemy.relic !== undefined ? enemy.relic : PRESETS[enemy.style].relic,
    undefined,
    { player: player.book, enemy: enemy.book },
    { enemyItems: enemy.items, terms },
  );
  let next = 48,
    intent = [],
    release = 0;
  while (s.status === 'playing') {
    stepThrowDuelInPlace(s);
    if (s.status !== 'playing') break;
    const f = s.fighters[0];
    if (intent.length && s.tick >= release) {
      launchThrowInPlace(s, 0, intent);
      intent = [];
      next = s.tick + aiThinkMs(player.style) / 50;
    } else if (!intent.length && s.tick >= next && f.hand.length) {
      aiArrange(s, 0, player.style);
      const legal = f.hand.filter((card) => !terms?.suits || terms.suits.includes(card.suit));
      let cards = legal.length
        ? recommendCards(legal, f.items, player.style, { ...f, target: s.fighters[1], tick: s.tick })
        : [];
      if (terms?.maxCards) cards = cards.slice(0, terms.maxCards);
      if (terms?.minCards && cards.length < terms.minCards)
        cards = [...cards, ...legal.filter((card) => !cards.includes(card))].slice(0, terms.minCards);
      const ready =
        cards.length &&
        (terms?.maxCards || terms?.deadlineMs || aiReady(player.style, cards, f) || f.hand.length >= handLimit(f.relic));
      if (ready && termsAllow(terms, cards)) {
        intent = cards.map((card) => card.uid);
        release = s.tick + 20;
      } else next = s.tick + 9;
    }
  }
  return { score: s.winner === 0 ? 1 : s.winner === 'draw' ? 0.5 : 0, seconds: s.tick / 20 };
}
export const seedAt = (i) => 1000 + i * 7919;
