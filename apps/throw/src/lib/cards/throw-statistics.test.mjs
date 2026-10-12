import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyQualifierOpening, createThrowDuel, launchThrowInPlace, stepThrowDuelInPlace,
  previewThrow, useSleight, TICK_MS,
} from './throw-duel.ts';

function duel(items = [], relic = null, enemyItems = []) {
  const state = createThrowDuel(41, items, 'quick', relic, null, undefined, {}, {
    enemyItems, presence: { player: 2000, enemy: 2000 },
  });
  state.ai.thinkTick = 99999;
  return state;
}
const advance = (state, ticks) => { for (let i = 0; i < ticks; i++) stepThrowDuelInPlace(state); };
const card = (uid, rank = 2, suit = 0, ench) => ({ uid, rank, suit, ...(ench ? { ench } : {}) });

test('statistics retain every card, activation and real hit after the visual event feed is trimmed', () => {
  const state = duel(['quick', 'needle']);
  for (let turn = 0; turn < 55; turn++) {
    state.fighters[0].hand = [card(`throw-${turn}`)];
    assert.equal(launchThrowInPlace(state, 0, [`throw-${turn}`]), true);
    advance(state, 20);
  }
  assert.equal(state.events.length, 240);
  assert.ok(state.events[0].id > 1, 'early events have left the visual buffer');
  assert.equal(state.stats[0].throws, 55);
  assert.equal(state.stats[0].actions.length, 55);
  assert.equal(state.stats[0].actions[0].cards[0].uid, 'throw-0');
  assert.equal(state.stats[0].actions.reduce((sum, action) => sum + action.effects.direct, 0), 550);
  assert.equal(state.stats[0].hits, 55);
  assert.equal(state.stats[0].cardsThrown, 55);
  assert.equal(state.stats[0].cards['0-2'].count, 55);
  assert.equal(state.stats[0].kinds[0], 55);
  assert.deepEqual(state.stats[0].damage, { direct: 550, burn: 0, poison: 0, reflection: 0 });
  assert.deepEqual(state.stats[0].itemTriggers, { quick: 55, needle: 55 });
  assert.equal(state.fighters[1].hp, 1450);
});

test('damage statistics exclude blocked points and overkill, and separate burn, poison and theatre damage', () => {
  const hit = duel();
  hit.fighters[1].hp = 3;
  hit.fighters[1].shield = 5;
  hit.fighters[0].hand = [card('ace', 14)];
  launchThrowInPlace(hit, 0, ['ace']);
  advance(hit, 9);
  assert.equal(hit.stats[0].damage.direct, 3, 'only the target remaining HP was actually removed');

  const dots = duel();
  dots.fighters[1].burn = 7;
  dots.fighters[1].poison = 4;
  dots.tick = 19;
  advance(dots, 1);
  assert.deepEqual(dots.stats[0].damage, { direct: 0, burn: 7, poison: 5, reflection: 0 });
  const curtain = duel();
  curtain.tick = 60000 / TICK_MS - 1;
  advance(curtain, 1);
  assert.deepEqual(curtain.stats[0].damage, { direct: 0, burn: 0, poison: 0, reflection: 0 });
  assert.equal(curtain.stats[0].curtainDamageTaken, 6);
});

