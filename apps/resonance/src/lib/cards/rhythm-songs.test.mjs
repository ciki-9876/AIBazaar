import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RHYTHM_SONGS } from './rhythm-songs.ts';
import {
  defaultRhythmInput,
  defaultSongRhythmInput,
  equipRhythmSong,
  rhythmTiming,
  simulateRhythm,
  serializeRhythmReplay,
  parseRhythmReplay,
  validateRhythmInput,
} from './rhythm.ts';

const card = (id, at, side = 0) => ({
  uid: `${side}-${id}-${at}`,
  id: `rhythm-${id}`,
  at,
});
const frame = (result, tick) => result.frames[tick + 1];
const duel = (player, enemy = [], extra = {}) => ({
  ...defaultSongRhythmInput(),
  health: 2000,
  maxTicks: 900,
  player,
  enemy,
  ...extra,
});

test('legacy scan-v1 preserves its complete deterministic baseline byte for byte', () => {
  const result = simulateRhythm(defaultRhythmInput());
  assert.equal(
    createHash('sha256').update(JSON.stringify(result)).digest('hex'),
    '4b50c86867863fd7fbcedff51a2d9bcbbef2145c686475a3443aad2e2011a126',
  );
  assert.equal(result.frames.at(-1).tick, 1120);
  assert.deepEqual(
    result.frames.at(-1).fighters.map((f) => f.hp),
    [193, 0],
  );
});

test('independent song tempos guarantee first entry and put every cast on its own beat', () => {
  for (const song of RHYTHM_SONGS)
    assert.equal(song.beatTicks * 25, 60000 / song.bpm);
  const input = duel(
    [card('lamp', 0), card('tea', 1), card('bell', 8)],
    [card('lamp', 0, 1), card('tea', 1, 1), card('bell', 8, 1)],
    { maxTicks: 864 },
  );
  const result = simulateRhythm(input);
  for (const side of [0, 1]) {
    const timing = rhythmTiming(input, side);
    assert.equal(timing.triggerTicks, side ? 24 : 20);
    assert.equal(timing.sweepTicks, timing.triggerTicks * 18);
    assert.ok(
      result.actions
        .filter((a) => a.side === side)
        .every((a) => a.tick % timing.triggerTicks === 0),
    );
    for (const c of side ? input.enemy : input.player) {
      const entries = result.actions.filter(
        (a) => a.uid === c.uid && a.reason === 'entry',
      );
      const expected =
        Math.floor(
          (input.maxTicks - c.at * 2 * timing.triggerTicks) / timing.sweepTicks,
        ) + 1;
      assert.equal(entries.length, expected);
      assert.deepEqual(
        entries.map((a) => a.tick),
        Array.from(
          { length: expected },
          (_, n) => c.at * timing.triggerTicks * 2 + n * timing.sweepTicks,
        ),
      );
    }
  }
});

test('homecoming adds healing on downbeats and consumes one response on the next direct attack', () => {
  const result = simulateRhythm(
    duel([card('needle', 0), card('lamp', 1)], [card('lamp', 0, 1)], {
      maxTicks: 61,
    }),
  );
  const casts = result.actions.filter((a) => a.side === 0);
  assert.equal(casts[0].songAccent.heal, 6);
  assert.equal(casts[0].heal, 11);
  assert.equal(frame(result, 0).fighters[0].songBoost, 4);
  assert.equal(casts[1].songAccent.heal, 0);
  assert.deepEqual(
    casts.slice(2).map((a) => [a.damage, a.songAccent.damage]),
    [
      [15, 4],
      [11, 0],
    ],
  );
  assert.equal(frame(result, 40).fighters[0].songBoost, 0);
  const full = simulateRhythm(
    duel([card('needle', 0), card('lamp', 1)], [], { maxTicks: 41 }),
  );
  assert.equal(full.actions[0].heal, 0);
  assert.equal(full.actions.at(-1).damage, 11);
  assert.equal(full.frames.at(-1).fighters[0].songBoost, 0);
});

test('song guard shares the existing single-consumption guard and does not add to a stronger card guard', () => {
  const input = equipRhythmSong(
    duel([card('bell', 0)], [card('lamp', 0, 1)], { maxTicks: 25 }),
    0,
    'rain-eaves',
  );
  const result = simulateRhythm(input);
  assert.equal(frame(result, 0).fighters[0].feedback.damage, 7);
  assert.equal(frame(result, 0).fighters[0].guard, 0);
  assert.equal(frame(result, 24).fighters[0].guard, 0);
  assert.equal(frame(result, 24).fighters[0].feedback.damage, 7);
  const unspent = simulateRhythm({ ...input, enemy: [] });
  assert.equal(frame(unspent, 24).fighters[0].guard, 40);
  const plain = simulateRhythm(
    equipRhythmSong(
      duel([card('lamp', 0)], [], { maxTicks: 25 }),
      0,
      'rain-eaves',
    ),
  );
  assert.equal(frame(plain, 0).fighters[0].guard, 20);
  assert.equal(frame(plain, 24).fighters[0].guard, 20);
});

test('swapping both songs and formations preserves symmetry and replay determinism', () => {
  const input = defaultSongRhythmInput();
  const before = JSON.stringify(input),
    result = simulateRhythm(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(
    simulateRhythm(parseRhythmReplay(serializeRhythmReplay(input))),
    result,
  );
  const reversed = simulateRhythm(
    equipRhythmSong(
      {
        ...input,
        player: input.enemy,
        enemy: input.player,
        songs: [input.songs[1], input.songs[0]],
      },
      0,
      input.songs[1],
    ),
  );
  assert.deepEqual(
    reversed.frames.map((f) => f.fighters.map((s) => s.hp)),
    result.frames.map((f) => f.fighters.map((s) => s.hp).reverse()),
  );
  assert.equal(reversed.winner, 1 - result.winner);
});

test('invalid song imports and tempo mismatches reject atomically, with v1 still supported', () => {
  const input = defaultSongRhythmInput(),
    before = JSON.stringify(input);
  for (const bad of [
    undefined,
    ['home-lights'],
    ['missing-song', 'rain-eaves'],
  ])
    assert.throws(() => validateRhythmInput({ ...input, songs: bad }));
  assert.throws(() => equipRhythmSong(input, 0, 'missing-song'));
  assert.throws(() => validateRhythmInput({ ...input, triggerTicks: 40 }));
  assert.throws(() => validateRhythmInput({ ...input, sweepTicks: 432 }));
  assert.equal(JSON.stringify(input), before);
  for (const original of [input, defaultRhythmInput()]) {
    const envelope = JSON.parse(serializeRhythmReplay(original));
    envelope.product =
      envelope.product === 'wandeng-cards'
        ? 'wandeng-resonance'
        : 'wandeng-cards';
    assert.throws(() => parseRhythmReplay(JSON.stringify(envelope)));
  }
  assert.deepEqual(
    parseRhythmReplay(serializeRhythmReplay(defaultRhythmInput())),
    validateRhythmInput(defaultRhythmInput()),
  );
});
