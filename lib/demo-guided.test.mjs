import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
  makeItem,
  act,
  currentFloor,
  currentNode,
  makeDuel,
  playerCards,
  validSave,
  identificationState,
  tutorialFloor,
} from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';
import {
  pipeConnected,
  initialPipes,
  rotatedPipe,
  PIPE_SHAPES,
} from './tutorial-pipes.ts';
const restore = (s) => {
  const copy = JSON.parse(JSON.stringify(s));
  assert.ok(validSave(copy));
  return copy;
};
const start = (seed) =>
  act(act(newRun(seed, true), { type: 'begin' }), { type: 'enter', floor: 1 });
function reject(s, a) {
  const before = JSON.stringify(s);
  assert.throws(() => act(s, a));
  assert.equal(JSON.stringify(s), before);
}
function cache(seed) {
  let s = start(seed);
  const preview = makeDuel(s, 'guardian');
  s = act(s, { type: 'fight' });
  assert.deepEqual(s.duel, preview);
  const r = simulateDuel(s.duel);
  assert.equal(r.winner, 0);
  assert.equal(r.frames.at(-1).hp[0], 240);
  assert.equal(r.frames.at(-1).time, 13.25);
  assert.deepEqual(simulateDuel(restore(s).duel), r);
  s = act(s, { type: 'resolve' });
  assert.equal(currentNode(s), 'search');
  assert.equal(s.loot.item.id, 'gapblade');
  reject(s, { type: 'claim-loot' });
  s = act(s, { type: 'reveal-loot' });
  const saved = restore(s);
  s = act(saved, { type: 'claim-loot' });
  reject(s, { type: 'claim-loot' });
  s = act(s, { type: 'place', id: s.tutorialRewardUid, at: 3 });
  return act(s, { type: 'search' });
}
function equipment(seed) {
  let s = cache(seed);
  for (const x of currentFloor(s).stock)
    s = act(s, { type: 'pickup', id: x.uid });
  assert.equal(s.charges, 0);
  assert.ok(!s.items.some((x) => x.id === 'scanner'));
  return s;
}
test('guided7: twenty natural slingshot journeys connect weapon reward, two tools, pipes, scanner, identification and return', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let s = start(seed);
    assert.deepEqual(
      playerCards(s).map((c) => c.id),
      ['slingshot'],
    );
    assert.equal(currentNode(s), 'patrol');
    assert.equal(s.encounter, null);
    s = equipment(seed);
    assert.equal(playerCards(s).length, 2);
    assert.equal(s.charges, 0);
    s = act(restore(s), { type: 'next-node' });
    assert.equal(currentNode(s), 'pressure');
    const before = s.stamina;
    s = act(s, {
      type: 'pipe-work',
      id: 'tutorial-rubber',
      turns: Array(9).fill(0),
    });
    assert.equal(s.stamina, before + 10);
    assert.ok(
      s.items.some((x) => x.uid === 'tutorial-rubber' && x.type === 'physical'),
    );
    assert.equal(currentNode(s), 'pressure');
    assert.ok(!s.items.some((x) => x.uid === 'tutorial-sealant'));
    assert.equal(s.loot.item.id, 'scanner');
    reject(s, { type: 'scan', id: 'tutorial-rubber' });
    s = act(act(restore(s), { type: 'reveal-loot' }), { type: 'claim-loot' });
    assert.equal(s.charges, 1);
    reject(s, { type: 'tutorial-continue' });
    reject(s, { type: 'field-work', choice: -2 });
    s = act(s, { type: 'scan', id: 'tutorial-rubber' });
    assert.equal(s.charges, 0);
    reject(s, { type: 'scan', id: 'tutorial-rubber' });
    s = act(s, { type: 'tutorial-continue' });
    assert.equal(currentNode(s), 'antechamber');
    const preview = makeDuel(s, 'guardian');
    s = act(s, { type: 'approach-guardian' });
    s = act(s, { type: 'fight' });
    assert.deepEqual(s.duel, preview);
    assert.equal(simulateDuel(s.duel).winner, 0);
    assert.deepEqual(s.duel.player, playerCards(restore(s)));
    s = act(s, { type: 'resolve' });
    assert.equal(currentNode(s), 'exit');
    s = act(act(s, { type: 'reveal-loot' }), { type: 'claim-loot' });
    s = act(s, { type: 'extract' });
    assert.equal(s.phase, 'base');
    assert.deepEqual(s.clears, [1]);
    assert.equal(s.quota, 12);
    assert.equal(tutorialFloor(s), false);
    assert.equal(s.items.find((x) => x.uid === 'tutorial-rubber').type, 'card');
    assert.ok(validSave(s));
  }
});
test('guided7: no early exit or loss of required tools; scanning spends one charge and preserves the other object', () => {
  let s = start(2);
  reject(s, { type: 'extract' });
  reject(s, { type: 'rescue' });
  s = cache(2);
  reject(s, { type: 'next-node' });
  s = act(s, { type: 'pickup', id: 'tutorial-sealant' });
  s = act(s, { type: 'pickup', id: 'tutorial-rubber' });
  assert.equal(identificationState(s).allowed, false);
  reject(s, { type: 'scan', id: 'tutorial-rubber' });
  reject(s, { type: 'drop', id: 'tutorial-rubber' });
  assert.equal(s.charges, 0);
});
test('guided7: invalid pipes, unavailable tools and duplicate settlement reject atomically; orientation can be retried freely', () => {
  let s = act(equipment(10909), { type: 'next-node' });
  const before = JSON.stringify(s);
  for (const turns of [
    undefined,
    Array(9),
    [],
    [0],
    Array(9).fill(4),
    Array(9).fill(-1),
    initialPipes(s.seed),
  ])
    reject(s, { type: 'pipe-work', id: 'tutorial-rubber', turns });
  reject(s, {
    type: 'pipe-work',
    id: 'tutorial-nailer',
    turns: Array(9).fill(0),
  });
  assert.equal(JSON.stringify(s), before);
  s = act(s, {
    type: 'pipe-work',
    id: 'tutorial-rubber',
    turns: Array(9).fill(0),
  });
  reject(s, {
    type: 'pipe-work',
    id: 'tutorial-rubber',
    turns: Array(9).fill(0),
  });
});
test('guided7: all seeded pipe layouts rotate into a reciprocal connected route', () => {
  for (let seed = 0; seed < 100; seed++) {
    const turns = initialPipes(seed);
    assert.equal(pipeConnected(turns), false);
    for (let i = 0; i < 9; i++) while (turns[i]) turns[i] = (turns[i] + 1) % 4;
    assert.ok(pipeConnected(turns));
    for (const mask of PIPE_SHAPES) assert.equal(rotatedPipe(mask, 4), mask);
  }
});
test('guided7: tutorial progress restores without changing combat or paying anything', () => {
  let s = act(start(10909), { type: 'fight' });
  const duel = structuredClone(s.duel);
  for (let choice = 0; choice < 7; choice++) {
    const before = s.stamina;
    s = act(s, { type: 'tutorial-step', choice });
    assert.equal(s.stamina, before);
    s = restore(s);
    assert.equal(s.tutorialBattleStep, choice + 1);
    assert.deepEqual(s.duel, duel);
  }
  reject(s, { type: 'tutorial-step', choice: 0 });
  assert.equal(validSave({ ...s, tutorialBattleStep: 9 }), false);
});

