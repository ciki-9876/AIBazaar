import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaReview,
  placeOnArena,
  placementPreview,
  formationRelations,
  cardStatus,
} from './arena-presentation.ts';
import { simulateDuel } from './demo-combat.ts';
import { cardDef } from './demo-cards.ts';
import { makeArenaDuel, OPENING_LINEUP } from './arena-challenge.ts';
import { summarizeMatch, parseArchive } from './arena-archive.ts';
const card = (n, at, uid = `p-${n}`) => ({
  uid,
  id: `arena-${String(n).padStart(2, '0')}`,
  at,
  rarity: cardDef(`arena-${String(n).padStart(2, '0')}`).rarity,
  quality: 0,
  level: 0,
});

test('table moves preserve identities and reject overlapping/cross-lane moves atomically', () => {
  const board = [card(11, 0), card(15, 2)],
    original = structuredClone(board);
  const moved = placeOnArena(board, 'arena-11', 3, 'p-11', true);
  assert.equal(moved.find((c) => c.uid === 'p-11').at, 3);
  assert.deepEqual(board, original);
  assert.throws(() => placeOnArena(board, 'arena-11', 1, 'p-11', true), /重叠/);
  assert.equal(placementPreview(board, 'arena-11', 2, 'p-11').allowed, false);
  assert.throws(
    () => placeOnArena(board, 'arena-11', 3, 'missing', true),
    /未找到/,
  );
  assert.deepEqual(board, original);
});
test('formation relations select left priority and never bridge an empty slot or another lane', () => {
  const board = [card(1, 0), card(31, 1), card(4, 2), card(1, 3, 'other')];
  assert.deepEqual(formationRelations(board[1], board).targets, ['p-1']);
  assert.deepEqual(
    formationRelations(card(31, 2), [card(1, 0), card(31, 2)]).targets,
    [],
  );
  assert.match(
    formationRelations(card(41, 0), [card(41, 0), card(1, 3)]).note,
    /已满足/,
  );
});
test('review reconciles actual shield/host losses and excludes periodic damage from per-card credit', () => {
  const duel = makeArenaDuel(
    [card(11, 0), card(15, 2), card(3, 3), card(3, 6, 'second')],
    OPENING_LINEUP,
    ['amp-05', null, null],
  );
  const result = simulateDuel(duel),
    before = JSON.stringify(result),
    review = arenaReview(duel, result.frames);
  const archived = summarizeMatch('test', 'opening', null, duel, result);
  for (let side = 0; side < 2; side++) {
    assert.ok(
      Math.abs(
        review.lanes[side].reduce((n, l) => n + l.host, 0) -
          archived.summary.damageToHost[side],
      ) < 0.11,
    );
    assert.ok(
      Math.abs(
        review.lanes[side].reduce((n, l) => n + l.barrier, 0) -
          archived.summary.damageToBarrier[side],
      ) < 0.11,
    );
  }
  assert.equal(review.cards['p-11'].damage, 0);
  assert.ok(review.lanes[1][0].periodic > 0);
  assert.ok(review.events.some((e) => e.kind === 'break'));
  assert.ok(review.events.some((e) => e.kind === 'link' && e.to === 'p-15'));
  assert.equal(JSON.stringify(result), before);
  assert.deepEqual(
    review,
    arenaReview(duel, simulateDuel(structuredClone(duel)).frames),
  );
  assert.deepEqual(
    parseArchive(JSON.stringify({ version: 1, matches: [archived] }))
      .matches[0],
    archived,
  );
});
test('trigger evidence records actual watcher relationships and charge endpoints', () => {
  const duel = makeArenaDuel(
    [card(1, 0), card(7, 1), card(42, 2), card(34, 3), card(39, 5)],
    OPENING_LINEUP,
    [null, null, null],
  );
  const r = simulateDuel(duel),
    links = r.frames.flatMap((f) => f.links);
  assert.ok(links.some((l) => l.from === 'p-1' && l.to === 'p-7'));
  assert.ok(!links.some((l) => l.from === 'p-1' && l.to === 'p-42'));
  const r2 = simulateDuel(
    makeArenaDuel([card(11, 0), card(42, 2)], OPENING_LINEUP, [
      null,
      null,
      null,
    ]),
  );
  assert.ok(
    arenaReview(duel, r2.frames).events.some(
      (e) => e.kind === 'charge' && e.from === 'p-42' && e.to === 'p-11',
    ),
  );
});
test('empty repair has no benefit event and rewind state does not retain future growth', () => {
  const c = card(47, 0),
    duel = makeArenaDuel([c, card(50, 3)], OPENING_LINEUP, [null, null, null]),
    r = simulateDuel(duel);
  assert.match(cardStatus(c, r.frames[0]).join(' '), /0\/2次/);
  const full = structuredClone(r.frames[0]);
  full.hits = [
    {
      kind: 'shield',
      side: 0,
      value: 0,
      source: '测试',
      sourceUid: c.uid,
      targetLane: 0,
    },
  ];
  assert.equal(arenaReview(duel, [full]).events.length, 0);
  assert.equal(arenaReview(duel, [full]).lanes[0][0].repair, 0);
});
