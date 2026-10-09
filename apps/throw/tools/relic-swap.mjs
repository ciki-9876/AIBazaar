// Usage: node apps/throw/tools/relic-swap.mjs [N=8]
// Every preset with every relic (and none) against the field. A relic that
// equals 'none' everywhere is dead; one that tops many presets is generic.
import { playDuel, seedAt } from './sim-proxy.mjs';
import { PRESETS, COMPETITIVE_STYLES, RELICS } from '../src/lib/cards/throw-loadout.ts';
const N = Number(process.argv[2] || 8);
console.log('style  '.padEnd(8) + RELICS.map((r) => r.id.padStart(9)).join('') + '   none   own-rank');
for (const a of COMPETITIVE_STYLES) {
  const cells = [];
  for (const r of [...RELICS.map((x) => x.id), null]) {
    let sc = 0, n = 0;
    for (const b of COMPETITIVE_STYLES) for (let i = 0; i < N; i++) { sc += playDuel({ style: a, items: PRESETS[a].items, relic: r }, { style: b }, seedAt(i)).score; n++; }
    cells.push((sc / n) * 100);
  }
  const own = cells[RELICS.findIndex((x) => x.id === PRESETS[a].relic)];
  const rank = [...cells].sort((x, y) => y - x).indexOf(own) + 1;
  console.log(a.padEnd(8) + cells.map((v) => v.toFixed(0).padStart(9)).join('') + `   #${rank}`);
}
