import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceReplay, replayFrameIndex } from '../app/art/playback.ts';
import { makeArenaDuel, OPENING_LINEUP } from './arena-challenge.ts';
import { simulateDuel } from './demo-combat.ts';
import { cardDef } from './demo-cards.ts';
import { parseArchive, summarizeMatch } from './arena-archive.ts';
import { surfaceEvents } from './battle-slice-fx.ts';

test('arena first animation callback may precede performance.now without selecting frame -1', () => {
  const frames = [{ hp: [300, 300] }, { hp: [300, 288] }];
  const time = advanceReplay(0, 99.8 - 100, 1, 1);
  assert.equal(time, 0);
  assert.deepEqual(
    frames[replayFrameIndex(time, frames.length)].hp,
    [300, 300],
  );
  assert.equal(replayFrameIndex(-0.001, frames.length), 0);
  assert.equal(replayFrameIndex(NaN, frames.length), 0);
  assert.equal(replayFrameIndex(900, frames.length), 1);
  assert.equal(advanceReplay(2, 60000, 4, 90), 2.4);
});

test('a full burn formation starts, records and replays all damage frames deterministically', () => {
  const player = [
    ['arena-11', 0],
    ['arena-12', 2],
    ['arena-14', 3],
    ['arena-13', 6],
    ['arena-15', 8],
  ].map(([id, at]) => ({
    id,
    at,
    uid: `burn-${at}`,
    rarity: cardDef(id).rarity,
    quality: 0,
    level: 0,
  }));
  const duel = makeArenaDuel(player, OPENING_LINEUP, [
    'amp-05',
    'amp-05',
    'amp-05',
  ]);
  const result = simulateDuel(duel);
  const match = summarizeMatch('burn-replay', 'opening', null, duel, result);
  const saved = parseArchive(JSON.stringify({ version: 1, matches: [match] }))
    .matches[0];
  assert.deepEqual(simulateDuel(saved.duel), result);
  assert.ok(
    result.frames.some((f) =>
      f.hits.some((h) => h.kind === 'burn' && h.periodic),
    ),
  );
  assert.ok(surfaceEvents(result.frames).some((e) => e.kind === 'core'));
  for (const frame of result.frames) {
    assert.equal(
      result.frames[replayFrameIndex(frame.time, result.frames.length)],
      frame,
    );
    assert.ok(frame.hp.every(Number.isFinite));
  }
});
