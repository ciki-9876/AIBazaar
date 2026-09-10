import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateDuel, cardMaxHp, reviveTimeOf } from './demo-combat.ts';
import { newRun, act, migrateCargo, validSave } from './demo-engine.ts';
test('ghost: lethal card damage disables targeting, activations and in-flight effects until full revival', () => {
  const p = { uid: 'p', id: 'knife', at: 0, rarity: 4, quality: 2, level: 5 };
  const e = { uid: 'e', id: 'knife', at: 0, rarity: 0, quality: 0, level: 0 };
  const r = simulateDuel({
    player: [p],
    enemy: [e],
    maxHp: [10000, 10000],
    weather: 0,
    layout: 0,
    kind: 'guardian',
    name: 'test',
    botId: null,
  });
  const dead = r.frames.find((f) => f.cards.e.reviveAt !== null);
  assert.ok(dead);
  assert.equal(dead.cards.e.hp, 0);
  assert.equal(dead.cards.e.reviveAt - dead.time, reviveTimeOf(e));
  const interval = r.frames.filter(
    (f) => f.time > dead.time && f.time < dead.cards.e.reviveAt,
  );
  for (const f of interval) {
    assert.ok(!f.fired.includes('e'));
    assert.ok(!f.hits.some((h) => h.targetUid === 'e' || h.sourceUid === 'e'));
    assert.ok(
      !f.projectiles.some((h) => h.targetUid === 'e' || h.sourceUid === 'e'),
    );
  }
  assert.ok(
    interval.some((f) =>
      f.hits.some((h) => h.sourceUid === 'p' && !h.targetUid),
    ),
  );
  const revived = r.frames.find((f) => f.time === dead.cards.e.reviveAt);
  assert.equal(revived.cards.e.hp, cardMaxHp(e));
  assert.equal(revived.cards.e.reviveAt, null);
  assert.equal(revived.timers[1][0], 0);
  assert.ok(reviveTimeOf({ ...e, level: 5 }) < reviveTimeOf(e));
});
test('migration: vertical cargo is preserved horizontally and rotation requests reject atomically', () => {
  let s = act(newRun(51), { type: 'begin' });
  s = act(s, { type: 'move', id: 'starter-shelter', to: 'bag' });
  s.items.find((x) => x.uid === 'starter-shelter').rotated = true;
  const copy = structuredClone(s),
    migrated = migrateCargo(s);
  assert.deepEqual(s, copy);
  assert.deepEqual(
    migrated.items.map((x) => x.uid).sort(),
    s.items.map((x) => x.uid).sort(),
  );
  assert.ok(migrated.items.every((x) => !x.rotated));
  assert.ok(validSave(s));
  assert.ok(validSave(migrated));
  assert.throws(() =>
    act(migrated, { type: 'move', id: 'apple', to: 'bag', rotated: true }),
  );
});
