import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chapterHealingInput,
  simulateHealing,
  validateHealingInput,
  serializeHealingReplay,
  parseHealingReplay,
} from './healing.ts';
import {
  defaultRhythmInput,
  defaultSongRhythmInput,
  simulateRhythm,
} from './rhythm.ts';
import { heartDemon, HEALING_CHAPTERS } from './healing-catalog.ts';

const card = (id, at) => ({ uid: `p:${id}:${at}`, id: `rhythm-${id}`, at });
const demon = (uid, id, health = 1000, attack = 0) => ({
  uid,
  id,
  health,
  attack,
});
const input = (overrides = {}) =>
  validateHealingInput({
    ...chapterHealingInput(),
    health: 2000,
    maxTicks: 400,
    enemies: [demon('d1', 'whisper')],
    priority: 'd1',
    ...overrides,
  });
const frame = (result, tick) => result.frames[tick + 1];

test('legacy full simulation hash remains unchanged after sharing activation rules', () => {
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(simulateRhythm(defaultRhythmInput())))
      .digest('hex'),
    '4b50c86867863fd7fbcedff51a2d9bcbbef2145c686475a3443aad2e2011a126',
  );
});
test('player activation, scores and state match the previous song rules against an inert target', () => {
  const old = {
    ...defaultSongRhythmInput(),
    health: 2000,
    enemy: [],
    maxTicks: 359,
  };
  const a = simulateRhythm(old),
    b = simulateHealing(
      input({
        player: old.player,
        enemies: [demon('d1', 'whisper', 2000)],
        maxTicks: 359,
      }),
    );
  assert.deepEqual(
    b.actions.map(({ target: _target, ...action }) => action),
    a.actions.filter((action) => action.side === 0),
  );
  assert.deepEqual(
    b.scores,
    a.scores.filter((score) => score.side === 0),
  );
  for (let tick = -1; tick <= 359; tick++) {
    const player = structuredClone(frame(b, tick).player);
    if (player.lastAction) delete player.lastAction.target;
    assert.deepEqual(player, a.frames[tick + 1].fighters[0]);
  }
});
test('enemy skill clocks are independent of the equipped song and repeat by their cooldown', () => {
  const base = input({ player: [], enemies: [demon('d1', 'clock')] });
  const a = simulateHealing(base),
    b = simulateHealing({ ...base, song: 'rain-eaves' });
  assert.deepEqual(a.enemyActions, b.enemyActions);
  assert.deepEqual(
    a.enemyActions.filter((c) => c.skill === 'hurry').map((c) => c.tick),
    [60, 140, 220, 300, 380],
  );
  assert.equal('song' in a.frames[0].enemies[0], false);
});
test('priority targeting moves to the next living entity; overkill never spills', () => {
  const r = simulateHealing(
    input({
      player: [card('lamp', 0)],
      enemies: [demon('d1', 'whisper', 5), demon('d2', 'thorn')],
      maxTicks: 40,
    }),
  );
  assert.equal(r.actions[0].target, 'd1');
  assert.equal(frame(r, 0).enemies[1].hp, 1000);
  assert.equal(r.actions[1].target, 'd2');
  assert.equal(frame(r, 0).target, 'd2');
  assert.equal(r.scores[0].damage, 16);
});
test('a dead enemy has neither skills nor ticking damage, and cannot be revived by an echo', () => {
  const r = simulateHealing(
    input({
      player: [card('lamp', 0)],
      enemies: [demon('d1', 'whisper', 5, 30), demon('d2', 'echo')],
      maxTicks: 300,
    }),
  );
  assert.ok(r.enemyActions.every((a) => a.uid !== 'd1'));
  assert.ok(
    r.enemyActions.filter((a) => a.heal).every((a) => a.target === 'd2'),
  );
  for (const f of r.frames.slice(1))
    assert.deepEqual(
      [f.enemies[0].hp, f.enemies[0].burn, f.enemies[0].poison],
      [0, 0, 0],
    );
});
test('enemy support heals the living ally with the lowest life fraction', () => {
  const r = simulateHealing(
    input({
      player: [card('lamp', 0)],
      enemies: [demon('d1', 'burden'), demon('d2', 'echo')],
      maxTicks: 201,
    }),
  );
  assert.equal(r.enemyActions.find((c) => c.skill === 'cling').target, 'd1');
  assert.equal(frame(r, 200).enemies[0].feedback.heal, 18);
});
test('newly applied poison waits for the next public damage tick', () => {
  const r = simulateHealing(
    input({ player: [], enemies: [demon('d1', 'thorn')], maxTicks: 240 }),
  );
  assert.equal(frame(r, 220).player.hp, 2000);
  assert.equal(frame(r, 220).player.poison, 3);
  assert.equal(frame(r, 240).player.hp, 1997);
});
test('simultaneous lethal player and monster actions produce a draw', () => {
  const r = simulateHealing(
    input({
      player: [card('lamp', 2)],
      health: 12,
      enemies: [demon('d1', 'whisper', 22, 12)],
      maxTicks: 200,
    }),
  );
  assert.equal(r.winner, 'draw');
  assert.equal(r.frames.at(-1).tick, 100);
  assert.equal(r.frames.at(-1).player.hp, 0);
  assert.equal(r.frames.at(-1).enemies[0].hp, 0);
  assert.ok(r.enemyActions.some((a) => a.tick === 100));
});
test('one guard protects the common multi-monster incoming settlement and is consumed once', () => {
  const r = simulateHealing(
    input({
      song: 'rain-eaves',
      player: [card('needle', 0)],
      enemies: [
        demon('d1', 'burden', 1000, 20),
        demon('d2', 'burden', 1000, 20),
      ],
      maxTicks: 160,
    }),
  );
  // Shelter stored at the opening downbeat protects both first attacks at tick 160.
  assert.equal(frame(r, 160).player.feedback.damage, 40);
  assert.equal(frame(r, 160).player.guard, 0);
});
test('first entry is guaranteed and every player activation lands on the song beat', () => {
  for (const song of ['home-lights', 'rain-eaves']) {
    const r = simulateHealing(
      input({
        song,
        player: [card('lamp', 0), card('tea', 1), card('needle', 8)],
        maxTicks: 900,
        enemies: [demon('d1', 'whisper', 3000)],
      }),
    );
    const beat = song === 'home-lights' ? 20 : 24;
    assert.ok(r.actions.every((a) => a.tick % beat === 0));
    assert.ok(r.scores.every((s) => s.entries >= 2));
  }
});
test('homecoming requires actual recovery and drain is capped to target life', () => {
  const full = simulateHealing(
    input({ player: [card('needle', 0)], maxTicks: 0 + 1 }),
  );
  assert.equal(frame(full, 0).player.songBoost, 0);
  const drain = simulateHealing(
    input({
      health: 1,
      player: [card('tea', 0)],
      enemies: [demon('d1', 'whisper', 1)],
      maxTicks: 1,
    }),
  );
  assert.equal(drain.actions[0].heal, 0);
  assert.equal(drain.scores[0].damage, 1);
});
test('all six story encounters have independent enemies and a playable default resolution', () => {
  assert.equal(HEALING_CHAPTERS.length, 6);
  for (let n = 0; n < 6; n++) {
    const raw = chapterHealingInput(n),
      r = simulateHealing(raw);
    assert.equal(r.winner, 'player');
    assert.equal(r.timedOut, false);
    assert.ok(r.enemyActions.length > 0);
    for (const e of raw.enemies) assert.ok(heartDemon(e.id));
    assert.ok(
      HEALING_CHAPTERS[n].before.length && HEALING_CHAPTERS[n].after.length,
    );
  }
});
test('replays round trip deterministically and reject product/version confusion', () => {
  const raw = chapterHealingInput(5),
    text = serializeHealingReplay(raw);
  assert.deepEqual(parseHealingReplay(text), raw);
  assert.deepEqual(
    simulateHealing(parseHealingReplay(text)),
    simulateHealing(raw),
  );
  const envelope = JSON.parse(text);
  assert.throws(() =>
    parseHealingReplay(
      JSON.stringify({ ...envelope, product: 'wandeng-throw' }),
    ),
  );
  assert.throws(() =>
    parseHealingReplay(
      JSON.stringify({
        ...envelope,
        input: { ...raw, rulesVersion: 'rhythm-song-v2' },
      }),
    ),
  );
  assert.throws(() =>
    parseHealingReplay(JSON.stringify({ ...envelope, extra: 1 })),
  );
});
test('invalid formation, identities, targets and unbounded stats fail without mutating input', () => {
  const raw = chapterHealingInput(),
    snapshot = structuredClone(raw);
  for (const bad of [
    { priority: 'missing' },
    { song: 'unknown' },
    { enemies: [] },
    { enemies: [...raw.enemies, raw.enemies[0]] },
    { enemies: [{ ...raw.enemies[0], uid: raw.player[0].uid }] },
    { enemies: [{ ...raw.enemies[0], attack: -1 }] },
    { enemies: [{ ...raw.enemies[0], health: 3001 }] },
    { seed: -1 },
    { seed: 1.2 },
    { maxTicks: 4801 },
    { enemies: [{ ...raw.enemies[0], surprise: true }] },
    { player: [...raw.player, card('lamp', 0)] },
  ])
    assert.throws(() => validateHealingInput({ ...raw, ...bad }));
  assert.deepEqual(raw, snapshot);
  simulateHealing(raw);
  assert.deepEqual(raw, snapshot);
});
