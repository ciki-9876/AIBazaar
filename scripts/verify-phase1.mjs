// Reproducible engineering evidence. UI fixtures are imported only into ?qa=phase1.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  newRun,
  act,
  currentNode,
  currentFloor,
  makeDuel,
  playerCards,
  layoutAt,
  makeItem,
  merchantOffers,
  puzzle,
  validSave,
  checkpoint,
} from '../lib/demo-engine.ts';
import { rarityOf } from '../lib/demo-card-rules.ts';
import { hash } from '../lib/design-model.ts';
import { sceneTitle } from '../lib/demo-content.ts';
import { simulateDuel } from '../lib/demo-combat.ts';
import { battleEvidence } from '../lib/battle-evidence.ts';
const out = 'outputs/f9-phase1';
fs.mkdirSync(out + '/fixtures', { recursive: true });
function save(name, s) {
  if (!validSave(s)) throw Error('Invalid fixture ' + name);
  fs.writeFileSync(`${out}/fixtures/${name}.json`, JSON.stringify(s, null, 2));
}
const start = () => act(newRun(10909), { type: 'begin' });
function step(s) {
  const node = currentNode(s);
  if (s.stamina < 30) {
    const food = s.items.find(
      (x) =>
        ['apple', 'supply', 'medicine'].includes(x.id) &&
        ['bag', 'safe'].includes(x.zone),
    );
    if (food) return act(s, { type: 'consume', id: food.uid });
  }
  if (['patrol', 'elite', 'guardian'].includes(node))
    return act(act(s, { type: 'fight' }), { type: 'resolve' });
  if (node === 'puzzle')
    return act(s, { type: 'puzzle', choice: puzzle(s).answer });
  if (node === 'exit') return act(s, { type: 'extract' });
  return act(s, {
    type: ['search', 'merchant'].includes(node) ? 'skip' : node,
  });
}
let s = act(start(), { type: 'enter', floor: 1 });
const path = [];
while (currentNode(s) !== 'merchant') {
  path.push({ node: currentNode(s), stamina: s.stamina });
  s = step(s);
}
s = act(s, { type: 'open-trade' });
const offer = merchantOffers(s).find((x) => x.id === 'fuse');
s = act(s, { type: 'trade', id: offer.uid });
path.push({
  node: 'merchant',
  cost: 4,
  uid: offer.uid,
  stamina: s.stamina,
  gold: s.material,
});
s = act(s, { type: 'extract' });
save('01-natural-before-identification', s);
s = act(s, { type: 'scan', id: offer.uid });
s = act(s, { type: 'place', id: offer.uid, at: 3 });
s = act(s, { type: 'place', id: 'starter-knife', at: 4 });
save('02-natural-build', s);
s = act(s, { type: 'sleep' });
s = act(s, { type: 'enter', floor: 3 });
const second = [];
while (s.phase === 'floor' && currentNode(s) !== 'elite') {
  second.push({ node: currentNode(s), stamina: s.stamina });
  s = step(s);
}
if (s.phase !== 'floor')
  throw Error('Natural second outing did not reach elite');
save('03-natural-3f-elite-A', s);
const a = makeDuel(s, 'guardian'),
  bState = act(s, { type: 'place', id: 'starter-knife', at: 0 }),
  b = makeDuel(bState, 'guardian');
save('04-natural-3f-elite-B', bState);
const compare = [a, b].map((d) => {
  const r = simulateDuel(d);
  return {
    duel: d,
    duration: r.duration,
    winner: r.winner,
    evidence: battleEvidence(d, r.frames),
    events: r.frames.flatMap((f) =>
      f.hits.map((h) => ({ time: f.time, ...h })),
    ),
  };
});
// Use the previous implementation's encounter function solely to produce the old configuration table.
const oldSource = execFileSync(
  'git',
  ['show', '710c53dcd8c9c75554c4ac5f6f9ffb75578e1735:lib/demo-engine.ts'],
  { encoding: 'utf8' },
);
const oldFunction = oldSource
  .match(/export function makeDuel[\s\S]*?\n}\r?\n/)[0]
  .replace('export ', '')
  .replace('s: Run', 's')
  .replace("kind: 'guardian' | 'survivor'", 'kind')
  .replace('): Duel', ')');
