import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFT,
  PLAYER_RADIUS,
  DEPARTURE,
  DEPARTURE_TICKS,
  insideLift,
} from './survival-lift.ts';
import {
  BAG_SIZE,
  ITEMS,
  ROOM,
  ELEVATOR,
  createSurvival,
  survivalAction,
  stepSurvival,
  capacity,
  distance,
  pathTo,
  walkable,
  firstFit,
  weaponStats,
} from './survival-room.ts';
import {
  generateWorld,
  flood,
  cellKey,
  revealFog,
  isVisible,
  clearSight,
} from './survival-world.ts';
// Combat fixtures bypass the one-time arrival; the real lifecycle is tested below.
const start = (seed = 92601) => ({
  ...createSurvival(seed),
  status: 'running',
  departureTick: DEPARTURE_TICKS,
});
const item = (kind, uid = kind) => ({ ...ITEMS[kind], uid });
const advance = (s, ticks, input = {}) => {
  for (let i = 0; i < ticks; i++) s = stepSurvival(s, input);
  return s;
};
const place = (s, p) => {
  s.player = { ...s.player, ...p };
  s.fog = revealFog(s.player, s.fog, s.world);
  return s;
};
const enemy = (p, hp = 1000) => ({
  id: 'test-enemy',
  kind: 'brute',
  ...p,
  hp,
  maxHp: hp,
  nextAttack: 9999,
  awake: true,
  hitAt: -100,
  windup: 0,
  aim: null,
});

test('survival: identical commands and JSON restoration reproduce fog, world, equipment and combat', () => {
  const run = () => {
    let s = survivalAction(start(), { type: 'move', to: { x: 48, z: 60 } });
    s = advance(s, 420);
    const restored = JSON.parse(JSON.stringify(s));
    assert.deepEqual(
      advance(s, 180, { x: 1 }),
      advance(restored, 180, { x: 1 }),
    );
    return advance(s, 180, { x: 1 });
  };
  assert.deepEqual(run(), run());
});

test('survival: recipe maps exceed ten times the old area and all cache/gate routes connect across seeds', () => {
  assert.ok(ROOM.width * ROOM.depth >= 28 * 24 * 10);
  assert.deepEqual(generateWorld(19), generateWorld(19));
  assert.notDeepEqual(generateWorld(19).obstacles, generateWorld(20).obstacles);
  for (let seed = 1; seed <= 16; seed++) {
    const s = start(seed),
      field = flood(ELEVATOR, s.world);
    assert.equal(s.world.modules.length, 16);
    assert.equal(
      new Set(s.caches.map((c) => c.item.uid)).size,
      s.caches.length,
    );
    for (const p of [...s.caches, ...s.world.gates, ...s.enemies]) {
      assert.ok(
        walkable(p, 0.42, s.world),
        `blocked ${JSON.stringify(p)} / seed ${seed}`,
      );
      assert.ok(field[cellKey(p)] >= 0, `unreachable / seed ${seed}`);
    }
  }
});

test('survival: diagonal movement is normalized, collision prevents entry, and input is immutable', () => {
  const original = start(),
    snapshot = structuredClone(original);
  assert.ok(
    Math.abs(
      distance(original.player, stepSurvival(original, { x: 1 }).player) -
        distance(
          original.player,
          stepSurvival(original, { x: 1, z: -1 }).player,
        ),
    ) < 1e-10,
  );
  assert.deepEqual(original, snapshot);
  const o = original.world.obstacles[0];
  const s = place(start(), { x: o.x - o.w / 2 - 1, z: o.z });
  const walked = advance(s, 80, { x: 1 });
  assert.ok(walkable(walked.player, PLAYER_RADIUS, s.world));
  assert.ok(walked.player.x < o.x - o.w / 2);
  assert.equal(stepSurvival(s, { x: NaN, z: Infinity }).player.x, s.player.x);
});

test('survival: click navigation routes around machinery and auto-equips the early coil once', () => {
  let s = start();
  const o = s.world.obstacles[0],
    from = { x: o.x - o.w / 2 - 1, z: o.z },
    to = { x: o.x + o.w / 2 + 1, z: o.z };
  assert.equal(clearSight(from, to, s.world), false);
  const path = pathTo(from, to, s.world);
  assert.ok(path.length > 2);
  assert.ok(path.every((p) => walkable(p, 0.42, s.world)));
  s = survivalAction(s, {
    type: 'move',
    to: s.caches.find((c) => c.id === 'coil'),
  });
  s = advance(s, 100);
  assert.ok(distance(s.player, { x: 48, z: 69 }) < 0.2);
  assert.equal(s.equipment.filter((e) => e.item.kind === 'coil').length, 1);
  s = advance(s, 50);
  assert.equal(s.equipment.filter((e) => e.item.kind === 'coil').length, 1);
  assert.equal(survivalAction(s, { type: 'move', to: o }), s);
});

