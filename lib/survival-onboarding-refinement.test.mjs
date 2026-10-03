import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpening } from './survival-opening.ts';
import {
  createSurvival,
  survivalAction,
  stepSurvival,
  ITEMS,
  ELEVATOR,
} from './survival-room.ts';
import { visionRange, isVisible, walkable } from './survival-world.ts';
import {
  presentationFrame,
  presentationPose,
  retargetPresentation,
} from './survival-presentation.ts';
import { PerspectiveCamera, Vector3 } from 'three';
import { packBag } from './survival-cargo.ts';

const item = (kind, uid) => ({ ...ITEMS[kind], uid });
test('opening fog starts unexplored; equipped flashlight adds exactly 2m and safe storage disables it', () => {
  const s = createOpening();
  assert.equal(visionRange(s.room), 8);
  assert.ok(s.room.fog.explored.reduce((a, b) => a + b, 0) < 250);
  const point = { x: ELEVATOR.x + 9, z: ELEVATOR.z - 1 };
  let room = {
    ...s.room,
    status: 'running',
    bag: packBag([item('flashlight', 'test-torch')]),
  };
  assert.equal(isVisible(room, point), false);
  room = survivalAction(room, { type: 'equip', uid: 'test-torch', slot: 1 });
  assert.equal(visionRange(room), 10);
  assert.equal(isVisible(room, point), true);
  room = survivalAction(room, { type: 'unequip', uid: 'test-torch' });
  assert.equal(visionRange(room), 8);
  assert.equal(isVisible(room, point), false);
  assert.equal(
    room.fog.explored[Math.floor(point.z) * 96 + Math.floor(point.x)],
    1,
  );
  assert.equal(walkable({ x: 30, z: 60 }, 0.4, room.world), false);
});
test('touch materials collect during movement/combat, emit one receipt each, and never vanish into a full bag', () => {
  const base = createOpening().room;
  const loot = item('lift-material', 'touch-x');
  const c = {
    id: 'drop-x',
    x: 48.5,
    z: 70,
    item: loot,
    contents: [loot],
    container: 'loose',
    pickup: 'touch',
    searched: false,
    opened: false,
    available: 0,
  };
  const state = {
    ...base,
    status: 'running',
    player: { ...base.player, x: 48.5, z: 70 },
    caches: [c],
  };
  const next = stepSurvival(
    state,
    { x: 1 },
    { search: false, combat: false, waves: false },
  );
  assert.equal(next.caches[0].opened, true);
  assert.equal(next.searchTicks, 0);
  assert.deepEqual(
    next.effects.filter((e) => e.kind === 'pickup').map((e) => e.itemUid),
    ['touch-x'],
  );
  assert.equal(state.caches[0].contents.length, 1);
  const full = {
    ...state,
    bag: packBag(
      Array.from({ length: 16 }, (_, i) => item('water', `water-${i}`)),
    ),
  };
  const rejected = stepSurvival(
    full,
    { x: 1 },
    { search: false, waves: false },
  );
  assert.equal(rejected.caches[0].contents[0].uid, 'touch-x');
  assert.equal(
    rejected.effects.some((e) => e.kind === 'pickup'),
    false,
  );
  assert.equal(
    stepSurvival(next, {}, { waves: false }).effects.filter(
      (e) => e.kind === 'pickup',
    ).length,
    1,
  );
});
test('multi-item crate emits separate receipts only for actually transferred items', () => {
  const s = createOpening().room;
  const c = s.caches[1];
  let state = {
    ...s,
    status: 'running',
    player: { ...s.player, x: c.x, z: c.z },
    caches: [
      {
        ...c,
        available: 0,
        contents: [item('water', 'test-water'), item('food', 'test-food')],
      },
    ],
  };
  for (let i = 0; i < 90; i++)
    state = stepSurvival(state, {}, { waves: false, combat: false });
  assert.deepEqual(
    state.effects.filter((e) => e.kind === 'pickup').map((e) => e.label),
    ['净水瓶', '压缩口粮'],
  );
  assert.equal(
    new Set(
      state.effects.filter((e) => e.kind === 'pickup').map((e) => e.stack),
    ).size,
    2,
  );
});
test('presentation interpolates uniform motion at display rate and never changes authoritative positions', () => {
  const before = createSurvival(),
    after = structuredClone(before);
  after.tick++;
  after.player.x += 3.8 / 30;
  before.player.facing = Math.PI - 0.1;
  after.player.facing = -Math.PI + 0.1;
  const frame = { ...presentationFrame(after), previous: before, alpha: 0.5 };
  const pose = presentationPose(frame);
  assert.ok(Math.abs(pose.player.x - (before.player.x + 3.8 / 60)) < 1e-9);
  assert.ok(Math.abs(pose.player.facing - Math.PI) < 1e-9);
  assert.equal(after.player.x, before.player.x + 3.8 / 30);
  frame.current = { ...after, seed: before.seed + 1 };
  assert.equal(presentationPose(frame).player.x, after.player.x);
});
test('camera and character label share one pose at 60/144Hz, including between-tick path commands', () => {
  const first = createSurvival(),
    next = structuredClone(first);
  next.tick++;
  next.player.x += 3.8 / 30;
  const camera = new PerspectiveCamera(38, 16 / 9, 0.025, 180);
  for (const hz of [60, 144]) {
    let anchor;
    for (let sample = 0; sample <= hz; sample++) {
      const frame = { previous: first, current: next, alpha: sample / hz };
      const current = retargetPresentation(frame, {
        ...next,
        path: [{ x: 49, z: 70 }],
      });
      assert.equal(current.alpha, frame.alpha);
      const p = presentationPose(current).player;
      camera.position.set(p.x, 14, p.z + 9.8);
      camera.lookAt(p.x, 0, p.z - 2.2);
      camera.updateMatrixWorld();
      const point = new Vector3(p.x, 2.2, p.z).project(camera);
      anchor ??= point;
      assert.ok(
        point.distanceTo(anchor) < 1e-9,
        'stationary screen anchor must not acquire 30Hz judder',
      );
    }
  }
});
