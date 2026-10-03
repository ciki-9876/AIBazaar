import test from 'node:test';
import assert from 'node:assert/strict';
import { createGMCheckpoint } from './survival-gm.ts';
import { openingAction, stepOpening } from './survival-opening.ts';
import { createGuidance, advanceGuidance } from './survival-guidance.ts';
import {
  foodSpeed,
  thirstDistortion,
  survivalAction,
  stepSurvival,
  ITEMS,
  pathTo,
  ELEVATOR,
} from './survival-room.ts';
import { maintenanceRoom, MAINTENANCE_POINTS } from './survival-afterlight.ts';
import { ASCENT_COST } from './survival-ascent.ts';
import { clearSight, walkable, ROOM } from './survival-world.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';

test('welcome bread leaves water at 60; weak guide waits for both needs to fall and expires without pausing', () => {
  let s = openingAction(createGMCheckpoint('after:eat-food'), {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
  assert.equal(s.room.player.water, 60);
  s = createGMCheckpoint('field:expedition');
  s.guidance = createGuidance();
  const one = {
    ...s,
    room: { ...s.room, player: { ...s.room.player, water: 58, food: 100 } },
  };
  assert.equal(advanceGuidance(s, one).guidance.active, null);
  let next = advanceGuidance(s, {
    ...one,
    room: { ...one.room, player: { ...one.room.player, food: 98 } },
  });
  assert.equal(next.guidance.active.id, 'needs');
  const tick = next.room.tick;
  next = stepOpening(next);
  assert.equal(next.room.tick, tick + 1);
  next.guidance.active.remaining = 1;
  assert.equal(stepOpening(next).guidance.active, null);
});

test('first hit or starvation reveals spirit and strong guidance freezes simulation until explicitly acknowledged', () => {
  for (const cause of ['attack', 'starvation']) {
    const s = createGMCheckpoint('field:expedition');
    s.guidance = createGuidance();
    s.room.player.hurtUntil = 0;
    if (cause === 'attack')
      s.room.enemies = [
        {
          id: 'test-hit',
          kind: 'crawler',
          hp: 100,
          maxHp: 100,
          x: s.room.player.x + 0.5,
          z: s.room.player.z,
          nextAttack: 0,
          awake: true,
          hitAt: -100,
          windup: 0,
          aim: null,
        },
      ];
    else {
      s.room.player.food = 0;
      s.room.bag = [];
    }
    const next = stepOpening(s);
    assert.equal(next.guidance.active.id, 'spirit');
    assert.ok(next.room.player.hp < s.room.player.hp);
    assert.equal(stepOpening(next, { x: 1 }), next);
    assert.equal(openingAction(next, { type: 'move', to: ELEVATOR }), next);
    assert.deepEqual(readOpeningCheckpoint(JSON.stringify(next)), next);
    assert.ok(
      stepOpening(openingAction(next, { type: 'ack-guide' })).room.tick >
        next.room.tick,
    );
  }
});

test('50 threshold gives continuous food speed and water distortion, is taught once, and no hidden energy damage', () => {
  assert.deepEqual([100, 50, 25, 0].map(foodSpeed), [1, 1, 0.75, 0.5]);
  assert.deepEqual([100, 50, 25, 0].map(thirstDistortion), [0, 0, 0.5, 1]);
  const s = createGMCheckpoint('field:expedition');
  s.room.player.food = 49.99;
  s.room.player.energy = 0;
  s.room.enemies = [];
  s.room.spawns = [];
  s.room.nextWave = 999999;
  const n = stepOpening(s);
  assert.equal(n.guidance.active.id, 'low');
  assert.equal(n.room.player.hp, s.room.player.hp);
  const ack = openingAction(n, { type: 'ack-guide' });
  assert.notEqual(stepOpening(ack).guidance.active?.id, 'low');
  const base = { ...s.room, path: [], status: 'running' };
  const full = stepSurvival(
    { ...base, player: { ...base.player, food: 100 } },
    { x: 1 },
    { combat: false, waves: false, needs: false },
  );
  const empty = stepSurvival(
    { ...base, player: { ...base.player, food: 0 } },
    { x: 1 },
    { combat: false, waves: false, needs: false },
  );
  assert.ok(
    Math.abs(
      (full.player.x - base.player.x) / 2 - (empty.player.x - base.player.x),
    ) < 1e-8,
  );
});

test('new floor 2 halves area, has connected routes, low walls block movement but permit sight', () => {
  const r = maintenanceRoom(),
    b = r.world.bounds;
  assert.equal(
    (b.maxX - b.minX) * (b.maxZ - b.minZ),
    (ROOM.width * ROOM.depth) / 2,
  );
  assert.equal(walkable({ x: b.minX - 1, z: 50 }, 0.4, r.world), false);
  for (const point of Object.values(MAINTENANCE_POINTS))
    assert.ok(pathTo(ELEVATOR, point, r.world).length, JSON.stringify(point));
  const wall = r.world.obstacles.find((o) => o.type === 'low-wall');
  const world = { ...r.world, obstacles: [wall] };
  const a = { x: wall.x, z: wall.z - 2 },
    c = { x: wall.x, z: wall.z + 2 };
  assert.equal(clearSight(a, c, world), true);
  assert.equal(clearSight(a, c, world, 0.4, true), false);
  assert.equal(walkable(wall, 0.4, world), false);
  const route = pathTo(a, c, world);
  assert.ok(route.length > 2);
  for (let i = 1; i < route.length; i++)
    assert.ok(clearSight(route[i - 1], route[i], world, 0.4, true));
});

test('drag exchanges are atomic across grids; incompatible sizes or multiple occupants reject without loss', () => {
  const r = createGMCheckpoint('after:equip-module').room;
  const mod = r.bag.find((i) => i.kind === 'capacitor');
  const phone = r.equipment.find((e) => e.item.kind === 'phone');
  const before = structuredClone(r);
  let n = survivalAction(r, {
    type: 'transfer',
    uid: mod.uid,
    zone: 'equipment',
    slot: phone.slot,
  });
  assert.equal(
    n.equipment.find((e) => e.slot === phone.slot).item.uid,
    mod.uid,
  );
  assert.equal(n.bag.find((i) => i.uid === phone.item.uid).slot, mod.slot);
  assert.deepEqual(r, before);
  n = survivalAction(n, {
    type: 'transfer',
    uid: phone.item.uid,
    zone: 'equipment',
    slot: phone.slot,
  });
  assert.equal(n.bag.find((i) => i.uid === mod.uid).slot, mod.slot);
  const water = r.bag.find((i) => i.kind === 'water');
  assert.equal(
    survivalAction(r, {
      type: 'transfer',
      uid: water.uid,
      zone: 'equipment',
      slot: 0,
    }),
    r,
  );
  const light = r.equipment.find((e) => e.item.kind === 'flashlight');
  const safe = survivalAction(r, {
    type: 'transfer',
    uid: light.item.uid,
    zone: 'safe',
    slot: 0,
  });
  assert.equal(safe, r);
  // A one-cell backpack swap preserves exact source coordinates and identities.
  n = survivalAction(r, {
    type: 'transfer',
    uid: mod.uid,
    zone: 'bag',
    slot: water.slot,
  });
  assert.equal(n.bag.find((i) => i.uid === mod.uid).slot, water.slot);
  assert.equal(n.bag.find((i) => i.uid === water.uid).slot, mod.slot);
  assert.equal(
    new Set(
      [...n.bag, ...n.safe, ...n.equipment.map((e) => e.item)].map(
        (i) => i.uid,
      ),
    ).size,
    n.bag.length + n.safe.length + n.equipment.length,
  );
});

test('cabinet module stays in bag; return receipt waits indefinitely, then equipment lesson requires real adjacency', () => {
  const field = createGMCheckpoint('field:module');
  assert.equal(field.afterlight.waterFound, true);
  assert.equal(
    field.room.equipment.some((e) => e.item.kind === 'capacitor'),
    false,
  );
  assert.ok(field.room.bag.some((i) => i.kind === 'capacitor'));
  let s = createGMCheckpoint('after:report');
  for (let i = 0; i < 600; i++) s = stepOpening(s);
  assert.equal(s.afterlight.phase, 'report');
  s = openingAction(s, { type: 'confirm-report' });
  assert.equal(s.afterlight.phase, 'equip-module');
  const mod = s.room.bag.find((i) => i.kind === 'capacitor');
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'transfer', uid: mod.uid, zone: 'equipment', slot: 8 },
  });
  assert.equal(stepOpening(s).afterlight.phase, 'equip-module');
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'transfer', uid: mod.uid, zone: 'equipment', slot: 3 },
  });
  assert.equal(stepOpening(s).afterlight.phase, 'upgrade-goal');
});

