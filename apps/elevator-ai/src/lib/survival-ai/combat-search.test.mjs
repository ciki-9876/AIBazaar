import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCombat,
  observeCombat,
  createCombatModel,
  advanceCombat,
  COMBAT_ACTIONS,
} from './combat-lab.ts';
import {
  emptySearchMemory,
  updateSearchMemory,
  searchChoices,
  searchDirection,
  controllerDecision,
  createSearchModel,
  rankSearch,
  SEARCH_FEATURES,
} from './combat-search.ts';
import { trainEncounter } from './encounter-policy.ts';
import { fingerprint } from './protocol.ts';

test('search memory is derived only from observations, survives occlusion and clears checked clues', () => {
  const s = createCombat(778, 'cover'),
    o = observeCombat(s),
    before = emptySearchMemory();
  const m = updateSearchMemory(before, o);
  assert.equal(Object.keys(before.clues).length, 0);
  assert.equal(Object.keys(m.clues).length, o.mobs.length);
  const hidden = {
    ...o,
    tick: 12,
    player: { ...o.player, x: 10, z: 10 },
    mobs: [],
  };
  const next = updateSearchMemory(m, hidden);
  assert.ok(Object.keys(next.clues).length > 0);
  assert.ok(Object.keys(next.clues).length <= Object.keys(m.clues).length);
  assert.deepEqual(
    searchChoices(hidden, next),
    searchChoices(structuredClone(hidden), structuredClone(next)),
  );
});
test('search actuator can leave an arena edge and route around walls without teleporting', () => {
  const s = createCombat(779, 'cover');
  s.player.x = 11.69;
  s.player.z = 8;
  const to = { x: -9, z: -9 };
  let n = s;
  for (let i = 0; i < 150; i++) {
    const a = searchDirection(observeCombat(n), to);
    const next = advanceCombat(n, a, 3);
    assert.ok(
      Math.hypot(next.player.x - n.player.x, next.player.z - n.player.z) <=
        0.381,
    );
    n = next;
    if (Math.hypot(n.player.x - to.x, n.player.z - to.z) < 0.7) break;
  }
  assert.ok(n.player.x < 9);
});
test('zero search head does not silently gain heuristic priority; visible enemies interrupt search', () => {
  const s = createCombat(780, 'cover'),
    o = observeCombat(s),
    memory = updateSearchMemory(emptySearchMemory(), o);
  const search = createSearchModel(781),
    combat = createCombatModel(782);
  assert.equal(SEARCH_FEATURES.length, 34);
  const none = { ...o, mobs: [] },
    choices = searchChoices(none, memory);
  assert.ok(
    choices.every(
      (c) => c.features.length === 34 && c.features.every(Number.isFinite),
    ),
  );
  assert.equal(rankSearch(search, choices)[0].key, 'hold');
  const idle = controllerDecision(none, memory, combat, search);
  assert.equal(idle.action.key, 'hold');
  const fight = controllerDecision(o, idle.memory, combat, search);
  assert.equal(fight.mode, 'combat');
});
test('search weight updates are reproducible, ignore held-out labels and preserve combat weights', () => {
  const o = { ...observeCombat(createCombat(783, 'cover')), mobs: [] },
    memory = updateSearchMemory(emptySearchMemory(), o),
    model = createSearchModel(784);
  const cs = searchChoices(o, memory),
    best = [...cs].sort((a, b) => b.utility - a.utility)[0];
  const row = {
    group: 'train',
    partition: 'train',
    candidates: cs.map((c) => ({
      features: c.features,
      key: c.key,
      utility: c.utility,
    })),
    bestKey: best.key,
  };
  const validation = { ...row, group: 'validation', partition: 'test' },
    before = fingerprint(model);
  const a = trainEncounter([row, validation], 785, 4, { initial: model.core });
  const b = trainEncounter(
    [
      row,
      {
        ...validation,
        candidates: validation.candidates.map((c) => ({ ...c, utility: 999 })),
      },
    ],
    785,
    4,
    { initial: model.core },
  );
  assert.deepEqual(a.w1, b.w1);
  assert.deepEqual(a.w2, b.w2);
  assert.equal(fingerprint(model), before);
  assert.ok(a.w2.some((v) => v !== 0));
  assert.throws(() =>
    advanceCombat(
      createCombat(786, 'cover'),
      { ...COMBAT_ACTIONS[0], x: 5 },
      3,
    ),
  );
});
