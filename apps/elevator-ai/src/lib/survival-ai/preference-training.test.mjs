import test from 'node:test';
import assert from 'node:assert/strict';
import model from './encounter-model.json' with { type: 'json' };
import { lesson } from './rollout-training.ts';
import { encounterRequest } from './encounter.ts';
import {
  rankEncounter,
  trainEncounterPreferences,
  validateEncounterModel,
} from './encounter-policy.ts';
import { fingerprint } from './protocol.ts';

test('reviewed preference updates a real margin reproducibly without mutating its parent', () => {
  const request = encounterRequest(lesson(74101, 'ally', 'deathbag'));
  const preferred = request.candidates.find(
    (c) => c.action.type === 'consume',
  ).features;
  const rejected = request.candidates.find(
    (c) => c.key === 'engage:player',
  ).features;
  const row = {
    group: 'course-1',
    partition: 'train',
    evidenceId: 'review-1',
    preferred,
    rejected,
  };
  const before = fingerprint(model);
  const a = trainEncounterPreferences([row], model, 900, 10);
  const b = trainEncounterPreferences([row], model, 900, 10);
  const margin = (m) => {
    const scores = rankEncounter(m, {
      candidates: [
        { key: 'a', features: preferred },
        { key: 'b', features: rejected },
      ],
    });
    return (
      scores.find((x) => x.candidate.key === 'a').score -
      scores.find((x) => x.candidate.key === 'b').score
    );
  };
  assert.deepEqual(a, b);
  assert.ok(margin(a) > margin(model));
  assert.equal(fingerprint(model), before);
  assert.equal(a.training.parentVersion, model.version);
  assert.equal(a.training.source, 'session-reviewed-preference-v1');
  validateEncounterModel(JSON.parse(JSON.stringify(a)));
});

test('held-out labels never enter updates and cannot share a training trajectory', () => {
  const preferred = Array(34).fill(0),
    rejected = Array(34).fill(0);
  preferred[1] = 1;
  rejected[0] = 1;
  const row = {
    group: 'train-seed',
    partition: 'train',
    evidenceId: 'review',
    preferred,
    rejected,
  };
  const val = { ...row, group: 'validation-seed', partition: 'test' };
  const a = trainEncounterPreferences([row, val], model, 900, 2);
  const b = trainEncounterPreferences(
    [row, { ...val, preferred: rejected, rejected: preferred }],
    model,
    900,
    2,
  );
  assert.deepEqual(a.w1, b.w1);
  assert.deepEqual(a.b1, b.b1);
  assert.deepEqual(a.w2, b.w2);
  assert.throws(
    () =>
      trainEncounterPreferences(
        [row, { ...val, group: row.group }],
        model,
        900,
        2,
      ),
    /leaking/,
  );
  assert.throws(
    () =>
      trainEncounterPreferences([{ ...row, preferred: [NaN] }], model, 900, 2),
    /Invalid/,
  );
  assert.throws(
    () => trainEncounterPreferences([row], model, 900, 2, Infinity),
    /Invalid/,
  );
});
