import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gardenManifest,
  gardenWorld,
  gardenObstacles,
  pavilionRoom,
  validGardenManifest,
} from './survival-pavilion.ts';
import { ELEVATOR, walkable, clearSight } from './survival-world.ts';
import { pathTo } from './survival-room.ts';
import { dunesRoom } from './survival-ascent.ts';
import { createGMCheckpoint } from './survival-gm.ts';
import { openingAction, stepOpening } from './survival-opening.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';

test('garden pack serializes a stable manifest; colour and decor variants retain navigation and identity', () => {
  const rain = gardenManifest();
  assert.deepEqual(gardenManifest(), rain);
  assert.ok(validGardenManifest(rain));
  for (const mood of ['feast', 'relic']) {
    const variant = gardenManifest(92623, mood);
    assert.deepEqual(variant.instances, rain.instances);
    assert.deepEqual(gardenObstacles(variant), gardenObstacles(rain));
    assert.equal(variant.mood, mood);
  }
  assert.notEqual(gardenManifest(92624).instances[0].id, rain.instances[0].id);
});

test('garden loot, entrances, boss and emergency supply position are reachable from the elevator', () => {
  const room = pavilionRoom();
  for (const point of [
    ...room.caches,
    ...room.world.gates,
    room.enemies[0],
    { x: 48.5, z: 65 },
    { x: 48.5, z: 54 },
  ]) {
    assert.ok(walkable(point, 0.42, room.world), JSON.stringify(point));
    const path = pathTo(ELEVATOR, point, room.world);
    assert.ok(path.length > 0, `unreachable ${JSON.stringify(point)}`);
    assert.equal(path.at(-1).x, point.x);
    assert.equal(path.at(-1).z, point.z);
    assert.ok(pathTo(point, ELEVATOR, room.world).length > 0);
  }
});

test('moon gate permits the central passage while plaster panels and the pond block walking', () => {
  const world = gardenWorld();
  assert.ok(
    clearSight({ x: 48.5, z: 68 }, { x: 48.5, z: 62 }, world, 0.42, true),
  );
  assert.equal(walkable({ x: 44, z: 65.5 }, 0.42, world), false);
  assert.equal(walkable({ x: 60, z: 56 }, 0.42, world), false);
  assert.ok(clearSight({ x: 58, z: 56 }, { x: 63, z: 56 }, world));
  assert.equal(walkable({ x: 73.5, z: 60 }, 0.42, world), false);
});

test('new third floor saves keep their manifest and replay identically; damaged manifests are rejected', () => {
  const s = createGMCheckpoint('guide:floor3');
  assert.equal(s.room.world.theme, 'pavilion');
  assert.deepEqual(s.room.world.garden, gardenManifest());
  const saved = readOpeningCheckpoint(JSON.stringify(s));
  assert.deepEqual(saved, s);
  assert.deepEqual(stepOpening(saved), stepOpening(s));
  for (const mutate of [
    (m) => {
      m.mood = 'unknown';
    },
    (m) => {
      m.version = 3;
    },
    (m) => {
      m.instances[0].w = -5;
    },
    (m) => {
      m.instances[1].id = m.instances[0].id;
    },
  ]) {
    const invalid = structuredClone(s);
    mutate(invalid.room.world.garden);
    assert.equal(readOpeningCheckpoint(JSON.stringify(invalid)), null);
  }
});

test('returning to an already visited third floor retains its original dune snapshot and searched caches', () => {
  const s = createGMCheckpoint('guide:floor3');
  s.stage = 'home';
  s.homecoming.scene = 'complete';
  s.afterlight.phase = 'ascend';
  s.lift.choosingFloor = true;
  const old = dunesRoom();
  old.liftLevel = 2;
  old.caches[0].searched = true;
  s.room = { ...old, status: 'extracted' };
  const saved = readOpeningCheckpoint(JSON.stringify(s));
  assert.ok(saved);
  const resumed = openingAction(saved, { type: 'choose-floor', floor: 3 });
  assert.equal(resumed.room.world.theme, 'dunes');
  assert.deepEqual(resumed.room.world, old.world);
  assert.equal(resumed.room.caches[0].searched, true);
});
