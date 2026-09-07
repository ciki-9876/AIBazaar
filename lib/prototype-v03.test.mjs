import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newDay,
  dayAction,
  newCargo,
  cargoV03,
  duel,
  START_BOARD,
  TALENTS,
  newBots,
  botDay,
} from './prototype-v03.ts';
test('v03 day only advances by sleep; extraction commits highest clear and keeps daily attendance spent', () => {
  let s = dayAction(newDay(), 'depart', 3);
  s = dayAction(s, 'search');
  s = dayAction(s, 'search');
  assert.equal(s.day, 1);
  assert.equal(s.best, 0);
  s = dayAction(s, 'extract');
  assert.equal(s.best, 3);
  assert.throws(() => dayAction(s, 'depart', 4), /每天/);
  s = dayAction(s, 'sleep');
  assert.equal(s.day, 2);
  assert.equal(s.quota, 11);
  assert.equal(s.used, false);
});
test('v03 rescue loses ordinary loot, protects small cargo, retains best and eventually exhausts quota', () => {
  let s = dayAction({ ...newDay(), best: 1 }, 'depart', 3);
  s = dayAction(s, 'search');
  s = dayAction(s, 'secure');
  s = dayAction(s, 'search');
  const material = s.material;
  s = dayAction(s, 'fail');
  assert.equal(s.quota, 9);
  assert.equal(s.phase, 'base');
  assert.equal(s.best, 1);
  assert.equal(s.material, material + 2);
  assert.equal(s.loot, 0);
  assert.equal(s.used, true);
  s = dayAction({ ...s, phase: 'floor', quota: 3 }, 'fail');
  assert.equal(s.phase, 'over');
  assert.throws(() => dayAction(s, 'sleep'), /耗尽/);
});
test('v03 access, growth, production and capacity reject illegal operations without charging', () => {
  const s = newDay();
  assert.throws(() => dayAction(s, 'depart', 11), /解锁/);
  assert.equal(s.power, 24);
  const upgraded = dayAction(s, 'upgrade');
  assert.equal(upgraded.slots, 5);
  assert.equal(upgraded.maxFloor, 20);
  const grown = dayAction(upgraded, 'bag');
  assert.equal(grown.capacity, 16);
  assert.equal(grown.slots, 5);
  const produced = dayAction(s, 'produce');
  assert.equal(produced.day, 1);
  assert.equal(produced.quota, 12);
  assert.throws(() => dayAction(produced, 'produce'), /一次/);
});
test('v03 weather changes expedition resource costs and objective requirements', () => {
  let clear = dayAction(newDay(), 'depart', 3);
  let fog = structuredClone(clear);
  for (let i = 0; i < 2; i++) {
    clear = dayAction(clear, 'search', 3, 0);
    fog = dayAction(fog, 'search', 3, 2);
  }
  assert.equal(clear.objective, true);
  assert.equal(fog.objective, false);
  assert.ok(fog.stamina > clear.stamina);
  assert.equal(fog.day, 1);
});
test('v03 scan locks five-tier rarity, retains volume and never spends again on retries', () => {
  assert.ok(Math.abs(TALENTS.reduce((n, t) => n + t.chance, 0) - 100) < 1e-9);
  const initial = newCargo();
  assert.ok(initial.bag.every((c) => c.rarity === undefined));
  const s = cargoV03(initial, 'scan', 'knife-001');
  assert.equal(s.charges, 1);
  assert.equal(s.bag[0].size, initial.bag[0].size);
  assert.equal(s.cycles, 0);
  assert.ok(s.bag[0].rarity >= 0 && s.bag[0].rarity < 5);
  const again = cargoV03(s, 'scan', 'knife-001');
  assert.equal(again.charges, 1);
  assert.deepEqual(again.bag, s.bag);
  assert.equal(cargoV03(s, 'expand').capacity, 16);
});
test('v03 battles are deterministic, bounded, affect owners and preserve inputs', () => {
  const board = [...START_BOARD];
  const a = duel(board, 0, 0, 'weather', 1);
  assert.deepEqual(a, duel(board, 0, 0, 'weather', 1));
  assert.deepEqual(board, START_BOARD);
  assert.ok(a.frames.length <= 241);
  assert.ok(a.frames.at(-1).hp.some((h) => h < 220));
  for (const f of a.frames) {
    assert.ok(f.hp.every((h) => h >= 0 && h <= 220));
    assert.ok(f.energy.every((e) => e >= 0 && e <= 10));
    assert.ok(f.shield.every((v) => v >= 0));
  }
});
test('v03 weather and quality matter; power comparison disables all weather modifiers', () => {
  assert.notDeepEqual(
    duel(START_BOARD, 0, 0, 'weather', 1),
    duel(START_BOARD, 0, 1, 'weather', 1),
  );
  assert.notDeepEqual(
    duel(START_BOARD, 0, 0, 'weather', 0),
    duel(START_BOARD, 0, 0, 'weather', 2),
  );
  assert.deepEqual(
    duel(START_BOARD, 0, 0, 'power', 1),
    duel(START_BOARD, 3, 2, 'power', 1),
  );
});
test('v03 bots share quota rules, preserve stock, and replay deterministically by day', () => {
  let s = newBots();
  for (let i = 0; i < 12; i++) {
    const old = s;
    s = botDay(s);
    assert.deepEqual(s, botDay(old));
    for (let j = 0; j < 100; j++)
      assert.ok(s.stock[j] >= 0 && s.stock[j] <= old.stock[j]);
    for (const b of s.bots) {
      const before = old.bots.find((v) => v.id === b.id);
      if (!before.alive) assert.deepEqual(b, before);
    }
  }
  assert.ok(s.bots.every((b) => !b.alive));
  assert.ok(s.stock.some((x) => x < 12));
});
