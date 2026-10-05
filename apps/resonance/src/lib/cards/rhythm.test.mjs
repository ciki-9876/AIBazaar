import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultRhythmInput,
  editRhythmCard,
  shiftRhythmCard,
  simulateRhythm,
  parseRhythmReplay,
  serializeRhythmReplay,
  validateRhythmInput,
} from './rhythm.ts';
const card = (id, at, prefix = 'p') => ({
  uid: `${prefix}-${id}-${at}`,
  id: `rhythm-${id}`,
  at,
});
const duel = (player, enemy = [], options = {}) => ({
  ...defaultRhythmInput(),
  health: 2000,
  maxTicks: 359,
  player,
  enemy,
  ...options,
});
const frame = (result, tick) => result.frames[tick + 1];

test('rhythm first entry guarantees small cards across independent scan speeds and cooldowns', () => {
  for (const sweepTicks of [144, 237, 360, 481])
    for (const triggerTicks of [16, 40, 80, 157]) {
      const input = duel(
        [card('lamp', 0), card('needle', 4), card('bell', 8)],
        [],
        { sweepTicks, triggerTicks, maxTicks: sweepTicks * 2 - 1 },
      );
      const result = simulateRhythm(input);
      for (const placed of input.player) {
        const entries = result.actions.filter(
          (a) => a.uid === placed.uid && a.reason === 'entry',
        );
        assert.equal(
          entries.length,
          2,
          `${sweepTicks}/${triggerTicks}/${placed.at}`,
        );
        assert.ok(entries[0].tick < sweepTicks);
        assert.ok(entries[1].tick >= sweepTicks);
      }
    }
});

test('entry resets the line cooldown, with one event when entry and expiry coincide', () => {
  const input = duel([card('lamp', 0), card('tea', 1)], [], {
    triggerTicks: 60,
    maxTicks: 119,
  });
  const result = simulateRhythm(input);
  assert.deepEqual(
    result.actions.map((a) => [a.tick, a.reason]),
    [
      [0, 'entry'],
      [40, 'entry'],
      [100, 'cooldown'],
    ],
  );
  const boundary = simulateRhythm({ ...input, triggerTicks: 40 });
  assert.deepEqual(
    boundary.actions.map((a) => a.tick),
    [0, 40, 80],
  );
  assert.equal(boundary.actions.filter((a) => a.tick === 40).length, 1);
});

test('size grants dwell repeats, and changing trigger cooldown changes those repeats', () => {
  const input = duel([card('lamp', 0), card('tea', 1), card('projector', 3)]);
  const normal = simulateRhythm(input);
  assert.deepEqual(
    normal.scores.map((s) => s.triggers),
    [1, 2, 3],
  );
  const slow = simulateRhythm({ ...input, triggerTicks: 80 });
  assert.deepEqual(
    slow.scores.map((s) => s.triggers),
    [1, 1, 2],
  );
  const quick = simulateRhythm({ ...input, triggerTicks: 20 });
  assert.deepEqual(
    quick.scores.map((s) => s.triggers),
    [2, 4, 6],
  );
  assert.deepEqual(
    normal.actions
      .filter((a) => a.uid.includes('projector'))
      .map((a) => a.damage),
    [0, 0, 52],
  );
});

test('empty slots cost traversal time and do not shorten a sparse formation loop', () => {
  const r = simulateRhythm(duel([card('lamp', 8)], [], { maxTicks: 719 }));
  assert.deepEqual(
    r.actions.map((a) => a.tick),
    [320, 680],
  );
});

test('simultaneous lethal attacks resolve both actions and permit a draw', () => {
  const r = simulateRhythm(
    duel([card('lamp', 0)], [card('lamp', 0, 'e')], { health: 11 }),
  );
  assert.equal(r.winner, 'draw');
  assert.equal(r.timedOut, false);
  assert.equal(r.actions.length, 2);
  assert.deepEqual(
    r.frames.at(-1).fighters.map((f) => f.hp),
    [0, 0],
  );
});

