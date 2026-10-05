import type { OpeningAction, OpeningState } from './survival-opening.ts';
import { maintenanceRoom, departureIdentities } from './survival-afterlight.ts';
import { gardenWorld, pavilionRoom } from './survival-pavilion.ts';
import {
  ELEVATOR,
  clearSight,
  survivalAction,
  type SurvivalInput,
  type SurvivalState,
} from './survival-room.ts';
import { revealFog, visionRange } from './survival-world.ts';
import { brainExperience, countKind, spendUnits } from './survival-stacks.ts';
import {
  acknowledgeRace,
  ascendRace,
  createRace,
  destinationReason,
  qualifyRace,
  raceCheckpoint,
  raceFloorSeed,
  racePaused,
  racePlayer,
  raceSpan,
  tickRace,
} from './survival-race.ts';

/** Reuse verified theme kits; each visited destination has its own persisted manifest/UIDs. */
export function createRaceRoom(floor: number): SurvivalState {
  const garden = floor % 2 === 1;
  const base = garden ? pavilionRoom() : maintenanceRoom();
  const seed = raceFloorSeed(floor);
  const room: SurvivalState = {
    ...base,
    floor,
    seed,
    rng: seed,
    world: garden
      ? gardenWorld(
          seed,
          ['rain', 'feast', 'relic'][Math.floor(floor / 10) % 3] as
            | 'rain'
            | 'feast'
            | 'relic',
        )
      : { ...base.world, seed },
    caches: base.caches.map((c, i) => {
      const contents = c.contents.map((item, n) => ({
        ...item,
        uid: `race-${floor}-cache-${i}-${n}`,
      }));
      return {
        ...c,
        id: `race-${floor}-cache-${i}`,
        contents,
        item: contents[0],
        manualEquip: true,
      };
    }),
    enemies: base.enemies.map((e) => ({
      ...e,
      id: `race-${floor}-guardian`,
      level: Math.min(8, 4 + Math.floor(floor / 10)),
      hp: Math.round(e.hp * (1 + (floor - 3) * 0.045)),
      maxHp: Math.round(e.maxHp * (1 + (floor - 3) * 0.045)),
    })),
  };
  if (garden)
    room.world.obstacles.push(
      ...base.world.obstacles.filter((o) => o.type === 'container'),
    );
  room.fog = revealFog(ELEVATOR, room.fog, room.world);
  return room;
}
export function enrollRace(s: OpeningState): OpeningState {
  if (s.race) return s;
  return {
    ...s,
    version: 7,
    race: createRace(s.room.seed, s.room.floor),
    afterlight: { ...s.afterlight, phase: 'complete', tick: 0 },
    lastRobotLine: '欢迎参加百层竞速。007号，先抵达100层的人获胜。',
  };
}
const guardianDefeated = (s: OpeningState) =>
  !s.room.enemies.some((e) => e.kind === 'boss' && e.hp > 0);
