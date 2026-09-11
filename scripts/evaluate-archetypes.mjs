import { writeFileSync } from 'node:fs';
import { ARCHETYPES, archetypeDuel } from '../lib/demo-archetypes.ts';
import { simulateDuel } from '../lib/demo-combat.ts';
import { SYSTEM_CARDS, cardDef } from '../lib/demo-cards.ts';
import { rarityOf } from '../lib/demo-card-rules.ts';

// Deterministic cases, not repeated random seeds: two compositions, all lane
// permutations, swapped sides and five equal-growth / equal-health profiles.
const profiles = [
  [300, 0, 0],
  [240, 0, 0],
  [360, 0, 0],
  [300, 1, 2],
  [400, 2, 5],
];
const rows = [],
  details = [];
const percentile = (a, p) =>
  [...a].sort((x, y) => x - y)[Math.ceil(a.length * p) - 1];
for (const [hp, quality, level] of profiles)
  for (const school of ARCHETYPES) {
    const times = [];
    let win = 0,
      loss = 0,
      draw = 0,
      timeout = 0,
      asymmetry = 0;
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++)
        for (let p = 0; p < 6; p++)
          for (let q = 0; q < 6; q++) {
            const d = archetypeDuel(
              school.id,
              school.beats,
              a,
              b,
              p,
              q,
              hp,
              quality,
              level,
            );
            const forward = simulateDuel(d);
            const reverse = simulateDuel({
              ...d,
              player: d.enemy,
              enemy: d.player,
            });
            if (
              forward.winner !==
              (reverse.winner === -1 ? -1 : 1 - reverse.winner)
            )
              asymmetry++;
            for (const [r, side] of [
              [forward, 0],
              [reverse, 1],
            ]) {
              win += r.winner === side;
              loss += r.winner === 1 - side;
              draw += r.winner === -1;
              timeout += r.timedOut;
              times.push(r.duration);
            }
          }
    rows.push({
      school: school.id,
      opponent: school.beats,
      hp,
      quality,
      level,
      cases: times.length,
      win,
      loss,
      draw,
      timeout,
      asymmetry,
      median: percentile(times, 0.5),
      p90: percentile(times, 0.9),
    });
  }
// Remove one copy of a card at a time: measures marginal contribution, not
// equal-budget card replacement. Use the same six opposing arrangements.
for (const school of ARCHETYPES)
  for (const removed of [null, ...new Set(school.variants[0])]) {
    let wins = 0,
      seconds = 0;
    for (const enemy of ARCHETYPES)
      for (let q = 0; q < 6; q++) {
        const d = archetypeDuel(school.id, enemy.id, 0, 0, 0, q);
        if (removed) {
          const index = d.player.findIndex((c) => c.id === removed);
          d.player.splice(index, 1);
        }
        const r = simulateDuel(d);
        wins += r.winner === 0;
        seconds += r.duration;
      }
    details.push({
      school: school.id,
      removed,
      cases: 18,
      wins,
      meanDuration: +(seconds / 18).toFixed(2),
    });
  }
// Explore one-card same-size substitutions against the counter-archetype.
// Selection is post hoc: these are examples, not a held-out win-rate estimate.
const substitutions = [];
for (const school of ARCHETYPES) {
  const opponent = ARCHETYPES.find((a) => a.beats === school.id),
    base = archetypeDuel(school.id, opponent.id);
  const options = [];
  for (const [index, old] of base.player.entries())
    for (const replacement of SYSTEM_CARDS.filter(
      (c) => c.school !== school.id && c.size === cardDef(old.id).size,
    )) {
      let wins = 0,
        draws = 0;
      for (let p = 0; p < 6; p++) {
        const d = archetypeDuel(school.id, opponent.id, 0, 0, 0, p);
        d.player[index] = {
          ...d.player[index],
          id: replacement.id,
          rarity: rarityOf(replacement.id),
        };
        const r = simulateDuel(d);
        wins += r.winner === 0;
        draws += r.winner === -1;
      }
      options.push({
        slot: old.at,
        removed: old.id,
        added: replacement.id,
        wins,
        draws,
        cases: 6,
      });
    }
  options.sort((a, b) => b.wins - a.wins);
  substitutions.push({
    school: school.id,
    opponent: opponent.id,
    tested: options.length,
    best: options[0],
  });
}
const report = {
  method:
    '同生命、同强化、同品阶、9 格；每套两种构筑 × 双方全部换路 × 交换敌我。确定性测试，不是随机胜率或玩家测试。',
  rows,
  ablation: details,
  substitutions,
};
writeFileSync(
  'lib/archetype-report.json',
  JSON.stringify(report, null, 2) + '\n',
);
for (const s of ARCHETYPES) {
  const r = rows.filter((r) => r.school === s.id);
  console.log(
    s.name,
    JSON.stringify({
      cases: r.reduce((n, x) => n + x.cases, 0),
      wins: r.reduce((n, x) => n + x.win, 0),
      draws: r.reduce((n, x) => n + x.draw, 0),
      timeouts: r.reduce((n, x) => n + x.timeout, 0),
    }),
  );
}
console.log(
  'Side asymmetry:',
  rows.reduce((n, r) => n + r.asymmetry, 0),
);