test('shield totals count actual generated shield, including healing overflow, never damage merely parried', () => {
  const ward = duel(['ward']);
  ward.fighters[0].hand = [card('spade')];
  const expected = previewThrow(ward.fighters[0].hand, ['ward'], ward.fighters[0]).shield;
  launchThrowInPlace(ward, 0, ['spade']);
  assert.equal(ward.stats[0].shieldGenerated, expected);
  assert.equal(ward.fighters[0].shield, expected);

  const overflow = duel(['mend'], 'heart');
  overflow.fighters[0].hp--;
  overflow.fighters[0].hand = [card('heart', 2, 1)];
  const heal = previewThrow(overflow.fighters[0].hand, ['mend'], overflow.fighters[0]).heal;
  launchThrowInPlace(overflow, 0, ['heart']);
  assert.equal(overflow.stats[0].healingDone, 1);
  assert.equal(overflow.stats[0].shieldGenerated, Math.floor((heal - 1) / 2));
  assert.equal(overflow.stats[0].itemTriggers.mend, 1);
  assert.equal(overflow.stats[0].relicTriggers.heart, 1);

  const fan = duel(['sequence']);
  fan.fighters[0].hand.push(card('extra-1'), card('extra-2'));
  fan.fighters[1].hand = [card('incoming', 10)];
  launchThrowInPlace(fan, 1, ['incoming']);
  advance(fan, 9);
  assert.equal(fan.stats[0].itemTriggers.sequence, 1);
  assert.equal(fan.stats[0].shieldGenerated, 0, 'parry prevention is not newly generated shield');
});

test('reflection is distinct from thrown direct damage; leech is one activation and real healing only', () => {
  const reflection = duel(['thorns']);
  reflection.fighters[1].hp = 5;
  reflection.fighters[1].hand = [card('a', 2, 0), card('b', 5, 1), card('c', 9, 2)];
  launchThrowInPlace(reflection, 1, ['a', 'b', 'c']);
  advance(reflection, 9);
  assert.equal(reflection.stats[0].damage.reflection, 5);
  assert.equal(reflection.stats[0].damage.direct, 0);
  assert.equal(reflection.stats[0].itemTriggers.thorns, 1);
  const leech = duel(['drain']);
  leech.fighters[0].hp--;
  leech.fighters[0].hand = [card('drain', 14)];
  launchThrowInPlace(leech, 0, ['drain']);
  advance(leech, 9);
  assert.equal(leech.stats[0].healingDone, 1);
  assert.equal(leech.stats[0].itemTriggers.drain, 1, 'launch and impact belong to the same activation');
});

test('rejected actions preserve statistics; serialized rule state keeps cumulative counters', () => {
  const state = duel(['quick']);
  const before = structuredClone(state);
  assert.equal(launchThrowInPlace(state, 0, ['missing']), false);
  assert.deepEqual(state, before);
  const restored = JSON.parse(JSON.stringify(state));
  const ids = [state.fighters[0].hand[0].uid];
  launchThrowInPlace(state, 0, ids);
  launchThrowInPlace(restored, 0, ids);
  advance(state, 15);
  advance(restored, 15);
  assert.deepEqual(restored, state);
});

test('qualification decks are scripted across seeds, keep all 52 unique cards, and preserve variants', () => {
  const make = (seed) => applyQualifierOpening(createThrowDuel(seed, ['ward'], 'burn', null, null, undefined,
    { player: { '0-4': 'edge' } }, { performers: { player: 'eli' } }));
  const a = make(1), b = make(8888888);
  assert.deepEqual(a.fighters, b.fighters);
  assert.equal(a.fighters[0].hand.filter((entry) => entry.suit === 0).length, 3);
  assert.equal(a.fighters[0].hand[0].ench, 'edge');
  for (const fighter of a.fighters) {
    const deck = [...fighter.hand, ...fighter.pile];
    assert.equal(deck.length, 52);
    assert.equal(new Set(deck.map((entry) => `${entry.suit}-${entry.rank}`)).size, 52);
  }
  const drawn = useSleight(a, 0);
  assert.equal(drawn.fighters[0].hand.length, 10);
  assert.ok(drawn.fighters[0].hand.some((entry) => entry.suit === 0));
  assert.deepEqual(a.stats, b.stats, 'scripting is not a throw or skill action');
  assert.deepEqual(applyQualifierOpening(a), a, 'reapplying a fresh scripted opener is stable');
  advance(a, 1);
  assert.equal(applyQualifierOpening(a), a, 'never rewrite a duel after its first tick');
});