test('guided7: first energy lesson persists without spending; the next departure spends exactly four', () => {
  let s = act(newRun(9, true), { type: 'begin' });
  const energy = s.stamina;
  s = act(s, { type: 'energy-explained' });
  assert.equal(s.stamina, energy);
  assert.equal(restore(s).energyExplained, true);
  s = act(s, { type: 'enter', floor: 1 });
  assert.equal(s.stamina, energy - 4);
});
test('guided7: packing during combat changes only the next board and survives restore', () => {
  let s = act(start(8), { type: 'fight' });
  const snapshot = structuredClone(s.duel);
  const result = simulateDuel(snapshot);
  s = act(s, { type: 'place', id: 'starter-slingshot', at: 0 });
  assert.equal(playerCards(s)[0].at, 0);
  assert.deepEqual(s.duel, snapshot);
  assert.deepEqual(simulateDuel(restore(s).duel), result);
});

test('guided7: old opening saves retain knife, original cache and pre-puzzle identification', () => {
  let old = newRun(12, true);
  delete old.openingVersion;
  delete old.bagUnlocked;
  old.charges = 1;
  old.floors[0].stock = [
    makeItem('tutorial-nailer', 'nailer', 'physical'),
    makeItem('tutorial-rubber', 'rubber', 'physical'),
    makeItem('tutorial-scanner', 'scanner', 'tool'),
  ];
  old = act(act(restore(old), { type: 'begin' }), { type: 'enter', floor: 1 });
  assert.equal(playerCards(old)[0].id, 'gapblade');
  old = act(act(old, { type: 'fight' }), { type: 'resolve' });
  old = act(act(old, { type: 'reveal-loot' }), { type: 'claim-loot' });
  old = act(old, { type: 'search' });
  for (const item of currentFloor(old).stock)
    old = act(old, { type: 'pickup', id: item.uid });
  old = act(old, { type: 'scan', id: 'tutorial-nailer' });
  old = act(old, { type: 'equip', id: 'tutorial-nailer' });
  old = act(old, { type: 'next-node' });
  old = act(old, {
    type: 'pipe-work',
    id: 'tutorial-rubber',
    turns: Array(9).fill(0),
  });
  assert.equal(currentNode(old), 'antechamber');
  assert.ok(validSave(old));
});
test('guided7: random rewards use actual offensive enemy instances, survive reload and reject corrupt pending saves', () => {
  const s = act(start(16), { type: 'fight' });
  s.duel.enemy = [
    { uid: 'enemy-acid', id: 'acid', at: 0, rarity: 0, quality: 1, level: 2 },
    {
      uid: 'enemy-culture',
      id: 'culture',
      at: 3,
      rarity: 0,
      quality: 0,
      level: 1,
    },
  ];
  s.duel.maxHp = [10000, 1];
  const result = act(s, { type: 'resolve' });
  assert.deepEqual(act(restore(s), { type: 'resolve' }).loot, result.loot);
  assert.ok(['acid', 'culture'].includes(result.loot.item.id));
  const revealed = act(restore(result), { type: 'reveal-loot' });
  assert.equal(revealed.loot.item.uid, result.loot.item.uid);
  assert.equal(
    validSave({
      ...result,
      loot: { ...result.loot, item: { ...result.loot.item, type: 'physical' } },
    }),
    false,
  );
  reject(revealed, { type: 'resolve' });
});
