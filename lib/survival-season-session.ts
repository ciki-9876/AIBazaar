import type { OpeningAction, OpeningState } from './survival-opening.ts';
import {
  ELEVATOR,
  STEP,
  stepSurvival,
  survivalAction,
  weaponStats,
  distance,
  clearSight,
  type SurvivalInput,
  type SurvivalState,
  type Item,
} from './survival-room.ts';
import { insideLift, LIFT, PLAYER_RADIUS } from './survival-lift.ts';
import { unplaced } from './survival-cargo.ts';
import { feedLift, liftFed } from './survival-lift-feed.ts';
import { brainExperience, countKind, spendUnits } from './survival-stacks.ts';
import {
  createSeasonRoom,
  materializeSeasonGolden,
  nearestSeasonGround,
  preparationFog,
  seasonWorldSnapshot,
} from './survival-season-world.ts';
import {
  createSeason,
  tickSeason,
  seasonPlayer,
  seasonRoomKey,
  ascendSeason,
  seasonDestinationReason,
  startSeason,
  syncSeasonActor,
  addSeasonSources,
  workSeasonSource,
  seasonHeld,
  pickupSeasonGolden,
  dropSeasonGolden,
  redeemSeasonGolden,
  seasonStopped,
  seasonDeath,
  reserveRescue,
  rescueUnits,
  consumeRescue,
  type SeasonState,
} from './survival-season.ts';

const sync = (season: SeasonState, room: SurvivalState) =>
  syncSeasonActor(season, 'player', {
    position: { x: room.player.x, z: room.player.z },
    inLift: insideLift(room.player, ELEVATOR),
    hp: room.player.hp,
    food: room.player.food,
    water: room.player.water,
  });
const notice = (s: OpeningState, text: string) => ({
  ...s,
  room: { ...s.room, notice: text, noticeUntil: s.room.tick + 100 },
});
function enterRoom(
  s: OpeningState,
  season: SeasonState,
  floor: number,
): OpeningState {
  const old = s.room;
  const worlds = { ...season.worlds };
  // Private floors are permanently closed on ascent. Keep shared rooms for late arrivals.
  if ((old.floor || 1) >= 4 && old.floor !== floor && old.floor! % 10 === 0)
    worlds[seasonRoomKey(old.floor!)] = seasonWorldSnapshot(old);
  const key = seasonRoomKey(floor),
    snapshot = worlds[key];
  delete worlds[key];
  const fresh =
    floor === old.floor
      ? old
      : { ...createSeasonRoom(season.seed, floor), ...snapshot };
  let room: SurvivalState = {
    ...fresh,
    floor,
    status: 'ready',
    serial: Math.max(old.serial, fresh.serial),
    bag: old.bag,
    equipment: old.equipment,
    safe: old.safe,
    warehouse: old.warehouse || [],
    rescueReserved: old.rescueReserved || [],
    liftLevel: old.liftLevel || 2,
    liftExperience: old.liftExperience || 0,
    liftParts: old.liftParts || 0,
    liftLightOn: true,
    player: { ...old.player, ...ELEVATOR, hurtUntil: 0 },
    path: [],
    effects: [],
    lost: [],
    cooldowns: {},
    extraction: 0,
    searching: null,
    leftLift: false,
    resting: false,
    notice: '',
    noticeUntil: 0,
  };
  if (season.phase === 'live' && !s.season?.initialized)
    room = {
      ...room,
      player: { ...room.player, hp: 100, food: 100, water: 100 },
    };
  season = { ...season, worlds };
  season = addSeasonSources(
    season,
    'player',
    floor,
    [
      { x: 44.5, z: 68.5 },
      { x: 54.5, z: 58.5 },
      { x: 40.5, z: 54.5 },
    ].map((p) => nearestSeasonGround(room.world, p)!),
  );
  ({ room, season } = materializeSeasonGolden(room, season));
  return {
    ...s,
    season,
    hostileTarget: undefined,
    interacting: undefined,
    stage: 'second-departing',
    beat: 0,
    homecoming: { ...s.homecoming, scene: 'complete', tick: 0 },
    room: survivalAction(room, { type: 'start' }),
    lift: {
      ...s.lift,
      highestFloor: floor,
      trips: s.lift.trips + 1,
      choosingFloor: false,
    },
    afterlight: {
      ...s.afterlight,
      phase: 'explore',
      tick: 0,
      collected: [],
      used: [],
      departureOwned: [],
      failedReturn: false,
      hint: '',
    },
  };
}

