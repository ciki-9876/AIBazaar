import test from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  newRun,
  checkpoint,
  validSave,
  currentFloor,
  unlockedItem,
  merchantOffers,
} from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';
const start = () => act(newRun(491), { type: 'begin' });
test('recovery: failed jump restores the departure checkpoint, preserving searched stock and attendance cost', () => {
  let s = start();
  s.best = s.floor = s.stopFloor = 3;
  s.clears = [3];
  s = act(s, { type: 'enter', floor: 10 });
  const stock = structuredClone(currentFloor(s).stock);
  s = act(s, { type: 'rescue' });
  assert.equal(s.floor, 3);
  assert.equal(checkpoint(s), 3);
  assert.equal(s.best, 3);
  assert.equal(s.quota, 9);
  assert.equal(s.used, true);
  assert.deepEqual(s.floors[9].stock, stock);
  assert.ok(!s.items.some((x) => x.zone === 'bag'));
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.throws(() => act(s, { type: 'enter', floor: 4 }));
  s = act(s, { type: 'sleep' });
  for (const floor of [4, 7, 10])
    assert.equal(act(s, { type: 'enter', floor }).floor, floor);
  assert.throws(() => act(s, { type: 'enter', floor: 2 }));
});
test('recovery: only completed extraction commits height; legacy saves recover their last successful floor', () => {
  let s = start();
  s = act(s, { type: 'enter', floor: 5 });
  const early = act(s, { type: 'extract' });
  assert.equal(early.floor, 0);
  assert.equal(early.best, 0);
  s.objective = true;
  const clear = act(s, { type: 'extract' });
  assert.equal(clear.floor, 5);
  assert.equal(checkpoint(clear), 5);
  assert.equal(clear.best, 5);
  const legacy = {
    ...s,
    best: 2,
    departureFloor: undefined,
    stopFloor: undefined,
  };
  assert.equal(act(legacy, { type: 'rescue' }).floor, 2);
  assert.equal(validSave({ ...early, stopFloor: 9 }), false);
});
test('progression: facilities and portable scanning unlock with level, while base scanning stays free', () => {
  let s = start();
  assert.ok(!s.items.some((x) => x.id === 'scanner'));
  assert.equal(unlockedItem(s, 'power'), false);
  assert.throws(() => act(s, { type: 'build', id: 'clinic' }), /Lv.2/);
  assert.throws(() => act(s, { type: 'grow', id: 'starter-knife' }), /Lv.2/);
  assert.throws(() => act(s, { type: 'craft-scanner' }), /Lv.3/);
  s = act(s, { type: 'upgrade' });
  assert.equal(unlockedItem(s, 'medicine'), true);
  assert.equal(unlockedItem(s, 'fuel'), false);
  s = act(s, { type: 'upgrade' });
  assert.equal(unlockedItem(s, 'fuel'), true);
  assert.equal(s.items.find((x) => x.id === 'scanner').zone, 'warehouse');
  assert.ok(validSave(s));
  s = act(s, { type: 'enter', floor: 1 });
  s.level = 1;
  assert.ok(merchantOffers(s).every((x) => x.id !== 'scanner'));
});
const card = (uid, flightTime, id = 'knife') => ({
  uid,
  flightTime,
  id,
  at: 0,
  rarity: 0,
  quality: 0,
  level: 0,
});
const duel = (player, enemy, maxHp = [10, 10]) => ({
  player,
  enemy,
  maxHp,
  weather: 0,
  layout: 0,
  name: 'test',
  kind: 'guardian',
  botId: null,
});
test('projectiles: flight duration affects lethal ordering; equal-time lethal arrivals draw', () => {
  const fast = simulateDuel(duel([card('p', 0.5)], [card('e', 1.5)]));
  assert.equal(fast.winner, 0);
  const slow = simulateDuel(duel([card('p', 1.5)], [card('e', 0.5)]));
  assert.equal(slow.winner, 1);
  const equal = simulateDuel(duel([card('p', 1)], [card('e', 1)]));
  assert.equal(equal.winner, -1);
  const firstLaunch = equal.frames.find((f) => f.projectiles.length);
  assert.deepEqual(firstLaunch.hp, [10, 10]);
  assert.equal(firstLaunch.hits.length, 0);
  assert.equal(
    equal.frames.find((f) => f.hits.some((h) => h.kind === 'damage')).time,
    firstLaunch.time + 1,
  );
});
test('projectiles: shield and energy arrive after launch and every impact is delivered once', () => {
  const result = simulateDuel(
    duel([card('shield', 1.5, 'battery')], [card('enemy', 1)], [1000, 1000]),
  );
  const launch = result.frames.find((f) =>
    f.projectiles.some((p) => p.sourceUid === 'shield'),
  );
  assert.ok(launch.barriers[0][0].hp < launch.barriers[0][0].maxHp);
  assert.equal(launch.energy[0], 0);
  const shot = launch.projectiles.find(
    (p) => p.sourceUid === 'shield' && p.kind === 'shield',
  );
  const landed = result.frames.find((f) => f.time === shot.impactAt);
  assert.ok(
    landed.hits.some((h) => h.sourceUid === 'shield' && h.kind === 'shield'),
  );
  const identities = result.frames.flatMap((f) =>
    f.hits.filter((h) => h.id).map((h) => h.id),
  );
  assert.equal(new Set(identities).size, identities.length);
});
