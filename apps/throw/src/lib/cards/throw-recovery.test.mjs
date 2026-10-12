import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createThrowDuel, launchThrow, launchThrowInPlace, stepThrowDuelInPlace,
  throwLockRemainingMs, THROW_LOCK_MS_PER_CARD, TICK_MS, useSleight,
  previewThrow,
} from './throw-duel.ts';

const cards = (count, prefix = 'proof') => Array.from({ length: count }, (_, index) => ({
  uid: `${prefix}-${index}`, rank: 2 + index % 13, suit: index % 4,
}));
function duel(options = {}) {
  const state = createThrowDuel(912, [], 'quick', null, null, undefined, {}, options);
  state.ai.thinkTick = 99999;
  return state;
}
function advance(state, count) { for (let i = 0; i < count; i++) stepThrowDuelInPlace(state); }

test('one card locks for one second, five for five; both seats reject every early attempt atomically', () => {
  for (const side of [0, 1]) for (const count of [1, 2, 5, 10]) {
    const state = duel();
    state.fighters[side].hand = cards(count);
    assert.equal(launchThrowInPlace(state, side, state.fighters[side].hand.map((card) => card.uid)), true);
    assert.equal(throwLockRemainingMs(state, side), count * THROW_LOCK_MS_PER_CARD);
    state.fighters[side].hand = cards(1, 'next');
    state.tick = state.nextLaunch[side] - 1;
    const before = structuredClone(state);
    assert.equal(launchThrow(state, side, ['next-0']), state);
    assert.deepEqual(state, before, 'no cards, cooldown, events or statistics spent');
    assert.equal(throwLockRemainingMs(state, side), TICK_MS);
    state.tick++;
    assert.equal(throwLockRemainingMs(state, side), 0);
    assert.equal(launchThrowInPlace(state, side, ['next-0']), true);
  }
});

test('recovery is counted from launch and does not stack an extra projectile or sleight delay', () => {
  const state = duel({ performers: { player: 'eli' } });
  state.fighters[0].hand = cards(5);
  launchThrowInPlace(state, 0, state.fighters[0].hand.map((card) => card.uid));
  advance(state, 9);
  assert.equal(state.shots.length, 0, 'impact still lands at 450ms');
  assert.equal(throwLockRemainingMs(state, 0), 4550);
  const drawn = useSleight(state, 0);
  assert.equal(drawn.fighters[0].hand.length, 5, 'drawing is allowed during recovery');
  assert.equal(throwLockRemainingMs(drawn, 0), 4550);
  assert.equal(launchThrow(drawn, 0, [drawn.fighters[0].hand[0].uid]), drawn);
});

test('AI keeps its announced batch through recovery and launches exactly at the legal boundary', () => {
  const state = duel();
  state.fighters[1].hand = cards(5);
  launchThrowInPlace(state, 1, state.fighters[1].hand.map((card) => card.uid));
  state.fighters[1].hand = cards(1, 'reply');
  state.ai.intent = ['reply-0'];
  state.ai.releaseTick = 20;
  advance(state, 99);
  assert.equal(state.fighters[1].throws, 1);
  assert.deepEqual(state.ai.intent, ['reply-0']);
  advance(state, 1);
  assert.equal(state.fighters[1].throws, 2);
  assert.equal(state.events.filter((event) => event.type === 'launch' && event.side === 1).at(-1).tick, 100);
});

const reserve = { performer: 'molly', style: 'mend', items: ['mend'], presence: 400 };
test('two-person matches substitute once, preserve the survivor and aggregate statistics', () => {
  const state = duel({ performers: { player: 'eli', enemy: 'juno' }, enemyReserve: reserve });
  state.fighters[0].hp = 220;
  state.fighters[0].shield = 17;
  state.fighters[0].poison = 3;
  const hand = structuredClone(state.fighters[0].hand);
  state.fighters[1].hp = 0;
  advance(state, 1);
  assert.equal(state.status, 'playing');
  assert.equal(state.fighters[1].performer, 'molly');
  assert.equal(state.fighters[1].hp, 400);
  assert.equal(state.fighters[1].hand.length, 5);
  assert.equal(state.activeSeats[1], 1);
  assert.deepEqual(state.teamOrder[1], ['juno', 'molly']);
  assert.equal(state.ai.style, 'mend');
  assert.equal(state.tick, 1);
  assert.equal(state.fighters[0].hp, 220);
  assert.equal(state.fighters[0].shield, 17);
  assert.equal(state.fighters[0].poison, 3);
  assert.deepEqual(state.fighters[0].hand, hand);
  assert.ok(state.intermission);
  assert.equal(throwLockRemainingMs(state, 1), 0, 'the announced break replaces the old instant one-second entry lock');
  assert.equal(state.reserves[1], null);
  state.fighters[1].hp = 0;
  advance(state, 100);
  advance(state, 1);
  assert.equal(state.status, 'ended');
  assert.equal(state.winner, 0);
});

