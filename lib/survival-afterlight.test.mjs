import test from 'node:test';
import assert from 'node:assert/strict';
import { createAfterlightRehearsal } from './survival-rehearsal.ts';
import { stepOpening, openingAction } from './survival-opening.ts';
import {
  twoSidedAmplifier,
  afterlightSettlement,
  MAINTENANCE_POINTS,
} from './survival-afterlight.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';
import { ITEMS, ELEVATOR, weaponStats } from './survival-room.ts';
const until = (s, fn, limit = 4000) => {
  for (let i = 0; i < limit && !fn(s); i++) s = stepOpening(s);
  assert.ok(fn(s), `${s.stage}/${s.afterlight.phase}/${s.room.status}`);
  return s;
};
const ready = () => {
  let s = until(
    createAfterlightRehearsal(),
    (s) => s.afterlight.phase === 'safe',
  );
  s = openingAction(s, { type: 'skip-safe' });
  s = until(s, (s) => s.afterlight.phase === 'eat-food');
  return openingAction(s, {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
};
test('18–23 preserve first-room items and offer either real protection or explicit skip', () => {
  let s = createAfterlightRehearsal();
  assert.equal(s.room.liftLightOn, true);
  assert.equal(openingAction(s, { type: 'open-door' }), s);
  s = until(s, (s) => s.afterlight.phase === 'safe');
  const id = s.room.bag[0].uid;
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'protect', uid: id },
  });
  s = stepOpening(s);
  assert.equal(s.afterlight.safeChoice, 'protected');
  assert.equal(s.room.safe[0].uid, id);
  const copy = readOpeningCheckpoint(JSON.stringify(s));
  assert.deepEqual(stepOpening(copy), stepOpening(s));
  assert.equal(ready().afterlight.safeChoice, 'skipped');
});
test('maintenance cabinet grants real water and one module, allowing any valid bilateral arrangement', () => {
  let s = until(
    openingAction(openingAction(ready(), { type: 'open-door' }), {
      type: 'choose-floor',
      floor: 2,
    }),
    (s) => s.stage === 'expedition',
  );
  s = openingAction(s, { type: 'move', to: MAINTENANCE_POINTS.cabinet });
  s = until(s, (s) => s.room.caches.find((c) => c.id === 'cabinet').opened);
  assert.equal(
    s.afterlight.collected.filter((i) => i.kind === 'water').length,
    1,
  );
  assert.equal(s.afterlight.moduleSeen, true);
  assert.equal(s.afterlight.linked, false);
  const phone = s.room.equipment.find((e) => e.item.kind === 'phone'),
    light = s.room.equipment.find((e) => e.item.kind === 'flashlight'),
    mod = { item: s.room.bag.find((i) => i.kind === 'capacitor') };
  assert.equal(
    s.room.equipment.some((e) => e.item.kind === 'capacitor'),
    false,
  );
  for (const [e, slot] of [
    [light, 6],
    [mod, 5],
    [phone, 4],
  ])
    s = openingAction(s, {
      type: 'inventory',
      action: { type: 'equip', uid: e.item.uid, slot },
    });
  s = stepOpening(s);
  assert.equal(twoSidedAmplifier(s.room), true);
  assert.equal(s.afterlight.linked, true);
  assert.equal(
    weaponStats(
      s.room,
      s.room.equipment.find((e) => e.item.kind === 'phone'),
    ).damage,
    16,
  );
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'equip', uid: phone.item.uid, slot: 0 },
  });
  assert.equal(twoSidedAmplifier(s.room), false);
});
test('early extraction preserves floor identities, opened caches and fog, and unlocks honest report and previews', () => {
  let s = until(
    openingAction(openingAction(ready(), { type: 'open-door' }), {
      type: 'choose-floor',
      floor: 2,
    }),
    (s) => s.stage === 'expedition',
  );
  s = openingAction(s, { type: 'move', to: MAINTENANCE_POINTS.loose });
  s = until(s, (s) => s.room.caches.find((c) => c.id === 'loose').opened);
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = until(s, (s) => s.stage === 'home');
  assert.equal(s.afterlight.phase, 'report');
  assert.equal(
    afterlightSettlement(s.afterlight, s.room).filter(
      (i) => i.location === '带回',
    ).length,
    1,
  );
  const ids = s.room.caches.flatMap((c) => c.contents.map((i) => i.uid));
  const explored = s.room.fog.explored;
  for (let i = 0; i < 400; i++) s = stepOpening(s);
  assert.equal(s.afterlight.phase, 'report');
  s = openingAction(s, { type: 'confirm-report' });
  assert.equal(s.afterlight.phase, 'upgrade-goal');
  const before = s.room.bag;
  s = openingAction(s, { type: 'finish-tutorial' });
  assert.deepEqual(s.room.bag, before);
  s = openingAction(s, { type: 'open-door' });
  s = openingAction(s, { type: 'choose-floor', floor: 2 });
  assert.deepEqual(
    s.room.caches.flatMap((c) => c.contents.map((i) => i.uid)),
    ids,
  );
  assert.ok(s.room.caches.find((c) => c.id === 'loose').opened);
  assert.ok(s.room.fog.explored.every((v, i) => v >= explored[i]));
});
test('real manual water consumption is classified as used; protected stock is retained', () => {
  let s = until(
    openingAction(openingAction(ready(), { type: 'open-door' }), {
      type: 'choose-floor',
      floor: 2,
    }),
    (s) => s.stage === 'expedition',
  );
  const water = { ...ITEMS.water, uid: 'test-water' };
  s = {
    ...s,
    afterlight: { ...s.afterlight, collected: [water] },
    room: { ...s.room, bag: [water], player: { ...s.room.player, water: 35 } },
  };
  s = stepOpening(s);
  assert.equal(s.afterlight.used.length, 0);
  s = openingAction(s, { type: 'ack-guide' });
  s = openingAction(s, { type: 'inventory', action: { type: 'consume', uid: water.uid } });
  assert.equal(s.afterlight.used[0].uid, water.uid);
  assert.equal(
    afterlightSettlement(s.afterlight, s.room)[0].location,
    '途中使用',
  );
  const broken = JSON.parse(JSON.stringify(s));
  broken.room.safe = [{ ...s.room.equipment[0].item }];
  assert.equal(readOpeningCheckpoint(JSON.stringify(broken)), null);
  assert.equal(readOpeningCheckpoint('{broken'), null);
});
