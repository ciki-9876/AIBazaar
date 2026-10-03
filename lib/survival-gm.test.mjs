import test from 'node:test';
import assert from 'node:assert/strict';
import { GM_STAGES, createGMCheckpoint } from './survival-gm.ts';
import { openingAction, stepOpening } from './survival-opening.ts';
import { readOpeningCheckpoint } from './survival-checkpoint.ts';
import { ITEMS } from './survival-room.ts';

const steps = (s, n) => {
  for (let i = 0; i < n; i++) s = stepOpening(s);
  return s;
};
const consume = (s) =>
  openingAction(s, {
    type: 'inventory',
    action: { type: 'consume', uid: 'anbo-welcome-bread' },
  });
test('every GM stage has a description, a valid isolated checkpoint, and deterministic continuation', () => {
  assert.equal(new Set(GM_STAGES.map((s) => s.id)).size, GM_STAGES.length);
  for (const stage of GM_STAGES) {
    assert.ok(stage.description.length > 6);
    const s = createGMCheckpoint(stage.id),
      copy = readOpeningCheckpoint(JSON.stringify(s));
    assert.ok(copy, stage.id);
    assert.deepEqual(steps(s, 20), steps(copy, 20), stage.id);
    s.room.bag.length = 0;
    assert.deepEqual(
      createGMCheckpoint(stage.id),
      copy,
      stage.id + ' fixture isolation',
    );
  }
  assert.throws(() => createGMCheckpoint('invalid'));
});
test('bread emits once after its animation; full bag holds delivery without loss and resumes after freeing one cell', () => {
  const start = createGMCheckpoint('after:serve-food');
  assert.equal(start.afterlight.breadGiven, false);
  assert.equal(
    steps(start, 89).room.bag.some((i) => i.kind === 'bread'),
    false,
  );
  let s = steps(start, 90);
  assert.equal(s.afterlight.phase, 'eat-food');
  assert.equal(s.afterlight.breadGiven, true);
  assert.equal(s.afterlight.breadEaten, false);
  assert.equal(s.room.bag.filter((i) => i.kind === 'bread').length, 1);
  assert.equal(
    s.room.effects.filter(
      (e) => e.kind === 'pickup' && e.itemUid === 'anbo-welcome-bread',
    ).length,
    1,
  );
  s = steps(s, 300);
  assert.equal(s.room.bag.filter((i) => i.kind === 'bread').length, 1);
  const full = {
    ...start,
    room: {
      ...start.room,
      bag: Array.from({ length: 16 }, (_, slot) => ({
        ...ITEMS.scrap,
        uid: `full-${slot}`,
        slot,
      })),
    },
  };
  s = steps(full, 150);
  assert.equal(s.afterlight.phase, 'serve-food');
  assert.equal(s.afterlight.breadGiven, false);
  assert.deepEqual(s.room.bag, full.room.bag);
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'protect', uid: 'full-0' },
  });
  s = stepOpening(s);
  assert.equal(s.afterlight.phase, 'eat-food');
  assert.equal(s.room.bag.length, 16);
  assert.equal(s.room.safe[0].uid, 'full-0');
});
test('explicit bread consumption is atomic, cannot consume protected or absent items, and alone unlocks needs and departure', () => {
  let s = createGMCheckpoint('after:eat-food');
  s = { ...s, room: { ...s.room, player: { ...s.room.player, food: 40 } } };
  assert.equal(openingAction(s, { type: 'open-door' }), s);
  assert.equal(
    openingAction(s, {
      type: 'inventory',
      action: {
        type: 'consume',
        uid: s.room.bag.find((i) => i.kind === 'lift-material').uid,
      },
    }),
    s,
  );
  let safe = openingAction(s, {
    type: 'inventory',
    action: { type: 'protect', uid: 'anbo-welcome-bread' },
  });
  assert.equal(consume(safe), safe);
  safe = openingAction(safe, {
    type: 'inventory',
    action: { type: 'unprotect', uid: 'anbo-welcome-bread' },
  });
  const next = consume(safe);
  assert.equal(next.room.player.food, 85);
  assert.equal(next.afterlight.breadEaten, true);
  assert.equal(next.afterlight.phase, 'depart');
  assert.equal(
    next.room.bag.some((i) => i.kind === 'bread'),
    false,
  );
  assert.equal(consume(next), next);
  assert.equal(s.room.player.food, 40);
});
test('each repaired-elevator departure requires floor selection; cancel and invalid selections spend nothing', () => {
  for (const id of ['after:depart', 'after:upgrade-goal']) {
    const s = createGMCheckpoint(id);
    assert.equal(openingAction(s, { type: 'choose-floor', floor: 2 }), s);
    const requested = openingAction(s, { type: 'open-door' });
    assert.equal(requested.stage, 'home');
    assert.equal(requested.room, s.room);
    assert.equal(requested.lift.choosingFloor, true);
    for (const floor of [1, 3, NaN, Infinity])
      assert.equal(
        openingAction(requested, { type: 'choose-floor', floor }),
        requested,
      );
    assert.equal(
      openingAction(openingAction(requested, { type: 'close-floor' }), {
        type: 'choose-floor',
        floor: 2,
      }).stage,
      'home',
    );
    const next = openingAction(requested, { type: 'choose-floor', floor: 2 });
    assert.equal(next.stage, 'second-departing');
    assert.equal(next.room.floor, 2);
    assert.equal(next.lift.choosingFloor, false);
    assert.equal(next.lift.trips, s.lift.trips + 1);
    assert.deepEqual(next.room.bag, s.room.bag);
    assert.equal(openingAction(next, { type: 'choose-floor', floor: 2 }), next);
  }
});
test('old checkpoints migrate without replaying a meal already passed; mid-meal and floor selection resume exactly', () => {
  for (const id of ['after:serve-food', 'after:eat-food', 'field:floor']) {
    const s = createGMCheckpoint(id),
      copy = readOpeningCheckpoint(JSON.stringify(s));
    assert.deepEqual(steps(copy, 130), steps(s, 130));
  }
  const old = createGMCheckpoint('after:upgrade-goal');
  old.version = 4;
  old.afterlight.phase = 'complete';
  delete old.afterlight.breadGiven;
  delete old.afterlight.breadEaten;
  delete old.lift.choosingFloor;
  delete old.room.floor;
  const migrated = readOpeningCheckpoint(JSON.stringify(old));
  assert.equal(migrated.version, 6);
  assert.equal(migrated.afterlight.breadEaten, true);
  assert.equal(migrated.room.floor, 2);
  assert.deepEqual(migrated.room.bag, old.room.bag);
});
