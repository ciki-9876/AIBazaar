import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiWantsSleight,
  createThrowDuel,
  launchThrow,
  handLimit,
  sleightReady,
  previewThrow,
  stepThrowDuel,
  useSleight,
  MAX_HP,
  SHRED,
  TICK_MS,
} from './throw-duel.ts';
import { PERFORMERS, PERFORMER_IDS, EMPTY_HAND_BONUS, JUNO_SHRED, STOKE_SHARE, QUICK_DRAW_COUNT, ROSIE_BURN_RESIST, MOLLY_HEART_HEAL, MOLLY_REMEDY } from './throw-performer.ts';
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

test("Eli's quick draw takes the next five in order, without altering the normal deal clock", () => {
  let state = duel('eli');
  state.fighters[0].drawClock = 17;
  const coming = state.fighters[0].pile.slice(-QUICK_DRAW_COUNT).reverse().map((card) => card.uid);
  state = useSleight(state, 0);
  assert.deepEqual(state.fighters[0].hand.slice(-QUICK_DRAW_COUNT).map((card) => card.uid), coming);
  assert.equal(state.fighters[0].drawClock, 17);
  assert.equal(state.fighters[0].nextSleight, 15000 / TICK_MS);
  assert.equal(state.stats[0].sleightsUsed, 1);
  assert.equal(useSleight(state, 0), state, 'cooling down');
  state.fighters[0].hand.length = 3;
  state.tick = 15000 / TICK_MS - 1;
  assert.equal(sleightReady(state, 0), false, 'not one tick early');
  state.tick++;
  assert.equal(sleightReady(state, 0), true, 'ready at exactly fifteen seconds');
});

test('quick draw respects hand capacity and rejects a full hand atomically', () => {
  let state = duel('eli');
  state = useSleight(state, 0);
  state.fighters[0].nextSleight = 0;
  assert.equal(state.fighters[0].hand.length, handLimit(null));
  const before = structuredClone(state);
  assert.equal(useSleight(state, 0), state);
  assert.deepEqual(state, before, 'no cooldown or event spent on a full hand');
  state.fighters[0].hand.length = 9;
  const top = state.fighters[0].pile.at(-1);
  const partial = useSleight(state, 0);
  assert.equal(partial.fighters[0].hand.length, 10);
  assert.equal(partial.fighters[0].hand.at(-1).uid, top.uid);
  assert.equal(partial.events.at(-1).value, 1, 'event reports real cards drawn');
  assert.equal(partial.fighters[0].nextSleight, 300);
  const roomy = createThrowDuel(41, [], 'quick', 'capacity', null, undefined, {}, { performers: { player: 'eli' } });
  roomy.fighters[0].hand.push(...roomy.fighters[0].pile.splice(-5));
  assert.equal(useSleight(roomy, 0).fighters[0].hand.length, 12);
});

test('quick draw belongs only to Eli; AI Eli uses the same ability and deck sequence', () => {
  const state = duel(null, 'eli');
  assert.equal(aiWantsSleight(state, 0), false);
  assert.equal(aiWantsSleight(state, 1), true);
  const expected = useSleight(state, 1).fighters[1].hand;
  const advanced = stepThrowDuel(state);
  assert.deepEqual(advanced.fighters[1].hand, expected);
  assert.equal(advanced.stats[1].sleightsUsed, 1);
  assert.equal(advanced.stats[0].sleightsUsed, 0);
  for (const other of ['juno', 'rosie', 'stan']) assert.notEqual(PERFORMERS[other].sleight.id, 'quick-draw');
  const depleted = duel('eli');
  depleted.fighters[0].pile.length = 2;
  const first = useSleight(depleted, 0), second = useSleight(structuredClone(depleted), 0);
  assert.deepEqual(first, second, 'cross-cycle quick draws remain deterministic');
  assert.equal(first.fighters[0].cycle, 1);
  assert.equal(new Set(first.fighters[0].hand.map((card) => card.uid)).size, 10);
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
  state = run(state, 11);
  state = run(launchThrow(state, 0, ['p0']), 9);
  assert.ok(!state.fighters[0].hand.some((card) => card.uid === 'p0'), 'only once');
});

test("Rosie resists burn ticks, and stoking settles half the target's flames through its shield", () => {
  let state = duel('rosie');
  state.fighters[0].burn = 9;
  state.fighters[0].hand = cards([2]);
  assert.equal(launchThrow(state, 0, ['p0']).fighters[0].hp, MAX_HP);
  const plain = duel();
  plain.fighters[0].burn = 9;
  plain.fighters[0].hand = cards([2]);
  assert.equal(launchThrow(plain, 0, ['p0']).fighters[0].hp, MAX_HP);
  const resistant = run(state, 20), ordinary = run(plain, 20);
  assert.equal(resistant.fighters[0].hp - ordinary.fighters[0].hp, ROSIE_BURN_RESIST);
  assert.equal(resistant.events.find((event) => event.kind === 'burn').hpDamage, 9 - ROSIE_BURN_RESIST);

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

test('Molly heals once per heart-containing throw; her remedy obeys real healing, cleanse and cooldown', () => {
  let state = duel('molly');
  state.fighters[0].hp = 100;
  state.fighters[0].poison = 20;
  state.fighters[0].hand = cards([3, 8], [1, 1]);
  assert.equal(previewThrow(state.fighters[0].hand, [], state.fighters[0]).heal, MOLLY_HEART_HEAL);
  state = launchThrow(state, 0, ['p0', 'p1']);
  assert.equal(state.fighters[0].hp, 100 + MOLLY_HEART_HEAL);
  state = useSleight(state, 0);
  assert.equal(state.fighters[0].hp, 100 + MOLLY_HEART_HEAL + MOLLY_REMEDY);
  assert.equal(state.fighters[0].poison, 20 - Math.ceil(MOLLY_HEART_HEAL / 2) - MOLLY_REMEDY / 2);
  assert.equal(state.fighters[0].nextSleight, 18000 / TICK_MS);
  assert.equal(useSleight(state, 0), state);
  assert.equal(state.stats[0].healingDone, MOLLY_HEART_HEAL + MOLLY_REMEDY);
  const full = duel('molly');
  assert.equal(useSleight(full, 0), full);
  full.fighters[0].poison = 3;
  assert.notEqual(useSleight(full, 0), full, 'cleansing still helps at full life');
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
