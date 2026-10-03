import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ARENA_CARDS } from './arena-catalog.ts';
import { ALL_CARDS, cardDef } from './cards/catalog.ts';
import { simulateArenaDuel } from './arena-engine.ts';
import { makeArenaDuel, OPENING_LINEUP } from './arena-challenge.ts';
import { coreStats } from './arena-card-face.ts';
import { TRAINING_CARDS } from './training-catalog.ts';
import {
  LOCKED_ASSISTANT,
  makeTrainingDuel,
  exportTrainingDuel,
  parseTrainingDuel,
} from './wandeng-training.ts';

const c = (id, at, side = 'p') => ({
  uid: `${side}-${id}-${at}`,
  id,
  at,
  rarity: cardDef(id).rarity,
  level: 0,
  quality: 0,
});
function duel(player, enemy = [], version = 'original-v1') {
  const d = makeArenaDuel(
    player,
    {
      id: 'test',
      title: 'test',
      thesis: '',
      cards: enemy,
      amps: [null, null, null],
    },
    [null, null, null],
  );
  d.arena.training = version;
  return d;
}
const run = (d) => simulateArenaDuel(d);
const hits = (r) =>
  r.frames.flatMap((f) => f.hits.map((h) => ({ ...h, time: f.time })));

test('training keeps the original 50-card pool and pre-extension replay byte-identical', () => {
  assert.equal(ARENA_CARDS.length, 50);
  assert.equal(
    ALL_CARDS.some((c) => c.id.startsWith('training-')),
    false,
  );
  assert.equal(TRAINING_CARDS.length, 6);
  const d = makeArenaDuel(
    LOCKED_ASSISTANT.cards,
    OPENING_LINEUP,
    LOCKED_ASSISTANT.amps,
  );
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(run(d)))
      .digest('hex'),
    '24347b2766393a6f139f444a61e0720e4af4aa2566cadad99385d1732d1a2a1d',
  );
});

test('training inputs, fixed opponent and versioned replays are deterministic and validated', () => {
  for (const version of ['original-v1', 'tuned-v1']) {
    const d = makeTrainingDuel(version),
      before = structuredClone(d),
      first = run(d);
    assert.deepEqual(run(parseTrainingDuel(exportTrainingDuel(d))), first);
    assert.deepEqual(d, before);
    assert.deepEqual(d.enemy, LOCKED_ASSISTANT.cards);
    assert.deepEqual(d.arena.amplifiers[1], ['amp-05', 'amp-07', 'amp-08']);
    assert.ok(
      first.frames.some((f) => f.trainingState['user-keepsakes-1'].bonus > 0),
    );
  }
  const invalid = makeTrainingDuel();
  delete invalid.arena.training;
  assert.throws(() => run(invalid), /规则版本/);
  invalid.arena.training = 'unknown-v99';
  assert.throws(() => run(invalid), /规则版本/);
  const malformed = makeTrainingDuel();
  malformed.barrierHp[0][0] = -5;
  assert.throws(() => parseTrainingDuel(exportTrainingDuel(malformed)), /护幕/);
  const duplicate = makeTrainingDuel();
  duplicate.enemy[0].uid = duplicate.player[0].uid;
  assert.throws(() => parseTrainingDuel(exportTrainingDuel(duplicate)), /UID/);
});

test('training controls choose from a shared phase snapshot when the two sides are swapped', () => {
  for (const version of ['original-v1', 'tuned-v1']) {
    const d = makeTrainingDuel(version);
    d.enemy = OPENING_LINEUP.cards;
    d.arena.amplifiers[1] = OPENING_LINEUP.amps;
    const a = run(d),
      b = run({
        ...d,
        player: d.enemy,
        enemy: d.player,
        arena: {
          ...d.arena,
          amplifiers: [d.arena.amplifiers[1], d.arena.amplifiers[0]],
        },
      });
    assert.equal(a.frames.length, b.frames.length);
    for (let i = 0; i < a.frames.length; i++) {
      assert.deepEqual(a.frames[i].hp, [...b.frames[i].hp].reverse());
      assert.deepEqual(a.frames[i].timers, [...b.frames[i].timers].reverse());
    }
  }
});

