// Usage: node apps/throw/tools/growth-curve.mjs [N=4] [city ...]
// ADR-0059 acceptance check for the 气场 curve. For each town, three heroes with
// that town's card variants (low: 60% of the target, random cards; mid: the
// target, style-matched rares on random cards; high: the target, best-screened
// and placed) meet that town's final opponent (70% of the target variants,
// presence × 1.1) across all six styles. Target: mid duels 42–50 s, at most 30%
// past the curtain. Item modifications are not modelled (see the design doc).
import { playDuel, seedAt } from './sim-proxy.mjs';
import { PRESETS, COMPETITIVE_STYLES } from '../src/lib/cards/throw-loadout.ts';
import { ENCHANTS, GENERIC_ENCHANTS } from '../src/lib/cards/throw-enchant.ts';

const N = Number(process.argv[2] || 4);
const only = process.argv.slice(3);
/** Departure presence (base, without lodging or mood) and owned variants [rare, epic, legendary] per town. */
export const CITIES = {
  bridgeport: { presence: 340, mix: [14, 4, 0] },
  westport: { presence: 370, mix: [20, 11, 4] },
  millbrook: { presence: 395, mix: [22, 15, 8] },
  aurora: { presence: 420, mix: [24, 19, 12] },
  world: { presence: 460, mix: [30, 26, 24] },
};
const LEG = ENCHANTS.filter((e) => e.rarity === 'legendary');
const RARE = GENERIC_ENCHANTS.filter((e) => e.rarity === 'rare');
const EPIC = GENERIC_ENCHANTS.filter((e) => e.rarity === 'epic');
const SLOTS = [];
for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) SLOTS.push(`${s}-${r}`);
const keyOf = (e) => `${e.card.suit}-${e.card.rank}`;
const rng = (seed) => () => ((seed = (seed + 0x6d2b79f5) | 0), (((seed ^ (seed >>> 15)) * (1 | seed)) >>> 0) / 4294967296);
const kit = (style, book, presence) => ({ style, items: PRESETS[style].items, relic: PRESETS[style].relic, book, presence });

/** Marginal win rate of each variant for a style against the six presets (small sample). */
function screen(style) {
  const rate = (book) => {
    let score = 0;
    for (const enemy of COMPETITIVE_STYLES) for (let i = 0; i < 2; i++) score += playDuel(kit(style, book), { style: enemy }, seedAt(i) + 77).score;
    return score;
  };
  const value = (e) => rate(e.card ? { [keyOf(e)]: e.id } : Object.fromEntries((e.rarity === 'rare' ? [2, 3, 4, 5] : [14, 13]).flatMap((r) => [0, 1, 2, 3].map((s) => [`${s}-${r}`, e.id]))));
  const scored = (list) => list.map((e) => ({ e, v: value(e) })).sort((a, b) => b.v - a.v).map(({ e }) => e);
  return { legend: scored(LEG), rare: scored(RARE)[0].id, epic: scored(EPIC)[0].id };
}
function book(style, city, mode, seed, best) {
  const share = mode === 'low' ? 0.6 : mode === 'enemy' ? 0.7 : 1;
  let [nr, ne, nl] = CITIES[city].mix.map((n) => Math.round(n * share));
  nr = Math.max(0, Math.min(nr, 52 - ne - nl));
  const r = rng(seed);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const out = {};
  const free = new Set(SLOTS);
  const put = (key, id) => ((out[key] = id), free.delete(key));
  if (mode === 'high') {
    best.legend.slice(0, nl).forEach((e) => put(keyOf(e), e.id));
    [...free].sort((a, b) => +b.split('-')[1] - +a.split('-')[1]).slice(0, ne).forEach((key) => put(key, best.epic));
    [...free].sort((a, b) => +a.split('-')[1] - +b.split('-')[1]).slice(0, nr).forEach((key) => put(key, best.rare));
    return out;
  }
  for (let i = 0; i < nl; i++) {
    const e = pick(LEG.filter((entry) => free.has(keyOf(entry))));
    put(keyOf(e), e.id);
  }
  for (let i = 0; i < ne; i++) put(pick([...free]), pick(EPIC).id);
  for (let i = 0; i < nr; i++) put(pick([...free]), mode === 'low' ? pick(RARE).id : best.rare);
  return out;
}
const best = Object.fromEntries(COMPETITIVE_STYLES.map((style) => [style, screen(style)]));
for (const [city, { presence }] of Object.entries(CITIES)) {
  if (only.length && !only.includes(city)) continue;
  const enemyPresence = Math.round(presence * 1.1);
  const cells = ['low', 'mid', 'high'].map((mode) => {
    let length = 0, score = 0, late = 0, n = 0;
    for (const a of COMPETITIVE_STYLES)
      for (const b of COMPETITIVE_STYLES)
        for (let i = 0; i < N; i++) {
          const seed = seedAt(i) + 31;
          const result = playDuel(
            kit(a, book(a, city, mode, seed * 3 + a.length, best[a]), presence),
            { style: b, book: book(b, city, 'enemy', seed * 5 + b.length, best[b]), presence: enemyPresence },
            seed,
          );
          length += result.seconds;
          score += result.score;
          late += result.seconds >= 60 ? 1 : 0;
          n++;
        }
    return `${mode} ${(length / n).toFixed(1)}s ${((score / n) * 100).toFixed(0)}% late ${((late / n) * 100).toFixed(0)}%`;
  });
  console.log(`${city.padEnd(10)} ${presence}/${enemyPresence}  ${cells.join(' · ')}`);
}
