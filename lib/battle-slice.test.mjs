import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattleSlice,
  slicePreview,
  startSlice,
  settleSlice,
  sliceEvidence,
} from './battle-slice.ts';
import { act, makeItem } from './demo-engine.ts';
import { simulateDuel } from './demo-combat.ts';

test('3D slice uses identical preview, opening and deterministic replay', () => {
  const ready = act(createBattleSlice(), {
    type: 'place',
    id: 'slice-pad',
    at: 3,
  });
  const preview = slicePreview(ready),
    playing = startSlice(ready);
  assert.deepEqual(playing.duel, preview);
  const first = simulateDuel(playing.duel),
    second = simulateDuel(structuredClone(playing.duel));
  assert.deepEqual(first, second);
  assert.equal(first.winner, 0);
  assert.ok(first.frames.some((f) => f.projectiles.length));
  assert.ok(
    first.frames.some((f) => f.hits.some((h) => h.sourceUid === 'slice-blade')),
  );
  const rearranged = act(playing, { type: 'place', id: 'slice-pad', at: 4 });
  assert.deepEqual(rearranged.duel, playing.duel);
});

test('same resources, changing cushion lane produces real mitigation difference', () => {
  const base = act(createBattleSlice(), {
    type: 'place',
    id: 'slice-pad',
    at: 3,
  });
  const good = simulateDuel(
    slicePreview(act(base, { type: 'place', id: 'slice-pad', at: 3 })),
  );
  const bad = simulateDuel(
    slicePreview(act(base, { type: 'place', id: 'slice-pad', at: 0 })),
  );
  const goodEvidence = sliceEvidence(good.frames),
    badEvidence = sliceEvidence(bad.frames);
  assert.equal(good.winner, 0);
  assert.equal(bad.winner, 0);
  assert.ok(goodEvidence.reduced > 0);
  assert.equal(badEvidence.reduced, 0);
  assert.ok(goodEvidence.ownLoss < badEvidence.ownLoss);
});

test('placement failures are atomic and board swaps preserve identities', () => {
  const base = createBattleSlice(),
    copy = structuredClone(base);
  assert.throws(() => act(base, { type: 'place', id: 'slice-pad', at: 1 }));
  assert.deepEqual(base, copy);
  const swapped = act(base, { type: 'place', id: 'slice-blade', at: 6 });
  assert.equal(swapped.items.find((x) => x.uid === 'slice-sling').at, 0);
  assert.equal(swapped.items.find((x) => x.uid === 'slice-blade').at, 6);
  const big = {
    ...base,
    items: [...base.items, makeItem('test-bow', 'springbow', 'card')],
  };
  assert.throws(() => act(big, { type: 'place', id: 'test-bow', at: 2 }));
  assert.equal(big.items.find((x) => x.uid === 'test-bow').zone, 'bag');
});

test('victory loot belongs to defeated enemy and cannot be settled or claimed twice', () => {
  const playing = startSlice(
    act(createBattleSlice(), { type: 'place', id: 'slice-pad', at: 3 }),
  );
  const won = settleSlice(playing),
    source = playing.duel.enemy.find((c) => c.uid === won.loot.sourceUid);
  assert.equal(won.loot.item.id, source.id);
  assert.throws(() => settleSlice(won));
  const revealed = act(won, { type: 'reveal-loot' }),
    uid = revealed.loot.item.uid;
  const claimed = act(revealed, { type: 'claim-loot' });
  assert.equal(claimed.items.filter((x) => x.uid === uid).length, 1);
  // A boss may have a separate chest queued, but its identity is distinct.
  assert.notEqual(claimed.loot?.item.uid, uid);
});

// Regression: moving within a lane must move the impact, not converge on its centre.
test('slice keeps parallel slot trajectories and explicit cross-lane offsets', async () => {
  const { impactX, slotX } = await import('./battle-slice-visual.ts');
  for (let at = 0; at < 9; at++) {
    const c = {
      uid: 'stone',
      id: 'slingshot',
      at,
      quality: 0,
      rarity: 0,
      level: 0,
    };
    assert.equal(impactX(c, Math.floor(at / 3)), slotX(at));
    assert.ok(
      Math.abs(impactX(c, 1) - (slotX(at) + (1 - Math.floor(at / 3)) * 3.46)) <
        1e-8,
    );
  }
  assert.equal(
    impactX(
      { uid: 'bow', id: 'springbow', at: 3, quality: 0, rarity: 0, level: 0 },
      1,
    ),
    slotX(3, 2),
  );
});

test('slice weapon flight profiles change actual arrival times and retain replay determinism', () => {
  const duel = slicePreview(createBattleSlice());
  const result = simulateDuel(duel);
  const projectiles = result.frames.flatMap((f) => f.projectiles);
  const stone = projectiles.find((p) => p.sourceUid === 'slice-sling');
  const bow = projectiles.find((p) => p.source.includes('卷簧'));
  assert.equal(stone.impactAt - stone.launchedAt, 0.75);
  assert.equal(bow.impactAt - bow.launchedAt, 0.5);
  for (const shot of [stone, bow]) {
    assert.ok(
      result.frames
        .find((f) => f.time === shot.impactAt)
        .hits.some((h) => h.sourceUid === shot.sourceUid),
    );
    assert.ok(
      !result.frames
        .filter((f) => f.time >= shot.launchedAt && f.time < shot.impactAt)
        .some((f) => f.hits.some((h) => h.sourceUid === shot.sourceUid)),
    );
  }
  assert.ok(!projectiles.some((p) => p.sourceUid === 'slice-blade'));
});
