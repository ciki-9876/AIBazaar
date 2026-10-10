import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buryPeek,
  createThrowDuel,
  launchThrow,
  peekedCards,
  previewThrow,
  stepThrowDuel,
  useSleight,
  DEAL_SIZE,
  MAX_HP,
  SHRED,
  SCORCH_PER_THROW,
  TICK_MS,
} from './throw-duel.ts';
import { PERFORMERS, PERFORMER_IDS, EMPTY_HAND_BONUS, JUNO_SHRED, STOKE_SHARE } from './throw-performer.ts';
import { validDeckBook } from './throw-enchant.ts';

const cards = (ranks, suits = ranks.map((_, i) => i % 4)) => ranks.map((rank, i) => ({ uid: `p${i}`, rank, suit: suits[i] }));
const run = (state, count) => {
  for (let i = 0; i < count; i++) state = stepThrowDuel(state);
  return state;
};
const duel = (player = null, enemy = null, items = []) => {
  const state = createThrowDuel(41, items, 'quick', null, null, undefined, {}, { enemyItems: [], performers: { player, enemy } });
  state.ai.thinkTick = 99999;
  return state;
};

test('performers are rule identities only: every signature deck is legal and every sleight has a cooldown', () => {
  for (const id of PERFORMER_IDS) {
    const performer = PERFORMERS[id];
    assert.ok(validDeckBook(performer.book), `${id} deck`);
    assert.ok(performer.talent.text && performer.sleight.text && performer.sleight.cooldownMs > 0);
  }
  assert.throws(() => createThrowDuel(1, [], 'quick', null, null, undefined, {}, { performers: { player: 'felix' } }));
  const plain = duel();
  assert.equal(plain.fighters[0].performer, null);
  assert.equal(useSleight(plain, 0), plain, 'no performer, no sleight');
  assert.equal(duel('eli').fighters[0].hp, MAX_HP, 'no stat differences');
});

test("Eli's talent: only a throw that empties the hand earns the bonus", () => {
  const one = cards([7]);
  assert.equal(previewThrow(one, [], { performer: 'eli', hand: one }).damage, 7 + EMPTY_HAND_BONUS);
  assert.equal(previewThrow(one, [], { performer: 'eli', hand: cards([7, 9]) }).damage, 7);
  assert.equal(previewThrow(one, [], { performer: 'juno', hand: one }).damage, 7);
});

test("Eli's false shuffle shows the next deal in draw order; burying swaps it, the deal clears it", () => {
  let state = duel('eli');
  const coming = state.fighters[0].pile.slice(-DEAL_SIZE).reverse().map((card) => card.uid);
  state = useSleight(state, 0);
  assert.deepEqual(peekedCards(state.fighters[0]).map((card) => card.uid), coming);
  assert.equal(useSleight(state, 0), state, 'cooling down');
  const buried = buryPeek(state, 0);
  assert.equal(buried.fighters[0].peeking, false);
  assert.deepEqual(buried.fighters[0].pile.slice(0, DEAL_SIZE).map((card) => card.uid).reverse(), coming, 'buried at the bottom');
  assert.equal(buryPeek(buried, 0), buried, 'bury only once per peek');
  // Without burying, the revealed cards are exactly what the next round deals.
  let dealt = run(state, 120);
  assert.deepEqual(dealt.fighters[0].hand.slice(-DEAL_SIZE).map((card) => card.uid), coming);
  assert.equal(dealt.fighters[0].peeking, false);
  dealt = run(dealt, 18000 / TICK_MS);
  assert.notEqual(useSleight(dealt, 0), dealt, 'ready again after the cooldown');
});

test("Juno's talent shreds harder and her boomerang returns one single card on impact", () => {
  let state = duel('juno');
  state.fighters[1].shield = 100;
  state.fighters[0].hand = cards([10]);
  state = run(launchThrow(state, 0, ['p0']), 9);
  assert.equal(state.fighters[1].shield, 100 - Math.ceil(10 * JUNO_SHRED));
  let plain = duel();
  plain.fighters[1].shield = 100;
  plain.fighters[0].hand = cards([10]);
  plain = run(launchThrow(plain, 0, ['p0']), 9);
  assert.equal(plain.fighters[1].shield, 100 - Math.ceil(10 * SHRED));

  state = duel('juno');
  state.fighters[0].hand = cards([9, 4]);
  state = useSleight(state, 0);
  assert.equal(state.fighters[0].boomerang, true);
  state = run(launchThrow(state, 0, ['p0']), 9);
  assert.ok(state.fighters[0].hand.some((card) => card.uid === 'p0'), 'the nine came back');
  assert.equal(state.fighters[0].boomerang, false);
  state = run(launchThrow(state, 0, ['p0']), 9);
  assert.ok(!state.fighters[0].hand.some((card) => card.uid === 'p0'), 'only once');
});

test("Rosie never scorches herself, and stoking settles half the target's flames through its shield", () => {
  let state = duel('rosie');
  state.fighters[0].burn = 9;
  state.fighters[0].hand = cards([2]);
  assert.equal(launchThrow(state, 0, ['p0']).fighters[0].hp, MAX_HP);
  let plain = duel();
  plain.fighters[0].burn = 9;
  plain.fighters[0].hand = cards([2]);
  assert.equal(launchThrow(plain, 0, ['p0']).fighters[0].hp, MAX_HP - SCORCH_PER_THROW);

  state = duel('rosie');
  state.fighters[1].burn = 3;
  assert.equal(useSleight(state, 0), state, 'needs at least four stacks');
  state.fighters[1].burn = 12;
  state.fighters[1].shield = 2;
  state = useSleight(state, 0);
  const amount = Math.floor(12 * STOKE_SHARE);
  assert.equal(state.fighters[1].burn, 12 - amount);
  assert.equal(state.fighters[1].shield, 0);
  assert.equal(state.fighters[1].hp, MAX_HP - (amount - 2));
});

test('computer performers use their sleights deterministically', () => {
  const play = () => {
    let state = createThrowDuel(77, ['cinder', 'bellows', 'ash'], 'burn', null, 'ember', undefined, { enemy: PERFORMERS.rosie.book }, {
      enemyItems: ['cinder', 'bellows', 'ash', 'pair', 'draw'],
      performers: { player: 'juno', enemy: 'rosie' },
    });
    state.fighters[0].burn = 0;
    state.fighters[1].burn = 0;
    state.fighters[0].hand.length = 0;
    state = run(state, 2400);
    return state;
  };
  const a = play(), b = play();
  assert.deepEqual(a, b);
});

test("Stan alights once below half life, and his switch trades the lowest card for the pile's top", () => {
  let state = duel('stan');
  const drawn = state.fighters[0].drawn;
  state.fighters[0].hp = 170;
  state = run(state, 1);
  assert.equal(state.fighters[0].drawn, drawn, 'not yet below half');
  state.fighters[0].hp = 150;
  state = run(state, 1);
  assert.equal(state.fighters[0].drawn, drawn + 2);
  state.fighters[0].hp = 120;
  state = run(state, 1);
  assert.equal(state.fighters[0].drawn, drawn + 2, 'only once');

  state = duel('stan');
  state.fighters[0].hand = cards([9, 3, 12]);
  const top = state.fighters[0].pile.at(-1);
  state = useSleight(state, 0);
  assert.deepEqual(state.fighters[0].hand.map((card) => card.uid), ['p0', top.uid, 'p2']);
  assert.equal(state.fighters[0].pile[0].uid, 'p1', 'the three goes to the bottom');
});
