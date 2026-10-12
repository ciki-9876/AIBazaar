import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel, launchThrow, launchThrowInPlace, stepThrowDuelInPlace, useSleight,
  throwLockMsPerCard, throwLockProgress, TICK_MS,
} from './throw-duel.ts';

const card = (uid, rank = 2, suit = 0) => ({ uid, rank, suit });
const cards = (count, prefix = 'batch') => Array.from({ length: count }, (_, i) => card(`${prefix}-${i}`, 2 + i, i % 4));
function duel(items = [], options = {}) {
  const state = createThrowDuel(219, items, 'quick', null, null, undefined, {}, {
    enemyItems: [], presence: { player: 2000, enemy: 2000 }, ...options,
  });
  state.ai.thinkTick = 99999;
  return state;
}
const advance = (state, ticks) => { for (let i = 0; i < ticks; i++) stepThrowDuelInPlace(state); };
function throwCards(state, side, hand) {
  state.fighters[side].hand = hand;
  assert.equal(launchThrowInPlace(state, side, hand.map((entry) => entry.uid)), true);
  return state.stats[side].actions.at(-1);
}

test('phase recovery applies to both seats and quantizes a whole batch, with atomic early refusals', () => {
  assert.equal(throwLockMsPerCard(600), 1000);
  assert.equal(throwLockMsPerCard(601), 1000 * 2 / 3);
  assert.equal(throwLockMsPerCard(1200), 500);
  for (const side of [0, 1]) for (const tick of [0, 600, 601, 1199, 1200]) for (const count of [1, 3, 5]) {
    const state = duel(); state.tick = tick;
    throwCards(state, side, cards(count));
    const expected = Math.ceil(count * throwLockMsPerCard(tick) / TICK_MS) * TICK_MS;
    assert.deepEqual(throwLockProgress(state, side), { remainingMs: expected, durationMs: expected, remainingRatio: 1 });
    state.fighters[side].hand = [card('too-soon')];
    const before = structuredClone(state);
    assert.equal(launchThrow(state, side, ['too-soon']), state);
    assert.deepEqual(state, before);
  }
});

test('a running recovery shortens proportionally at each phase boundary without restarting progress', () => {
  const opening = duel(); opening.tick = 590;
  throwCards(opening, 0, cards(5));
  advance(opening, 11);
  assert.equal(opening.tick, 601);
  assert.equal(opening.nextLaunch[0], 661, 'remaining 89 ticks become ceil(89 × 2/3)');
  assert.equal(throwLockProgress(opening, 0).durationMs, 3350);
  assert.ok(throwLockProgress(opening, 0).remainingRatio < 0.9);
  const heated = duel(); heated.tick = 1190;
  throwCards(heated, 1, cards(5));
  advance(heated, 10);
  assert.equal(heated.nextLaunch[1], 1243, 'remaining 57 ticks become ceil(57 × 3/4)');
  assert.equal(throwLockProgress(heated, 1).durationMs, 2550);
});

test('curtain settles every half-second at unchanged time-based damage, without doubling status ticks', () => {
  const state = createThrowDuel(41, [], 'quick', null, null, undefined, {}, { enemyItems: [] });
  state.ai.thinkTick = 99999;
  state.tick = 1199;
  state.fighters[0].burn = 5; state.fighters[0].poison = 4;
  advance(state, 1);
  assert.deepEqual(state.stats[0].damageTaken, { direct: 0, burn: 5, poison: 5, reflection: 0, curtain: 1 });
  advance(state, 10);
  assert.equal(state.stats[0].damageTaken.curtain, 2);
  assert.equal(state.stats[0].damageTaken.burn, 5);
  assert.equal(state.stats[0].damageTaken.poison, 5);
  advance(state, 10);
  assert.equal(state.stats[0].damageTaken.curtain, 4);
  assert.equal(state.stats[0].damageTaken.burn, 9);
  assert.equal(state.stats[0].damageTaken.poison, 9, 'the 60s poison ebb removed one stack');
  assert.equal(state.stats[0].curtainDamageTaken, 4);
  assert.equal(state.stats[1].damage.direct, 0, 'environment is never enemy direct damage');
});