test('A gathers direct contacts, splits energy between touching cards and expires after exactly four seconds', () => {
  const a = c('training-a', 1),
    left = c('arena-04', 0),
    right = c('arena-43', 2);
  const r = run(duel([left, a, right], [c('arena-43', 0, 'e')]));
  const f = r.frames.find((f) => f.time === 10);
  assert.equal(f.trainingState[a.uid].energy, 0);
  assert.equal(f.trainingState[left.uid].bonus, 5);
  assert.equal(f.trainingState[right.uid].bonus, 5);
  assert.equal(f.trainingState[left.uid].bonusSeconds, 4);
  assert.equal(
    r.frames.find((f) => f.time === 14).trainingState[left.uid].bonus,
    0,
  );
  const alone = c('training-a', 0);
  const noNeighbor = run(duel([alone], [c('arena-43', 0, 'e')]));
  assert.equal(
    noNeighbor.frames.find((f) => f.time === 10).trainingState[alone.uid]
      .energy,
    10,
  );
  const burning = run(duel([alone], [c('arena-11', 0, 'e')]));
  assert.equal(
    Math.max(...burning.frames.map((f) => f.trainingState[alone.uid].energy)),
    0,
  );
});

test('B siphons actual combined shield and host loss, excludes overkill and blocked damage, never rebuilds', () => {
  const b = c('training-b', 0),
    d = duel([b], [c('arena-04', 0, 'e')]);
  d.maxHp[1] = 1;
  d.barrierHp[1][0] = 1;
  const result = hits(run(d));
  const attack = result.find(
    (h) => h.sourceUid === b.uid && h.kind === 'damage',
  );
  const repair = result.find(
    (h) => h.sourceUid === b.uid && h.kind === 'shield',
  );
  assert.equal(attack.barrierAbsorbed, 1);
  assert.equal(attack.healthLoss, 1);
  assert.equal(repair.value, 2);
  const blocked = hits(run(duel([b], [c('arena-22', 0, 'e')])));
  assert.equal(
    blocked.filter((h) => h.sourceUid === b.uid && h.kind === 'shield').length,
    0,
  );
  const broken = duel([b], [c('arena-04', 0, 'e')]);
  broken.barrierHp[0][0] = 1;
  const afterBreak = hits(run(broken)).filter(
    (h) => h.sourceUid === b.uid && h.kind === 'shield',
  );
  assert.ok(afterBreak.length > 0);
  assert.ok(afterBreak.every((h) => h.value === 0));
});

test('C snapshots remaining target shield percent at launch, does not boost repair or persist after rupture', () => {
  const b = c('training-b', 0),
    mirror = c('training-c', 3),
    pin = c('arena-04', 2),
    f = c('training-f', 6);
  const d = duel([b, pin, mirror, f], [c('arena-43', 6, 'e')]);
  const r = run(d),
    shot = r.frames
      .find((f) => f.time === 6)
      .projectiles.find((p) => p.sourceUid === b.uid);
  assert.equal(shot.value, 14.8); // The mirror also buffs the pin: 8 * (1 + 76/90).
  assert.equal(
    hits(r).find((h) => h.sourceUid === b.uid && h.kind === 'damage').raw,
    14.8,
  );
  assert.equal(
    Math.max(
      ...hits(r)
        .filter((h) => h.sourceUid === f.uid && h.kind === 'shield')
        .map((h) => h.value),
    ),
    5,
  );
  const alreadyBroken = duel([b, pin, mirror]);
  alreadyBroken.barrierHp[1][0] = 1;
  const base = run(alreadyBroken)
    .frames.find((f) => f.time === 6)
    .projectiles.find((p) => p.sourceUid === b.uid);
  assert.equal(base.value, 8);
});

test('D responds once per actual shield contact including periodic damage and stops after that shield breaks', () => {
  const a = c('training-a', 0),
    b = c('training-b', 1),
    bell = c('training-d', 6);
  const r = run(duel([a, b, bell], [c('arena-17', 6, 'e')]));
  const all = hits(r),
    charges = all.filter(
      (h) => h.sourceUid === bell.uid && h.kind === 'charge',
    );
  assert.ok(charges.some((h) => h.time === 5.25));
  assert.ok(charges.some((h) => h.time === 6));
  assert.ok(
    charges.every(
      (h) => h.value === 0.25 && [a.uid, b.uid].includes(h.targetUid),
    ),
  );
  const expected =
    all.filter(
      (h) => h.side === 0 && h.targetLane === 2 && (h.barrierAbsorbed ?? 0) > 0,
    ).length * 2;
  assert.equal(charges.length, expected);
  const brokenAt = r.frames.find((f) => f.barriers[0][2].broken).time;
  assert.ok(charges.every((h) => h.time <= brokenAt));
});

