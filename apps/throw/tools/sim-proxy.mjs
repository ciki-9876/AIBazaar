// Shared proxy player for balance tools. It plays side 0 with the same
// helpers the built-in AI uses for side 1, so presets meet on equal terms.
import {
  aiArrange,
  duelRoundTick,
  aiReady,
  aiThinkMs,
  createThrowDuel,
  handLimit,
  launchThrowInPlace,
  recommendCards,
  stepThrowDuelInPlace,
  termsAllow,
  aiWantsSleight,
  useSleightInPlace as activateSleightInPlace,
} from '../src/lib/cards/throw-duel.ts';
import { PRESETS } from '../src/lib/cards/throw-loadout.ts';
import { PERFORMERS } from '../src/lib/cards/throw-performer.ts';

/**
 * One duel. `player` is { style, items, relic, book?, performer?, presence?, reserve?, upgrades? }; `enemy` is
 * { style, items?, relic?, book?, terms?, performer?, presence?, reserve?, upgrades? }. Returns 1 for a win, 0.5 draw, 0 loss,
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
      playerReserve: player.reserve,
      enemyReserve: enemy.reserve,
      playerUpgrades: player.upgrades,
      enemyUpgrades: enemy.upgrades,
    },
  );
  let next = 48,
    intent = [],
    release = 0,
    activeSeat = 0;
  while (s.status === 'playing') {
    stepThrowDuelInPlace(s);
    if (s.status !== 'playing') break;
    if (s.intermission) { intent = []; next = s.tick + 48; continue; }
    const f = s.fighters[0];
    if (s.activeSeats[0] !== activeSeat) {
      activeSeat = s.activeSeats[0];
      intent = [];
      next = s.tick;
    }
    const style = activeSeat > 0 ? player.reserve?.style ?? (f.performer ? PERFORMERS[f.performer].style : player.style) : player.style;
    if (aiWantsSleight(s, 0)) activateSleightInPlace(s, 0);
    if (intent.length && s.tick >= release && s.tick >= s.nextLaunch[0]) {
      launchThrowInPlace(s, 0, intent);
      intent = [];
      next = s.tick + aiThinkMs(style) / 50;
    } else if (!intent.length && s.tick >= next && f.hand.length) {
      aiArrange(s, 0, style);
      const legal = f.hand.filter((card) => !terms?.suits || terms.suits.includes(card.suit));
      let cards = legal.length
        ? recommendCards(legal, f.items, style, { ...f, target: s.fighters[1], tick: s.tick, phaseTick: duelRoundTick(s) })
        : [];
      if (terms?.maxCards) cards = cards.slice(0, terms.maxCards);
      if (terms?.minCards && cards.length < terms.minCards)
        cards = [...cards, ...legal.filter((card) => !cards.includes(card))].slice(0, terms.minCards);
      const ready =
        cards.length &&
        (terms?.maxCards || terms?.deadlineMs || aiReady(style, cards, f) || f.hand.length >= handLimit(f.relic));
      if (ready && termsAllow(terms, cards)) {
        intent = cards.map((card) => card.uid);
        release = s.tick + 20;
      } else next = s.tick + 9;
    }
  }
  return { score: s.winner === 0 ? 1 : s.winner === 'draw' ? 0.5 : 0, seconds: s.tick / 20 };
}
export const seedAt = (i) => 1000 + i * 7919;
