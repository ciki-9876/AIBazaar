// Usage: node apps/throw/tools/card-exposure.mjs [N=10]
// How often does one specific card reach the hand, get thrown, or get thrown
// after the curtain (60 s)? Use it before designing a variant that depends on
// a single card or on the curtain.
import * as D from '../src/lib/cards/throw-duel.ts';
import { PRESETS, COMPETITIVE_STYLES } from '../src/lib/cards/throw-loadout.ts';
const N = Number(process.argv[2] || 10);
const rows = [];
for (const a of COMPETITIVE_STYLES) for (const b of COMPETITIVE_STYLES) for (let i = 0; i < N; i++) {
  const seed = 1000 + i * 7919;
  const s = D.createThrowDuel(seed, [...PRESETS[a].items], b, PRESETS[a].relic, PRESETS[b].relic);
  const seen = new Set(), thrown = new Set(), late = new Set();
  let next = 48, intent = [], release = 0;
  const note = () => s.fighters[0].hand.forEach((c) => seen.add(c.uid));
  note();
  while (s.status === 'playing') {
    D.stepThrowDuelInPlace(s); note();
    if (s.status !== 'playing') break;
    const f = s.fighters[0];
    if (intent.length && s.tick >= release) { intent.forEach((u) => { thrown.add(u); if (s.tick >= 1200) late.add(u); }); D.launchThrowInPlace(s, 0, intent); intent = []; next = s.tick + D.aiThinkMs(a) / 50; }
    else if (!intent.length && s.tick >= next && f.hand.length) {
      D.aiArrange(s, 0, a);
      const cards = D.recommendCards(f.hand, f.items, a, { ...f, target: s.fighters[1], tick: s.tick });
      if (cards.length && (D.aiReady(a, cards, f) || f.hand.length >= D.handLimit(f.relic))) { intent = cards.map((c) => c.uid); release = s.tick + 20; } else next = s.tick + 9;
    }
  }
  rows.push({ a, sec: s.tick / 20, seen: seen.size, thrown: thrown.size, late: late.size, long: s.tick >= 1200 ? 1 : 0 });
}
const by = {};
for (const r of rows) (by[r.a] ??= []).push(r);
const avg = (xs, k) => xs.reduce((x, r) => x + r[k], 0) / xs.length;
console.log('style   sec   seen/52  thrown/52  P(card seen)  P(thrown)');
for (const [a, xs] of Object.entries(by)) console.log(a.padEnd(7), avg(xs,'sec').toFixed(0).padStart(4), avg(xs,'seen').toFixed(1).padStart(8), avg(xs,'thrown').toFixed(1).padStart(9), (avg(xs,'seen')/52*100).toFixed(0).padStart(10)+'%', (avg(xs,'thrown')/52*100).toFixed(0).padStart(9)+'%');
console.log('all    ', avg(rows,'sec').toFixed(0).padStart(4), avg(rows,'seen').toFixed(1).padStart(8), avg(rows,'thrown').toFixed(1).padStart(9), (avg(rows,'seen')/52*100).toFixed(0).padStart(10)+'%', (avg(rows,'thrown')/52*100).toFixed(0).padStart(9)+'%');
console.log('\nstyle   P(duel reaches 60s)  P(specific card thrown after 60s)');
for (const [a, xs] of Object.entries(by)) console.log(a.padEnd(7), (avg(xs,'long')*100).toFixed(0).padStart(10)+'%', (avg(xs,'late')/52*100).toFixed(1).padStart(18)+'%');
console.log('all    ', (avg(rows,'long')*100).toFixed(0).padStart(10)+'%', (avg(rows,'late')/52*100).toFixed(1).padStart(18)+'%');