/** The adapter executes player/world actions. It does not invent autonomous opponents. */
export function seasonOpeningAction(
  s: OpeningState,
  a: OpeningAction,
): OpeningState | null {
  if (s.version !== 9) return null;
  if (!s.season) {
    if (
      a.type !== 'confirm-report' ||
      s.stage !== 'home' ||
      s.afterlight.phase !== 'report' ||
      s.room.floor !== 3
    )
      return null;
    if (!s.room.bossDefeated)
      return notice(
        { ...s, afterlight: { ...s.afterlight, phase: 'complete' } },
        '先通关第三层，再领取首张通行证',
      );
    return {
      ...s,
      season: createSeason(s.room.seed),
      guidance: { ...s.guidance, active: null },
      lastRobotLine: '首张通行证已登记 · 前往4F集结',
      afterlight: { ...s.afterlight, phase: 'complete', tick: 0 },
    };
  }
  let season = s.season;
  if (seasonStopped(season)) return s;
  if (a.type === 'interact-world') {
    const target =
      s.room.caches.find((c) => c.id === a.id && !c.opened && c.manualPickup) ||
      season.sources.find(
        (q) =>
          q.id === a.id &&
          q.actor === 'player' &&
          q.floor === s.room.floor &&
          !q.taken,
      );
    if (a.id === null) return { ...s, interacting: undefined };
    return season.phase === 'live' &&
      s.room.status === 'running' &&
      target &&
      distance(target, s.room.player) <= 1.65 &&
      clearSight(s.room.player, target, s.room.world)
      ? { ...s, interacting: a.id, room: { ...s.room, path: [] } }
      : s;
  }
  if (a.type === 'inventory') {
    const uid = 'uid' in a.action ? a.action.uid : null;
    if (s.room.warehouse?.some((i) => i.uid === uid) && s.stage !== 'home')
      return s;
    const room = survivalAction(s.room, a.action);
    if (room === s.room) return s;
    if (a.action.type === 'drop') {
      const ids = seasonHeld(season)
        .filter((g) => !room.bag.some((i) => i.uid === g.id))
        .map((g) => g.id);
      const cache = room.caches.find((c) =>
        c.contents.some((i) => ids.includes(i.uid)),
      );
      if (cache) season = dropSeasonGolden(season, 'player', ids, cache);
    }
    return { ...s, room, season: sync(season, room) };
  }
  if (a.type === 'reserve-rescue') {
    const next = { ...s, room: reserveRescue(s.room, a.enabled) };
    return rescueUnits(s.room) &&
      !rescueUnits(next.room) &&
      season.phase === 'live'
      ? notice(next, '救援未备 · 倒下将永久死亡')
      : next;
  }
  if (a.type === 'rest')
    return s.stage === 'home' && season.phase === 'live'
      ? { ...s, room: { ...s.room, resting: a.enabled } }
      : s;
  if (a.type === 'target-contestant') {
    const target = season.actors.find(
      (t) =>
        t.id === a.id &&
        t.id !== 'player' &&
        t.floor === s.room.floor &&
        t.status === 'alive' &&
        !t.inLift,
    );
    return {
      ...s,
      hostileTarget:
        season.phase === 'live' && (s.room.floor || 1) % 10 === 0
          ? target?.id
          : undefined,
    };
  }
  if (a.type === 'feed-lift') {
    if (s.stage !== 'home') return s;
    const room = feedLift(s.room, a.uid);
    if (room === s.room) return s;
    const next = { ...s, room };
    return liftFed(room)
      ? seasonOpeningAction(next, { type: 'upgrade-race' })
      : next;
  }
  if (a.type === 'upgrade-race' || a.type === 'upgrade-lift') {
    if (s.stage !== 'home') return s;
    const level = s.room.liftLevel || 2,
      cost = 40 + (level - 2) * 30,
      xp = brainExperience(s.room.bag) + (s.room.liftExperience || 0);
    if (
      level >= 5 ||
      xp < cost ||
      countKind(s.room.bag, 'scrap') + (s.room.liftParts || 0) < 2
    )
      return s;
    let bag = spendUnits(
      s.room.bag,
      'lift-material',
      Math.max(0, cost - (s.room.liftExperience || 0)),
      true,
    );
    bag = spendUnits(bag, 'scrap', Math.max(0, 2 - (s.room.liftParts || 0)));
    return {
      ...s,
      room: {
        ...s.room,
        bag,
        liftLevel: level + 1,
        liftParts: 0,
        liftExperience: xp - brainExperience(bag) - cost,
      },
    };
  }
  if (a.type === 'confirm-report')
    return { ...s, afterlight: { ...s.afterlight, phase: 'complete' } };
  if (a.type === 'close-floor')
    return { ...s, lift: { ...s.lift, choosingFloor: false } };
  if (a.type === 'open-door')
    return s.stage === 'home'
      ? { ...s, lift: { ...s.lift, choosingFloor: true } }
      : s;
  if (a.type === 'choose-floor') {
    if (s.stage !== 'home' || !s.lift.choosingFloor) return s;
    if (season.phase === 'boarding' && a.floor === 5) {
      const next = startSeason(sync(season, s.room));
      if (next.phase !== 'live') return s;
      const entered = enterRoom(s, next, 5);
      return rescueUnits(entered.room)
        ? entered
        : notice(entered, '救援未备 · 倒下将永久死亡');
    }
    // Re-entry to the preparation room is not permitted until its gate opens.
    const reason = seasonDestinationReason(
      season,
      'player',
      a.floor,
      s.room.liftLevel || 2,
    );
    if (reason) return notice(s, reason);
    const next =
      a.floor === s.room.floor
        ? season
        : ascendSeason(season, 'player', a.floor, s.room.liftLevel || 2);
    return enterRoom(s, next, a.floor);
  }
  if (a.type === 'move')
    return s.room.status === 'running'
      ? { ...s, interacting: undefined, room: survivalAction(s.room, a) }
      : s;
  if (a.type === 'return') {
    if (s.room.status !== 'running' || distance(s.room.player, ELEVATOR) > 3)
      return s;
    if (['gathering', 'broadcast'].includes(season.phase))
      return notice(s, '广播结束后开放电梯');
    if (seasonHeld(season).length > 1)
      return notice(s, '只准带回一张金票 · 请扔下多余金票');
    const room = insideLift(s.room.player, ELEVATOR)
      ? survivalAction(s.room, { type: 'extract' })
      : survivalAction(s.room, { type: 'move', to: ELEVATOR });
    return { ...s, room };
  }
  return s;
}

