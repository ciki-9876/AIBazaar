// Usage: node apps/throw/tools/enchant-power.mjs [N=8]
// Each generic enchantment alone, at its rarity limit on the highest cards
// placed high (rare: A and K of every suit; epic: the four aces) and low
// (rare: 8s and 7s; epic: the four 8s), against the white deck.
import { playDuel, seedAt } from './sim-proxy.mjs';
import { PRESETS, COMPETITIVE_STYLES } from '../src/lib/cards/throw-loadout.ts';
import { GENERIC_ENCHANTS } from '../src/lib/cards/throw-enchant.ts';
const N = Number(process.argv[2] || 8);
const kit = (s, book) => ({ style: s, items: PRESETS[s].items, relic: PRESETS[s].relic, book });
const rate = (book) => {
  const per = {};
  for (const a of COMPETITIVE_STYLES) {
    let sc = 0, n = 0;
    for (const b of COMPETITIVE_STYLES) for (let i = 0; i < N; i++) { sc += playDuel(kit(a, book), { style: b }, seedAt(i)).score; n++; }
    per[a] = (sc / n) * 100;
  }
  return per;
};
const fmt = (per) => COMPETITIVE_STYLES.map((s) => `${s} ${per[s].toFixed(0)}`).join(' ');
const mean = (per) => Object.values(per).reduce((x, y) => x + y) / 6;
const base = rate({});
console.log('white'.padEnd(16), mean(base).toFixed(1).padStart(5), '|', fmt(base));
const placements = {
  high: { rare: [14, 13], epic: [14] },
  low: { rare: [8, 7], epic: [8] },
};
for (const e of GENERIC_ENCHANTS)
  for (const [where, ranks] of Object.entries(placements)) {
    const cards = ranks[e.rarity === 'rare' ? 'rare' : 'epic'].flatMap((r) => [0, 1, 2, 3].map((s) => `${s}-${r}`));
    const book = Object.fromEntries(cards.map((k) => [k, e.id]));
    const per = rate(book);
    console.log(`${e.id}(${e.rarity[0]}) ${where}`.padEnd(16), mean(per).toFixed(1).padStart(5), `Δ${(mean(per) - mean(base)).toFixed(1).padStart(5)}`, '|', fmt(per));
  }
