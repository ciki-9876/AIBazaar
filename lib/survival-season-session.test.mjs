import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openingAction,
  stepOpening,
  createSeasonOpening,
} from './survival-opening.ts';
import {
  createSeasonRehearsal,
  SEASON_GM_STAGES,
} from './survival-season-rehearsal.ts';
import {
  createSeasonWorld,
  createSeasonRoom,
  nearestSeasonGround,
} from './survival-season-world.ts';
import {
  seasonPlayer,
  seasonHeld,
  seasonRoomKey,
  seasonRoomSeed,
} from './survival-season.ts';
import {
  readOpeningCheckpoint,
  serializeOpeningCheckpoint,
} from './survival-checkpoint.ts';
import { ELEVATOR, ITEMS, pathTo } from './survival-room.ts';
import { itemIds } from './survival-stacks.ts';
import { insideLift } from './survival-lift.ts';

const run = (s, n, input = {}) => {
  for (let i = 0; i < n; i++) s = stepOpening(s, input);
  return s;
};
const roundtrip = (s) => {
  const result = readOpeningCheckpoint(serializeOpeningCheckpoint(s));
  assert.ok(
    result,
    `invalid save ${s.stage}/${s.season?.phase}/${s.room.floor}`,
  );
  assert.deepEqual(result, JSON.parse(JSON.stringify(s)));
  return result;
};
const home = (s) => ({
  ...s,
  stage: 'home',
  room: {
    ...s.room,
    status: 'extracted',
    player: { ...s.room.player, ...ELEVATOR },
    path: [],
  },
  homecoming: { ...s.homecoming, scene: 'complete' },
  afterlight: { ...s.afterlight, phase: 'complete' },
});
const enter = (s, to) =>
  openingAction(openingAction(home(s), { type: 'open-door' }), {
    type: 'choose-floor',
    floor: to,
  });