function fatal(s: OpeningState): OpeningState {
  let room = s.room,
    season = sync(s.season!, room);
  const position = nearestSeasonGround(room.world, room.player)!;
  const carriedGold = seasonHeld(season).map((g) => g.id);
  season = dropSeasonGolden(season, 'player', carriedGold, position);
  // finish() may already have deposited the bag; move any raw gold into public reach.
  const existing = room.caches.flatMap((c) => c.contents);
  const bag = room.bag.filter((i) => !existing.some((v) => v.uid === i.uid));
  let caches = room.caches.map((c) =>
    c.contents.some((i) => carriedGold.includes(i.uid))
      ? { ...c, ...position, manualPickup: true }
      : c,
  );
  const rescued = consumeRescue(room);
  const contents: Item[] = [
    ...bag,
    ...(rescued ? [] : [...room.safe, ...room.equipment.map((e) => e.item)]),
  ].map(unplaced);
  if (contents.length)
    caches = [
      ...caches,
      {
        ...position,
        id: `season-corpse:${room.seed}:${room.serial}`,
        contents,
        item: { ...contents[0], name: rescued ? '遗落的背包' : '选手遗物' },
        container: 'backpack',
        opened: false,
        searched: false,
        available: room.tick,
        manualEquip: true,
        manualPickup: true,
      },
    ];
  room = {
    ...(rescued || room),
    caches,
    serial: room.serial + 1,
    bag: [],
    path: [],
    searching: null,
    extraction: 0,
    resting: false,
    effects: [],
  };
  if (rescued) {
    room = {
      ...room,
      status: 'extracted',
      notice: '救援已消耗 · 背包留地 · 无储备将永久死亡',
      noticeUntil: room.tick + 360,
      player: { ...room.player, ...ELEVATOR, hurtUntil: 0 },
    };
    season = sync(
      {
        ...season,
        events: [
          ...season.events,
          {
            id: season.serial,
            at: season.tick,
            actor: 'player',
            floor: room.floor!,
            kind: 'rescue' as const,
            text: '救援消耗药×1／食×1／水×1 · 背包留地',
          },
        ].slice(-128),
        serial: season.serial + 1,
      },
      room,
    );
    return {
      ...s,
      room,
      season,
      stage: 'collapse',
      beat: 0,
      hostileTarget: undefined,
      interacting: undefined,
      lift: { ...s.lift, choosingFloor: false },
    };
  }
  season = seasonDeath(season, 'player');
  return {
    ...s,
    room: { ...room, status: 'dead', equipment: [], safe: [] },
    season,
    stage: 'collapse',
    beat: 0,
    hostileTarget: undefined,
  };
}

