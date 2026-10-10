import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePoker } from './throw-poker.ts';
import {
  createThrowDuel,
  drawInterval,
  DEAL_SIZE,
  launchThrow,
  MAX_HP,
  PRESETS,
  previewThrow,
  SPLASH_MIN_ITEMS,
  WARD_PER_SPADE,
  RULES_VERSION,
  stepThrowDuel,
  handLimit,
  reorderThrow,
  arrangeThrow,
  battlePhase,
  REORDER_MS,
  TICK_MS,
  RELICS,
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
test('default reordering preserves card identity and spends exactly twenty seconds on success', () => {
  assert.ok(!RELICS.some((relic) => relic.id === 'order'));
  assert.throws(() => createThrowDuel(1024, [], 'guard', 'order'));
  let state = createThrowDuel(1024, [], 'guard', null);
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
  assert.equal(state.fighters[0].nextReorder, REORDER_MS / TICK_MS);
  assert.equal(reorderThrow(state, 0, initial[0], 0), state);
  state = run(state, REORDER_MS / TICK_MS - 1);
  assert.equal(reorderThrow(state, 0, initial[0], 0), state);
  state = run(state, 1);
  const reordered = reorderThrow(state, 0, initial[0], 0);
  assert.notEqual(reordered, state);
  assert.equal(reordered.fighters[0].hand[0].uid, initial[0]);
});
test('relay adds one to every consecutive single card after the first, never draws, and resets on a batch', () => {
  let state = createThrowDuel(7, [], 'guard', 'relay');
  state.ai.thinkTick = 99999;
  let next = 0;
  const deal = (count) => {
    state.fighters[0].hand = Array.from({ length: count }, () => ({ uid: `relay${next++}`, rank: 6, suit: 0 }));
  };
  const bonus = () => {
    deal(3);
    return (
      previewThrow([state.fighters[0].hand[0]], [], state.fighters[0]).effects.find(
        (effect) => effect.source === 'relic:relay',
      )?.value ?? 0
    );
  };
  const single = () => {
    deal(3);
    const count = state.fighters[0].drawn;
    state = run(launchThrow(state, 0, [state.fighters[0].hand[0].uid]), 9);
    assert.ok(state.fighters[0].drawn - count <= 1, 'only the regular three-second draw');
  };
  assert.equal(bonus(), 0);
  single();
  assert.equal(bonus(), 1);
  single();
  assert.equal(bonus(), 1, 'capped at +1');
  assert.equal(launchThrow(state, 0, ['unknown']), state);
  deal(3);
  state = run(launchThrow(state, 0, state.fighters[0].hand.slice(0, 2).map((card) => card.uid)), 9);
  assert.equal(state.fighters[0].singles, 0);
  assert.equal(bonus(), 0, 'a batch resets the streak');
});
test('echo gathers three per impact below half life, up to nine, and is consumed only by a valid throw', () => {
  let state = createThrowDuel(9, [], 'guard', 'echo');
  state.ai.thinkTick = 99999;
  const strike = (index) => {
    state.fighters[1].hand = [{ uid: `attack${index}`, rank: 2, suit: 0 }];
    state = run(launchThrow(state, 1, [`attack${index}`]), 9);
  };
  strike(0);
  assert.equal(state.fighters[0].echo, 0, 'healthy magicians do not brood');
  state.fighters[0].hp = 150;
  for (let index = 1; index < 6; index++) strike(index);
  assert.equal(state.fighters[0].echo, 9);
  assert.equal(launchThrow(state, 0, ['unknown']), state);
  const card = state.fighters[0].hand[0];
  const expected = card.rank + 9;
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
  assert.equal(scorePoker(cards([14, 2, 3, 4, 6])).kind, 4);
});
test('straights, flushes and straight flushes start at three cards, including Ace-low runs', () => {
  for (const [ranks, suits, kind, comboLength] of [
    [[2, 3], [0, 0], 0, 0],
    [[2, 4], [1, 1], 0, 0],
    [[2, 3, 4], [0, 1, 2], 4, 3],
    [[2, 3, 4, 5], [0, 1, 2, 3], 4, 4],
    [[14, 2, 3], [0, 1, 2], 4, 3],
    [[14, 2, 3, 4], [0, 1, 2, 3], 4, 4],
    [[13, 14, 2], [0, 1, 2], 0, 0],
    [[2, 5, 9], [1, 1, 1], 5, 3],
    [[3, 7, 9, 12], [2, 2, 2, 2], 5, 4],
    [[2, 3, 4], [3, 3, 3], 8, 3],
    [[14, 2, 3], [3, 3, 3], 8, 3],
  ]) {
    const score = scorePoker(cards(ranks, suits));
    assert.equal(score.kind, kind, JSON.stringify([ranks, suits]));
    assert.equal(score.comboIds.length, comboLength);
  }
});
test('phase boundaries drive deal rounds and carry elapsed progress into the faster interval', () => {
  assert.equal(RULES_VERSION, 'throw-duel-v11');
  assert.equal(DEAL_SIZE, 2);
  assert.equal(battlePhase(600), 'opening');
  assert.equal(battlePhase(601), 'heated');
  assert.equal(battlePhase(1199), 'heated');
  assert.equal(battlePhase(1200), 'curtain');
  // Same card rate as v7 (one per 3 s / 2 s / 1.5 s), delivered two at a time.
  assert.equal(drawInterval([], 600), 120);
  assert.equal(drawInterval([], 601), 80);
  assert.equal(drawInterval([], 1199), 80);
  assert.equal(drawInterval([], 1200), 60);
  for (const [tick, interval] of [[599, 120], [600, 80], [1199, 60]]) {
    let state = idle();
    state.tick = tick;
    state.fighters[0].drawClock = interval - 1;
    state = run(state, 1);
    assert.equal(state.fighters[0].drawn, 7);
    assert.equal(state.fighters[0].drawClock, 0);
  }
  for (const [tick, interval] of [[601, 80], [1201, 60]]) {
    let state = idle();
    state.tick = tick;
    state = run(state, interval - 1);
    assert.equal(state.fighters[0].drawn, 5);
    state = run(state, 1);
    assert.equal(state.fighters[0].drawn, 7);
  }
});
test('short combinations earn proportional rewards and loose cards do not inflate item rewards', () => {
  for (const [ranks, multiplier, damage, itemBonus] of [
    [[2, 3, 4], 172, 15, 21],
    [[2, 3, 4, 5], 196, 27, 28],
    [[2, 3, 4, 5, 6], 220, 44, 36],
  ]) {
    const hand = cards(ranks);
    assert.equal(scorePoker(hand).multiplier, multiplier);
    assert.equal(scorePoker(hand).damage, damage);
    assert.equal(previewThrow(hand, ['sequence']).itemBonus, itemBonus);
  }
  const mixed = cards([2, 3, 4, 9, 10, 13], [0, 1, 2, 3, 1, 2]);
  assert.equal(previewThrow(mixed, ['sequence']).itemBonus, 21);
  assert.equal(previewThrow(cards([2, 5, 9], [1, 1, 1]), ['suit']).itemBonus, 18);
  assert.equal(previewThrow(cards([2, 5, 9, 13], [1, 1, 1, 1]), ['suit']).itemBonus, 24);
});
test('default sort no-ops never consume cooldown or change the seeded draw stream', () => {
  const state = idle();
  state.fighters[0].hand = cards([2, 3, 4]);
  const before = JSON.stringify(state);
  assert.equal(arrangeThrow(state, 0, 'rank'), state);
  assert.equal(arrangeThrow(state, 0, 'gather', ['missing']), state);
  assert.equal(JSON.stringify(state), before);
  const original = idle();
  const reordered = reorderThrow(original, 0, original.fighters[0].hand[0].uid, 4);
  assert.deepEqual(run(original, 60).fighters[0].pile, run(reordered, 60).fighters[0].pile);
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
  assert.equal(previewThrow(cards([2]), ['quick']).damage, 10);
  assert.equal(previewThrow(cards([2, 2]), ['pair']).damage, 16);
  assert.equal(
    previewThrow(cards([2, 3, 4, 5, 6]), ['sequence', 'mend']).damage,
    80,
  );
  assert.equal(drawInterval(['draw']), 120);
  assert.throws(() => createThrowDuel(1, ['quick', 'quick']));
  assert.throws(() =>
    createThrowDuel(1, ['sequence', 'suit', 'focus', 'mend', 'pair']),
  );
});
test('full hand pauses dealing, resumes once space opens, with no banked draws', () => {
  let state = run(idle(), 240);
  assert.equal(state.fighters[0].hand.length, 9);
  // A round with one free slot deals one card; the second is not banked.
  state = run(state, 120);
  assert.equal(state.fighters[0].hand.length, 10);
  assert.equal(state.fighters[0].drawn, 10);
  const serialized = JSON.stringify(state.fighters[0]);
  state = run(state, 120);
  assert.equal(JSON.stringify(state.fighters[0]), serialized);
  state = launchThrow(state, 0, [state.fighters[0].hand[0].uid, state.fighters[0].hand[1].uid]);
  state = run(state, 119);
  assert.equal(state.fighters[0].hand.length, 8);
  state = run(state, 1);
  assert.equal(state.fighters[0].hand.length, 10, 'a whole round lands at once');
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
  // The alarm clock's extra draws make the deck run out and reshuffle within the time limit.
  let state = createThrowDuel(1024, ['draw']);
  state.ai.thinkTick = 99999;
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
test('costumes reward narrow trunks: sequin for one family, tailcoat for exactly two; utility never counts', () => {
  const spade = cards([5], [0]);
  const shields = ['ward', 'thorns', 'umbrella'];
  assert.equal(previewThrow(spade, shields).shield, WARD_PER_SPADE);
  assert.equal(previewThrow(spade, [...shields, 'sequin']).shield, 15, 'one family: +25% of 12');
  assert.equal(previewThrow(spade, [...shields, 'sequin', 'draw']).shield, 15, 'utility items are not a family');
  assert.equal(previewThrow(spade, [...shields, 'sequin', 'quick']).shield, 12, 'two families: the vest is idle');
  const coat = previewThrow(spade, [...shields, 'quick', 'tailcoat']);
  assert.equal(coat.shield, 14, 'two families: +20% of 12');
  assert.equal(coat.damage, 5 + 8 + 1, '+20% of the 8 from the repair kit');
  assert.ok(coat.effects.some((effect) => effect.kind === 'link' && effect.name === '燕尾双修' && effect.value === 3));
  assert.equal(previewThrow(spade, [...shields, 'quick', 'wash', 'tailcoat']).shield, 12, 'three families: the coat is idle');
});
test('splash tax: shield and healing items are halved below three items of their family', () => {
  const spade = cards([5], [0]),
    heart = cards([5], [1]);
  assert.equal(SPLASH_MIN_ITEMS, 3);
  assert.equal(previewThrow(spade, ['ward']).shield, 6);
  assert.equal(previewThrow(spade, ['ward', 'thorns']).shield, 6);
  assert.equal(previewThrow(spade, ['ward', 'thorns', 'umbrella']).shield, 12);
  assert.equal(previewThrow(heart, ['mend']).heal, 4);
  assert.equal(previewThrow(heart, ['mend', 'wash', 'drain']).heal, 9);
  assert.equal(previewThrow(spade, ['quick']).damage, 5 + 8, 'other families are never taxed');
  assert.equal(previewThrow(cards([5, 6], [2, 2]), ['growth'], { lastSuit: 2 }).growth, 3);
  assert.equal(previewThrow(cards([5], [2]), ['growth'], { lastSuit: 2 }).growth, 0, 'a single card is not a run');
});