test('per-launch outcomes use real HP, shield shred, overheal and defensive recoil, not nominal previews', () => {
  const state = duel(['ward', 'mend']);
  state.fighters[0].hp--;
  state.fighters[1].shield = 5;
  const action = throwCards(state, 0, [card('spade', 14), card('heart', 2, 1)]);
  assert.equal(action.effects.heal, 1);
  assert.ok(action.effects.shield > 0);
  advance(state, 9);
  assert.equal(action.status, 'resolved');
  assert.equal(action.effects.direct, state.stats[0].damage.direct);
  assert.equal(action.effects.shieldDamage, 5);
  assert.equal(state.stats[1].damageTaken.direct, action.effects.direct);
  const shred = duel(); shred.fighters[1].shield = 5;
  const shredded = throwCards(shred, 0, [card('single', 14)]);
  advance(shred, 9);
  assert.equal(shredded.effects.shieldDamage, 5, 'actual shield expenditure includes single-card shred');
  const reflection = duel([], { enemyItems: ['thorns'] });
  reflection.fighters[0].hp = 5;
  const reflected = throwCards(reflection, 0, cards(3));
  advance(reflection, 9);
  assert.equal(reflected.effects.reflected, 5);
  assert.equal(reflection.stats[0].damageTaken.reflection, 5);
  assert.equal(reflection.stats[1].damage.reflection, 5);
});

test('overlapping burn and poison credit each causal throw exactly once across decay and serialization', () => {
  let state = duel(['cinder', 'poison']);
  const first = throwCards(state, 0, [card('diamond-1', 2, 3), card('club-1', 3, 2)]);
  advance(state, 40);
  const second = throwCards(state, 0, [card('diamond-2', 2, 3), card('club-2', 3, 2)]);
  advance(state, 9);
  assert.ok(first.effects.burnApplied > 0 && second.effects.poisonApplied > 0);
  assert.equal(state.fighters[1].afflictions.burn.length, 2);
  const continued = structuredClone(state);
  state = JSON.parse(JSON.stringify(state));
  advance(state, 130); advance(continued, 130);
  assert.deepEqual(state, continued);
  for (const kind of ['direct', 'burn', 'poison']) {
    assert.equal(state.stats[0].actions.reduce((sum, action) => sum + action.effects[kind], 0), state.stats[0].damage[kind]);
    assert.equal(state.stats[1].damageTaken[kind], state.stats[0].damage[kind]);
  }
  assert.ok(state.stats[0].actions.every((action) => action.effects.burn > 0 && action.effects.poison > 0));
});

test('cleansing removes oldest causal stacks and independent sleights are not miscredited to a throw', () => {
  const state = duel(['cinder'], { performers: { player: 'rosie' } });
  const action = throwCards(state, 0, [card('flame-a', 2, 3), card('flame-b', 3, 3), card('flame-c', 4, 3)]);
  advance(state, 9);
  const after = useSleight(state, 0);
  assert.ok(after.stats[0].damage.burn > 0);
  assert.equal(after.stats[0].actions[0].effects.burn, 0, 'stoke is a separately activated skill');
  assert.equal(action.effects.burn, 0);
  after.fighters[1].items = ['wash'];
  after.fighters[1].layout = [{ id: 'wash', start: 0 }];
  throwCards(after, 1, [card('cleanse', 2, 1)]);
  const fighter = after.fighters[1];
  assert.equal(fighter.afflictions.burn.reduce((sum, part) => sum + part.stacks, 0), fighter.burn);
  assert.ok(after.stats[1].actions[0].effects.cleanse > 0);
  const mixed = duel(['cinder', 'poison'], { enemyItems: ['wash'] });
  throwCards(mixed, 0, [card('old-fire', 2, 3), card('old-poison', 3, 2)]);
  advance(mixed, 40);
  const recent = throwCards(mixed, 0, [card('new-fire', 2, 3), card('new-poison', 3, 2)]);
  advance(mixed, 9);
  throwCards(mixed, 1, [card('wash-four', 2, 1)]);
  assert.deepEqual(mixed.fighters[1].afflictions.poison, [{ actionId: recent.id, stacks: 1 }]);
  assert.deepEqual(mixed.fighters[1].afflictions.burn, []);
});

