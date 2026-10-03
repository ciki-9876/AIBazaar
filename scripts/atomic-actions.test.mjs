import test from 'node:test';
import assert from 'node:assert/strict';
import { randomStream } from '../packages/core/random.ts';
import { createWandeng, wandengReducer, eventOffers } from '../lib/wandeng-game.ts';
import { createSurvival, survivalAction, ITEMS } from '../lib/survival-room.ts';
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
test('generated resource shortages and valid-item invalid destinations never partially spend or transfer items', () => {
  const random = randomStream(20261003, 'resource-and-placement-failures');
  for (let i = 0; i < 30; i++) {
    let state = wandengReducer(createWandeng(i + 100), { type: 'comic-done' });
    state = wandengReducer(state, { type: 'lesson-next' });
    state = wandengReducer(state, { type: 'place', uid: state.inventory[3].uid, at: 5 });
    for (const type of ['start-lesson', 'resolve-battle', 'continue', 'read-letter', 'depart']) state = wandengReducer(state, { type });
    state = { ...state, coins: Math.floor(random() * 6), step: 1 };
    const before = structuredClone(state); freeze(state);
    assert.throws(() => wandengReducer(state, { type: 'repair', uid: state.inventory[Math.floor(random() * state.inventory.length)].uid }));
    assert.deepEqual(state, before);
    const shop = freeze(wandengReducer(state, { type: 'choose-event', id: eventOffers(state).find((offer) => offer.kind === 'shop').id }));
    const shopBefore = structuredClone(shop);
    assert.throws(() => wandengReducer(shop, { type: 'event-choice', choice: Math.floor(random() * 2) }));
    assert.deepEqual(shop, shopBefore);
    const room = freeze({ ...createSurvival(i + 200), status: 'running', bag: [{ ...ITEMS.phone, uid: `owned-${i}` }] });
    const roomBefore = structuredClone(room);
    for (const action of [{ type: 'equip', uid: `owned-${i}`, slot: 100 + i }, { type: 'cargo-move', uid: `owned-${i}`, slot: 100 + i, rotated: false }]) {
      assert.strictEqual(survivalAction(room, action), room);
      assert.deepEqual(room, roomBefore);
    }
  }
});
