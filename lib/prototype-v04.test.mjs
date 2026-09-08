import test from 'node:test';
import assert from 'node:assert/strict';
import {
  START,
  POWER,
  ENEMY,
  FOUR,
  CARDS,
  covered,
  validateBoard,
  placeCard,
  battle,
  newDay,
  dayAction,
  rescueCost,
  safeCapacity,
  newBase,
  baseAction,
  baseSlots,
  FACILITIES,
  stat,
  newBots,
  botDay,
} from './prototype-v04.ts';
test('v04 multi-cell cards cannot overlap, cross lanes, duplicate identities or use locked cells', () => {
  validateBoard(START, FOUR);
  validateBoard(POWER, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  validateBoard(ENEMY, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const original = structuredClone(START);
  assert.throws(
    () => placeCard(START, 'brick', 2, [0, 1, 2, 3, 4, 5, 6, 7, 8]),
    /跨路/,
  );
  assert.throws(() => placeCard(START, 'brick', 3, FOUR), /占用/);
  assert.throws(() => placeCard([], 'battery', 0, FOUR), /解锁/);
  assert.deepEqual(START, original);
  const moved = placeCard(START, 'wire', 2, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(moved.filter((p) => p.id === 'wire').length, 1);
  assert.equal(moved.find((p) => p.id === 'wire').at, 2);
  assert.deepEqual(covered({ id: 'battery', at: 3 }), [3, 4, 5]);
});
test('v04 covered cells never create extra activations or timers', () => {
  const result = battle([{ id: 'shelter', at: 0 }], [], 2, 0, 0);
  assert.equal(
    result.frames.filter((f) => f.time <= 20 && f.fired.includes('0-0')).length,
    4,
  );
  assert.ok(
    result.frames.every(
      (f) => f.timers[0][1] === 0 && !f.fired.includes('0-1'),
    ),
  );
});
test('v04 ordinary cards fire without energy; consumer stalls until a producer supplies energy', () => {
  const dry = battle(
    [
      { id: 'knife', at: 0 },
      { id: 'coil', at: 3 },
    ],
    [],
    2,
    0,
    0,
  );
  assert.ok(dry.frames.some((f) => f.fired.includes('0-0')));
  assert.ok(dry.frames.every((f) => !f.fired.includes('0-3')));
  assert.ok(dry.frames.some((f) => f.waiting.includes('0-3')));
  const powered = battle(
    [
      { id: 'cell', at: 0 },
      { id: 'coil', at: 1 },
    ],
    [],
    2,
    0,
    1,
  );
  assert.ok(powered.frames.some((f) => f.fired.includes('0-1')));
  assert.ok(
    powered.frames.every((f) =>
      f.energy.every((e, i) => e >= 0 && e <= f.cap[i]),
    ),
  );
});
test('v04 miracles have non-linear power and bounded executable echo', () => {
  assert.ok(stat('knife', 4, 0) > stat('knife', 3, 0) * 1.6);
  const normal = battle([{ id: 'knife', at: 0 }], [], 2, 0, 0);
  const miracle = battle([{ id: 'knife', at: 0 }], [], 2, 0, 0, 'knife');
  assert.ok(
    miracle.frames.some((f) => f.log.some((l) => l.includes('奇迹回响'))),
  );
  assert.ok(miracle.frames.length < normal.frames.length);
  assert.deepEqual(
    miracle,
    battle([{ id: 'knife', at: 0 }], [], 2, 0, 0, 'knife'),
  );
  assert.ok(miracle.frames.length <= 241);
});
test('v04 all sample layouts remain deterministic across weather and quality', () => {
  for (let w = 0; w < 4; w++)
    for (let q = 0; q < 3; q++) {
      const result = battle(POWER, ENEMY, w, 1, q);
      assert.deepEqual(result, battle(POWER, ENEMY, w, 1, q));
      for (const f of result.frames) {
        assert.ok(f.hp.every((h) => h >= 0 && h <= 260));
        assert.ok(f.shield.every((h) => h >= 0));
      }
    }
  assert.equal(CARDS.length, 10);
});
test('v04 rescue costs increase, sleep keeps the streak, normal extraction resets it', () => {
  let s = dayAction(newDay(), 'depart', 3);
  s = dayAction(s, 'fail');
  assert.equal(s.quota, 15);
  assert.equal(s.streak, 1);
  s = dayAction(s, 'sleep');
  assert.equal(s.streak, 1);
  s = dayAction(s, 'depart', 3);
  s = dayAction(s, 'fail');
  assert.equal(s.quota, 9);
  assert.equal(s.streak, 2);
  s = dayAction(s, 'sleep');
  s = dayAction(s, 'depart', 3);
  s = dayAction(s, 'extract');
  assert.equal(s.streak, 0);
  assert.deepEqual([0, 1, 2, 3, 4].map(rescueCost), [3, 5, 7, 9, 9]);
});
test('v04 secure storage grows separately from the exploration bag and survives rescue', () => {
  assert.deepEqual([4, 6, 8].map(safeCapacity), [2, 4, 6]);
  let s = { ...newDay(), slots: 6, loot: 3, phase: 'floor' };
  s = dayAction(s, 'secure');
  s = dayAction(s, 'secure');
  assert.equal(s.safe, 2);
  assert.throws(() => dayAction(s, 'secure'), /空间/);
  const before = s.material;
  s = dayAction(s, 'fail');
  assert.equal(s.material, before + 4);
  assert.equal(s.loot, 0);
  assert.equal(s.capacity, 12);
});
test('v04 build limits and demolition/rebuild cannot bypass daily facility limits', () => {
  let s = baseAction(newBase(), 'build', 'grow');
  s = baseAction(s, 'use', 'grow');
  const snapshot = structuredClone(s);
  assert.throws(() => baseAction(s, 'use', 'grow'), /今天/);
  assert.deepEqual(s, snapshot);
  s = baseAction(s, 'remove', 'grow');
  s = baseAction(s, 'build', 'grow');
  assert.throws(() => baseAction(s, 'use', 'grow'), /今天/);
  s = baseAction(s, 'sleep');
  assert.doesNotThrow(() => baseAction(s, 'use', 'grow'));
  const full = baseAction(
    baseAction(newBase(), 'build', 'grow'),
    'build',
    'clinic',
  );
  assert.equal(baseSlots(full), 6);
  assert.throws(() => baseAction(full, 'build', 'weather'), /空间/);
});
test('v04 every facility implements a real resource, information or preparation effect', () => {
  for (const f of FACILITIES) {
    let s = baseAction(newBase(), 'build', f.id);
    const before = structuredClone(s);
    s = baseAction(s, 'use', f.id);
    assert.ok(s.facilityUsed.includes(f.id));
    assert.equal(s.day, before.day);
    assert.equal(s.quota, before.quota);
    const field = {
      grow: 'supply',
      generator: 'power',
      clinic: 'stamina',
      weather: 'forecast',
      recycle: 'material',
      workshop: 'charges',
      storage: 'fuel',
      adapt: 'adapted',
    }[f.id];
    assert.notEqual(s[field], before[field]);
  }
});
test('v04 preparation is consumed by expedition; fuel cap is enforced when downsizing', () => {
  let s = baseAction(baseAction(newBase(), 'build', 'adapt'), 'use', 'adapt');
  const stamina = s.stamina;
  s = baseAction(s, 'supply-run');
  assert.equal(s.stamina, stamina - 10);
  assert.equal(s.adapted, false);
  assert.throws(() => baseAction(s, 'supply-run'), /一次/);
  s = baseAction(newBase(), 'build', 'storage');
  s.fuel = 8;
  assert.throws(() => baseAction(s, 'remove', 'storage'), /容量/);
  s.fuel = 6;
  assert.doesNotThrow(() => baseAction(s, 'remove', 'storage'));
});
test('v04 bots preserve stock, use rescue streaks and stop acting when quota ends', () => {
  let s = newBots();
  assert.ok(s.bots.every((b) => b.quota === 18));
  for (let i = 0; i < 18; i++) {
    const prior = s;
    s = botDay(s);
    assert.deepEqual(s, botDay(prior));
    assert.ok(s.stock.every((n, f) => n >= 0 && n <= prior.stock[f]));
    for (const b of s.bots)
      if (!prior.bots.find((x) => x.id === b.id).alive)
        assert.equal(b.alive, false);
  }
  assert.ok(s.bots.every((b) => !b.alive));
});
