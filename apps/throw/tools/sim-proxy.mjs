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
  aiWantsSleight,
  useSleightInPlace,
} from '../src/lib/cards/throw-duel.ts';
import { PRESETS } from '../src/lib/cards/throw-loadout.ts';
import { MAX_THROW } from '../src/lib/cards/throw-poker.ts';

/**
 * Lazy human habits (ADR-0060). Each picks cards from the whole hand — more
 * freedom than the contiguous box a real player has — so they bound what a
 * simple habit can squeeze out of a kit. A new rule must survive all of them.
 */
const byPoints = (a, b) => b.rank - a.rank;
export const LAZY_POLICIES = {
  /** Always throw the single highest card. */
  singles: (hand) => [...hand].sort(byPoints).slice(0, 1),
  /** Wait for five cards, then dump the five highest. */
  dump: (hand) => (hand.length >= MAX_THROW ? [...hand].sort(byPoints).slice(0, MAX_THROW) : []),
  /** Throw every card of the commonest suit (up to five) once two or more share it. */
  suit: (hand) => {
    const bySuit = [0, 1, 2, 3].map((suit) => hand.filter((card) => card.suit === suit).sort(byPoints));
    const best = bySuit.sort((a, b) => b.length - a.length)[0];
    return best.length >= 2 ? best.slice(0, MAX_THROW) : [...hand].sort(byPoints).slice(0, 1);
  },
  /** Throw the three highest cards of the commonest suit, else the highest card (the v11 flush habit). */
  triple: (hand) => {
    const best = [0, 1, 2, 3].map((suit) => hand.filter((card) => card.suit === suit).sort(byPoints)).sort((a, b) => b.length - a.length)[0];
    return best.length >= 3 ? best.slice(0, 3) : [...hand].sort(byPoints).slice(0, 1);
  },
  /** Throw the biggest rank group (pair, trips, quads), else the highest card. */
  groups: (hand) => {
    const groups = new Map();
    for (const card of hand) groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
    const best = [...groups.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank)[0];
    return best.length >= 2 ? best : [...hand].sort(byPoints).slice(0, 1);
  },
};

/**
 * One duel. `player` is { style, items, relic, book?, performer?, presence?, policy? }; `enemy` is
 * { style, items?, relic?, book?, terms?, performer?, presence? }. Returns 1 for a win, 0.5 draw, 0 loss,
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
    {
      enemyItems: enemy.items,
      terms,
      performers: { player: player.performer ?? null, enemy: enemy.performer ?? null },
      // v11 presence caps (气场上限); absent means the classic 320.
      presence: { player: player.presence, enemy: enemy.presence },
    },
  );
  let next = 48,
    intent = [],
    release = 0;
  while (s.status === 'playing') {
    stepThrowDuelInPlace(s);
    if (s.status !== 'playing') break;
    const f = s.fighters[0];
    if (aiWantsSleight(s, 0)) useSleightInPlace(s, 0);
    if (intent.length && s.tick >= release) {
      launchThrowInPlace(s, 0, intent);
      intent = [];
      next = s.tick + aiThinkMs(player.style) / 50;
    } else if (!intent.length && s.tick >= next && f.hand.length) {
      if (player.policy) {
        const cards = LAZY_POLICIES[player.policy](f.hand);
        if (cards.length && termsAllow(terms, cards)) {
          intent = cards.map((card) => card.uid);
          release = s.tick + 20;
        } else next = s.tick + 9;
        continue;
      }
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