const oldMake = new Function(
  'currentNode',
  'currentFloor',
  'rarityOf',
  'hash',
  'playerCards',
  'layoutAt',
  'sceneTitle',
  oldFunction + '; return makeDuel;',
)(currentNode, currentFloor, rarityOf, hash, playerCards, layoutAt, sceneTitle);
const encounters = [];
for (const floor of [1, 3, 5]) {
  let r = act(start(), { type: 'enter', floor });
  for (const node of ['patrol', 'elite', 'guardian']) {
    r.node = currentFloor(r).nodes.indexOf(node);
    r.encounter = null;
    const old = oldMake(r, 'guardian'),
      next = makeDuel(r, 'guardian');
    encounters.push({
      floor,
      node,
      old: { enemy: old.enemy, hp: old.maxHp[1] },
      next: { enemy: next.enemy, hp: next.maxHp[1] },
      simulation: (() => {
        const result = simulateDuel(next);
        return {
          duration: result.duration,
          winner: result.winner,
          ...battleEvidence(next, result.frames),
        };
      })(),
    });
  }
}
const flows = [];
for (const floor of [1, 3, 5]) {
  let r = act(start(), { type: 'enter', floor });
  const steps = [];
  try {
    for (let i = 0; i < 40 && r.phase === 'floor'; i++) {
      steps.push({
        node: currentNode(r),
        stamina: r.stamina,
        items: r.items.length,
      });
      r = step(r);
    }
    flows.push({
      floor,
      steps,
      phase: r.phase,
      quota: r.quota,
      stamina: r.stamina,
      best: r.best,
      checkpoint: checkpoint(r),
      notice: r.notice,
      valid: validSave(r),
    });
  } catch (e) {
    flows.push({ floor, steps, error: e.message, valid: validSave(r) });
  }
}
// Explicit boundary fixtures, not natural acquisition evidence.
let q = act(start(), { type: 'enter', floor: 3 });
q.level = 3;
q.items.push(makeItem('qa-unknown', 'distiller', 'physical'));
save('boundary-field-no-scanner', q);
q.items.push(makeItem('qa-scanner', 'scanner', 'tool'));
q.charges = 0;
save('boundary-field-no-charge', q);
q.charges = 2;
save('boundary-field-ready', q);
let refine = start();
refine.level = 3;
refine.items.push(makeItem('qa-copy', 'wire', 'card'));
save('boundary-refine', refine);
let large = start();
large.level = 6;
large.items = large.items.filter((x) => x.zone !== 'board');
large.items.push(
  { ...makeItem('qa-battery', 'battery', 'card', 'board'), at: 0 },
  { ...makeItem('qa-distiller', 'distiller', 'card', 'board'), at: 3 },
  { ...makeItem('qa-knife', 'knife', 'card', 'board'), at: 6 },
);
save('boundary-large-board', large);
const pressureState = act(start(), { type: 'enter', floor: 5 });
pressureState.level = 3;
pressureState.items = pressureState.items.filter((x) => x.zone !== 'board');
pressureState.items.push(
  ...[
    ['wire', 0, 1],
    ['springbow', 1, 0],
    ['shelter', 3, 0],
    ['knife', 6, 0],
  ].map(([id, at, quality]) => ({
    ...makeItem('pressure-' + id, id, 'card', 'board'),
    at,
    quality,
  })),
);
pressureState.encounter = null;
const pressure = ['patrol', 'elite', 'guardian'].map((node) => {
  pressureState.node = currentFloor(pressureState).nodes.indexOf(node);
  const d = makeDuel(pressureState, 'guardian'),
    old = oldMake(pressureState, 'guardian');
  if (JSON.stringify(d.enemy) !== JSON.stringify(old.enemy))
    throw Error('5F encounter unexpectedly changed');
  const r = simulateDuel(d);
  return {
    node,
    duel: d,
    duration: r.duration,
    winner: r.winner,
    ...battleEvidence(d, r.frames),
  };
});
save('boundary-5f-pressure', pressureState);
fs.writeFileSync(
  `${out}/engineering-evidence.json`,
  JSON.stringify(
    {
      baseline: '710c53dcd8c9c75554c4ac5f6f9ffb75578e1735',
      seed: 10909,
      path,
      second,
      compare,
      encounters,
      flows,
      pressure,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      path,
      second,
      compare: compare.map(({ duel, duration, winner, evidence }) => ({
        player: duel.player,
        duration,
        winner,
        evidence,
      })),
      flows,
    },
    null,
    2,
  ),
);