test('survival: full cargo preserves container contents, and freed space takes only fitting items', () => {
  let s = start();
  s.bag = Array.from({ length: BAG_SIZE }, (_, i) =>
    item('scrap', 'filler-' + i),
  );
  const supply = s.caches.find((c) => c.id === 'water-entry');
  place(s, supply);
  s = advance(s, 155);
  let cache = s.caches.find((c) => c.id === supply.id);
  assert.equal(cache.searched, true);
  assert.equal(cache.opened, false);
  assert.equal(cache.contents.length, 3);
  assert.equal(capacity(s.bag), BAG_SIZE);
  s = survivalAction(s, { type: 'protect', uid: 'filler-0' });
  s = advance(s, 2);
  cache = s.caches.find((c) => c.id === supply.id);
  assert.equal(cache.opened, false);
  assert.equal(cache.contents.length, 2);
  assert.equal(s.bag.filter((i) => i.kind === 'water').length, 1);
  place(s, { x: 48, z: 69 });
  s = advance(s, 45);
  assert.ok(s.equipment.some((e) => e.item.kind === 'coil'));
  assert.equal(capacity(s.bag), BAG_SIZE);
});

test('survival: the ten-slot strip fits 1/2/3-cell gear and rejects overlap, fractions and overflow atomically', () => {
  let s = start();
  s.bag = [item('coil'), item('blade'), item('laser')];
  for (const uid of ['coil', 'blade', 'laser'])
    s = survivalAction(s, {
      type: 'equip',
      uid,
      slot: firstFit(s.equipment, ITEMS[uid].size),
    });
  assert.equal(
    s.equipment.reduce((n, e) => n + e.item.size, 0),
    10,
  );
  assert.equal(s.bag.length, 0);
  const snapshot = structuredClone(s);
  for (const slot of [-1, 0.5, 0, 8, NaN, Infinity])
    assert.equal(survivalAction(s, { type: 'equip', uid: 'laser', slot }), s);
  assert.deepEqual(s, snapshot);
  s.bag = Array.from({ length: BAG_SIZE }, (_, i) =>
    item('scrap', `full-${i}`),
  );
  assert.equal(survivalAction(s, { type: 'unequip', uid: 'laser' }), s);
});

test('survival: adjacency changes actual damage, a gap removes it, and moving does not reset cooldown', () => {
  let buffed = start();
  buffed.enemies = [enemy({ x: 48, z: 69 })];
  let plain = survivalAction(buffed, {
    type: 'equip',
    uid: 'starter-capacitor',
    slot: 9,
  });
  buffed = stepSurvival(buffed);
  plain = stepSurvival(plain);
  assert.equal(buffed.damage, 29);
  assert.equal(plain.damage, 23);
  const ready = buffed.cooldowns['starter-nail'];
  const moved = survivalAction(buffed, {
    type: 'equip',
    uid: 'starter-nail',
    slot: 5,
  });
  assert.equal(moved.cooldowns['starter-nail'], ready);
  assert.equal(stepSurvival(moved).damage, 29);
});

test('survival: one-cell support buffs both touching weapons, not weapons behind a gap', () => {
  const s = start();
  s.equipment = [
    { item: item('nail'), slot: 0 },
    { item: item('capacitor'), slot: 2 },
    { item: item('coil'), slot: 3 },
    { item: item('coolant'), slot: 5 },
    { item: item('laser'), slot: 7 },
  ];
  assert.equal(weaponStats(s, s.equipment[0]).damage, 29);
  assert.equal(weaponStats(s, s.equipment[2]).damage, 28);
  assert.equal(weaponStats(s, s.equipment[2]).interval, 50);
  assert.equal(weaponStats(s, s.equipment[4]).interval, 90);
});

test('survival: protecting equipped support removes its buff and obeys safe capacity', () => {
  let s = start();
  const before = structuredClone(s);
  assert.equal(survivalAction(s, { type: 'protect', uid: 'starter-nail' }), s);
  assert.equal(survivalAction(s, { type: 'protect', uid: 'missing' }), s);
  assert.deepEqual(s, before);
  s = survivalAction(s, { type: 'protect', uid: 'starter-capacitor' });
  assert.equal(s.safe[0].uid, 'starter-capacitor');
  assert.equal(s.equipment.length, 1);
  assert.equal(weaponStats(s, s.equipment[0]).damage, 23);
  s = survivalAction(s, { type: 'unprotect', uid: 'starter-capacitor' });
  assert.equal(s.bag[0].uid, 'starter-capacitor');
  assert.equal(s.equipment.length, 1);
});

