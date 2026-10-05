import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeason,
  tickSeason,
  startSeason,
  ascendSeason,
  seasonDestinationReason,
  seasonPlayer,
  refreshSeasonCheckpoints,
  pickupSeasonGolden,
  resolveSeasonGolden,
  redeemSeasonGolden,
  dropSeasonGolden,
  seasonDeath,
  addSeasonSources,
  workSeasonSource,
  reserveRescue,
  rescueUnits,
  consumeRescue,
  GATHERING_TICKS,
  BROADCAST_PART_TICKS,
  SEASON_RULES,
} from './survival-season.ts';
import {
  createSurvival,
  survivalAction,
  stepSurvival,
  ITEMS,
  ELEVATOR,
} from './survival-room.ts';
import { transferItem } from './survival-transfer.ts';
const advance = (s, n) => {
  for (let i = 0; i < n; i++) s = tickSeason(s);
  return s;
};
function live(count = 6, x = 2) {
  let s = ascendSeason(createSeason(42, count, x), 'player', 4, 2);
  s = advance(s, GATHERING_TICKS + SEASON_RULES.length * BROADCAST_PART_TICKS);
  return startSeason(s);
}
function enter(s, id, floor = 10) {
  s = structuredClone(s);
  const a = s.actors.find((a) => a.id === id);
  a.floor = floor;
  a.inLift = false;
  s.checkpoints.find((p) => p.floor === floor).arrived.push(id);
  return refreshSeasonCheckpoints(s);
}
function claim(s, id, index) {
  const g = s.golden[index];
  s = structuredClone(s);
  const a = s.actors.find((a) => a.id === id);
  a.position = { ...g.position };
  a.inLift = false;
  return pickupSeasonGolden(s, id, [g.id]);
}
function redeem(s, id) {
  s = structuredClone(s);
  s.actors.find((a) => a.id === id).inLift = true;
  return redeemSeasonGolden(s, id);
}
test('third-floor entry ticket is consumed once, gathering protects the start, broadcast persists', () => {
  let s = createSeason(42, 12);
  assert.equal(seasonPlayer(s).passes.length, 1);
  const invalid = ascendSeason(s, 'player', 5, 5);
  assert.equal(invalid, s);
  s = ascendSeason(s, 'player', 4, 2);
  assert.equal(seasonPlayer(s).passes.length, 0);
  assert.equal(s.phase, 'gathering');
  assert.equal(startSeason(s), s);
  s = advance(s, GATHERING_TICKS);
  assert.equal(s.phase, 'broadcast');
  s = JSON.parse(JSON.stringify(advance(s, 111)));
  assert.equal(s.phaseTick, 111);
  s = advance(s, SEASON_RULES.length * BROADCAST_PART_TICKS - 111);
  assert.equal(s.phase, 'boarding');
  s = startSeason(s);
  assert.equal(s.phase, 'live');
  assert.ok(s.actors.every((a) => a.floor === 5 && a.hp === 100));
  assert.equal(startSeason(s), s);
});
test('no elapsed tick eliminates a living actor or automatically grants upward progress', () => {
  let s = live();
  s = advance(s, 25000);
  assert.equal(s.phase, 'live');
  assert.ok(s.actors.every((a) => a.floor === 5 && a.status === 'alive'));
});
test('finite ordinary sources are private, atomic and persistent', () => {
  let s = addSeasonSources(live(), 'player', 5, [{ x: 40, z: 60 }]);
  seasonPlayer(s).position = { x: 40, z: 60 };
  seasonPlayer(s).inLift = false;
  for (let i = 0; i < 90; i++) s = workSeasonSource(s, 'player', true);
  assert.equal(seasonPlayer(s).passes.length, 1);
  assert.ok(s.sources[0].taken);
  for (let i = 0; i < 200; i++) s = workSeasonSource(s, 'player', true);
  assert.equal(seasonPlayer(s).passes.length, 1);
  assert.equal(addSeasonSources(s, 'player', 5, [{ x: 50, z: 60 }]), s);
  const invalid = ascendSeason(s, 'player', 8, 5);
  assert.equal(invalid, s);
  assert.equal(seasonPlayer(s).passes.length, 1);
  s = ascendSeason(s, 'player', 6, 2);
  assert.equal(seasonPlayer(s).floor, 6);
  assert.equal(seasonPlayer(s).passes.length, 0);
  assert.equal(ascendSeason(s, 'player', 5, 2), s);
});
test('checkpoint freezes N minus X, includes late arrivals, never changes issuance after death', () => {
  let s = enter(live(), 'player');
  assert.equal(s.golden.length, 4);
  assert.equal(s.checkpoints[0].roster.length, 6);
  s = seasonDeath(s, 'contestant-5');
  s = enter(s, 'contestant-1');
  assert.equal(s.golden.length, 4);
  assert.equal(s.checkpoints[0].issued, 4);
  assert.equal(
    seasonDestinationReason(s, 'player', 11, 5),
    '带回一张本点金票才能晋级',
  );
});
test('one actor may hold multiple golden tickets but cannot redeem multiple or warehouse them', () => {
  let s = enter(live(), 'player');
  s = claim(s, 'player', 0);
  s = claim(s, 'player', 1);
  const denied = redeem(s, 'player');
  assert.equal(denied.actors[0].qualified.length, 0);
  assert.equal(denied.golden.filter((g) => g.status === 'carried').length, 2);
  s = dropSeasonGolden(s, 'player', [s.golden[1].id], { x: 50, z: 60 });
  s = redeem(s, 'player');
  assert.deepEqual(seasonPlayer(s).qualified, [10]);
  assert.equal(redeemSeasonGolden(s, 'player'), s);
  const id = s.golden[1].id;
  seasonPlayer(s).inLift = false;
  seasonPlayer(s).position = { x: 50, z: 60 };
  assert.equal(pickupSeasonGolden(s, 'player', [id]), s);
  assert.equal(seasonDestinationReason(s, 'player', 12, 5), '先进入11F');
  s = ascendSeason(s, 'player', 11, 5);
  assert.equal(seasonPlayer(s).floor, 11);
});
test('same-tick contention is deterministic and independent of request array order', () => {
  let s = enter(live(), 'player');
  s = enter(s, 'contestant-1');
  s.actors.slice(0, 2).forEach((a) => {
    a.position = { ...s.golden[0].position };
    a.inLift = false;
  });
  const requests = s.actors
    .slice(0, 2)
    .map((a) => ({ actor: a.id, id: s.golden[0].id, completedAt: s.tick }));
  const a = resolveSeasonGolden(s, requests),
    b = resolveSeasonGolden(s, [...requests].reverse());
  assert.deepEqual(a, b);
  assert.equal(a.golden.filter((g) => g.status === 'carried').length, 1);
  assert.equal(s.golden[0].status, 'ground');
});
test('unredeemed gold returns to public ground on death; redeemed qualification is never recycled', () => {
  let s = enter(live(), 'player');
  s = enter(s, 'contestant-1');
  s = claim(s, 'contestant-1', 0);
  s = seasonDeath(s, 'contestant-1');
  assert.equal(s.golden[0].status, 'ground');
  assert.equal(s.golden[0].owner, null);
  s = claim(s, 'player', 0);
  s = redeem(s, 'player');
  s = seasonDeath(s, 'player');
  assert.equal(s.phase, 'defeat');
  assert.equal(s.golden[0].status, 'redeemed');
  assert.equal(s.golden.length, 4);
});
test('downstream issuance waits for prior settlement and records early real arrival', () => {
  let s = enter(live(3, 1), 'player');
  s = claim(s, 'player', 0);
  s = redeem(s, 'player');
  s = enter(s, 'player', 20);
  assert.equal(s.checkpoints[1].frozenAt, null);
  assert.equal(s.golden.filter((g) => g.floor === 20).length, 0);
  s = enter(s, 'contestant-1', 10);
  s = claim(s, 'contestant-1', 1);
  s = redeem(s, 'contestant-1');
  assert.equal(s.checkpoints[0].settled, true);
  assert.equal(s.checkpoints[1].issued, 1);
  assert.deepEqual(s.checkpoints[1].roster, ['player', 'contestant-1']);
});
test('unclaimed pools settle when all nonqualifiers die, and the last survivor has a valid ticket', () => {
  let s = enter(live(3, 1), 'player');
  s = claim(s, 'player', 0);
  s = redeem(s, 'player');
  s = enter(s, 'player', 20);
  s = seasonDeath(s, 'contestant-1');
  s = seasonDeath(s, 'contestant-2');
  assert.ok(s.checkpoints[0].settled);
  assert.equal(s.checkpoints[1].issued, 1);
  assert.equal(s.checkpoints[1].x, 0);
});
test('arrival at 100 is not victory; one terminal ticket must actually be redeemed', () => {
  let s = live(1, 1);
  for (let f = 10; f <= 100; f += 10) {
    s = enter(s, 'player', f);
    const index = s.golden.findIndex((g) => g.floor === f);
    assert.equal(s.phase, 'live');
    s = claim(s, 'player', index);
    s = redeem(s, 'player');
  }
  assert.equal(s.phase, 'victory');
  assert.equal(seasonPlayer(s).status, 'winner');
  assert.equal(tickSeason(s), s);
});
const material = (kind, uid) => ({ ...ITEMS[kind], uid });
test('rescue requires a complete real reserved kit, locks swaps, and consumes it exactly once', () => {
  let room = {
    ...createSurvival(92601),
    status: 'extracted',
    warehouse: [
      material('medicine', 'm'),
      material('food', 'f'),
      material('water', 'w'),
    ],
    bag: [material('scrap', 's')],
    safe: [],
  };
  room = reserveRescue(room, true);
  assert.equal(rescueUnits(room).length, 3);
  assert.equal(survivalAction(room, { type: 'destroy', uid: 'm' }), room);
  assert.equal(
    transferItem(room, {
      type: 'transfer',
      uid: 's',
      zone: 'warehouse',
      slot: 0,
    }),
    room,
  );
  const missing = {
    ...room,
    warehouse: room.warehouse.filter((i) => i.uid !== 'w'),
  };
  assert.equal(consumeRescue(missing), null);
  room = { ...room, player: { ...room.player, hp: 0, food: 0, water: 0 } };
  const rescued = consumeRescue(room);
  assert.equal(rescued.player.hp, 45);
  assert.equal(rescued.player.food, 45);
  assert.equal(rescued.player.water, 45);
  assert.equal(rescued.warehouse.length, 0);
  assert.equal(consumeRescue(rescued), null);
  assert.equal(room.warehouse.length, 3);
});
test('drop splits stable units, prevents immediate automatic pickup, and invalid amounts are atomic', () => {
  let room = {
    ...createSurvival(92601),
    status: 'running',
    enemies: [],
    spawns: [],
    player: { ...createSurvival(92601).player, x: 48.5, z: 60.5 },
    bag: [{ ...material('lift-material', 'b1'), stack: ['b2', 'b3'] }],
  };
  assert.equal(
    survivalAction(room, { type: 'drop', uid: 'b1', quantity: 4 }),
    room,
  );
  room = survivalAction(room, { type: 'drop', uid: 'b1', quantity: 2 });
  assert.equal(room.bag[0].uid, 'b3');
  const c = room.caches.at(-1);
  assert.equal(c.contents[0].uid, 'b1');
  assert.deepEqual(c.contents[0].stack, ['b2']);
  const waited = stepSurvival(
    room,
    {},
    { waves: false, combat: false, needs: false },
  );
  assert.equal(waited.caches.find((q) => q.id === c.id).opened, false);
  const golden = { ...room, bag: [material('golden', 'g1')] };
  assert.equal(survivalAction(golden, { type: 'protect', uid: 'g1' }), golden);
  assert.equal(survivalAction(golden, { type: 'destroy', uid: 'g1' }), golden);
  assert.equal(
    transferItem(golden, {
      type: 'transfer',
      uid: 'g1',
      zone: 'warehouse',
      slot: 0,
    }),
    golden,
  );
  assert.equal(
    survivalAction(
      { ...golden, player: { ...golden.player, ...ELEVATOR } },
      { type: 'drop', uid: 'g1' },
    ).caches.length,
    golden.caches.length,
  );
});
