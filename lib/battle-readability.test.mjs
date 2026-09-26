import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardCamera,
  equipmentZ,
  barrierZ,
  coreZ,
  slotX,
  impactX,
  SHOT_HEIGHT,
  BARRIER_HEIGHT,
  BARRIER_WIDTH,
} from './battle-slice-visual.ts';
import { battleFeedback } from './battle-slice-fx.ts';
import {
  createBattleSlice,
  slicePreview,
  sliceEvidence,
} from './battle-slice.ts';
import { simulateDuel } from './demo-combat.ts';
import { act } from './demo-engine.ts';

test('both firing directions leave own barrier behind and hit every slot without convergence', () => {
  for (const side of [0, 1]) {
    const direction = side ? 1 : -1;
    assert.ok((equipmentZ(side) - barrierZ(side)) * direction > 0);
    assert.ok((barrierZ(1 - side) - equipmentZ(side)) * direction > 0);
    assert.ok((coreZ(1 - side) - barrierZ(1 - side)) * direction > 0);
    for (let at = 0; at < 9; at++) {
      const card = {
        id: 'slingshot',
        uid: `${side}/${at}`,
        at,
        level: 0,
        rarity: 0,
        quality: 0,
      };
      const lane = Math.floor(at / 3);
      assert.equal(impactX(card, lane), slotX(at));
      assert.ok(
        Math.abs(impactX(card, lane) - (lane - 1) * 3.46) < BARRIER_WIDTH / 2,
      );
    }
  }
  assert.ok(SHOT_HEIGHT > 0.5 && SHOT_HEIGHT < 0.05 + BARRIER_HEIGHT);
  assert.ok(
    3.46 * 2 + BARRIER_WIDTH >= 10.2,
    'barriers span the continuous core',
  );
});

test('tactical perspective fits both nine-slot boards and cores on desktop and narrow windows', () => {
  for (const [width, height] of [
    [1280, 524],
    [1440, 704],
    [800, 668],
    [640, 568],
  ]) {
    const camera = boardCamera(width / height),
      [, cy, cz] = camera.position;
    const d = Math.hypot(cy, cz),
      sin = cy / d,
      cos = cz / d,
      tan = Math.tan((camera.fov * Math.PI) / 360);
    const projectsInside = (x, y, z) => {
      const depth = d - y * sin - z * cos;
      assert.ok(
        Math.abs(x / depth / tan / (width / height)) < 1,
        `${width}: horizontal clip`,
      );
      assert.ok(
        Math.abs((y * cos - z * sin) / depth / tan) < 1,
        `${width}: vertical clip`,
      );
    };
    assert.ok((Math.atan2(cy, cz) * 180) / Math.PI > 55);
    for (const side of [0, 1])
      for (let at = 0; at < 9; at++) {
        for (const dx of [-0.45, 0.45])
          for (const dz of [-0.53, 0.53])
            projectsInside(slotX(at) + dx, 0.1, equipmentZ(side) + dz);
      }
    for (const side of [0, 1])
      for (const x of [-5.1, 5.1]) projectsInside(x, 1, coreZ(side));
  }
});

test('readable hit feedback preserves actual totals, identities and simultaneous overflow', () => {
  const duel = slicePreview(
    act(createBattleSlice(), { type: 'place', id: 'slice-pad', at: 3 }),
  );
  const result = simulateDuel(duel),
    original = structuredClone(result.frames);
  const feedback = battleFeedback(result.frames);
  assert.deepEqual(result.frames, original);
  assert.deepEqual(feedback, battleFeedback(structuredClone(result.frames)));
  const evidence = sliceEvidence(result.frames);
  assert.equal(
    feedback.filter((f) => f.side === 0).reduce((n, f) => n + f.core, 0),
    evidence.ownLoss,
  );
  assert.equal(
    feedback.filter((f) => f.side === 0).reduce((n, f) => n + f.blocked, 0),
    20,
  );
  assert.equal(evidence.ownLoss, 26);
  assert.equal(result.duration, 24);
  assert.ok(feedback.some((f) => f.absorbed > 0 && f.core > 0));
  assert.ok(feedback.every((f) => f.sources.length || f.broken));
  assert.ok(
    feedback.flatMap((f) => f.sources).some((s) => s.includes('[slice-sling]')),
  );
  assert.deepEqual(simulateDuel(duel), result);
});

test('feedback merges simultaneous contacts and omits zero-effect repair', () => {
  const base = simulateDuel(slicePreview(createBattleSlice())).frames[0];
  const hits = [
    {
      side: 1,
      kind: 'damage',
      source: 'A',
      sourceUid: 'a',
      targetLane: 2,
      value: 7,
      barrierAbsorbed: 4,
      healthLoss: 3,
    },
    {
      side: 1,
      kind: 'damage',
      source: 'B',
      sourceUid: 'b',
      targetLane: 2,
      value: 2,
      healthLoss: 2,
    },
    {
      side: 0,
      kind: 'shield',
      source: 'C',
      sourceUid: 'c',
      targetLane: 1,
      value: 0,
    },
  ];
  const merged = battleFeedback([{ ...base, hits }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].absorbed, 4);
  assert.equal(merged[0].core, 5);
  assert.deepEqual(merged[0].sources, ['A [a]', 'B [b]']);
});