test('survival: inventory weapons are inactive and cannot duplicate when the cargo is full', () => {
  let s = start();
  s.bag = [item('coil')];
  s.enemies = [enemy({ x: 48, z: 72 })];
  s = advance(s, 5);
  assert.equal(
    s.effects.some((e) => e.kind === 'arc'),
    false,
  );
  s.bag = Array.from({ length: BAG_SIZE }, (_, i) => item('scrap', `${i}`));
  s.safe = [item('coolant')];
  const before = structuredClone(s);
  assert.equal(survivalAction(s, { type: 'unprotect', uid: 'coolant' }), s);
  assert.deepEqual(s, before);
});

test('survival: fog blocks sight behind machines, remembers terrain and never retains current enemy vision', () => {
  const s = start();
  s.world = {
    ...s.world,
    obstacles: [{ x: 48, z: 65, w: 8, d: 2, type: 'wall' }],
  };
  s.fog = {
    explored: Array(ROOM.width * ROOM.depth).fill(0),
    visible: Array(ROOM.width * ROOM.depth).fill(0),
  };
  place(s, { x: 48, z: 70 });
  assert.equal(isVisible(s, { x: 48, z: 68 }), true);
  assert.equal(isVisible(s, { x: 48, z: 60 }), false);
  assert.equal(s.fog.explored[cellKey({ x: 48, z: 60 })], 0);
  const known = { x: 48, z: 68 };
  place(s, { x: 70, z: 70 });
  assert.equal(s.fog.explored[cellKey(known)], 1);
  assert.equal(isVisible(s, known), false);
});

test('survival: attacks cannot target enemies behind occluders or outside vision', () => {
  const s = start();
  s.world = {
    ...s.world,
    obstacles: [{ x: 48, z: 71, w: 5, d: 1, type: 'wall' }],
  };
  place(s, ELEVATOR);
  s.enemies = [enemy({ x: 48, z: 69 })];
  assert.equal(stepSurvival(s).damage, 0);
});

test('survival: laser pierces aligned enemies but does not damage off-axis enemies', () => {
  const s = start();
  s.equipment = [{ item: item('laser'), slot: 0 }];
  s.enemies = [
    enemy({ x: 48, z: 71 }),
    { ...enemy({ x: 48, z: 67 }), id: 'second' },
    { ...enemy({ x: 50, z: 69 }), id: 'side' },
  ];
  const next = stepSurvival(s);
  assert.equal(next.damage, 116);
  assert.equal(next.enemies.find((e) => e.id === 'side').hp, 1000);
  assert.ok(next.effects.some((e) => e.kind === 'laser'));
});

test('survival: death loses equipped and ordinary items once, preserves safety and stops simulation', () => {
  let s = start();
  s.bag = [item('coil'), item('scrap')];
  s.safe = [item('water')];
  s.player.hp = 1;
  s.enemies = [
    {
      ...enemy({ x: ELEVATOR.x + 0.3, z: ELEVATOR.z }),
      kind: 'crawler',
      nextAttack: 0,
    },
  ];
  s = stepSurvival(s);
  assert.equal(s.status, 'dead');
  assert.equal(s.bag.length, 0);
  assert.equal(s.equipment.length, 0);
  assert.deepEqual(
    s.lost.map((i) => i.uid),
    ['coil', 'scrap', 'starter-nail', 'starter-capacitor'],
  );
  assert.equal(s.safe[0].uid, 'water');
  assert.equal(stepSurvival(s, { x: 1 }), s);
});

test('survival: extraction requires the lift, preserves equipment and can be interrupted', () => {
  let s = start();
  s.leftLift = true;
  s.bag = [item('scrap')];
  place(s, { x: 48, z: 69 });
  assert.equal(survivalAction(s, { type: 'extract' }), s);
  place(s, ELEVATOR);
  s = survivalAction(s, { type: 'extract' });
  assert.ok(s.extraction);
  s = stepSurvival(s, { x: 1 });
  assert.equal(s.extraction, 0);
  s = survivalAction(s, { type: 'extract' });
  s = advance(s, 70);
  assert.equal(s.status, 'extracted');
  assert.equal(s.bag[0].uid, 'scrap');
  assert.equal(s.equipment.length, 2);
});

test('survival: the optional nonhuman boss drops exactly one finite core', () => {
  let s = start();
  place(s, { x: 60, z: 14 });
  s.enemies[0].hp = 1;
  s = stepSurvival(s);
  assert.equal(s.bossDefeated, true);
  s = advance(s, 400);
  assert.equal(s.caches.filter((c) => c.id === 'warden-core').length, 1);
  assert.equal(
    s.enemies.some((e) => e.kind === 'boss'),
    false,
  );
});

