import { writeFileSync } from 'node:fs';
import { HEROES, heroOwner } from '../lib/heroes.ts';
import {
  HERO_DECKS,
  heroDuel,
  heroBoard,
  heroPool,
} from '../lib/hero-decks.ts';
import { simulateDuel } from '../lib/demo-combat.ts';
import { cardDef } from '../lib/demo-cards.ts';
import { rng } from '../lib/design-model.ts';
const profiles = [
  [300, 0, 0],
  [360, 1, 2],
  [450, 2, 5],
];
const NEUTRAL_DECKS = [
  {
    id: 'neutral-attack',
    name: '中立输出',
    lanes: [
      ['brick', 'knife'],
      ['coil', 'cell'],
      ['wire', 'bottle', 'knife'],
    ],
  },
  {
    id: 'neutral-repair',
    name: '中立续航',
    lanes: [
      ['shelter', 'wire'],
      ['box', 'knife'],
      ['coil', 'cell'],
    ],
  },
  {
    id: 'neutral-charge',
    name: '中立提速',
    lanes: [
      ['bell', 'wire', 'knife'],
      ['shelter', 'cell'],
      ['coil', 'bottle'],
    ],
  },
];
const percentile = (a, p) =>
  [...a].sort((a, b) => a - b)[Math.ceil(a.length * p) - 1];
const rows = [],
  results = new Map();
let mirrors = 0;
for (const [hp, quality, level] of profiles)
  for (const a of HERO_DECKS)
    for (const b of HERO_DECKS) {
      let wins = 0,
        draws = 0,
        timeout = 0;
      const times = [];
      for (let p = 0; p < 6; p++)
        for (let q = 0; q < 6; q++) {
          const d = heroDuel(a, b, p, q, hp, quality, level),
            r = simulateDuel(d);
          wins += r.winner === 0;
          draws += r.winner === -1;
          timeout += r.timedOut;
          times.push(r.duration);
          results.set(`${hp}/${a.id}/${b.id}/${p}/${q}`, r.winner);
        }
      rows.push({
        hp,
        quality,
        level,
        a: a.id,
        b: b.id,
        cases: 36,
        wins,
        draws,
        losses: 36 - wins - draws,
        timeout,
        median: percentile(times, 0.5),
        p90: percentile(times, 0.9),
      });
    }
for (const [key, winner] of results) {
  const [hp, a, b, p, q] = key.split('/'),
    reverse = results.get(`${hp}/${b}/${a}/${q}/${p}`);
  if (winner !== (reverse === -1 ? -1 : 1 - reverse)) mirrors++;
}
const passive = [],
  neutral = [];
for (const a of HERO_DECKS) {
  let enabled = 0,
    disabled = 0,
    drawOn = 0,
    drawOff = 0;
  for (const b of HERO_DECKS)
    for (let q = 0; q < 6; q++) {
      const d = heroDuel(a, b, 0, q),
        on = simulateDuel(d);
      // Disable only this hero's passive, leaving legality and exclusive cards intact.
      const off = simulateDuel({ ...d, disabledHeroSides: [0] });
      enabled += on.winner === 0;
      disabled += off.winner === 0;
      drawOn += on.winner === -1;
      drawOff += off.winner === -1;
    }
  passive.push({ id: a.id, cases: 54, enabled, disabled, drawOn, drawOff });
  for (const b of NEUTRAL_DECKS) {
    let wins = 0,
      draws = 0;
    for (let q = 0; q < 6; q++) {
      const d = heroDuel(a, a);
      d.enemy = heroBoard({ ...b, hero: a.hero }, 'neutral', q);
      d.heroes = [a.hero, a.hero];
      const r = simulateDuel(d);
      wins += r.winner === 0;
      draws += r.winner === -1;
    }
    neutral.push({ id: a.id, neutral: b.id, cases: 6, wins, draws });
  }
}
// Frozen, reproducible novel layouts, not hand-picked winning examples.
const random = rng(904213),
  exploration = [];
for (const hero of HEROES) {
  let wins = 0,
    draws = 0,
    timeout = 0,
    cases = 0;
  for (let i = 0; i < 12; i++) {
    const lanes = [[], [], []];
    for (let lane = 0; lane < 3; lane++) {
      let space = 3;
      while (space) {
        const choices = heroPool(hero.id).filter(
          (c) =>
            c.size <= space &&
            (lane !== 0 || lanes[0].length > 0 || heroOwner(c.id) === hero.id),
        );
        const c = choices[Math.floor(random() * choices.length)];
        lanes[lane].push(c.id);
        space -= c.size;
      }
    }
    const a = {
      id: `random-${hero.id}-${i}`,
      hero: hero.id,
      name: '随机合法混编',
      idea: '',
      lanes,
    };
    for (const b of HERO_DECKS) {
      const d = heroDuel(a, b),
        r = simulateDuel(d);
      wins += r.winner === 0;
      draws += r.winner === -1;
      timeout += r.timedOut;
      cases++;
    }
  }
  exploration.push({ hero: hero.id, cases, wins, draws, timeout });
}
const decks = HERO_DECKS.map((d) => {
  const cards = heroBoard(d, 'x');
  return {
    id: d.id,
    name: d.name,
    hero: d.hero,
    count: cards.length,
    exclusive: cards.filter((c) => heroOwner(c.id)).length,
    coins: cards.reduce((n, c) => n + 3 + cardDef(c.id).size, 0),
  };
});
const report = {
  profiles,
  rows,
  mirrors,
  passive,
  neutral,
  exploration,
  decks,
  mainCases: rows.length * 36,
  passiveCases: passive.length * 54 * 2,
  neutralCases: neutral.length * 6,
  explorationCases: exploration.reduce((n, x) => n + x.cases, 0),
};
writeFileSync('lib/hero-report.json', JSON.stringify(report, null, 2) + '\n');
for (const hero of HEROES) {
  const ids = HERO_DECKS.filter((d) => d.hero === hero.id).map((d) => d.id),
    r = rows.filter((r) => ids.includes(r.a) && !ids.includes(r.b));
  console.log(hero.name, {
    cases: r.reduce((n, x) => n + x.cases, 0),
    wins: r.reduce((n, x) => n + x.wins, 0),
    draws: r.reduce((n, x) => n + x.draws, 0),
    timeouts: r.reduce((n, x) => n + x.timeout, 0),
  });
}
console.log(
  'asymmetry',
  mirrors,
  'total',
  report.mainCases +
    report.passiveCases +
    report.neutralCases +
    report.explorationCases,
);