test('spirit depletion forces return, drops only ordinary cargo, retains gear/safe and leaves recoverable progression', () => {
  const s = createGMCheckpoint('field:module');
  s.guidance = {
    ...s.guidance,
    active: null,
    seen: ['spirit', 'low', 'needs'],
  };
  const safe = s.room.bag.find((i) => i.kind === 'lift-material');
  s.room = survivalAction(s.room, { type: 'protect', uid: safe.uid });
  s.room.player.hp = 0.01;
  s.room.player.food = 0;
  const before = structuredClone(s),
    collapsed = stepOpening(s);
  assert.equal(collapsed.stage, 'collapse');
  let n = collapsed;
  for (let i = 0; i < 145; i++) n = stepOpening(n);
  assert.equal(n.stage, 'home');
  assert.equal(n.afterlight.phase, 'report');
  assert.equal(n.afterlight.failedReturn, true);
  assert.equal(n.room.bag.length, 0);
  assert.deepEqual(n.room.equipment, before.room.equipment);
  assert.deepEqual(n.room.safe, before.room.safe);
  assert.deepEqual(
    n.room.lost.map((i) => i.uid).sort(),
    before.room.bag.map((i) => i.uid).sort(),
  );
  assert.ok(
    n.room.caches.some(
      (c) =>
        c.id.startsWith('lost-backpack-') &&
        c.contents.some((i) => i.kind === 'capacitor'),
    ),
  );
  assert.deepEqual(s, before);
  assert.ok(readOpeningCheckpoint(JSON.stringify(n)));
});

