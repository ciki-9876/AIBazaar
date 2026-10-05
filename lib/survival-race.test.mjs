import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRace,
  acknowledgeRace,
  registerContestant,
  racePlayer,
  tickRace,
  ascendRace,
  destinationReason,
  transferPasses,
  qualifyRace,
  validRace,
  raceSpan,
  raceSources,
  RACE_SEGMENT_TICKS,
  PASS_CAPACITY,
} from './survival-race.ts';
import { createGMCheckpoint } from './survival-gm.ts';
import { createRaceRoom } from './survival-race-session.ts';
import { openingAction, stepOpening } from './survival-opening.ts';
import {
  readOpeningCheckpoint,
  serializeOpeningCheckpoint,
} from './survival-checkpoint.ts';
import { ELEVATOR, ITEMS, pathTo } from './survival-room.ts';
import { revealFog, walkable } from './survival-world.ts';
import { encodeSave } from '../packages/core/save-envelope.ts';
const live = (floor = 3) => acknowledgeRace(createRace(917, floor));
function tickets(r, n, segment = 1, actor = 'player') {
  const c = r.contestants.find((c) => c.id === actor);
  c.passes = Array.from({ length: n }, (_, i) => ({
    id: `${actor}-test-${i}`,
    segment,
    source: 'test',
  }));
  return r;
}
function work(r, source, n, extra = {}) {
  const o = {
    actor: 'player',
    ...source,
    working: true,
    hurt: false,
    guardianAlive: false,
    ...extra,
  };
  for (let i = 0; i < n; i++) r = tickRace(r, [o]);
  return r;
}
test('race reveal pauses time and does not fabricate competitor progress', () => {
  let r = createRace(917);
  assert.equal(tickRace(r), r);
  r = acknowledgeRace(r);
  for (let i = 0; i < 150; i++) r = tickRace(r);
  assert.equal(r.tick, 150);
  assert.ok(
    r.contestants
      .slice(1)
      .every(
        (c) => c.status === 'pending' && c.floor === 3 && !c.passes.length,
      ),
  );
  assert.ok(validRace(r));
});
test('shared pass source grants once, preserves UID and resets interrupted work', () => {
  let r = registerContestant(live(), 'contestant-1');
  const s = r.sources[0];
  r = work(r, s, 44);
  assert.equal(r.work.player.ticks, 44);
  r = tickRace(r, [
    { actor: 'player', ...s, working: true, hurt: true, guardianAlive: false },
  ]);
  assert.equal(r.work.player, undefined);
  const obs = ['player', 'contestant-1'].map((actor) => ({
    actor,
    ...s,
    working: true,
    hurt: false,
    guardianAlive: false,
  }));
  for (let i = 0; i < s.duration; i++) r = tickRace(r, obs);
  assert.equal(racePlayer(r).passes.length, 2);
  assert.equal(r.contestants[1].passes.length, 0);
  assert.deepEqual(
    racePlayer(r).passes.map((p) => p.id),
    ['pass-3-0:0:0', 'pass-3-0:0:1'],
  );
  assert.ok(r.sources[0].exhausted);
  assert.equal(work(r, s, 100).contestants[0].passes.length, 2);
  assert.ok(validRace(r));
});
test('guard, range, blocked sight and capacity prevent issuing without consuming a source', () => {
  for (const extra of [
    { guardianAlive: true },
    { x: -500 },
    { blockedSources: ['pass-3-2'] },
  ]) {
    const r = live(),
      s = r.sources[2];
    const next = work(r, s, s.duration, extra);
    assert.equal(racePlayer(next).passes.length, 0);
    assert.equal(next.sources[2].cycle, 0);
  }
  const r = tickets(live(), PASS_CAPACITY - 1),
    next = work(r, r.sources[0], 100);
  assert.equal(racePlayer(next).passes.length, PASS_CAPACITY - 1);
  assert.equal(next.sources[0].cycle, 0);
});
test('repeat terminal has a shared cooldown and unique deterministic issuance cycles', () => {
  let r = live();
  const s = r.sources[3];
  r = work(r, s, s.duration);
  assert.equal(racePlayer(r).passes.length, 1);
  assert.equal(r.sources[3].exhausted, false);
  const snapshot = structuredClone(r);
  r = work(r, s, 449);
  assert.equal(racePlayer(r).passes.length, 1);
  r = work(r, s, s.duration);
  assert.equal(racePlayer(r).passes.length, 2);
  assert.notEqual(racePlayer(r).passes[0].id, racePlayer(r).passes[1].id);
  assert.deepEqual(work(snapshot, s, 449 + s.duration), r);
});
test('ascent is distance-priced, one-way, span-limited and cannot skip review', () => {
  const r = tickets(live(), 8);
  for (const floor of [2, 7, 11, 3.5, 101])
    assert.equal(ascendRace(r, 'player', floor, 2), r);
  assert.equal(ascendRace(r, 'player', 3, 2), r);
  const next = ascendRace(r, 'player', 6, 2);
  assert.equal(racePlayer(next).passes.length, 5);
  assert.equal(racePlayer(next).floor, 6);
  assert.deepEqual(
    racePlayer(next).passes.map((p) => p.id),
    racePlayer(r)
      .passes.slice(3)
      .map((p) => p.id),
  );
  assert.equal(ascendRace(next, 'player', 10, 5).contestants[0].floor, 10);
  assert.match(destinationReason(tickets(live(9), 8), 'player', 11, 5), /审查/);
  assert.deepEqual([2, 3, 4, 5].map(raceSpan), [3, 5, 7, 9]);
});
test('pass transfer conserves actual identities and rejects duplicate, wrong segment or full recipient', () => {
  const r = tickets(registerContestant(live(), 'contestant-1'), 3);
  const ids = racePlayer(r).passes.map((p) => p.id);
  assert.equal(
    transferPasses(r, 'player', 'contestant-1', [ids[0], ids[0]]),
    r,
  );
  assert.equal(transferPasses(r, 'player', 'contestant-1', ['missing']), r);
  const next = transferPasses(r, 'player', 'contestant-1', ids.slice(0, 2));
  assert.deepEqual(
    next.contestants[1].passes.map((p) => p.id),
    ids.slice(0, 2),
  );
  assert.equal(racePlayer(next).passes.length, 1);
  assert.ok(validRace(next));
  tickets(r, PASS_CAPACITY, 1, 'contestant-1');
  assert.equal(transferPasses(r, 'player', 'contestant-1', [ids[0]]), r);
  r.contestants[1].passes = [];
  r.contestants[1].floor = 11;
  assert.equal(transferPasses(r, 'player', 'contestant-1', [ids[0]]), r);
});
test('review requires actual guardian clearance, retires segment tickets once and grants next segment', () => {
  const r = tickets(live(10), 4);
  assert.equal(qualifyRace(r, 'player', false), r);
  const wrong = tickets(live(10), 4, 2);
  assert.equal(qualifyRace(wrong, 'player', true), wrong);
  const next = qualifyRace(r, 'player', true);
  assert.equal(next.scene, 'promotion');
  assert.equal(next.result.converted, 10);
  assert.deepEqual(racePlayer(next).qualified, [10]);
  assert.ok(racePlayer(next).passes.every((p) => p.segment === 2));
  assert.equal(qualifyRace(next, 'player', true), next);
  assert.equal(tickRace(next), next);
  assert.ok(validRace(next));
  const elapsed = { ...acknowledgeRace(next), tick: 987 };
  assert.equal(
    racePlayer(ascendRace(elapsed, 'player', 12, 2)).deadline,
    RACE_SEGMENT_TICKS,
  );
  const expiredAtReviewFloor = tickRace({
    ...acknowledgeRace(next),
    tick: RACE_SEGMENT_TICKS - 1,
  });
  assert.equal(expiredAtReviewFloor.scene, 'eliminated');
  assert.ok(validRace(expiredAtReviewFloor));
});
test('deadline elimination is distinct from rescue and final winner follows legal arrival events', () => {
  const r = live();
  const lost = tickRace({ ...r, tick: RACE_SEGMENT_TICKS - 1 });
  assert.equal(lost.scene, 'eliminated');
  assert.ok(validRace(lost));
  assert.equal(acknowledgeRace(lost), lost);
  let final = tickets(live(99), 1, 10);
  racePlayer(final).qualified = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  final = ascendRace(final, 'player', 100, 2);
  assert.equal(final.scene, 'victory');
  assert.equal(racePlayer(final).status, 'winner');
  assert.equal(final.events.at(-1).kind, 'winner');
  assert.ok(validRace(final));
  let rival = registerContestant(live(), 'contestant-1');
  rival.contestants[1].floor = 99;
  tickets(rival, 1, 10, 'contestant-1');
  rival.contestants[1].qualified = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  rival = ascendRace(rival, 'contestant-1', 100, 2);
  assert.equal(rival.scene, 'eliminated');
  assert.equal(racePlayer(rival).status, 'eliminated');
  assert.ok(validRace(rival));
});
test('new race checkpoints and old tutorial round-trip with different envelopes and strict product validation', () => {
  for (const key of [
    'after:depart',
    'guide:floor3',
    'race:briefing',
    'race:terminal',
    'race:passes',
    'race:review',
    'race:promotion',
    'race:eliminated',
    'race:victory',
  ]) {
    const s = createGMCheckpoint(key),
      text = serializeOpeningCheckpoint(s);
    assert.deepEqual(readOpeningCheckpoint(text), s, key);
    const envelope = JSON.parse(text);
    assert.equal(envelope.rulesVersion, 'f9-survival/8');
  }
  const s = createGMCheckpoint('race:terminal');
  assert.equal(
    readOpeningCheckpoint(encodeSave('elevator', 'f9-survival/6', s)),
    null,
  );
  assert.equal(
    readOpeningCheckpoint(encodeSave('cards', 'f9-survival/7', s)),
    null,
  );
  assert.equal(
    readOpeningCheckpoint(encodeSave('elevator', 'f9-survival/999', s)),
    null,
  );
  s.race.contestants[0].passes.push(s.race.contestants[0].passes[0]);
  assert.equal(readOpeningCheckpoint(serializeOpeningCheckpoint(s)), null);
});
test('race sources on all reusable floor themes are reachable and manifests stay deterministic', () => {
  for (let f = 3; f < 100; f++) {
    const r = createRaceRoom(f);
    for (const s of raceSources(f)) {
      assert.ok(walkable(s, 0.33, r.world), `${f}/${s.id}`);
      assert.ok(
        pathTo(ELEVATOR, s, r.world).length,
        `${f}/${s.id} inaccessible`,
      );
    }
    if (f % 2)
      assert.equal(
        r.world.obstacles.filter((o) => o.type === 'container').length,
        3,
      );
  }
  assert.deepEqual(createRaceRoom(42), createRaceRoom(42));
});
test('same-floor replay preserves opened containers, fog and death cargo; invalid jump preserves payment', () => {
  let s = createGMCheckpoint('race:terminal');
  s.room.caches[0].searched = true;
  s.room.caches[0].opened = true;
  s.room.fog.explored[20] = 1;
  s = openingAction(s, { type: 'open-door' });
  assert.equal(openingAction(s, { type: 'choose-floor', floor: 20 }), s);
  const replay = openingAction(s, { type: 'choose-floor', floor: 3 });
  assert.equal(racePlayer(replay.race).passes.length, 4);
  assert.equal(replay.room.caches[0].opened, true);
  assert.equal(replay.room.fog.explored[20], 1);
  const next = openingAction(s, { type: 'choose-floor', floor: 6 });
  assert.equal(next.room.floor, 6);
  assert.equal(racePlayer(next.race).passes.length, 1);
  assert.equal(next.lift.highestFloor, 6);
  assert.deepEqual(
    readOpeningCheckpoint(serializeOpeningCheckpoint(next)),
    next,
  );
});
test('player hold interaction issues passes in simulation and pauses for strong guidance', () => {
  let s = createGMCheckpoint('race:passes');
  s.room.enemies = [];
  s.room.nextWave = 999999;
  s.room.path = [];
  const initial = s.race.tick;
  for (let i = 0; i < 90; i++) s = stepOpening(s, { interact: true });
  assert.equal(racePlayer(s.race).passes.length, 2);
  assert.equal(s.race.tick, initial + 90);
  const stopped = createGMCheckpoint('race:briefing');
  assert.equal(stepOpening(stopped, { interact: true }), stopped);
});
test('ordinary collapse retains registered tickets while leaving recoverable bag cargo', () => {
  let s = createGMCheckpoint('race:passes');
  tickets(s.race, 2);
  const ids = racePlayer(s.race).passes.map((p) => p.id);
  s.room.bag = [{ ...ITEMS.scrap, uid: 'race-death-loot' }];
  s.room.player.hp = 0.01;
  s.room.player.hurtUntil = 0;
  s.room.enemies = [
    {
      ...s.room.enemies[0],
      x: s.room.player.x + 0.4,
      z: s.room.player.z,
      nextAttack: 0,
    },
  ];
  s.room.fog = revealFog(s.room.player, s.room.fog, s.room.world);
  for (let i = 0; i < 70 && s.stage !== 'collapse'; i++)
    s = stepOpening(
      s.guidance.active ? openingAction(s, { type: 'ack-guide' }) : s,
    );
  assert.equal(s.stage, 'collapse');
  assert.deepEqual(
    racePlayer(s.race).passes.map((p) => p.id),
    ids,
  );
  assert.ok(
    s.room.caches.some(
      (c) =>
        c.container === 'backpack' &&
        c.contents.some((i) => i.uid === 'race-death-loot'),
    ),
  );
});
test('race upgrade recipe is atomic and surplus brain experience is conserved', () => {
  const s = createGMCheckpoint('race:terminal');
  s.room.bag = [
    { ...ITEMS['lift-material'], quality: 'supreme', uid: 'xp' },
    { ...ITEMS.scrap, uid: 'part-1' },
  ];
  assert.equal(openingAction(s, { type: 'upgrade-race' }), s);
  s.room.bag.push({ ...ITEMS.scrap, uid: 'part-2' });
  const next = openingAction(s, { type: 'upgrade-race' });
  assert.equal(next.room.liftLevel, 3);
  assert.equal(next.room.liftExperience, 60);
  assert.equal(next.room.bag.length, 0);
  assert.equal(s.room.bag.length, 3);
});
test('malformed public race data is rejected without trusting announced status or duplicated events', () => {
  const mutations = [
    (r) => r.contestants.push(null),
    (r) => r.sources.push(null),
    (r) => r.events.push(r.events[0]),
    (r) => (r.work.player = { source: 'missing', ticks: 1 }),
    (r) => (r.scene = 'victory'),
    (r) => (racePlayer(r).qualified = [10, 10]),
  ];
  for (const mutate of mutations) {
    const r = live();
    mutate(r);
    assert.equal(validRace(r), false);
  }
});
