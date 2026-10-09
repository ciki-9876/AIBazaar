import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel,
  launchThrow,
  MAX_HP,
  stepThrowDuel,
  termsAllow,
  TICK_MS,
} from './throw-duel.ts';

const card = (rank, suit, uid = `t${rank}-${suit}`) => ({ uid, rank, suit });
const idle = (terms, extra = {}) => {
  const state = createThrowDuel(2024, [], 'guard', null, null, undefined, {}, { terms, ...extra });
  state.ai.thinkTick = 1e9;
  return state;
};

test('without terms a duel is unchanged and ends on knockout or time', () => {
  const plain = createThrowDuel(2024, [], 'guard');
  const empty = createThrowDuel(2024, [], 'guard', undefined, undefined, undefined, {}, {});
  assert.deepEqual(plain, empty);
  assert.equal(plain.terms, null);
  assert.equal(plain.endReason, null);
});

test('suit and card-count terms refuse the whole throw atomically', () => {
  assert.equal(termsAllow({ suits: [1, 3] }, [card(5, 1), card(5, 3)]), true);
  assert.equal(termsAllow({ suits: [1, 3] }, [card(5, 1), card(5, 0)]), false);
  assert.equal(termsAllow({ maxCards: 1 }, [card(5, 1), card(6, 1)]), false);
  let state = idle({ suits: [1, 3], maxCards: 2 });
  state.fighters[0].hand = [card(9, 0, 'black'), card(9, 1, 'red'), card(4, 3, 'red2'), card(2, 1, 'red3')];
  const before = structuredClone(state);
  assert.deepEqual(launchThrow(state, 0, ['black']), before);
  assert.deepEqual(launchThrow(state, 0, ['red', 'red2', 'red3']), before);
  state = launchThrow(state, 0, ['red', 'red2']);
  assert.equal(state.fighters[0].throws, 1);
  assert.deepEqual(state.fighters[0].hand.map((c) => c.uid), ['black', 'red3']);
});

test('terms bind only the player; the opponent plays normally', () => {
  let state = idle({ suits: [1] });
  state.fighters[1].hand = [card(9, 0, 'spade')];
  state = launchThrow(state, 1, ['spade']);
  assert.equal(state.fighters[1].throws, 1);
});

test('missing the deadline or dropping under the floor is a loss with a reason', () => {
  let state = idle({ deadlineMs: 1000 });
  for (let i = 0; i < 1000 / TICK_MS; i++) state = stepThrowDuel(state);
  assert.equal(state.status, 'ended');
  assert.equal(state.winner, 1);
  assert.equal(state.endReason, 'deadline');

  state = idle({ hpFloor: 160 });
  state.fighters[0].hp = 159;
  state = stepThrowDuel(state);
  assert.equal(state.winner, 1);
  assert.equal(state.endReason, 'floor');

  state = idle({ hpFloor: 160, deadlineMs: 1000 });
  state.fighters[1].hp = 0;
  state.fighters[0].hp = 100;
  state = stepThrowDuel(state);
  assert.equal(state.winner, 0, 'a knockout win counts even below the floor on the same tick');
  assert.equal(state.endReason, 'knockout');
});

test('invalid terms and opponent loadouts are refused', () => {
  assert.throws(() => idle({ suits: [] }), /terms/);
  assert.throws(() => idle({ maxCards: 0 }), /terms/);
  assert.throws(() => idle({ hpFloor: MAX_HP + 1 }), /terms/);
  assert.throws(() => idle({ deadlineMs: -5 }), /terms/);
  assert.throws(() => idle(undefined, { enemyItems: ['poison', 'poison'] }), /opponent/);
});

test('custom opponent kits replace the preset items', () => {
  const state = idle(undefined, { enemyItems: ['poison', 'venom', 'stride'] });
  assert.deepEqual([...state.fighters[1].items].sort(), ['poison', 'stride', 'venom']);
});

test('tallies record suits and poker kinds actually thrown', () => {
  let state = idle();
  state.fighters[0].hand = [card(7, 2, 'a'), card(7, 3, 'b'), card(2, 2, 'c')];
  state = launchThrow(state, 0, ['a', 'b']);
  state.nextLaunch[0] = 0;
  state = launchThrow(state, 0, ['c']);
  assert.deepEqual(state.fighters[0].tally.suits, [0, 0, 2, 1]);
  assert.equal(state.fighters[0].tally.kinds[1], 1);
  assert.equal(state.fighters[0].tally.kinds[0], 1);
});
