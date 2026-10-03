import test from 'node:test';
import assert from 'node:assert/strict';
import { randomStream } from '../packages/core/random.ts';
import { createWandeng, wandengReducer } from '../lib/wandeng-game.ts';
import { createSurvival, survivalAction } from '../lib/survival-room.ts';
import { newRun, act } from '../lib/demo-engine.ts';

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
test('generated illegal card actions leave complete frozen states, identities and resource counters unchanged', () => {
  const random = randomStream(20261003, 'invalid-card-actions');
  for (let i = 0; i < 100; i++) {
    let state = wandengReducer(createWandeng(Math.floor(random() * 0xffffffff)), { type: 'comic-done' });
    state = wandengReducer(state, { type: 'lesson-next' });
    const actions = [{ type: 'place', uid: state.inventory[Math.floor(random() * state.inventory.length)].uid, at: 9 + Math.floor(random() * 100) }, { type: 'place', uid: `missing-${i}`, at: 0 }, { type: 'resolve-battle' }];
    const before = structuredClone(state); freeze(state);
    for (const action of actions) { assert.throws(() => wandengReducer(state, action)); assert.deepEqual(state, before); }
  }
});
test('generated illegal survival item actions return the original state without changing RNG, serials or inventory', () => {
  const random = randomStream(20261003, 'invalid-survival-actions');
  for (let i = 0; i < 100; i++) {
    const state = freeze({ ...createSurvival(Math.floor(random() * 0xffffffff)), status: 'running' });
    const before = structuredClone(state);
    const actions = ['consume', 'equip', 'unequip', 'protect', 'unprotect', 'discard', 'cargo-move'].map((type) => ({ type, uid: `missing-${i}`, slot: Math.floor(random() * 100), rotated: false }));
    for (const action of actions) { assert.strictEqual(survivalAction(state, action), state); assert.deepEqual(state, before); }
  }
});
test('legacy invalid actions preserve input state across generated seeds', () => {
  const random = randomStream(20261003, 'invalid-legacy-actions');
  for (let i = 0; i < 30; i++) {
    const state = freeze(newRun(Math.floor(random() * 0xffffffff), true));
    const before = structuredClone(state);
    assert.throws(() => act(state, { type: 'enter', floor: 999 }));
    assert.deepEqual(state, before);
  }
});