test('new seasons use rules9; third-floor failure never mints tutorial pass', () => {
  assert.equal(createSeasonOpening().version, 9);
  let s = createSeasonRehearsal('tutorial');
  const failed = { ...s, room: { ...s.room, bossDefeated: false } };
  assert.equal(
    openingAction(failed, { type: 'confirm-report' }).season,
    undefined,
  );
  s = openingAction(s, { type: 'confirm-report' });
  assert.equal(seasonPlayer(s.season).passes.length, 1);
  assert.equal(
    openingAction(s, { type: 'confirm-report' }).season.golden.length,
    0,
  );
  roundtrip(s);
});
test('click channels perform the same finite action, stop on movement, and resume saved progress', () => {
  let s = createSeasonRehearsal('private');
  s = { ...s, room: { ...s.room, enemies: [], nextWave: 1e9 } };
  const id = s.season.sources[0].id;
  s = openingAction(s, { type: 'interact-world', id });
  s = run(s, 45);
  assert.equal(s.season.work.player.ticks, 45);
  roundtrip(s);
  s = stepOpening(s, { x: 1 });
  assert.equal(s.interacting, undefined);
  assert.equal(s.season.work.player, undefined);
  assert.equal(seasonPlayer(s.season).passes.length, 0);
  s = openingAction(s, { type: 'interact-world', id });
  s = run(s, 90);
  assert.equal(seasonPlayer(s.season).passes.length, 1);
  assert.equal(s.interacting, undefined);
  s = run(s, 180);
  assert.equal(seasonPlayer(s.season).passes.length, 1);
});
test('all private floors and ten checkpoints execute to100, conserving tickets and staying within save capacity', () => {
  let s = createSeasonRehearsal('private');
  s = {
    ...s,
    season: {
      ...s.season,
      actors: s.season.actors.filter((a) => a.id === 'player'),
    },
  };
  for (let floor = 5; floor <= 100; floor++) {
    assert.equal(s.room.floor, floor);
    s = {
      ...s,
      room: {
        ...s.room,
        status: 'running',
        enemies: [],
        spawns: [],
        nextWave: 1e9,
        leftLift: true,
      },
      stage: 'expedition',
    };
    for (const kind of ['water', 'food'])
      if (s.room.player[kind === 'water' ? 'water' : 'food'] < 60) {
        const cache = s.room.caches.find((c) =>
          c.contents.some((i) => i.kind === kind),
        );
        assert.ok(cache);
        s = {
          ...s,
          room: {
            ...s.room,
            player: { ...s.room.player, x: cache.x, z: cache.z },
          },
        };
        s = run(s, 160);
        const item = s.room.bag.find((i) => i.kind === kind);
        assert.ok(item);
        s = openingAction(s, {
          type: 'inventory',
          action: { type: 'consume', uid: item.uid },
        });
      }
    if (floor % 10 === 0) {
      const gold = s.season.golden.find((g) => g.floor === floor);
      assert.ok(gold);
      assert.equal(s.season.golden.filter((g) => g.floor === floor).length, 1);
      s = {
        ...s,
        room: { ...s.room, player: { ...s.room.player, ...gold.position } },
      };
      s = stepOpening(s);
      const cache = s.room.caches.find((c) =>
        c.contents.some((i) => i.uid === gold.id),
      );
      s = openingAction(s, { type: 'interact-world', id: cache.id });
      s = run(s, 90);
      assert.equal(seasonHeld(s.season).length, 1);
      s = {
        ...s,
        room: { ...s.room, player: { ...s.room.player, ...ELEVATOR } },
      };
      s = run(s, 70);
      assert.ok(seasonPlayer(s.season).qualified.includes(floor));
    } else {
      const q = s.season.sources.find(
        (q) => q.actor === 'player' && q.floor === floor,
      );
      assert.ok(q);
      s = {
        ...s,
        room: { ...s.room, player: { ...s.room.player, x: q.x, z: q.z } },
      };
      s = openingAction(s, { type: 'interact-world', id: q.id });
      s = run(s, 90);
      assert.ok(seasonPlayer(s.season).passes.length);
    }
    roundtrip(s);
    if (floor < 100) s = enter(s, floor + 1);
  }
  assert.equal(s.season.phase, 'victory');
  assert.equal(seasonPlayer(s.season).qualified.length, 10);
  assert.ok(serializeOpeningCheckpoint(s).length < 1_000_000);
  assert.ok(
    Object.values(s.season.worlds).every((w) => !Object.hasOwn(w, 'bag')),
  );
});
test('actual 3→4 departure, free walk, six broadcasts, return, 4→5 start without attacks or needs', () => {
  let s = createSeasonRehearsal('entry');
  s = enter(s, 4);
  assert.equal(s.room.floor, 4);
  assert.equal(seasonPlayer(s.season).passes.length, 0);
  s = run(s, 138);
  assert.equal(s.stage, 'expedition');
  assert.equal(s.season.actors.filter((a) => a.floor === 4).length, 12);
  const hp = s.room.player.hp,
    food = s.room.player.food,
    water = s.room.player.water;
  s = run(s, 100, { x: 1 });
  assert.ok(s.room.player.x > ELEVATOR.x);
  assert.deepEqual(
    [s.room.player.hp, s.room.player.food, s.room.player.water],
    [hp, food, water],
  );
  s = run(s, 360);
  assert.equal(s.season.phase, 'gathering');
  s = run(s, 2);
  assert.equal(s.season.phase, 'broadcast');
  s = run(roundtrip(s), 1980);
  assert.equal(s.season.phase, 'boarding');
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = run(s, 250);
  assert.equal(s.stage, 'home');
  s = enter(s, 5);
  assert.equal(s.room.floor, 5);
  assert.equal(s.season.phase, 'live');
  assert.ok(
    s.season.actors.every(
      (a) => a.floor === 5 && a.hp === 100 && a.food === 100 && a.water === 100,
    ),
  );
  roundtrip(s);
});
test('private rooms retain collected loot, finite source and dropped unit identities across re-entry', () => {
  let s = createSeasonRehearsal('private');
  s = { ...s, room: { ...s.room, enemies: [], nextWave: 1e9 } };
  s = run(s, 90, { interact: true });
  assert.equal(seasonPlayer(s.season).passes.length, 1);
  assert.equal(s.season.sources[0].taken, true);
  s = {
    ...s,
    room: {
      ...s.room,
      bag: [{ ...ITEMS.scrap, uid: 'persistent-drop', slot: 0 }],
    },
  };
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'drop', uid: 'persistent-drop' },
  });
  const caches = s.room.caches;
  s = enter(s, 5);
  assert.deepEqual(s.room.caches, caches);
  assert.equal(s.season.sources[0].taken, true);
  assert.equal(s.room.lootBudget, 36);
  roundtrip(s);
  s = run(s, 138);
  s = enter(s, 6);
  assert.equal(s.room.floor, 6);
  assert.equal(s.season.worlds[seasonRoomKey(5)], undefined);
  assert.equal(enter(s, 5).room.floor, 6);
  roundtrip(s);
});
test('carrying two physical golden passes prevents crossing protected cabin; drop one permits exact redemption', () => {
  let s = createSeasonRehearsal('multi');
  const ids = s.room.bag.map((i) => i.uid);
  s = openingAction(s, { type: 'return' });
  assert.equal(s.room.path.length, 0);
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = run(s, 100);
  assert.equal(insideLift(s.room.player, ELEVATOR), false);
  assert.equal(s.stage, 'expedition');
  s = openingAction(s, {
    type: 'inventory',
    action: { type: 'drop', uid: ids[1] },
  });
  assert.equal(seasonHeld(s.season).length, 1);
  const drop = s.room.caches.find((c) =>
    c.contents.some((i) => i.uid === ids[1]),
  );
  assert.ok(drop);
  assert.equal(drop.manualPickup, true);
  s = openingAction(s, { type: 'return' });
  s = run(s, 180);
  assert.equal(s.stage, 'home');
  assert.equal(s.room.bag.filter((i) => i.kind === 'golden').length, 0);
  assert.ok(seasonPlayer(s.season).qualified.includes(10));
  assert.equal(s.season.golden.find((g) => g.id === ids[1]).status, 'ground');
  assert.ok(enter(s, 11).room.floor === 11);
  assert.equal(enter(s, 12).room.floor, 10);
  roundtrip(s);
});
test('manual golden pickup is conserved and arrival at100 does not win; physical return wins', () => {
  let s = createSeasonRehearsal('final');
  assert.equal(s.season.phase, 'live');
  s = run(s, 20);
  assert.equal(s.room.bag.length, 0);
  s = run(s, 120, { interact: true });
  assert.equal(seasonHeld(s.season).length, 1);
  assert.equal(s.room.bag[0].kind, 'golden');
  roundtrip(s);
  s = openingAction(s, { type: 'move', to: ELEVATOR });
  s = run(s, 1000);
  assert.equal(s.season.phase, 'victory');
  assert.equal(s.room.bag.length, 0);
  assert.equal(stepOpening(s), s);
  roundtrip(s);
});
test('warehouse rescue consumes full reserved kit, drops bag, retains gear/safe and remains finite', () => {
  let s = createSeasonRehearsal('rescue');
  const gear = s.room.equipment,
    safe = s.room.safe;
  s = stepOpening(s);
  assert.equal(s.stage, 'collapse');
  assert.equal(s.season.phase, 'live');
  assert.equal(s.room.player.hp, 45);
  assert.equal(s.room.warehouse.length, 3);
  assert.equal(s.room.rescueReserved.length, 0);
  assert.deepEqual(s.room.equipment, gear);
  assert.deepEqual(s.room.safe, safe);
  assert.equal(s.room.bag.length, 0);
  assert.ok(
    s.room.caches.some((c) =>
      c.contents.some((i) => i.uid === 'gm-season-bag'),
    ),
  );
  roundtrip(s);
  s = run(s, 145);
  assert.equal(s.stage, 'home');
  assert.ok(s.room.player.food < 45 && s.room.player.water < 45);
  s = {
    ...s,
    room: {
      ...s.room,
      player: { ...s.room.player, hp: 0.02, food: 0, water: 0 },
    },
  };
  s = stepOpening(s);
  assert.equal(s.season.phase, 'defeat');
  assert.equal(s.room.equipment.length, 0);
  assert.equal(s.room.safe.length, 0);
  assert.ok(
    s.room.caches.flatMap((c) => c.contents).some((i) => i.uid === safe[0].uid),
  );
  roundtrip(s);
});
test('two real kits permit two separately reserved rescues, then the third collapse is permanent', () => {
  let s = createSeasonRehearsal('rescue');
  const collapse = (state) =>
    stepOpening({
      ...state,
      room: {
        ...state.room,
        player: { ...state.room.player, hp: 0.02, food: 0, water: 0 },
      },
    });
  s = collapse(s);
  assert.equal(s.room.warehouse.length, 3);
  s = run(roundtrip(s), 145);
  s = openingAction(s, { type: 'reserve-rescue', enabled: true });
  assert.equal(s.room.rescueReserved.length, 3);
  s = collapse(s);
  assert.equal(s.room.player.hp, 45);
  assert.equal(s.room.warehouse.length, 0);
  s = run(roundtrip(s), 145);
  s = collapse(s);
  assert.equal(s.season.phase, 'defeat');
  roundtrip(s);
});
test('rescue drops every unredeemed golden pass into reachable public ground without creating more', () => {
  let s = createSeasonRehearsal('multi');
  const count = s.season.golden.length,
    ids = s.room.bag.map((i) => i.uid);
  const stock = ['medicine', 'food', 'water'].map((kind, i) => ({
    ...ITEMS[kind],
    uid: `rescue-stock:${i}`,
    slot: i,
  }));
  s = {
    ...s,
    room: {
      ...s.room,
      warehouse: stock,
      player: { ...s.room.player, hp: 0.02, food: 0, water: 0 },
    },
  };
  // Reserve is an elevator action. The fixture authors the earlier reservation, not free supplies.
  s = { ...s, room: { ...s.room, rescueReserved: stock.map((i) => i.uid) } };
  s = stepOpening(s);
  assert.equal(s.stage, 'collapse');
  assert.equal(s.season.golden.length, count);
  assert.equal(seasonHeld(s.season).length, 0);
  for (const id of ids) {
    const g = s.season.golden.find((g) => g.id === id);
    assert.equal(g.status, 'ground');
    assert.equal(g.owner, null);
    assert.ok(pathTo(ELEVATOR, g.position, s.room.world).length);
    const cache = s.room.caches.find((c) =>
      c.contents.some((i) => i.uid === id),
    );
    assert.ok(cache?.manualPickup);
  }
  roundtrip(s);
});
test('season warehouse feeding spends true units incrementally, preserves surplus and upgrades span', () => {
  let s = createSeasonRehearsal('upgrade');
  s = openingAction(s, { type: 'feed-lift', uid: 'gm-upgrade-brain' });
  assert.equal(s.room.liftExperience, 40);
  assert.equal(s.room.liftLevel, 2);
  assert.equal(
    s.room.warehouse.find((i) => i.kind === 'lift-material').uid,
    'gm-upgrade-surplus',
  );
  s = openingAction(s, { type: 'feed-lift', uid: 'gm-upgrade-part:1' });
  assert.equal(s.room.liftParts, 1);
  s = roundtrip(s);
  s = openingAction(s, { type: 'feed-lift', uid: 'gm-upgrade-part:2' });
  assert.equal(s.room.liftLevel, 3);
  assert.equal(s.room.liftExperience, 0);
  assert.equal(s.room.liftParts, 0);
  assert.equal(s.room.warehouse.length, 1);
  roundtrip(s);
});
test('home and travel consume food/water; rest spends extra; normal return never restores health', () => {
  let s = createSeasonRehearsal('home');
  const before = s.room.player;
  s = run(s, 30);
  assert.equal(s.room.player.hp, before.hp);
  assert.ok(
    s.room.player.food < before.food && s.room.player.water < before.water,
  );
  s = openingAction(s, { type: 'rest', enabled: true });
  const food = s.room.player.food;
  s = run(s, 30);
  assert.ok(s.room.player.hp > before.hp);
  assert.ok(s.room.player.food < food - 0.5);
  const health = s.room.player.hp;
  s = enter(s, 5);
  s = run(s, 138);
  assert.equal(s.room.player.hp, health);
  assert.equal(s.room.resting, false);
  roundtrip(s);
});
test('same-floor neutral players are never targeted by default; explicit PvP is checkpoint-only', () => {
  let s = createSeasonRehearsal('pvp');
  const actor = s.season.actors.find((a) => a.id === 'contestant-1');
  s = run(s, 70);
  assert.equal(s.season.actors.find((a) => a.id === actor.id).hp, actor.hp);
  s = openingAction(s, { type: 'target-contestant', id: actor.id });
  s = run(s, 1);
  assert.ok(s.season.actors.find((a) => a.id === actor.id).hp < actor.hp);
  s = openingAction(s, { type: 'target-contestant', id: null });
  const hp = s.season.actors.find((a) => a.id === actor.id).hp;
  s = run(s, 70);
  assert.equal(s.season.actors.find((a) => a.id === actor.id).hp, hp);
  roundtrip(s);
});
test('all95 regular/ checkpoint destinations have 3:2 navigable area, reachable finite loot and stable private namespaces', () => {
  for (let f = 5; f <= 100; f++) {
    const w = createSeasonWorld(71, f);
    assert.equal(w.seasonLayout.area, f % 10 === 0 ? 750 : 500);
    const r = createSeasonRoom(71, f);
    assert.equal(r.caches.length, 8);
    assert.ok(r.caches.every((c) => pathTo(ELEVATOR, c, w).length));
    assert.ok(nearestSeasonGround(w, { x: 0, z: 0 }));
    assert.equal(r.lootBudget, 36);
    assert.ok(
      r.caches
        .flatMap((c) => c.contents)
        .every((i) => i.uid.includes(seasonRoomKey(f))),
    );
  }
  assert.notEqual(
    seasonRoomSeed(71, 5, 'player'),
    seasonRoomSeed(71, 5, 'contestant-1'),
  );
  assert.equal(
    seasonRoomSeed(71, 10, 'player'),
    seasonRoomSeed(71, 10, 'contestant-1'),
  );
});
test('rules9 fixtures and partial preparations survive checkpoint roundtrips; corrupt ownership/envelopes rejected', () => {
  for (const q of SEASON_GM_STAGES)
    roundtrip(createSeasonRehearsal(q.id.slice(7)));
  const base = createSeasonRehearsal('multi');
  for (const change of [
    (s) => s.room.bag.push({ ...s.room.bag[0] }),
    (s) => s.season.checkpoints[0].issued++,
    (s) => (s.season.golden[0].status = 'redeemed'),
    (s) => s.room.safe.push(s.room.bag.pop()),
    (s) => (s.room.rescueReserved = ['missing']),
    (s) =>
      (s.season.actors[0].passes = Array(11).fill({
        id: 'duplicate',
        source: 'x',
      })),
    (s) => (s.season.worlds['player:7'] = { ...s.room, seed: 123 }),
  ]) {
    const copy = structuredClone(base);
    change(copy);
    assert.equal(readOpeningCheckpoint(serializeOpeningCheckpoint(copy)), null);
  }
  const envelope = JSON.parse(serializeOpeningCheckpoint(base));
  envelope.product = 'throw';
  assert.equal(readOpeningCheckpoint(JSON.stringify(envelope)), null);
  envelope.product = 'elevator';
  envelope.rulesVersion = 'f9-survival/77';
  assert.equal(readOpeningCheckpoint(JSON.stringify(envelope)), null);
  assert.equal(
    new Set(
      [
        ...base.room.bag,
        ...base.room.caches.flatMap((c) => c.contents),
      ].flatMap(itemIds),
    ).size,
    [...base.room.bag, ...base.room.caches.flatMap((c) => c.contents)].flatMap(
      itemIds,
    ).length,
  );
});
