import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWalk, walkStep, nearbySpot } from './walk.ts';

test('horizontal steps remain deterministic and never cross scene boundaries', () => {
  let one = initialWalk(),
    grouped = initialWalk();
  for (let n = 0; n < 100; n++) one = walkStep(one, 1, 1);
  for (let n = 0; n < 20; n++) grouped = walkStep(grouped, 1, 5);
  assert.deepEqual(one, grouped);
  for (let n = 0; n < 200; n++) one = walkStep(one, 1, 5);
  assert.equal(one.x, 935);
  const steps = one.steps;
  assert.equal(walkStep(one, 1, 5).steps, steps);
});
test('dialogue pause and invalid steps cannot move the protagonist', () => {
  const state = initialWalk();
  assert.strictEqual(walkStep(state, 1, 5, true), state);
  for (const n of [0, 6, NaN, 1.5])
    assert.strictEqual(walkStep(state, 1, n), state);
});
test('interaction requires walking into range, with stable nearest selection', () => {
  assert.equal(nearbySpot(initialWalk()), null);
  const nearDoor = { ...initialWalk(), x: 530 };
  assert.equal(nearbySpot(nearDoor)?.id, 'door');
  assert.equal(nearbySpot({ ...nearDoor, x: 600 }), null);
  assert.equal(nearbySpot({ ...nearDoor, x: 310 })?.id, 'mentor');
});
