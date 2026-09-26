import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceEvents, pulseAt } from './battle-slice-fx.ts';
import { createBattleSlice, slicePreview } from './battle-slice.ts';
import { simulateDuel } from './demo-combat.ts';
import { act } from './demo-engine.ts';

test('VFX is derived without mutating the duel; overflow strikes both surfaces', () => {
  const run = act(createBattleSlice(), {
    type: 'place',
    id: 'slice-pad',
    at: 3,
  });
  const frames = simulateDuel(slicePreview(run)).frames;
  const before = structuredClone(frames);
  const events = surfaceEvents(frames);
  assert.deepEqual(frames, before);
  assert.deepEqual(events, surfaceEvents(structuredClone(frames)));
  for (const frame of frames)
    for (const hit of frame.hits) {
      const matches = events.filter(
        (e) =>
          e.time === frame.time &&
          e.sourceUid === hit.sourceUid &&
          e.side === hit.side,
      );
      if (hit.barrierAbsorbed > 0 && hit.healthLoss > 0) {
        assert.ok(matches.some((e) => e.kind === 'impact'));
        assert.ok(matches.some((e) => e.kind === 'core'));
      }
      if (hit.kind === 'shield' && hit.value === 0)
        assert.ok(!matches.some((e) => e.kind === 'repair'));
    }
  assert.ok(events.some((e) => e.kind === 'block'));
  assert.equal(events.filter((e) => e.kind === 'death').length, 1);
  assert.equal(
    events.filter((e) => e.kind === 'death')[0].time,
    frames.at(-1).time,
  );
});

test('repair VFX follows the resolved destination and actual amount', () => {
  const base = simulateDuel(slicePreview(createBattleSlice())).frames[0];
  const frames = [
    {
      ...base,
      hits: [
        {
          side: 1,
          kind: 'shield',
          source: 'repair',
          sourceUid: 'can',
          targetLane: 0,
          value: 6,
        },
        {
          side: 0,
          kind: 'shield',
          source: 'pad',
          sourceUid: 'pad',
          targetLane: 1,
          value: 0,
        },
      ],
    },
  ];
  assert.deepEqual(surfaceEvents(frames), [
    { time: 0, side: 1, lane: 0, sourceUid: 'can', kind: 'repair', value: 6 },
  ]);
});

test('replay animation envelope rewinds cleanly and expires', () => {
  const sequence = [8.5, 8.6, 8.7, 8.6, 8.4, 9].map((t) =>
    pulseAt(t, 8.5, 0.4),
  );
  assert.equal(sequence[0], 0);
  assert.equal(sequence[1], sequence[3]);
  assert.equal(sequence[4], 0);
  assert.equal(sequence[5], 0);
  assert.ok(sequence[2] > 0.99);
});
