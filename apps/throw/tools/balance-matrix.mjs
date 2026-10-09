// Usage: node apps/throw/tools/balance-matrix.mjs [N=40] [--kits kits.json]
// Prints the seat-symmetrised win matrix of the competitive presets and checks
// every declared `beats`. With --kits, also plays each custom kit against every
// preset (build-space audit).
import { readFileSync } from 'node:fs';
import { COMPETITIVE_STYLES, PRESETS } from '../src/lib/cards/throw-loadout.ts';
import { playDuel, seedAt } from './sim-proxy.mjs';

const N = Number(process.argv[2] || 40);
const kitsArg = process.argv.indexOf('--kits');
const preset = (style) => ({ style, items: PRESETS[style].items, relic: PRESETS[style].relic });
const raw = {};
for (const a of COMPETITIVE_STYLES)
  for (const b of COMPETITIVE_STYLES) {
    let score = 0;
    for (let i = 0; i < N; i++) score += playDuel(preset(a), { style: b }, seedAt(i)).score;
    raw[`${a}:${b}`] = (score / N) * 100;
  }
const share = (a, b) => (raw[`${a}:${b}`] + 100 - raw[`${b}:${a}`]) / 2;
console.log(`Seat-symmetrised win % (row beats column), N=${N}`);
console.log('A\\B'.padEnd(8) + COMPETITIVE_STYLES.map((s) => s.padStart(7)).join('') + '    avg');
for (const a of COMPETITIVE_STYLES) {
  const row = COMPETITIVE_STYLES.map((b) => share(a, b));
  console.log(a.padEnd(8) + row.map((v) => v.toFixed(0).padStart(7)).join('') + (row.reduce((x, y) => x + y) / row.length).toFixed(0).padStart(7));
}
let failed = 0;
for (const a of COMPETITIVE_STYLES)
  for (const b of PRESETS[a].beats ?? []) {
    const v = share(a, b);
    if (v < 60) failed++;
    console.log(`${v >= 60 ? 'ok  ' : 'FAIL'} ${a} beats ${b}: ${v.toFixed(0)}%`);
  }
if (kitsArg > 0) {
  const kits = JSON.parse(readFileSync(process.argv[kitsArg + 1], 'utf8'));
  console.log('\nCustom kits vs presets (kit seat only):');
  for (const [name, kit] of Object.entries(kits)) {
    const row = COMPETITIVE_STYLES.map((b) => {
      let score = 0;
      for (let i = 0; i < N; i++) score += playDuel(kit, { style: b }, seedAt(i)).score;
      return `${b} ${((score / N) * 100).toFixed(0)}`;
    });
    console.log(name.padEnd(12), row.join(' | '));
  }
}
process.exit(failed ? 1 : 0);
