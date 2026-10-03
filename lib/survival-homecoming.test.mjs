import { countKind } from './survival-stacks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomecomingRehearsal } from './survival-rehearsal.ts';
import {
  openingAction,
  stepOpening,
  openingSettlement,
} from './survival-opening.ts';
import { homecomingCamera } from './survival-homecoming-camera.ts';
import { ELEVATOR } from './survival-room.ts';
import { returnPath } from './survival-return-path.ts';
import { walkable } from './survival-world.ts';

test('first room produces real settlement; the authored homecoming pauses at the mouth with a five-second flicker and two-second silence', () => {
  let s = createHomecomingRehearsal();
  assert.deepEqual(
    openingSettlement(s).map((r) => [r.kind, r.count]),
    [
      ['flashlight', 1],
      ['lift-material', 3],
      ['energy-core', 1],
    ],
  );
  assert.equal(
    s.room.bag.find((i) => i.kind === 'energy-core').uid,
    'opening-box-item',
  );
  assert.equal(s.room.kills, 3);
  const order = [],
    counts = {};
  for (let i = 0; i < 3000 && s.homecoming.scene !== 'mouth'; i++) {
    const scene = s.homecoming.scene;
    if (order.at(-1) !== scene) order.push(scene);
    counts[scene] = (counts[scene] || 0) + 1;
    assert.equal(openingAction(s, { type: 'open-door' }), s);
    assert.equal(
      openingAction(s, { type: 'feed-core', uid: 'opening-box-item' }),
      s,
    );
    assert.equal(s.room.liftLevel || 0, 0);
    s = stepOpening(s, { x: 1, z: 1 });
  }
  assert.deepEqual(order, [
    'rest',
    'look-right',
    'look-left',
    'flicker',
    'blackout',
    'approach',
    'scare',
    'plead',
    'welcome',
    'logo',
    'ai-thought',
    'warning',
    'silence',
    'threat',
    'ellipsis',
    'settlement',
    'request',
  ]);
  assert.equal(counts.flicker, 150);
  assert.equal(counts.silence, 60);
  assert.equal(s.homecoming.scene, 'mouth');
  for (let i = 0; i < 400; i++) s = stepOpening(s);
  assert.equal(s.homecoming.scene, 'mouth');
  assert.deepEqual(s.room.player, createHomecomingRehearsal().room.player);
});
test('feeding validates ownership and type atomically; consumes one core, retains materials, turns on the lamp only after thanks, and carries inventory onward', () => {
  let s = createHomecomingRehearsal();
  while (s.homecoming.scene !== 'mouth') s = stepOpening(s);
  s = openingAction(s, { type: 'open-mouth' });
  const before = JSON.stringify(s);
  for (const uid of [
    'missing',
    s.room.bag.find((i) => i.kind === 'lift-material').uid,
    'opening-phone',
  ])
    assert.equal(openingAction(s, { type: 'feed-core', uid }), s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(
    openingAction(s, {
      type: 'inventory',
      action: { type: 'discard', uid: 'opening-box-item' },
    }),
    s,
  );
  s = openingAction(s, { type: 'close-mouth' });
  assert.equal(s.homecoming.scene, 'mouth');
  s = openingAction(s, { type: 'open-mouth' });
  s = openingAction(s, { type: 'feed-core', uid: 'opening-box-item' });
  assert.equal(countKind(s.room.bag, 'lift-material'), 3);
  assert.equal(s.room.liftLevel, 0);
  assert.equal(s.homecoming.fedUid, 'opening-box-item');
  assert.equal(
    openingAction(s, { type: 'feed-core', uid: 'opening-box-item' }),
    s,
  );
  let copy = JSON.parse(JSON.stringify(s));
  while (s.homecoming.scene !== 'lights') {
    assert.equal(s.room.liftLevel, s.homecoming.scene === 'thanks' ? 1 : 0);
    assert.equal(s.room.liftLightOn, false);
    s = stepOpening(s);
    copy = stepOpening(copy);
    assert.deepEqual(s, copy);
  }
  assert.equal(s.room.liftLevel, 1);
  assert.equal(s.room.liftLightOn, true);
  while (s.homecoming.scene !== 'complete') s = stepOpening(s);
  while (s.afterlight.phase !== 'safe') s = stepOpening(s);
  s = openingAction(s, { type: 'skip-safe' });
  for (let i = 0; i < 400 && s.afterlight.phase !== 'eat-food'; i++)
    s = stepOpening(s);
  assert.equal(s.afterlight.phase, 'eat-food');
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
  const next = openingAction(openingAction(s, { type: 'open-door' }), {
    type: 'choose-floor',
    floor: 2,
  });
  assert.equal(next.stage, 'second-departing');
  assert.equal(next.room.liftLevel, 1);
  assert.deepEqual(next.room.bag, s.room.bag);
  assert.deepEqual(next.room.equipment, s.room.equipment);
});
test('cinematic positions stay inside the cabin and reduced motion suppresses recoil shake; return path stays walkable', () => {
  for (const scene of [
    'rest',
    'look-right',
    'look-left',
    'flicker',
    'approach',
    'scare',
    'plead',
    'welcome',
    'lights',
  ])
    for (let t = 0; t < 180; t += 0.25) {
      const p = homecomingCamera(scene, t);
      assert.ok(
        Math.abs(p.x) < 0.3 && Math.abs(p.z) < 0.5 && p.y > 1.4 && p.y < 1.8,
      );
      assert.equal(homecomingCamera(scene, t, true).roll, 0);
    }
  const s = createHomecomingRehearsal(),
    p = { x: 51, z: 61 };
  const path = returnPath(p, s.room.world);
  assert.ok(path.length > 0);
  assert.deepEqual(path.at(-1), ELEVATOR);
  assert.ok(path.every((p) => walkable(p, 0.18, s.room.world)));
});
