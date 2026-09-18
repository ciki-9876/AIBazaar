import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CARDS } from '../lib/demo-cards.ts';
import { ARCHETYPES, archetypeDuel } from '../lib/demo-archetypes.ts';
import { simulateDuel } from '../lib/demo-combat.ts';
const tests = readdirSync('lib')
  .filter((x) => x.endsWith('.test.mjs'))
  .map((x) => 'lib/' + x);
execFileSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
const standard = ARCHETYPES.map((a) => {
  const row = {
    school: a.id,
    opponent: a.beats,
    wins: 0,
    draws: 0,
    losses: 0,
    cases: 36,
  };
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 6; j++) {
      const r = simulateDuel(archetypeDuel(a.id, a.beats, 0, 0, i, j));
      row[r.winner === 0 ? 'wins' : r.winner === -1 ? 'draws' : 'losses']++;
    }
  return row;
});
const out = 'outputs/card-items-implementation';
mkdirSync(out, { recursive: true });
const report = {
  catalog: CARDS.map(({ id, name, size, cd, power }) => ({
    id,
    name,
    size,
    cd,
    power,
  })),
  standard,
  scope:
    'q0/Lv0, 300HP, 30% barriers, standard decks; not a claim of mixed/growth balance',
};
writeFileSync(
  out + '/verification.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(standard, null, 2));
