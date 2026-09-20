import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun,
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
  return act(s, { type: 'search' });
}
function equipment(seed) {
  let s = cache(seed);
  for (const x of currentFloor(s).stock)
    s = act(s, { type: 'pickup', id: x.uid });
  s = act(s, { type: 'scan', id: 'tutorial-nailer' });
  return act(s, { type: 'equip', id: 'tutorial-nailer' });
}
test('guided6: twenty natural single-knife journeys connect combat, two objects, scanner, equipment, pipes and return', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let s = start(seed);
    assert.deepEqual(
      playerCards(s).map((c) => c.id),
      ['gapblade'],
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
    assert.equal(s.stamina, before + 7);
    assert.ok(
      s.items.some((x) => x.uid === 'tutorial-rubber' && x.type === 'physical'),
    );
    assert.equal(currentNode(s), 'antechamber');
    const preview = makeDuel(s, 'guardian');
    s = act(s, { type: 'approach-guardian' });
    s = act(s, { type: 'fight' });
    assert.deepEqual(s.duel, preview);
    assert.equal(simulateDuel(s.duel).winner, 0);
    assert.deepEqual(s.duel.player, playerCards(restore(s)));
    s = act(s, { type: 'resolve' });
    assert.equal(currentNode(s), 'exit');
    s = act(s, { type: 'extract' });
    assert.equal(s.phase, 'base');
    assert.deepEqual(s.clears, [1]);
    assert.equal(s.quota, 12);
    assert.equal(tutorialFloor(s), false);
    assert.doesNotThrow(() => act(s, { type: 'scan', id: 'tutorial-rubber' }));
    assert.ok(validSave(s));
  }
});
test('guided6: no early exit or loss of required tools; scanning spends one charge and preserves the other object', () => {
  let s = start(2);
  reject(s, { type: 'extract' });
  reject(s, { type: 'rescue' });
  s = cache(2);
  reject(s, { type: 'next-node' });
  s = act(s, { type: 'pickup', id: 'tutorial-nailer' });
  assert.equal(identificationState(s).allowed, false);
  reject(s, { type: 'scan', id: 'tutorial-nailer' });
  s = act(s, { type: 'pickup', id: 'tutorial-scanner' });
  s = act(s, { type: 'pickup', id: 'tutorial-rubber' });
  assert.equal(identificationState(s).allowed, true);
  reject(s, { type: 'scan', id: 'tutorial-rubber' });
  reject(s, { type: 'drop', id: 'tutorial-rubber' });
  s = act(s, { type: 'scan', id: 'tutorial-nailer' });
  assert.equal(s.charges, 0);
  // A repeated click rejects without a second payment.
  reject(s, { type: 'scan', id: 'tutorial-nailer' });
  assert.equal(s.charges, 0);
  reject(s, { type: 'next-node' });
});
test('guided6: invalid pipes, unavailable tools and duplicate settlement reject atomically; orientation can be retried freely', () => {
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
test('guided6: all seeded pipe layouts rotate into a reciprocal connected route', () => {
  for (let seed = 0; seed < 100; seed++) {
    const turns = initialPipes(seed);
    assert.equal(pipeConnected(turns), false);
    for (let i = 0; i < 9; i++) while (turns[i]) turns[i] = (turns[i] + 1) % 4;
    assert.ok(pipeConnected(turns));
    for (const mask of PIPE_SHAPES) assert.equal(rotatedPipe(mask, 4), mask);
  }
});
test('guided6: tutorial progress restores without changing combat or paying anything', () => {
  let s = act(start(10909), { type: 'fight' });
  const duel = structuredClone(s.duel);
  for (let choice = 0; choice < 6; choice++) {
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
