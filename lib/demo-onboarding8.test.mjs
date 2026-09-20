import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  newRun,
  currentFloor,
  currentNode,
  validSave,
  itemCount,
  migrateCargo,
  makeItem,
  makeDuel,
} from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';
import { claimReward } from './test-reward-helper.mjs';
import { initialPipes, PIPE_SHAPES, rotatedPipe } from './tutorial-pipes.ts';
import { rewardStars } from './minigame.ts';
const restore = (s) => {
  const n = JSON.parse(JSON.stringify(s));
  assert.ok(validSave(n));
  return migrateCargo(n);
};
const reject = (s, a) => {
  const before = structuredClone(s);
  assert.throws(() => act(s, a));
  assert.deepEqual(s, before);
};
function pressure(seed) {
  let s = act(act(newRun(seed, true), { type: 'begin' }), {
    type: 'enter',
    floor: 1,
  });
  s = claimReward(act(act(s, { type: 'fight' }), { type: 'resolve' }));
  reject(s, { type: 'search' });
  s = act(s, { type: 'place', id: s.tutorialRewardUid, at: 0 });
  s = act(s, { type: 'search' });
  for (const x of currentFloor(s).stock)
    s = act(s, { type: 'pickup', id: x.uid });
  s = act(s, { type: 'next-node' });
  return s;
}
function solve(s) {
  const turns = s.minigame?.board ?? initialPipes(s.seed);
  for (let i = 0; i < 9; i++) {
    let t = turns[i];
    while (rotatedPipe(PIPE_SHAPES[i], t) !== PIPE_SHAPES[i]) {
      s = act(s, { type: 'minigame-play', choice: i });
      t = (t + 1) % 4;
    }
  }
  return s;
}
test('opening8: 30 natural complete journeys, no injected loadout, all rewards and home guidance', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let s = pressure(seed);
    const before = s.stamina;
    if (seed % 2) s = act(s, { type: 'minigame-tool', id: 'tutorial-sealant' });
    s = solve(restore(s));
    s = act(s, { type: 'minigame-complete' });
    assert.equal(s.stamina, before - 2);
    assert.ok(s.minigame.stars >= 1);
    reject(s, { type: 'minigame-complete' });
    s = claimReward(restore(s));
    assert.equal(itemCount(s, 'scanner'), 1);
    s = act(s, { type: 'scan', id: 'tutorial-rubber' });
    assert.equal(itemCount(s, 'scanner'), 0);
    assert.deepEqual(restore(s).items, s.items);
    reject(s, { type: 'scan', id: 'tutorial-rubber' });
    s = act(s, { type: 'close-identification' });
    s = act(s, { type: 'tutorial-continue' });
    reject(s, { type: 'approach-guardian' });
    s = act(s, { type: 'place', id: 'tutorial-rubber', at: 3 });
    s = act(s, { type: 'defense-explained' });
    const preview = makeDuel(s, 'guardian');
    s = act(s, { type: 'approach-guardian' });
    s = act(s, { type: 'fight' });
    assert.deepEqual(s.duel, preview);
    assert.equal(simulateDuel(s.duel).winner, 0);
    s = claimReward(act(s, { type: 'resolve' }));
    assert.equal(currentNode(s), 'exit');
    assert.ok(s.items.some((x) => x.id === 'relic'));
    assert.equal(
      s.items.find((x) => x.uid === 'tutorial-boss-weapon').type,
      'physical',
    );
    s = act(s, { type: 'extract' });
    assert.equal(s.homeGuide, 'sell');
    assert.equal(s.expedition.active, false);
    assert.ok(s.expedition.acquired.some((x) => x.uid === 'tutorial-scanner'));
    assert.ok(s.expedition.spent.stamina >= 30);
    const gold = s.material;
    s = act(s, { type: 'sell-relic' });
    assert.equal(s.material, gold + 30);
    reject(s, { type: 'sell-relic' });
    s = act(s, { type: 'buy-scanner' });
    assert.equal(s.homeGuide, 'scan');
    assert.equal(s.material, gold + 18);
    s = act(s, { type: 'scan', id: 'tutorial-boss-weapon' });
    assert.equal(s.homeGuide, 'sleep');
    s = act(s, { type: 'close-identification' });
    s = act(s, { type: 'sleep' });
    assert.equal(s.homeGuide, 'done');
    assert.equal(s.day, 2);
    assert.ok(validSave(s));
  }
});
test('opening8: optional tool consumption, move budget, reset, skip and stars are atomic', () => {
  let s = pressure(4);
  reject(s, { type: 'minigame-play', choice: 2 });
  reject(s, { type: 'minigame-complete' });
  s = act(s, { type: 'minigame-tool', id: 'tutorial-sealant' });
  assert.equal(s.minigame.bonus, 4);
  reject(s, { type: 'minigame-tool', id: 'tutorial-sealant' });
  for (let i = 0; i < 16; i++) s = act(s, { type: 'minigame-play', choice: 0 });
  reject(s, { type: 'minigame-play', choice: 0 });
  s = act(restore(s), { type: 'minigame-reset' });
  assert.equal(s.minigame.used, 0);
  assert.equal(s.minigame.bonus, 4);
  s = act(s, { type: 'minigame-skip' });
  assert.equal(currentNode(s), 'antechamber');
  assert.equal(s.loot, null);
  assert.deepEqual([0, 1, 2, 3, 4, 8].map(rewardStars), [1, 1, 2, 2, 3, 3]);
});
test('opening8: scanner migration, shop stock and deterministic rarity variation', () => {
  let s = act(newRun(42, true), { type: 'begin' });
  s.charges = 3;
  delete s.scannerVersion;
  s.items.push(makeItem('old-scanner', 'scanner', 'tool'));
  const n = migrateCargo(s);
  assert.equal(itemCount(n, 'scanner', false), 3);
  assert.equal(n.charges, 0);
  assert.deepEqual(migrateCargo(n), n);
  const tiers = new Set();
  for (let seed = 0; seed < 200; seed++) {
    let a = act(newRun(seed, true), { type: 'begin' });
    a.items.push(makeItem('raw', 'rubber', 'physical'));
    a = act(a, { type: 'buy-scanner' });
    const b = act(a, { type: 'scan', id: 'raw' }),
      c = act(restore(a), { type: 'scan', id: 'raw' });
    assert.deepEqual(b.items, c.items);
    tiers.add(b.items.find((x) => x.uid === 'raw').rarity);
  }
  assert.equal(tiers.size, 5);
  s = act(newRun(42), { type: 'begin' });
  s.material = 100;
  s = act(s, { type: 'buy-scanner' });
  s = act(s, { type: 'buy-scanner' });
  reject(s, { type: 'buy-scanner' });
});

test('opening8: all eight combat tutorial steps survive save restoration', () => {
  let s = act(
    act(act(newRun(32, true), { type: 'begin' }), { type: 'enter', floor: 1 }),
    { type: 'fight' },
  );
  for (let i = 0; i < 8; i++) {
    s = act(s, { type: 'tutorial-step', choice: i });
    assert.ok(validSave(s));
  }
  assert.equal(restore(s).tutorialBattleStep, 8);
});