test('simultaneous knockouts use both reserves before declaring a draw; fresh card identities cannot collide', () => {
  const state = duel({ playerReserve: reserve, enemyReserve: reserve });
  const formerCards = new Set(state.fighters.flatMap((fighter) => [...fighter.hand, ...fighter.pile].map((card) => card.uid)));
  state.fighters[0].hp = 0;
  state.fighters[1].hp = 0;
  advance(state, 100);
  advance(state, 1);
  assert.equal(state.status, 'playing');
  assert.deepEqual(state.activeSeats, [1, 1]);
  for (const fighter of state.fighters) for (const card of [...fighter.hand, ...fighter.pile])
    assert.equal(formerCards.has(card.uid), false);
  state.fighters[0].hp = 0;
  state.fighters[1].hp = 0;
  advance(state, 1);
  assert.equal(state.winner, 'draw');
});

test('the safety time limit compares the remaining presence of the whole team', () => {
  const state = duel({ playerReserve: reserve });
  state.tick = 120000 / TICK_MS - 1;
  state.fighters[0].hp = 100;
  state.fighters[1].hp = 200;
  advance(state, 1);
  assert.equal(state.endReason, 'time');
  assert.equal(state.winner, 0, 'the unspent four-hundred presence reserve is not ignored');
  assert.equal(state.activeSeats[0], 0);
});

test('two-person matches validate reserves before returning a state and replay deterministically', () => {
  assert.throws(() => duel({ enemyReserve: { ...reserve, presence: -1 } }));
  assert.throws(() => duel({ playerReserve: { ...reserve, items: ['mend', 'mend'] } }));
  const replay = () => {
    const state = duel({ playerReserve: reserve, enemyReserve: reserve });
    state.fighters[0].hp = 0;
    advance(state, 120);
    return state;
  };
  assert.deepEqual(replay(), replay());
});

test('workshop upgrades feed the same preview and actual shield/heal after family and status modifiers', () => {
  const state = createThrowDuel(5, ['ward', 'mend'], 'quick', null, null, undefined, {}, {
    enemyItems: ['quick'], playerUpgrades: { ward: 'gold', mend: 'gold' }, enemyUpgrades: { quick: 'silver' },
  });
  state.fighters[0].hp = 100;
  state.fighters[0].burn = 1;
  state.fighters[0].hand = cards(2);
  const preview = previewThrow(state.fighters[0].hand, state.fighters[0].items, state.fighters[0]);
  assert.equal(preview.shield, 12, 'gold shield 24, then half of a splashed family');
  assert.equal(preview.heal, 9, 'gold heal 18, then half of a splashed family');
  launchThrowInPlace(state, 0, state.fighters[0].hand.map((card) => card.uid));
  assert.equal(state.fighters[0].shield, preview.shield);
  assert.equal(state.fighters[0].hp, 105, 'nine nominal heals at sixty percent while alight');
  assert.equal(state.stats[0].healingDone, 5);
  state.fighters[1].hand = cards(1, 'enemy');
  assert.equal(previewThrow(state.fighters[1].hand, state.fighters[1].items, state.fighters[1]).itemBonus, 10);
  launchThrowInPlace(state, 1, ['enemy-0']);
  assert.equal(state.shots.at(-1).damage, 12, 'same upgraded damage for the other seat');
});

test('malformed upgrade maps cannot start a half-valid duel or reserve', () => {
  for (const playerUpgrades of [{ missing: 'gold' }, { quick: 'unknown' }, { quick: 'bronze' }])
    assert.throws(() => duel({ playerUpgrades }));
  assert.throws(() => duel({ enemyReserve: { ...reserve, upgrades: { missing: 'silver' } } }));
});