test('replay and side swaps preserve deterministic simulation without hidden first side advantage', () => {
  const input = defaultRhythmInput(),
    before = JSON.stringify(input),
    result = simulateRhythm(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(
    simulateRhythm(parseRhythmReplay(serializeRhythmReplay(input))),
    result,
  );
  const reversed = simulateRhythm({
    ...input,
    player: input.enemy,
    enemy: input.player,
  });
  assert.equal(reversed.frames.length, result.frames.length);
  assert.deepEqual(
    reversed.frames.map((f) => f.fighters.map((s) => s.hp)),
    result.frames.map((f) => f.fighters.map((s) => s.hp).reverse()),
  );
  assert.equal(
    reversed.winner,
    result.winner === 'draw' ? 'draw' : 1 - result.winner,
  );
});

test('a warmup empowers two attacks and received energy is only available after that action', () => {
  const input = duel(
    [card('furnace', 0), card('tea', 1)],
    [card('lamp', 0, 'e')],
    { maxTicks: 81 },
  );
  const r = simulateRhythm(input);
  const attacks = r.actions.filter((a) => a.uid.includes('tea'));
  assert.deepEqual(
    attacks.map((a) => a.damage),
    [16, 16],
  );
  assert.equal(frame(r, 0).fighters[0].energy[input.player[0].uid], 4);
  assert.equal(frame(r, 80).fighters[0].boost.uses, 0);
});

test('adjacent support has provenance and never recursively activates a remote card', () => {
  const input = duel(
    [card('match', 0), card('lamp', 1), card('match', 2)],
    [],
    { maxTicks: 41 },
  );
  const r = simulateRhythm(input),
    attack = r.actions.find((a) => a.uid === input.player[1].uid);
  assert.equal(attack.burn, 2);
  assert.deepEqual(attack.supports, [input.player[0].uid, input.player[2].uid]);
  assert.equal(r.actions.filter((a) => a.tick === 40).length, 1);
});

test('new statuses wait for a public beat, and cleanse acts before existing status damage', () => {
  const input = duel(
    [card('lamp', 0), card('needle', 1)],
    [card('herb', 0, 'e')],
    { maxTicks: 41 },
  );
  const r = simulateRhythm(input);
  assert.equal(frame(r, 0).fighters[0].poison, 2);
  assert.equal(frame(r, 39).fighters[0].hp, frame(r, 0).fighters[0].hp);
  assert.equal(frame(r, 40).fighters[0].feedback.poison, 0);
  // The enemy's second application is new and will tick on the next public beat.
  assert.equal(frame(r, 40).fighters[0].poison, 2);
});

test('guard is one consumption, repair has become healing, and lifesteal excludes overkill', () => {
  const guarded = simulateRhythm(
    duel([card('bell', 0)], [card('lamp', 0, 'e')], { maxTicks: 1 }),
  );
  assert.equal(frame(guarded, 0).fighters[0].feedback.damage, 7);
  assert.equal(frame(guarded, 0).fighters[0].guard, 0);
  const drain = simulateRhythm(
    duel([card('tea', 0)], [card('lamp', 0, 'e')], { health: 5, maxTicks: 1 }),
  );
  assert.equal(drain.actions[0].heal, 2);
  assert.equal(drain.frames.at(-1).fighters[0].hp, 0);
});

test('invalid placement and replay imports are atomic and reject other products or rule versions', () => {
  const input = defaultRhythmInput(),
    before = JSON.stringify(input);
  assert.throws(() => editRhythmCard(input, 0, card('mirror', 8)));
  assert.equal(JSON.stringify(input), before);
  const envelope = JSON.parse(serializeRhythmReplay(input));
  for (const mutate of [
    (e) => {
      e.product = 'elevator';
    },
    (e) => {
      e.input.rulesVersion = 'rhythm-scan-v9';
    },
    (e) => {
      e.input.player[1].uid = e.input.player[0].uid;
    },
    (e) => {
      e.input.sweepTicks = 0;
    },
    (e) => {
      e.input.extra = true;
    },
  ]) {
    const copy = structuredClone(envelope);
    mutate(copy);
    assert.throws(() => parseRhythmReplay(JSON.stringify(copy)));
  }
  assert.throws(() => validateRhythmInput({ ...input, seed: NaN }));
});

test('adjacent swaps preserve item identities and sizes, including unequal sized neighbors', () => {
  const input = defaultRhythmInput(),
    uid = input.player[1].uid;
  const moved = shiftRhythmCard(input, 0, uid, -1);
  assert.equal(moved.player.find((c) => c.uid === uid).at, 0);
  assert.equal(moved.player.find((c) => c.uid === input.player[0].uid).at, 2);
  assert.deepEqual(
    shiftRhythmCard(moved, 0, uid, 1),
    validateRhythmInput(input),
  );
});
