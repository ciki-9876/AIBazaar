import { claimReward } from './test-reward-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  act,
  currentFloor,
  currentNode,
  makeDuel,
  validSave,
  playerCards,
  itemCount,
} from './demo-engine.ts';
import { floorRoute } from './demo-content.ts';
import { fieldTask } from './field-items.ts';
import { simulateDuel } from './demo-combat.ts';
const start = (seed) => act(newRun(seed), { type: 'begin' });
const restore = (s) => {
  const saved = JSON.parse(JSON.stringify(s));
  assert.ok(validSave(saved));
  return saved;
};
function journey(seed) {
  let s = act(start(seed), { type: 'enter', floor: 1 });
  assert.equal(s.encounter, null);
  assert.deepEqual(currentFloor(s).nodes, [
    'search',
    'patrol',
    'pressure',
    'antechamber',
    'guardian',
  ]);
  assert.deepEqual(
    currentFloor(s).stock.map((x) => [x.id, x.amount]),
    [
      ['material', 4],
      ['supply', 2],
      ['rubber', 1],
    ],
  );
  s = act(s, { type: 'search' });
  for (const x of currentFloor(s).stock)
    s = act(s, { type: 'pickup', id: x.uid });
  s = act(s, { type: 'next-node' });
  const fight = () => {
    const before = makeDuel(s, 'guardian');
    s = act(restore(s), { type: 'fight' });
    assert.deepEqual(s.duel, before);
    const result = simulateDuel(s.duel);
    assert.equal(result.winner, 0, `starter loses seed ${seed}`);
    assert.deepEqual(simulateDuel(restore(s).duel), result);
    s = claimReward(act(s, { type: 'resolve' }));
  };
  fight();
  assert.equal(currentNode(s), 'pressure');
  const tool = s.items.find((x) => x.uid === 'starter-object-rubber');
  const before = s.stamina;
  s = act(s, {
    type: 'field-work',
    id: tool.uid,
    at: 0,
    choice: fieldTask(seed, 1, 'pressure').answer,
  });
  assert.equal(s.stamina, before + 12 - 2 - 3);
  assert.ok(s.items.some((x) => x.uid === tool.uid && x.type === 'physical'));
  assert.equal(currentNode(s), 'antechamber');
  const intel = makeDuel(s, 'guardian');
  const energy = s.stamina;
  s = restore(s);
  assert.equal(s.stamina, energy);
  s = act(s, { type: 'approach-guardian' });
  assert.equal(s.stamina, energy - 3);
  assert.deepEqual(makeDuel(s, 'guardian'), intel);
  const snapshot = structuredClone(s);
  assert.throws(() => act(s, { type: 'approach-guardian' }));
  assert.deepEqual(s, snapshot);
  fight();
  assert.equal(currentNode(s), 'exit');
  s = act(s, { type: 'extract' });
  assert.equal(s.phase, 'base');
  assert.equal(s.stopFloor, 1);
  assert.deepEqual(s.clears, [1]);
  assert.equal(s.quota, 12);
  assert.equal(s.level, 1);
  assert.ok(s.stamina >= 8);
  assert.equal(
    s.items.filter((x) => x.id === 'rubber' && x.type === 'physical').length,
    2,
  );
  assert.equal(playerCards(s).length, 3);
  // The naturally found object survives extraction and can be converted/replaced at home.
  const found = s.items.find((x) => x.id === 'rubber' && x.uid !== tool.uid);
  s = act(s, { type: 'scan', id: found.uid });
  s = act(s, { type: 'place', id: found.uid, at: 0 });
  assert.equal(s.items.find((x) => x.uid === found.uid).zone, 'board');
  assert.ok(validSave(s));
  return s;
}
test('intro floor: 20 natural starter journeys connect loot, fight, tool, preview, boss and return', () => {
  for (let seed = 1; seed <= 20; seed++) journey(seed);
});
test('intro floor: save/revisit retain consumed stock and do not repeat first-clear rewards', () => {
  let s = journey(10909);
  s = act(s, { type: 'sleep' });
  s = act(s, { type: 'enter', floor: 1 });
  assert.equal(currentFloor(s).stock.length, 0);
  s = act(s, { type: 'search' });
  s = act(s, { type: 'next-node' });
  s = act(s, { type: 'fight' });
  s = claimReward(act(s, { type: 'resolve' }));
  assert.equal(currentNode(s), 'pressure');
  const before = s.stamina;
  s = act(s, { type: 'field-work', choice: -2 });
  assert.equal(s.stamina, before - 3); // previously completed workshop only charges travel
  s = act(s, { type: 'approach-guardian' });
  s = act(s, { type: 'fight' });
  s = claimReward(act(s, { type: 'resolve' }));
  const gold = s.material,
    supply = itemCount(s, 'supply', false);
  s = act(s, { type: 'extract' });
  assert.equal(s.material, gold);
  assert.equal(itemCount(s, 'supply', false), supply);
});
test('intro floor: existing v4 and in-progress saves retain routes and later floors retain standard generation', () => {
  let s = start(53);
  s.floors[0].nodes = floorRoute(53, 1);
  s.floors[0].routeVersion = 4;
  const old = [...s.floors[0].nodes];
  s = act(s, { type: 'enter', floor: 1 });
  assert.deepEqual(currentFloor(s).nodes, old);
  s = act(s, { type: 'search' });
  s = restore(s);
  assert.equal(s.interaction, 'search');
  assert.deepEqual(currentFloor(s).nodes, old);
  for (const f of newRun(53).floors.slice(1))
    assert.deepEqual(f.nodes, floorRoute(53, f.id));
});
