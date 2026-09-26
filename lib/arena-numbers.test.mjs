import test from 'node:test';
import assert from 'node:assert/strict';
import { combatNumbers, numberPose, NUMBER_LIFETIME } from './arena-numbers.ts';
import { makeArenaDuel, OPENING_LINEUP } from './arena-challenge.ts';
import { simulateDuel } from './demo-combat.ts';
import { cardDef } from './demo-cards.ts';

const card = (n, at) => ({
  id: `arena-${String(n).padStart(2, '0')}`,
  uid: `n-${n}`,
  at,
  rarity: cardDef(`arena-${String(n).padStart(2, '0')}`).rarity,
  level: 0,
  quality: 0,
});
const duel = makeArenaDuel(
  [card(11, 0), card(21, 2), card(28, 3), card(17, 4), card(3, 6)],
  OPENING_LINEUP,
  [null, null, null],
);

test('combat numbers distinguish resolved overflow, stacks, ineffective repair and separate surfaces', () => {
  const base = { side: 1, targetLane: 0, sourceUid: 'n-11', source: 'test' };
  const frames = [
    {
      time: 3,
      hits: [
        {
          ...base,
          kind: 'damage',
          value: 100,
          barrierAbsorbed: 10,
          healthLoss: 7,
          blocked: 83,
        },
        { ...base, kind: 'burn', value: 6 },
        { ...base, kind: 'corrode', value: 3 },
        { ...base, kind: 'shield', value: 0 },
        { ...base, kind: 'shield', value: 4 },
        { ...base, kind: 'heal', value: 2 },
        { ...base, kind: 'burn', value: 3, periodic: true, barrierAbsorbed: 3 },
      ],
    },
  ];
  const before = JSON.stringify(frames),
    numbers = combatNumbers(duel, frames);
  assert.deepEqual(
    numbers.map((n) => [n.surface, n.kind, n.value]),
    [
      ['barrier', 'damage', 10],
      ['core', 'damage', 7],
      ['barrier', 'repair', 4],
      ['core', 'heal', 2],
      ['barrier', 'burn', 3],
    ],
  );
  assert.ok(numbers.every((n) => n.column === 0.5));
  assert.equal(JSON.stringify(frames), before);
});

test('float totals reconcile with actual damage, repairs and healing over a full mixed duel', () => {
  const result = simulateDuel(duel),
    before = JSON.stringify(result);
  const numbers = combatNumbers(duel, result.frames);
  const sum = (values) =>
    Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
  for (const side of [0, 1]) {
    const hits = result.frames
      .flatMap((f) => f.hits)
      .filter((h) => h.side === side);
    assert.equal(
      sum(
        numbers
          .filter(
            (n) => n.side === side && !['repair', 'heal'].includes(n.kind),
          )
          .map((n) => n.value),
      ),
      sum(hits.map((h) => (h.barrierAbsorbed ?? 0) + (h.healthLoss ?? 0))),
    );
    for (const [kind, hitKind] of [
      ['repair', 'shield'],
      ['heal', 'heal'],
    ])
      assert.equal(
        sum(
          numbers
            .filter((n) => n.side === side && n.kind === kind)
            .map((n) => n.value),
        ),
        sum(hits.filter((h) => h.kind === hitKind).map((h) => h.value)),
      );
  }
  assert.equal(JSON.stringify(result), before);
  assert.deepEqual(combatNumbers(duel, result.frames), numbers);
});

test('number poses rewind exactly, freeze when paused and expire through final settle', () => {
  const n = { time: 10, track: -1, kind: 'damage' };
  const original = numberPose(n, 10.5);
  numberPose(n, 11);
  assert.deepEqual(numberPose(n, 10.5), original);
  assert.equal(numberPose(n, 9.99).opacity, 0);
  assert.equal(numberPose(n, 10 + NUMBER_LIFETIME + 0.01).opacity, 0);
  assert.deepEqual(numberPose(n, 10.5, true), numberPose(n, 10.7, true));
});
