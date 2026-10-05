import test from 'node:test';
import assert from 'node:assert/strict';
import parent from './encounter-model.json' with { type: 'json' };
import { lesson } from './rollout-training.ts';
import { encounterRequest, SCENARIOS, PROFILES } from './encounter.ts';
import { rankEncounter } from './encounter-policy.ts';
import {
  contextChoices,
  expandContextModel,
  rankContext,
  recordGoal,
  trainContextPreferences,
} from './context-policy.ts';
import { fingerprint } from './protocol.ts';

test('zero initialized context expansion preserves every original score and legal candidate identity', () => {
  const m = expandContextModel(parent);
  assert.equal(m.w1.length + m.b1.length + m.w2.length, 1472);
  for (const p of Object.keys(PROFILES))
    for (const { id } of SCENARIOS) {
      const s = lesson(99800, p, id),
        q = encounterRequest(s);
      const before = rankEncounter(parent, q),
        after = rankContext(m, contextChoices(s, [], q));
      assert.deepEqual(
        after.map((r) => [r.candidate.id, r.score]),
        before.map((r) => [r.candidate.id, r.score]),
      );
      assert.equal(q.candidates[0].features.length, 34);
    }
});
test('context adapter uses own memory, public geometry and observed facts, never unseen loot or rival inventory', () => {
  const s = lesson(99800, 'ally', 'help'),
    q = encounterRequest(s);
  const before = contextChoices(s, [], q),
    modified = structuredClone(s);
  modified.caches.forEach((c) => {
    c.contents = [];
  });
  modified.actors[0].bag = [];
  modified.enemies.push({ id: 'secret', x: 1, z: 1, hp: 999 });
  assert.deepEqual(contextChoices(modified, [], q), before);
  let memory = recordGoal([], 0, 'search:A');
  memory = recordGoal(memory, 30, 'search:B');
  memory = recordGoal(memory, 45, 'consume:water');
  assert.equal(memory.length, 2);
  assert.deepEqual(recordGoal(memory, 500, 'search:C'), [
    { tick: 500, key: 'search:C' },
  ]);
});
test('context preference gradients train reproducibly, preserve parents and exclude held out groups', () => {
  const m = expandContextModel(parent),
    q = encounterRequest(lesson(99800, 'ally', 'deathbag'));
  const choices = contextChoices(lesson(99800, 'ally', 'deathbag'), [], q);
  const row = {
    group: 'train',
    partition: 'train',
    evidenceId: 'manual-1',
    preferred: choices[1].features,
    rejected: choices[0].features,
  };
  const v = { ...row, group: 'test', partition: 'test' },
    hash = fingerprint(m);
  const a = trainContextPreferences([row, v], m, 900, 5);
  const b = trainContextPreferences(
    [row, { ...v, preferred: v.rejected, rejected: v.preferred }],
    m,
    900,
    5,
  );
  assert.deepEqual(a.w1, b.w1);
  assert.deepEqual(a.b1, b.b1);
  assert.deepEqual(a.w2, b.w2);
  assert.equal(fingerprint(m), hash);
  assert.ok(a.w1.some((x, i) => x !== m.w1[i]));
  assert.throws(
    () => trainContextPreferences([row, { ...v, group: 'train' }], m, 900),
    /leaking/,
  );
  assert.throws(
    () => trainContextPreferences([{ ...row, preferred: [NaN] }], m, 900),
    /Invalid/,
  );
});