test('C scales conditional damage at release and the new direct weapon works with the reactive amplifier', () => {
  const gun = c('arena-13', 0),
    mirror = c('training-c', 3),
    fire = c('arena-15', 2);
  const d = duel([gun, fire, mirror]);
  d.barrierHp[1][0] = 10000;
  d.arena.amplifiers[0][0] = 'amp-05';
  const r = run(d),
    launch = r.frames.find(
      (f) =>
        f.time > 8 &&
        f.projectiles.some(
          (p) => p.sourceUid === gun.uid && p.launchedAt === f.time,
        ),
    );
  const shot = launch.projectiles.find((p) => p.sourceUid === gun.uid);
  const hit = hits(r).find(
    (h) =>
      h.sourceUid === gun.uid && h.kind === 'damage' && h.time > launch.time,
  );
  const multiplier = 1 + launch.barriers[1][0].hp / launch.barriers[1][0].maxHp;
  assert.equal(hit.value, Math.round((shot.value + 18 * multiplier) * 10) / 10);
  const b = c('training-b', 0),
    reactive = duel([b], [c('arena-04', 0, 'e')], 'tuned-v1');
  reactive.arena.amplifiers[0][0] = 'amp-10';
  const first = run(reactive)
    .frames.find((f) => f.time === 3)
    .projectiles.find((p) => p.sourceUid === b.uid);
  assert.equal(first.value, 18);
});

test('E needs a neighbour event, obeys its gate, follows D and F, and bounded adjacent E chains terminate', () => {
  const e = c('training-e', 1),
    f = c('training-f', 2);
  const r = run(duel([e, f]));
  const launched = [
    ...new Set(
      r.frames.flatMap((f) =>
        f.projectiles
          .filter((p) => p.sourceUid === e.uid)
          .map((p) => p.launchedAt),
      ),
    ),
  ];
  assert.deepEqual(launched.slice(0, 4), [1, 4, 7, 10]);
  assert.equal(
    run(duel([e])).frames.some((f) => f.projectiles.length),
    false,
  );
  const d = c('training-d', 0),
    passive = run(duel([d, e], [c('arena-04', 0, 'e')]));
  assert.equal(
    passive.frames.find((f) => f.projectiles.some((p) => p.sourceUid === e.uid))
      .time,
    3,
  );
  const echo2 = c('training-e', 0),
    loop = run(duel([echo2, e, f]));
  assert.ok(loop.frames.every((f) => f.hits.length < 10));
  const first = loop.frames.find((f) => f.time === 1).projectiles;
  assert.equal(
    first.filter((p) => [e.uid, echo2.uid].includes(p.sourceUid)).length,
    2,
  );
});

test('F continues its 1 s cycle at full shield while healing only the missing amount', () => {
  const f = c('training-f', 0),
    r = run(duel([f], [c('arena-04', 0, 'e')]));
  assert.deepEqual(
    r.frames
      .filter((fr) => fr.fired.includes(f.uid))
      .slice(0, 5)
      .map((fr) => fr.time),
    [1, 2, 3, 4, 5],
  );
  const repairs = hits(r).filter(
    (h) => h.sourceUid === f.uid && h.kind === 'shield',
  );
  assert.equal(repairs.find((h) => h.time === 1).value, 0);
  assert.equal(repairs.find((h) => h.time === 3).value, 5);
  assert.equal(repairs.find((h) => h.time === 4).value, 2);
});

test('new card readouts match the selected version and reading every frame is non-mutating', () => {
  for (const version of ['original-v1', 'tuned-v1']) {
    const d = makeTrainingDuel(version),
      r = run(d),
      before = structuredClone(r);
    const b = d.player.find((c) => c.id === 'training-b'),
      e = d.player.find((c) => c.id === 'training-e');
    assert.equal(
      coreStats(b, r.frames[0], 0, d)[0].value,
      version === 'original-v1' ? 8 : 30,
    );
    assert.equal(
      coreStats(e, r.frames[0], 0, d)[0].value,
      version === 'original-v1' ? 2 : 4,
    );
    for (const frame of r.frames)
      for (const card of d.player) coreStats(card, frame, 0, d);
    assert.deepEqual(r, before);
  }
});
