// Usage: node apps/throw/tools/lazy-matrix.mjs [N=40]
// Each competitive preset played by the balance proxy and by every lazy human
// habit (sim-proxy LAZY_POLICIES), against all six presets. A habit that lifts
// a kit far above its proxy average is a rule that rewards not thinking.
import { COMPETITIVE_STYLES, PRESETS } from '../src/lib/cards/throw-loadout.ts';
import { LAZY_POLICIES, playDuel, seedAt } from './sim-proxy.mjs';

const N = Number(process.argv[2] || 40);
const policies = [null, ...Object.keys(LAZY_POLICIES)];
console.log(`Average win % against the six presets, N=${N} per pairing`);
console.log('kit'.padEnd(8) + policies.map((p) => (p ?? 'proxy').padStart(8)).join(''));
for (const style of COMPETITIVE_STYLES) {
  const row = policies.map((policy) => {
    let score = 0;
    for (const enemy of COMPETITIVE_STYLES)
      for (let i = 0; i < N; i++)
        score += playDuel({ style, items: PRESETS[style].items, relic: PRESETS[style].relic, policy }, { style: enemy }, seedAt(i)).score;
    return (score / (N * COMPETITIVE_STYLES.length)) * 100;
  });
  console.log(style.padEnd(8) + row.map((v) => v.toFixed(0).padStart(8)).join(''));
}
