import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCombat,
  advanceCombat,
  observeCombat,
  COMBAT_ACTIONS,
  COMBAT_FEATURES,
  createCombatModel,
  rankCombat,
  teacherCombat,
  validateCombatModel,
} from './combat-lab.ts';
import { fingerprint } from './protocol.ts';
import { trainEncounter } from './encounter-policy.ts';

test('combat curriculum is seeded, immutable, automatic and replayable without a cast action', () => {
  const a = createCombat(771, 'cluster'),
    before = fingerprint(a);
  let s = a;
  const inputs = [COMBAT_ACTIONS[2], COMBAT_ACTIONS[5], COMBAT_ACTIONS[0]];
  for (const i of inputs) s = advanceCombat(s, i, 30);
  let replay = createCombat(771, 'cluster');
  for (const i of inputs) replay = advanceCombat(replay, i, 30);
  assert.deepEqual(s, replay);
  assert.equal(fingerprint(a), before);
  assert.ok(s.metrics.shots > 0);
  assert.ok(s.metrics.hitsByShot.every((n) => n > 0));
  assert.throws(() => advanceCombat(a, { key: 'hold', x: 999, z: 0 }, 30));
  assert.equal(fingerprint(a), before);
});
test('combat teacher and learned observation cannot see a hidden monster or an unseen projectile', () => {
  const s = createCombat(772, 'cover');
  const changed = structuredClone(s);
  changed.mobs.push({
    id: 'hidden',
    x: 20,
    z: 20,
    hp: 900,
    kind: 'stalker',
    speed: 99,
    attackAt: 0,
    lastSeen: { x: 0, z: 0 },
    seenAt: -1000,
  });
  changed.projectiles.push({ id: 'hidden-shot', x: 20, z: 20, impactAt: 1 });
  const model = createCombatModel(4);
  assert.deepEqual(observeCombat(s), observeCombat(changed));
  assert.deepEqual(
    rankCombat(model, observeCombat(s)),
    rankCombat(model, observeCombat(changed)),
  );
  assert.deepEqual(
    teacherCombat(s).map((a) => [a.key, a.utility]),
    teacherCombat(changed).map((a) => [a.key, a.utility]),
  );
});
test('AoE really damages multiple targets and walls prevent direct automatic targeting', () => {
  const s = createCombat(773, 'cluster');
  s.mobs = s.mobs
    .slice(0, 3)
    .map((m, i) => ({ ...m, x: 0, z: 3 + i * 0.4, hp: 10, speed: 0 }));
  s.weapon.fireAt = 1;
  const shot = advanceCombat(s, COMBAT_ACTIONS[0], 1);
  assert.equal(shot.metrics.kills, 3);
  assert.deepEqual(shot.metrics.hitsByShot, [3]);
  s.walls = [{ x: 0, z: 1.5, w: 6, d: 1 }];
  const blocked = advanceCombat(s, COMBAT_ACTIONS[0], 1);
  assert.equal(blocked.metrics.shots, 0);
  assert.equal(observeCombat(s).mobs.length, 0);
});
test('combat model uses a distinct feature contract, performs real repeatable updates and ignores validation labels', () => {
  const parent = createCombatModel(774),
    before = fingerprint(parent);
  assert.equal(COMBAT_FEATURES.length, 34);
  const ranked = teacherCombat(createCombat(775, 'kite'));
  const row = {
    group: 'training',
    partition: 'train',
    bestKey: ranked[0].key,
    candidates: ranked.map((a) => ({
      key: a.key,
      features: a.features,
      utility: a.utility,
    })),
  };
  const validation = { ...row, group: 'validation', partition: 'test' };
  const a = trainEncounter([row, validation], 776, 3, {
    initial: parent.core,
    source: 'observed-rollout-v1',
  });
  const b = trainEncounter(
    [
      row,
      {
        ...validation,
        candidates: validation.candidates.map((c) => ({
          ...c,
          utility: c.utility + 999,
        })),
      },
    ],
    776,
    3,
    { initial: parent.core, source: 'observed-rollout-v1' },
  );
  assert.deepEqual(a.w1, b.w1);
  assert.deepEqual(a.w2, b.w2);
  assert.equal(fingerprint(parent), before);
  assert.ok(a.w2.some((v) => v !== 0));
  assert.throws(() =>
    validateCombatModel({
      ...parent,
      featureNames: [...COMBAT_FEATURES].reverse(),
    }),
  );
});
