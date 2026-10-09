import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePoker } from './throw-poker.ts';
import {
  createThrowDuel,
  drawInterval,
  launchThrow,
  MAX_HP,
  PRESETS,
  previewThrow,
  RULES_VERSION,
  stepThrowDuel,
  handLimit,
  reorderThrow,
} from './throw-duel.ts';
import { clickThrowSelection } from './throw-selection.ts';

const cards = (ranks, suits = ranks.map((_, i) => i % 4)) =>
  ranks.map((rank, i) => ({ uid: `c${i}`, rank, suit: suits[i] }));
const run = (state, count) => {
  for (let i = 0; i < count; i++) state = stepThrowDuel(state);
  return state;
};
const idle = () => {
  const state = createThrowDuel(1024, []);
  state.ai.thinkTick = 99999;
  return state;
};

test('single 2 deals 2; pair 2 deals 6; off-combo cards only add face value', () => {
  assert.equal(scorePoker(cards([2])).damage, 2);
  assert.equal(scorePoker(cards([2, 2])).damage, 6);
  assert.equal(scorePoker(cards([2, 2, 13])).damage, 19);
});

test('clicking replaces any previous selection and cannot accumulate non-adjacent cards', () => {
  assert.deepEqual(clickThrowSelection([], 'a'), ['a']);
  assert.deepEqual(clickThrowSelection(['a'], 'c'), ['c']);
  assert.deepEqual(clickThrowSelection(['a', 'b', 'c'], 'c'), ['c']);
  assert.deepEqual(clickThrowSelection(['c'], 'c'), []);
});
test('the single capacity relic raises capacity to twelve without overdraw', () => {
  let state = createThrowDuel(33, [], 'guard', 'capacity');
  state.ai.thinkTick = 99999;
  state = run(state, 480);
  assert.equal(handLimit(state.fighters[0].relic), 12);
  assert.equal(state.fighters[0].hand.length, 12);
  assert.equal(state.fighters[0].drawn, 12);
  assert.equal(handLimit(null), 10);
  assert.throws(() => createThrowDuel(33, [], 'guard', ['order', 'capacity']));
});
test('reordering requires its relic, preserves card identity, and spends exactly three seconds on success', () => {
  const baseline = idle(),
    uid = baseline.fighters[0].hand[0].uid;
  assert.equal(reorderThrow(baseline, 0, uid, 4), baseline);
  let state = createThrowDuel(1024, [], 'guard', 'order');
  state.ai.thinkTick = 99999;
  const initial = state.fighters[0].hand.map((card) => card.uid);
  for (const target of [-1, 5, 1.5, 0])
    assert.equal(reorderThrow(state, 0, initial[0], target), state);
  assert.equal(reorderThrow(state, 0, 'unknown', 2), state);
  state = reorderThrow(state, 0, initial[0], 4);
  assert.deepEqual(
    state.fighters[0].hand.map((card) => card.uid),
    [...initial.slice(1), initial[0]],
  );
  assert.equal(state.fighters[0].nextReorder, 60);
  assert.equal(reorderThrow(state, 0, initial[0], 0), state);
  state = run(state, 59);
  assert.equal(reorderThrow(state, 0, initial[0], 0), state);
  state = run(state, 1);
  const reordered = reorderThrow(state, 0, initial[0], 0);
  assert.notEqual(reordered, state);
  assert.equal(reordered.fighters[0].hand[0].uid, initial[0]);
});
test('relay draws once on the third successful batch without resetting the regular timer', () => {
  let state = createThrowDuel(7, [], 'guard', 'relay');
  state.ai.thinkTick = 99999;
  for (let index = 0; index < 2; index++) {
    state = launchThrow(state, 0, [state.fighters[0].hand[0].uid]);
    state = run(state, 9);
  }
  const fighter = state.fighters[0],
    clock = fighter.drawClock,
    count = fighter.drawn;
  const uid = fighter.hand[0].uid;
  assert.ok(
    previewThrow([fighter.hand[0]], [], fighter).effects.some(
      (effect) => effect.source === 'relic:relay',
    ),
  );
  assert.equal(launchThrow(state, 0, ['unknown']), state);
  state = launchThrow(state, 0, [uid]);
  assert.equal(state.fighters[0].drawn, count + 1);
  assert.equal(state.fighters[0].drawClock, clock);
  assert.equal(state.fighters[0].throws, 3);
  assert.ok(
    state.events.some(
      (event) => event.source === 'relic:relay' && event.text === '第三声接力',
    ),
  );
});
test('echo gains three per impact up to twelve and is consumed only by a valid throw', () => {
  let state = createThrowDuel(9, [], 'guard', 'echo');
  state.ai.thinkTick = 99999;
  for (let index = 0; index < 5; index++) {
    state.fighters[1].hand = [{ uid: `attack${index}`, rank: 2, suit: 0 }];
    state = run(launchThrow(state, 1, [`attack${index}`]), 9);
  }
  assert.equal(state.fighters[0].echo, 12);
  assert.equal(launchThrow(state, 0, ['unknown']), state);
  const card = state.fighters[0].hand[0];
  const expected = card.rank + 12;
  state = launchThrow(state, 0, [card.uid]);
  assert.equal(state.shots.at(-1).damage, expected);
  assert.equal(state.fighters[0].echo, 0);
});
test('all simultaneous item effects are named and attributed in both preview and actual launch', () => {
  const hand = cards([10, 11, 12, 13, 14], [1, 1, 1, 1, 1]);
  const state = createThrowDuel(12, ['sequence', 'suit', 'mend']);
  state.fighters[0].hand = hand;
  state.fighters[0].hp = MAX_HP - 8;
  const preview = previewThrow(hand, state.fighters[0].items, state.fighters[0]);
  assert.deepEqual(
    preview.effects.map((effect) => effect.name),
    ['织序连击', '四色辉光', '灯火回暖', '压轴重创'],
  );
  const next = launchThrow(state, 0, hand.map((card) => card.uid));
  assert.deepEqual(
    next.events.filter((event) => event.type === 'effect').map((event) => event.text),
    preview.effects.filter((effect) => effect.kind !== 'wound').map((effect) => effect.name),
  );
  assert.equal(next.shots[0].cards.length, 5);
  assert.equal(next.shots[0].effects.length, 4);
  assert.equal(next.fighters[0].hp, MAX_HP);
});
test('recognizes every poker combination, including the Ace-low straight', () => {
  for (const [ranks, suits, kind] of [
    [[2, 2, 4, 4], [0, 1, 0, 1], 2],
    [[3, 3, 3], [0, 1, 2], 3],
    [[14, 2, 3, 4, 5], [0, 1, 2, 3, 0], 4],
    [[2, 4, 7, 9, 12], [1, 1, 1, 1, 1], 5],
    [[3, 3, 3, 2, 2], [0, 1, 2, 0, 1], 6],
    [[9, 9, 9, 9], [0, 1, 2, 3], 7],
    [[10, 11, 12, 13, 14], [2, 2, 2, 2, 2], 8],
  ])
    assert.equal(scorePoker(cards(ranks, suits)).kind, kind);
  assert.equal(scorePoker(cards([14, 2, 3, 4, 6])).kind, 0);
});
test('ten-card batch awards only its strongest combination; leftovers stay base damage', () => {
  const score = scorePoker(
    cards([2, 3, 4, 5, 6, 9, 9, 10, 12, 13], [0, 0, 0, 0, 0, 1, 2, 1, 2, 3]),
  );
  assert.equal(score.kind, 8);
  assert.equal(score.comboIds.length, 5);
  assert.equal(score.damage, score.base + 60);
});
test('items affect actual preview, use ten cells and cannot stack', () => {
  assert.equal(previewThrow(cards([2]), ['quick']).damage, 6);
  assert.equal(previewThrow(cards([2, 2]), ['pair']).damage, 16);
  assert.equal(
    previewThrow(cards([2, 3, 4, 5, 6]), ['sequence', 'mend']).damage,
    80,
  );
  assert.equal(drawInterval(['draw']), 60);
  assert.throws(() => createThrowDuel(1, ['quick', 'quick']));
  assert.throws(() =>
    createThrowDuel(1, ['sequence', 'suit', 'focus', 'mend', 'pair']),
  );
});
test('full hand pauses drawing, resumes once space opens, with no banked draws', () => {
  let state = run(idle(), 300);
  assert.equal(state.fighters[0].hand.length, 10);
  assert.equal(state.fighters[0].drawn, 10);
  const serialized = JSON.stringify(state.fighters[0]);
  state = run(state, 60);
  assert.equal(JSON.stringify(state.fighters[0]), serialized);
  state = launchThrow(state, 0, [state.fighters[0].hand[0].uid]);
  state = run(state, 59);
  assert.equal(state.fighters[0].hand.length, 9);
  state = run(state, 1);
  assert.equal(state.fighters[0].hand.length, 10);
});
test('failed selection is atomic and repeated launch cannot duplicate damage', () => {
  const state = idle(),
    before = JSON.stringify(state);
  const uid = state.fighters[0].hand[0].uid;
  for (const ids of [[], [uid, uid], [uid, 'unknown']])
    assert.equal(launchThrow(state, 0, ids), state);
  assert.equal(JSON.stringify(state), before);
  const next = launchThrow(state, 0, [uid]);
  assert.equal(next.fighters[0].hand.length, 4);
  assert.equal(next.shots.length, 1);
  assert.equal(launchThrow(next, 0, [uid]), next);
});
test('cards deal direct core damage at impact, not when queued', () => {
  const state = idle();
  state.fighters[0].hand = cards([2, 2]);
  const launched = launchThrow(state, 0, ['c0', 'c1']);
  assert.equal(launched.fighters[1].hp, MAX_HP);
  assert.equal(run(launched, 8).fighters[1].hp, MAX_HP);
  assert.equal(run(launched, 9).fighters[1].hp, MAX_HP - 6);
});
test('same-tick lethal hits produce a draw; terminal state rejects new actions', () => {
  let state = idle();
  state.fighters[1].items = [];
  state.fighters[1].layout = [];
  state.fighters.forEach((fighter) => {
    fighter.hp = 2;
    fighter.hand = cards([2]);
  });
  state = launchThrow(launchThrow(state, 0, ['c0']), 1, ['c0']);
  state = run(state, 9);
  assert.equal(state.winner, 'draw');
  assert.equal(state.status, 'ended');
  assert.equal(stepThrowDuel(state), state);
  assert.equal(launchThrow(state, 0, ['c0']), state);
});
test('healing is clamped and tied to hearts in a successful throw', () => {
  const state = createThrowDuel(12, ['mend']);
  state.fighters[0].hp = MAX_HP - 3;
  state.fighters[0].hand = cards([2, 3], [1, 1]);
  const next = launchThrow(state, 0, ['c0', 'c1']);
  assert.equal(next.fighters[0].hp, MAX_HP);
  assert.equal(next.events.at(-1).value, 3);
  state.fighters[0].hand = cards([2, 3], [0, 2]);
  assert.equal(launchThrow(state, 0, ['c0', 'c1']).fighters[0].hp, MAX_HP - 3);
});
test('seed, actions and ticks replay identically; decks keep stable unique identities across cycles', () => {
  const replay = () => {
    let state = createThrowDuel(41, PRESETS.guard.items);
    for (let i = 0; i < 500; i++) {
      if (i % 40 === 0)
        state = launchThrow(
          state,
          0,
          state.fighters[0].hand.slice(0, 2).map((card) => card.uid),
        );
      state = stepThrowDuel(state);
    }
    return state;
  };
  assert.deepEqual(replay(), replay());
  assert.equal(replay().rules, RULES_VERSION);
  let state = idle();
  state.fighters[0].relic = 'relay';
  const ids = new Set(state.fighters[0].hand.map((card) => card.uid));
  for (let i = 0; i < 100; i++) {
    // Keep both alive through the curtain call so the deck cycles.
    state.fighters[0].hp = MAX_HP;
    state.fighters[1].hp = MAX_HP;
    state = launchThrow(
      state,
      0,
      state.fighters[0].hand.map((card) => card.uid),
    );
    state = run(state, 24);
    for (const card of state.fighters[0].hand) {
      assert.ok(!ids.has(card.uid));
      ids.add(card.uid);
    }
  }
  assert.ok(state.fighters[0].cycle > 0);
  assert.notDeepEqual(
    createThrowDuel(42, []).fighters[0].hand,
    createThrowDuel(41, []).fighters[0].hand,
  );
});
test('AI publishes an intent for one second before launching its actual cards', () => {
  let state = createThrowDuel(1024, [], 'quick');
  state = run(state, 48);
  const intent = [...state.ai.intent];
  assert.equal(intent.length, 1);
  const announced = previewThrow(
    state.fighters[1].hand.filter((card) => intent.includes(card.uid)),
    state.fighters[1].items,
  ).damage;
  assert.equal(run(state, 19).shots.length, 0);
  state = run(state, 20);
  assert.equal(state.shots[0].damage, announced);
  assert.deepEqual(
    state.shots[0].cards.map((card) => card.uid),
    intent,
  );
});
