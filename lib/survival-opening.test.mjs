import { countKind } from './survival-stacks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpening,
  openingAction,
  stepOpening as simulateOpening,
  LIGHT_POINT,
  BOX_POINT,
  OPENING_BOUNDS,
} from './survival-opening.ts';
import { ELEVATOR, stepSurvival, createSurvival } from './survival-room.ts';
import { walkable } from './survival-world.ts';

const stepOpening = (s, input) =>
  simulateOpening(
    s.guidance.active ? openingAction(s, { type: 'ack-guide' }) : s,
    input,
  );
function until(s, predicate, limit = 1800) {
  for (let i = 0; i < limit && !predicate(s); i++) s = stepOpening(s);
  assert.ok(predicate(s), `stuck at ${s.stage}`);
  return s;
}
function toDoor() {
  return until(
    openingAction(createOpening(), { type: 'enter' }),
    (s) => s.stage === 'door',
  );
}
function toBox() {
  let s = until(
    openingAction(toDoor(), { type: 'open-door' }),
    (s) => s.stage === 'find-light',
  );
  s = until(
    openingAction(s, { type: 'move', to: LIGHT_POINT }),
    (s) => s.stage === 'equip-light',
  );
  assert.equal(
    s.room.bag.find((i) => i.kind === 'flashlight')?.uid,
    'opening-light-item',
  );
  assert.equal(s.room.equipment.length, 1);
  s = openingAction(s, { type: 'equip-light' });
  assert.equal(s.room.equipment.length, 2);
  return until(
    openingAction(s, { type: 'move', to: BOX_POINT }),
    (s) => s.stage === 'edge',
  );
}
const spawn = (s) =>
  openingAction(s, {
    type: 'edge-spawns',
    points: [
      { x: s.room.player.x - 13, z: s.room.player.z },
      { x: s.room.player.x + 13, z: s.room.player.z - 1 },
      { x: s.room.player.x, z: s.room.player.z - 13 },
    ],
  });

test('opening follows the authored order and blocks early door, crate and attacks', () => {
  const start = createOpening();
  assert.equal(openingAction(start, { type: 'open-door' }), start);
  let s = openingAction(start, { type: 'enter' });
  const stages = [];
  for (let i = 0; i < 600; i++) {
    if (stages.at(-1) !== s.stage) stages.push(s.stage);
    s = stepOpening(s);
  }
  assert.deepEqual(stages, [
    'eyes',
    'where',
    'phone',
    'put-away',
    'door-thought',
    'door',
  ]);
  assert.equal(s.room.tick, 0);
  s = until(
    openingAction(s, { type: 'open-door' }),
    (s) => s.stage === 'find-light',
  );
  s = openingAction(s, { type: 'move', to: BOX_POINT });
  for (let i = 0; i < 250; i++) s = stepOpening(s);
  assert.equal(s.room.caches.find((c) => c.id === 'opening-box').opened, false);
  assert.equal(s.room.enemies.length, 0);
  assert.equal(s.room.effects.filter((e) => e.kind.endsWith('beam')).length, 0);
});
test('three real creatures reveal both beam weapons and drop stable, one-time materials', () => {
  let s = toBox();
  assert.deepEqual(
    s.room.bag.map((i) => i.kind),
    ['energy-core'],
  );
  assert.equal(
    openingAction(s, { type: 'edge-spawns', points: [{ x: NaN, z: 0 }] }),
    s,
  );
  s = spawn(s);
  assert.equal(s.room.enemies.length, 3);
  assert.equal(spawn(s), s);
  const seen = new Set();
  for (let i = 0; i < 1200 && s.stage !== 'aftermath'; i++) {
    s = stepOpening(s);
    for (const e of s.room.effects) seen.add(e.kind);
  }
  assert.equal(s.stage, 'aftermath');
  assert.equal(s.room.kills, 3);
  assert.ok(seen.has('phone-beam') && seen.has('torch-beam'));
  assert.equal(s.exclaimed, true);
  assert.equal(
    countKind([...s.room.bag, ...s.room.caches.flatMap((c) => c.contents)], 'lift-material'),
    3,
  );
  const ids = s.room.caches.flatMap((c) => c.contents.map((i) => i.uid));
  assert.equal(new Set(ids).size, ids.length);
  for (let i = 0; i < 120; i++) s = stepOpening(s);
  assert.equal(
    countKind([...s.room.bag, ...s.room.caches.flatMap((c) => c.contents)], 'lift-material'),
    3,
  );
});
test('natural collection and return preserve both weapons and all three materials', () => {
  let s = until(spawn(toBox()), (s) => s.stage === 'aftermath');
  for (const c of s.room.caches.filter(
    (c) => c.item.kind === 'lift-material',
  )) {
    s = until(
      openingAction(s, { type: 'move', to: { x: c.x, z: c.z } }),
      (next) => !next.room.caches.some((n) => n.id === c.id && !n.opened),
    );
  }
  s = until(
    openingAction(s, { type: 'move', to: ELEVATOR }),
    (s) => s.stage === 'home',
  );
  assert.equal(s.room.status, 'extracted');
  assert.equal(s.room.equipment.length, 2);
  assert.equal(countKind(s.room.bag, 'lift-material'), 3);
  assert.equal(openingAction(s, { type: 'open-door' }).stage, 'home');
  assert.deepEqual(stepOpening(s).room.bag, s.room.bag);
});
test('opening serialization resumes identically through encounter and collection', () => {
  let a = spawn(toBox()),
    b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 700; i++) {
    a = stepOpening(a);
    b = stepOpening(b);
  }
  assert.deepEqual(a, b);
});
test('default room still uses its ordinary loadout and authored opening disables needs only locally', () => {
  const ordinary = createSurvival();
  assert.deepEqual(
    ordinary.equipment.map((e) => e.item.kind),
    ['nail', 'capacitor'],
  );
  const s = toBox();
  const needs = {
    water: s.room.player.water,
    food: s.room.player.food,
    energy: s.room.player.energy,
  };
  assert.deepEqual(needs, { water: 100, food: 100, energy: 100 });
  const standard = stepSurvival({
    ...ordinary,
    status: 'running',
    leftLift: true,
  });
  assert.ok(standard.player.water < 100);
});
test('small clearing blocks escape and the sound cue keeps the encounter anchored at the box', () => {
  const s = toBox();
  const outside = { x: OPENING_BOUNDS.minX - 1, z: BOX_POINT.z };
  assert.equal(walkable(outside, 0.4, s.room.world), false);
  assert.equal(openingAction(s, { type: 'move', to: ELEVATOR }), s);
  let next = s;
  for (let i = 0; i < 60; i++) next = stepOpening(next, { x: 1, z: -1 });
  assert.deepEqual(next.room.player, s.room.player);
  assert.equal(next.stage, 'edge');
});