test('upgrade payment is all-or-nothing; ascent confirmation leads to floor 3 and permanently blocks lower floors', () => {
  const s = createGMCheckpoint('after:upgrade-goal');
  assert.equal(openingAction(s, { type: 'upgrade-lift' }), s);
  s.room.bag = ASCENT_COST.flatMap((c) =>
    Array.from({ length: c.kind === 'lift-material' ? c.count / 5 : c.count }, (_, i) => ({
      ...ITEMS[c.kind],
      uid: `cost-${c.kind}-${i}`,
    })),
  );
  const n = openingAction(s, { type: 'upgrade-lift' });
  assert.equal(n.room.bag.length, 0);
  assert.equal(n.room.liftLevel, 2);
  assert.equal(s.room.bag.length, 8);
  assert.equal(openingAction(n, { type: 'upgrade-lift' }), n);
  let ask = openingAction(openingAction(n, { type: 'open-door' }), {
    type: 'choose-floor',
    floor: 3,
  });
  assert.equal(ask.guidance.active.id, 'ascent');
  assert.equal(ask.stage, 'home');
  ask = openingAction(ask, { type: 'ack-guide' });
  assert.equal(ask.room.floor, 3);
  assert.equal(ask.room.world.theme, 'pavilion');
  assert.equal(ask.lift.highestFloor, 3);
  const home = {
    ...ask,
    stage: 'home',
    homecoming: { ...ask.homecoming, scene: 'complete' },
    afterlight: { ...ask.afterlight, phase: 'ascend' },
    lift: { ...ask.lift, choosingFloor: true },
    room: { ...ask.room, status: 'extracted' },
  };
  assert.equal(openingAction(home, { type: 'choose-floor', floor: 2 }), home);
  assert.ok(readOpeningCheckpoint(JSON.stringify(home)));
});

test('hits carry signed actual damage and a per-enemy flash tick', () => {
  const r = createGMCheckpoint('field:expedition').room;
  r.enemies = [
    {
      id: 'hit-target',
      kind: 'crawler',
      x: r.player.x + 0.5,
      z: r.player.z,
      hp: 100,
      maxHp: 100,
      awake: true,
      nextAttack: 0,
      hitAt: -100,
      windup: 0,
      aim: null,
    },
  ];
  r.player.hurtUntil = 0;
  r.cooldowns = {};
  const next = stepSurvival(r, {}, { waves: false, needs: false });
  assert.ok(next.effects.some((e) => e.kind === 'hit' && e.amount < 0));
  assert.ok(next.effects.some((e) => e.kind === 'hit' && e.amount > 0));
  assert.equal(next.enemies[0].hitAt, next.tick);
});

test('spirit loss in the very first battle also returns to the lift and permits recovering tutorial supplies', () => {
  let s = createGMCheckpoint('guide:spirit');
  s = openingAction(s, { type: 'ack-guide' });
  s.room.player.hp = 0.01;
  s.room.player.hurtUntil = 0;
  s.room.enemies = [
    {
      ...s.room.enemies[0],
      x: s.room.player.x + 0.5,
      z: s.room.player.z,
      nextAttack: 0,
    },
  ];
  s = stepOpening(s);
  assert.equal(s.stage, 'collapse');
  for (let i = 0; i < 145; i++) s = stepOpening(s);
  assert.equal(s.stage, 'home');
  assert.equal(s.afterlight.phase, 'recover-opening');
  assert.equal(s.room.bag.length, 0);
  assert.equal(s.room.equipment.length, 2);
  assert.ok(readOpeningCheckpoint(JSON.stringify(s)));
  const recovery = s.room.caches.find((c) => c.id.startsWith('lost-backpack-'));
  assert.ok(recovery.contents.some((i) => i.kind === 'energy-core'));
  s = openingAction(s, { type: 'open-door' });
  for (let i = 0; i < 150 && s.stage === 'second-departing'; i++)
    s = stepOpening(s);
  assert.equal(s.stage, 'return');
  s = openingAction(s, { type: 'move', to: recovery });
  for (
    let i = 0;
    i < 600 && !s.room.caches.find((c) => c.id === recovery.id).opened;
    i++
  )
    s = stepOpening(s);
  assert.ok(s.room.bag.some((i) => i.kind === 'energy-core'));
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  for (let i = 0; i < 600 && s.stage !== 'home'; i++) s = stepOpening(s);
  assert.equal(s.stage, 'home');
  assert.equal(s.afterlight.phase, 'dormant');
});
