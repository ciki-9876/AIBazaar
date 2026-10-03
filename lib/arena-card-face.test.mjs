import test from 'node:test';
import assert from 'node:assert/strict';
import { coreStats, sampleFighter } from './arena-card-face.ts';
import { ARENA_CARDS } from './arena-catalog.ts';
import { makeArenaDuel, OPENING_LINEUP } from './arena-challenge.ts';
import { simulateDuel } from './cards/combat.ts';

const duelFor = (cards) =>
  makeArenaDuel(
    cards,
    { ...OPENING_LINEUP, cards: [], amps: [null, null, null] },
    [null, null, null],
  );
const effect = (stats, kind) => stats.find((s) => s.kind === kind)?.value;

test('one-slot mixed effects match the actual launched effects; controls are not damage', () => {
  const card = sampleFighter('arena-17'),
    duel = duelFor([card]);
  const result = simulateDuel(duel),
    stats = coreStats(card);
  const launch = result.frames.find((f) => f.fired.includes(card.uid));
  assert.equal(
    effect(stats, 'damage'),
    launch.projectiles.find((p) => p.kind === 'damage').value,
  );
  assert.equal(
    effect(stats, 'corrode'),
    launch.projectiles.find((p) => p.kind === 'corrode').value,
  );
  assert.equal(stats.length, 2);
  assert.deepEqual(coreStats(sampleFighter('arena-31')), []);
  assert.deepEqual(coreStats(sampleFighter('arena-34')), []);
});

test('per-projectile numbers do not multiply the twin cannon volley', () => {
  const card = { ...sampleFighter('arena-02'), level: 2, quality: 1 };
  const result = simulateDuel(duelFor([card]));
  const shots = result.frames.find((f) =>
    f.fired.includes(card.uid),
  ).projectiles;
  assert.equal(shots.length, 2);
  for (const shot of shots)
    assert.equal(effect(coreStats(card), 'damage'), shot.value);
});

test('solo placement and third-shot previews agree with the next launch', () => {
  const solo = sampleFighter('arena-41'),
    duel = duelFor([solo]);
  const shot = simulateDuel(duel).frames.find((f) => f.fired.includes(solo.uid))
    .projectiles[0];
  assert.equal(
    effect(coreStats(solo, undefined, 0, duel), 'damage'),
    shot.value,
  );
  const repeated = sampleFighter('arena-06'),
    result = simulateDuel(duelFor([repeated]));
  const thirdIndex = result.frames.findIndex(
    (f) => f.cardState[repeated.uid].activations === 3,
  );
  const before = result.frames[thirdIndex - 1],
    third = result.frames[thirdIndex];
  assert.equal(
    effect(coreStats(repeated, before), 'damage'),
    third.projectiles.find((p) => p.sourceUid === repeated.uid).value,
  );
  assert.equal(effect(coreStats(repeated, before), 'damage'), 52);
});

test('conditional repair, quest and dual-mode previews retain their real conditions', () => {
  const mod = sampleFighter('arena-48'),
    frames = simulateDuel(duelFor([mod])).frames;
  const frame = structuredClone(frames[0]);
  assert.equal(effect(coreStats(mod, frame), 'damage'), 28);
  frame.barriers[0][0].hp = 45;
  assert.equal(effect(coreStats(mod, frame), 'shield'), 24);
  frame.barriers[0][0].broken = true;
  assert.equal(effect(coreStats(mod, frame), 'damage'), 28);
  const quest = sampleFighter('arena-47');
  assert.equal(effect(coreStats(quest), 'shield'), 8);
  frame.cardState[quest.uid] = {
    questHits: 2,
    questAbsorbed: 45,
    growth: 4,
    upgrade: 0,
  };
  assert.equal(effect(coreStats(quest, frame), 'damage'), 34);
  frame.barriers[0][0] = { hp: 35, maxHp: 90, broken: false };
  assert.equal(
    effect(coreStats(sampleFighter('arena-29'), frame), 'shield'),
    30,
  );
});

test('rendering every card throughout a duel does not mutate frames or inputs', () => {
  for (const def of ARENA_CARDS) {
    const card = sampleFighter(def.id),
      duel = makeArenaDuel([card], OPENING_LINEUP, [null, null, null]);
    const result = simulateDuel(duel),
      before = JSON.stringify({ duel, result });
    for (const frame of result.frames.filter((_, i) => i % 16 === 0)) {
      const stats = coreStats(card, frame, 0, duel);
      assert.equal(new Set(stats.map((s) => s.key)).size, stats.length);
      assert.ok(stats.every((s) => Number.isFinite(s.value) && s.value >= 0));
    }
    assert.equal(JSON.stringify({ duel, result }), before);
  }
});