/** null delegates to the historical tutorial; all race-only actions are handled here. */
export function raceOpeningAction(
  s: OpeningState,
  a: OpeningAction,
): OpeningState | null {
  if (!s.race) {
    if (
      a.type === 'confirm-report' &&
      s.stage === 'home' &&
      s.afterlight.phase === 'report' &&
      (s.room.floor || 1) >= 3
    )
      return enrollRace(s);
    return null;
  }
  const race = s.race,
    floor = s.room.floor || 1;
  if (a.type === 'ack-race') return { ...s, race: acknowledgeRace(race) };
  if (a.type === 'submit-review' && s.stage === 'home') {
    const next = qualifyRace(race, 'player', guardianDefeated(s));
    return next === race
      ? s
      : {
          ...s,
          race: next,
          lastRobotLine: next.events.at(-1)?.text,
          room: {
            ...s.room,
            liftExperience:
              (s.room.liftExperience || 0) + (next.result?.converted || 0),
          },
        };
  }
  if (racePaused(race)) return s;
  if (
    a.type === 'review-race' &&
    s.stage === 'home' &&
    floor % 10 === 0 &&
    !racePlayer(race).qualified.includes(floor)
  )
    return { ...s, race: { ...race, scene: 'review' } };
  if (
    a.type === 'confirm-report' &&
    s.stage === 'home' &&
    s.afterlight.phase === 'report'
  )
    return {
      ...s,
      afterlight: { ...s.afterlight, phase: 'complete', tick: 0 },
      race:
        floor % 10 === 0 && !racePlayer(race).qualified.includes(floor)
          ? { ...race, scene: 'review' }
          : race,
    };
  if (
    a.type === 'upgrade-race' &&
    s.stage === 'home' &&
    s.afterlight.phase !== 'report'
  ) {
    const level = s.room.liftLevel || 2,
      cost = 40 + (level - 2) * 30;
    const xp = brainExperience(s.room.bag) + (s.room.liftExperience || 0);
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
      lastRobotLine: `电梯升级完成，单次最大跨度提升至${raceSpan(level + 1)}层。`,
      room: {
        ...s.room,
        bag,
        liftLevel: level + 1,
        liftParts: 0,
        liftExperience: xp - brainExperience(bag) - cost,
      },
    };
  }
  if (a.type !== 'choose-floor') return null;
  if (
    s.stage !== 'home' ||
    s.homecoming.scene !== 'complete' ||
    !s.lift.choosingFloor ||
    s.afterlight.phase === 'report' ||
    destinationReason(race, 'player', a.floor, s.room.liftLevel || 2)
  )
    return s;
  const nextRace =
    a.floor === s.room.floor
      ? race
      : ascendRace(race, 'player', a.floor, s.room.liftLevel || 2);
  if (a.floor !== s.room.floor && nextRace === race) return s;
  const fresh = a.floor === s.room.floor ? s.room : createRaceRoom(a.floor);
  const room: SurvivalState = {
    ...fresh,
    serial: Math.max(fresh.serial, s.room.serial),
    bag: s.room.bag,
    safe: s.room.safe,
    equipment: s.room.equipment,
    liftLevel: s.room.liftLevel,
    liftExperience: s.room.liftExperience || 0,
    liftParts: s.room.liftParts || 0,
    warehouse: s.room.warehouse || [],
    liftLightOn: true,
    status: 'ready',
    departureTick: 0,
    extraction: 0,
    searching: null,
    path: [],
    leftLift: false,
    player: { ...s.room.player, ...ELEVATOR, hurtUntil: 0 },
    notice: '',
    noticeUntil: 0,
  };
  room.fog = revealFog(room.player, room.fog, room.world, visionRange(room));
  return {
    ...s,
    race: nextRace,
    lastRobotLine: nextRace.events.at(-1)?.text || s.lastRobotLine,
    stage: 'second-departing',
    beat: 0,
    room: survivalAction(room, { type: 'start' }),
    afterlight: {
      ...s.afterlight,
      phase: 'explore',
      tick: 0,
      departureOwned: departureIdentities(s.room),
      collected: [],
      used: [],
      failedReturn: false,
      hint: '',
      hintUntil: 0,
    },
    lift: {
      ...s.lift,
      trips: s.lift.trips + 1,
      choosingFloor: false,
      highestFloor: Math.max(s.lift.highestFloor, a.floor),
    },
  };
}
export function stepRaceSession(
  before: OpeningState,
  next: OpeningState,
  input: SurvivalInput,
): OpeningState {
  if (!before.race || before === next) return next;
  const race = tickRace(
    before.race,
    next.stage === 'expedition'
      ? [
          {
            actor: 'player',
            x: next.room.player.x,
            z: next.room.player.z,
            working:
              !!input.interact &&
              !input.x &&
              !input.z &&
              !next.room.path.length,
            blockedSources: before.race.sources
              .filter(
                (source) =>
                  source.floor === next.room.floor &&
                  !clearSight(next.room.player, source, next.room.world),
              )
              .map((source) => source.id),
            hurt: next.room.player.hurtUntil > next.room.tick,
            guardianAlive: !guardianDefeated(next),
          },
        ]
      : [],
  );
  const latest = race.events.at(-1);
  return {
    ...next,
    race,
    lastRobotLine:
      latest?.id !== before.race.events.at(-1)?.id
        ? latest?.text
        : next.lastRobotLine,
  };
}
export const nextRaceGoal = (s: OpeningState) => {
  if (!s.race) return '';
  const c = racePlayer(s.race);
  if (s.stage === 'home' && s.afterlight.phase !== 'report')
    return c.floor % 10 === 0 && !c.qualified.includes(c.floor)
      ? '驻守者与2张通行证齐备后，提交本层审查'
      : '按E选择楼层：继续搜刮，或花票向上';
  if (c.floor === raceCheckpoint(c.floor) && !c.qualified.includes(c.floor))
    return guardianDefeated(s)
      ? '携带2张通行证返回电梯，提交审查'
      : '击败驻守者，取得本段晋级资格';
  return c.passes.length
    ? '返回电梯，选择继续搜刮或跨层冲刺'
    : '寻找通行终端，按住E登记通行证';
};
