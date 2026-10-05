import test from 'node:test';
import assert from 'node:assert/strict';
import model from './encounter-model.json' with { type: 'json' };
import {
  lesson,
  observedBelief,
  runEpisode,
  replayEpisode,
  rolloutRow,
} from './rollout-training.ts';
import { encounterRequest } from './encounter.ts';
import { fingerprint } from './protocol.ts';
import { trainEncounter, validateEncounterModel } from './encounter-policy.ts';

test('rollout teacher cannot use hidden loot, opponent inventory or unseen enemies', () => {
  const s = lesson(41001, 'ally', 'search'),
    changed = structuredClone(s);
  const visible = encounterRequest(s).observation;
  for (const c of changed.caches)
    if (!visible.caches.find((x) => x.id === c.id)?.kind)
      c.contents = [
        { ...c.item, uid: 'hidden-replacement', kind: 'core', value: 999 },
      ];
  changed.actors[0].bag = [
    { ...changed.caches[0].item, uid: 'secret-inventory', kind: 'medicine' },
  ];
  for (const e of changed.enemies)
    if (!visible.threats.some((x) => x.id === e.id)) {
      e.hp = 999;
      e.kind = 'boss';
    }
  assert.deepEqual(encounterRequest(changed), encounterRequest(s));
  assert.deepEqual(observedBelief(changed, 41001), observedBelief(s, 41001));
  assert.deepEqual(
    rolloutRow(changed, model, 'train'),
    rolloutRow(s, model, 'train'),
  );
});

test('recorded choices reproduce full episode state without reinference', () => {
  const s = lesson(63001, 'broker', 'water'),
    run = runEpisode(s, model, 90);
  assert.equal(run.violations, 0);
  assert.equal(
    fingerprint(replayEpisode(s, run.inputs, run.state.tick)),
    run.hash,
  );
});

test('warm training updates real weights reproducibly and preserves old checkpoint', () => {
  const old = fingerprint(model),
    row = rolloutRow(lesson(41001, 'ally', 'help'), model, 'train');
  const options = { initial: model, source: 'observed-rollout-v1', rate: 0.01 };
  const a = trainEncounter([row], 123, 2, options),
    b = trainEncounter([row], 123, 2, options);
  validateEncounterModel(a);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.w1, model.w1);
  assert.equal(a.training.parentVersion, model.version);
  assert.equal(fingerprint(model), old);
  assert.throws(
    () => trainEncounter([row, { ...row, partition: 'test' }], 123, 2, options),
    /Leaking/,
  );
});