test('status caps credit only newly applied stacks and never adopt pre-existing uncaused damage', () => {
  const state = duel(['cinder', 'poison']);
  state.fighters[1].burn = 59; state.fighters[1].poison = 40;
  const action = throwCards(state, 0, [card('capped-fire', 2, 3), card('capped-poison', 3, 2)]);
  advance(state, 9);
  assert.equal(action.effects.burnApplied, 1);
  assert.equal(action.effects.poisonApplied, 0);
  advance(state, 11);
  assert.equal(action.effects.burn, 1);
  assert.equal(action.effects.poison, 0);
  assert.equal(state.stats[0].damage.burn, 60);
  assert.equal(state.stats[0].damage.poison, 41);
});

test('team substitution cancels in-flight damage, retains immediate gains and keeps team ledgers intact', () => {
  const state = duel(['ward'], { enemyReserve: { performer: 'molly', style: 'mend', items: [] } });
  const action = throwCards(state, 0, [card('ward', 2, 0)]);
  const shield = action.effects.shield;
  state.fighters[1].hp = 0;
  advance(state, 1);
  assert.equal(action.status, 'cancelled');
  assert.equal(action.effects.direct, 0);
  assert.equal(action.effects.shield, shield);
  assert.ok(shield > 0);
  assert.equal(state.stats[0].throws, 1);
  assert.equal(state.activeSeats[1], 1);
  assert.equal(state.fighters[1].afflictions.burn.length, 0);
});

test('per-launch draws and growth stop at actual caps and never include independent draws or sleights', () => {
  let state = duel([], { performers: { player: 'eli' } });
  state.fighters[0].hand = [{ ...card('biscuit-tin', 8, 1), ench: 'LH8' }, ...cards(9, 'held')];
  assert.equal(launchThrowInPlace(state, 0, ['biscuit-tin']), true);
  assert.equal(state.fighters[0].hand.length, 10);
  assert.equal(state.stats[0].actions[0].effects.draw, 1, 'two nominal draws fit only one vacant slot');
  state.fighters[0].hand.splice(0, 3);
  state = useSleight(state, 0);
  assert.equal(state.fighters[0].hand.length, 10);
  assert.equal(state.stats[0].actions[0].effects.draw, 1, 'the separate quick draw is not this card outcome');
  state.fighters[0].hand.pop();
  advance(state, 120);
  assert.equal(state.fighters[0].hand.length, 10);
  assert.equal(state.stats[0].actions[0].effects.draw, 1, 'normal replenishment is also independent');

  const growing = duel(['growth']);
  growing.fighters[0].lastSuit = 2; growing.fighters[0].power = 29;
  const first = throwCards(growing, 0, [card('growth-a', 2, 2), card('growth-b', 3, 2)]);
  assert.equal(first.effects.growth, 1, 'three nominal strength stops at thirty');
  advance(growing, 40);
  const second = throwCards(growing, 0, [card('growth-c', 2, 2), card('growth-d', 3, 2)]);
  assert.equal(second.effects.growth, 0);
});

test('slow and wound ledger records only duration truly added at impact, including overlapping statuses', () => {
  for (const [slowUntil, woundUntil, expectedSlow, expectedWound] of [[0, 0, 1200, 5000], [14, 29, 950, 4000], [1000, 1000, 0, 0]]) {
    const state = duel(['slow']);
    state.fighters[1].slowUntil = slowUntil; state.fighters[1].woundUntil = woundUntil;
    const action = throwCards(state, 0, [card('run-a', 2, 2), card('run-b', 3, 2), card('run-c', 4, 2)]);
    assert.equal(action.effects.slowMs, 0, 'status has not landed yet');
    assert.equal(action.effects.woundMs, 0);
    advance(state, 9);
    assert.equal(action.effects.slowMs, expectedSlow);
    assert.equal(action.effects.woundMs, expectedWound);
  }
});