export function stepSeasonSession(
  s: OpeningState,
  input: SurvivalInput,
): OpeningState {
  if (seasonStopped(s.season)) return s;
  let season = tickSeason(s.season!),
    room = s.room;
  const live = season.phase === 'live';
  if (live) {
    const moved = !!input.x || !!input.z || room.path.length > 0;
    const player = {
      ...room.player,
      food: Math.max(0, room.player.food - STEP * 0.14),
      water: Math.max(0, room.player.water - STEP * (0.2 + (moved ? 0.11 : 0))),
    };
    if (player.food <= 0 || player.water <= 0)
      player.hp = Math.max(0, player.hp - STEP * 1.5);
    if (
      room.resting &&
      s.stage === 'home' &&
      player.food > 0 &&
      player.water > 0 &&
      player.hp < 100
    ) {
      player.hp = Math.min(100, player.hp + STEP * 2);
      player.food = Math.max(0, player.food - STEP * 0.5);
      player.water = Math.max(0, player.water - STEP * 0.7);
    }
    room = { ...room, player };
    // Metabolism is a rule, independent of the not-yet-connected decision controllers.
    for (const actor of season.actors.filter(
      (a) => a.controller === 'external' && a.status === 'alive',
    )) {
      const food = Math.max(0, actor.food - STEP * 0.14),
        water = Math.max(0, actor.water - STEP * 0.2),
        hp = Math.max(0, actor.hp - (food <= 0 || water <= 0 ? STEP * 1.5 : 0));
      season = syncSeasonActor(season, actor.id, {
        position: actor.position,
        inLift: actor.inLift,
        food,
        water,
        hp,
      });
      if (!hp) season = seasonDeath(season, actor.id);
    }
  }
  if (room.player.hp <= 0) return fatal({ ...s, room, season });
  if (s.stage === 'collapse')
    return s.beat >= 144
      ? {
          ...s,
          room,
          season,
          stage: 'home',
          beat: 0,
          homecoming: { ...s.homecoming, scene: 'complete' },
          afterlight: { ...s.afterlight, phase: 'complete' },
        }
      : { ...s, room, season, beat: s.beat + 1 };
  if (s.stage === 'home') return { ...s, room, season: sync(season, room) };
  const before = room;
  const activeHostile =
    live &&
    season.actors.find(
      (a) =>
        a.id === s.hostileTarget &&
        a.status === 'alive' &&
        a.floor === room.floor &&
        !a.inLift,
    );
  const channel =
    s.interacting &&
    !input.x &&
    !input.z &&
    !room.path.length &&
    room.player.hurtUntil <= room.tick
      ? s.interacting
      : undefined;
  const effectiveInput = channel
    ? {
        ...input,
        interact: true,
        cache: room.caches.some((c) => c.id === channel) ? channel : undefined,
      }
    : input;
  room = stepSurvival(
    {
      ...room,
      forbidGolden: seasonPlayer(season).qualified.includes(room.floor!),
    },
    effectiveInput,
    {
      needs: false,
      waves: live,
      combat: live && !activeHostile,
      search: live,
      supplies: live,
    },
  );
  room = preparationFog(room);
  if (
    room.status === 'running' &&
    season.actors.some(
      (a) =>
        a.id !== 'player' &&
        a.floor === room.floor &&
        a.status === 'alive' &&
        !a.inLift &&
        distance(a.position, room.player) < 0.55,
    )
  )
    room = {
      ...room,
      player: { ...room.player, x: before.player.x, z: before.player.z },
      path: [],
    };
  const gateBlocked =
    seasonHeld(season).length > 1 ||
    ['gathering', 'broadcast'].includes(season.phase);
  if (
    gateBlocked &&
    room.status === 'running' &&
    room.player.z > ELEVATOR.z + LIFT.doorZ - PLAYER_RADIUS
  )
    room = {
      ...room,
      player: {
        ...room.player,
        z: ELEVATOR.z + LIFT.doorZ - PLAYER_RADIUS - 0.01,
      },
      path: [],
      extraction: 0,
      notice: live ? '多余金票请扔下' : '等待广播结束',
      noticeUntil: room.tick + 60,
    };
  season = sync(season, room);
  const newlyHeld = room.bag
    .filter(
      (i) => i.kind === 'golden' && !before.bag.some((b) => b.uid === i.uid),
    )
    .map((i) => i.uid);
  if (newlyHeld.length) {
    const next = pickupSeasonGolden(season, 'player', newlyHeld);
    if (next === season)
      room = {
        ...room,
        bag: room.bag.filter((i) => !newlyHeld.includes(i.uid)),
        caches: before.caches,
        searching: null,
      };
    else season = next;
  }
  if (live && s.hostileTarget && !insideLift(room.player, ELEVATOR)) {
    const target = season.actors.find(
      (a) =>
        a.id === s.hostileTarget &&
        a.floor === room.floor &&
        a.status === 'alive' &&
        !a.inLift,
    );
    if (target)
      for (const gear of room.equipment) {
        const stats = weaponStats(room, gear),
          cooldown = gear.item.uid;
        if (
          !stats ||
          room.tick < (room.cooldowns[cooldown] || 0) ||
          distance(room.player, target.position) > stats.range ||
          !clearSight(room.player, target.position, room.world)
        )
          continue;
        const hp = Math.max(
          0,
          season.actors.find((a) => a.id === target.id)!.hp - stats.damage,
        );
        season = syncSeasonActor(season, target.id, {
          position: target.position,
          inLift: false,
          hp,
          food: target.food,
          water: target.water,
        });
        room = {
          ...room,
          cooldowns: {
            ...room.cooldowns,
            [cooldown]: room.tick + stats.interval,
          },
          effects: [
            ...room.effects,
            {
              id: room.serial++,
              kind: 'shot',
              from: room.player,
              to: target.position,
              amount: stats.damage,
              tick: room.tick,
            },
          ],
        };
        if (!hp) {
          season = seasonDeath(season, target.id);
          break;
        }
      }
  }
  season = workSeasonSource(
    season,
    'player',
    !!effectiveInput.interact &&
      !input.x &&
      !input.z &&
      !room.path.length &&
      room.player.hurtUntil <= room.tick,
  );
  if (room.status === 'dead' || room.player.hp <= 0)
    return fatal({ ...s, room, season });
  if (
    room.status === 'running' &&
    room.leftLift &&
    insideLift(room.player, ELEVATOR) &&
    !gateBlocked
  )
    room = survivalAction(room, { type: 'extract' });
  if (room.status === 'extracted') {
    season = sync(season, room);
    const next = redeemSeasonGolden(season, 'player');
    if (next !== season)
      room = { ...room, bag: room.bag.filter((i) => i.kind !== 'golden') };
    return {
      ...s,
      room,
      season: next,
      stage: 'home',
      beat: 0,
      hostileTarget: undefined,
      homecoming: { ...s.homecoming, scene: 'complete', tick: 0 },
      afterlight: { ...s.afterlight, phase: 'complete' },
      lift: { ...s.lift, choosingFloor: false },
    };
  }
  ({ room, season } = materializeSeasonGolden(room, season));
  return {
    ...s,
    room,
    season,
    hostileTarget: season.actors.some(
      (a) =>
        a.id === s.hostileTarget &&
        a.status === 'alive' &&
        a.floor === room.floor,
    )
      ? s.hostileTarget
      : undefined,
    interacting:
      channel &&
      (room.caches.some((c) => c.id === channel && !c.opened) ||
        season.sources.some((q) => q.id === channel && !q.taken))
        ? channel
        : undefined,
    stage: room.status === 'departing' ? 'second-departing' : 'expedition',
    beat: s.beat + 1,
  };
}