test('survival: continuing waves spawn near the moving player on reachable ground with a warning', () => {
  for (const position of [ELEVATOR, { x: 48, z: 40 }, { x: 12, z: 10 }]) {
    let s = place(start(), position);
    s.leftLift = true;
    s.nextWave = 1;
    s = stepSurvival(s);
    assert.ok(s.spawns.length > 0);
    for (const spawn of s.spawns) {
      assert.ok(spawn.at > s.tick + 20);
      assert.ok(walkable(spawn, 0.35, s.world));
      assert.ok(
        distance(s.player, spawn) > 9.5 && distance(s.player, spawn) < 24,
      );
    }
    assert.equal(s.enemies.length, 1);
    assert.ok(advance(s, 60).enemies.length > 1);
  }
});

test('survival: water requires manual use, consumes the real ordinary item once and never protected supplies', () => {
  let s = start();
  s.player.water = 20;
  s.player.food = 20;
  s.bag = [item('water')];
  s.safe = [item('food')];
  s = stepSurvival(s);
  assert.equal(s.player.water, 20);
  assert.equal(s.bag.length, 1);
  s = survivalAction(s, { type: 'consume', uid: s.bag[0].uid });
  assert.equal(s.player.water, 65);
  assert.equal(s.bag.length, 0);
  assert.equal(s.player.food, 20);
  assert.equal(s.safe[0].kind, 'food');
  assert.equal(stepSurvival(s).player.water, 65);
});

test('survival: real-width lift permits exit and return but not wall traversal or outside extraction', () => {
  let s = start();
  s.nextWave = 999999;
  for (const wall of LIFT.walls)
    assert.equal(
      walkable(
        { x: ELEVATOR.x + wall.x, z: ELEVATOR.z + wall.z },
        PLAYER_RADIUS,
        s.world,
      ),
      false,
      'cannot walk through cabin walls or jambs',
    );
  for (let z = ELEVATOR.z - 3; z <= ELEVATOR.z; z += 0.1)
    assert.ok(walkable({ x: ELEVATOR.x, z }, PLAYER_RADIUS, s.world));
  place(s, { x: ELEVATOR.x, z: ELEVATOR.z - 1.3 });
  s.leftLift = true;
  assert.equal(
    survivalAction(s, { type: 'extract' }),
    s,
    'outside door is not a valid extraction point',
  );
  s = survivalAction(s, { type: 'move', to: { x: 48, z: 69 } });
  s = advance(s, 140);
  assert.ok(distance(s.player, { x: 48, z: 69 }) < 1.5);
  assert.ok(s.equipment.some((e) => e.item.kind === 'coil'));
  s = survivalAction(s, { type: 'move', to: ELEVATOR });
  s = advance(s, 140);
  assert.ok(insideLift(s.player, ELEVATOR));
  s = survivalAction(s, { type: 'extract' });
  s = advance(s, 70);
  assert.equal(s.status, 'extracted');
  assert.ok(s.equipment.some((e) => e.item.kind === 'coil'));
});

test('survival: departure opens before walking, preserves supplies, and restores identically mid-sequence', () => {
  const ready = createSurvival();
  assert.equal(stepSurvival(ready, { x: 1 }), ready);
  let s = survivalAction(ready, { type: 'start' });
  assert.equal(s.status, 'departing');
  assert.equal(survivalAction(s, { type: 'start' }), s);
  assert.equal(survivalAction(s, { type: 'move', to: { x: 12, z: 12 } }), s);
  s = advance(s, DEPARTURE.openTicks, { x: 1 });
  assert.equal(distance(s.player, ELEVATOR), 0);
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(advance(s, 30), advance(restored, 30));
  while (s.status === 'departing') {
    s = stepSurvival(s, { x: 1, z: 1 });
    assert.ok(
      walkable(s.player, PLAYER_RADIUS, s.world),
      'the entire walk crosses clear geometry',
    );
  }
  assert.equal(s.departureTick, DEPARTURE_TICKS);
  assert.equal(s.status, 'running');
  assert.equal(s.tick, 0);
  assert.equal(s.leftLift, true);
  assert.equal(s.player.hp, 100);
  assert.equal(s.player.water, 100);
  assert.equal(s.wave, 0);
  assert.equal(s.spawns.length, 0);
  assert.ok(s.player.z < ELEVATOR.z + LIFT.doorZ);
  assert.equal(stepSurvival(s).tick, 1);
});
