import {
  createSurvival,
  ITEMS,
  ROOM,
  ELEVATOR,
  type Item,
  type Point,
  type Cache,
  type SurvivalState,
} from './survival-room.ts';
import { LIFT } from './survival-lift.ts';
import {
  walkable,
  revealFog,
  flood,
  cellKey,
  type RoomWorld,
} from './survival-world.ts';
import {
  seasonRoomSeed,
  seasonRoomKey,
  type SeasonState,
  type SeasonWorld,
} from './survival-season.ts';

/** Equal modules make the actual navigable exploration area exactly 3:2. */
export function createSeasonWorld(seed: number, floor: number): RoomWorld {
  const shared = floor === 4 || floor % 10 === 0,
    modules = shared ? 3 : 2,
    minX = shared ? 30 : 36;
  const world: RoomWorld = {
    version: 4,
    seed,
    theme: 'maintenance',
    sight: 12,
    bounds: { minX, maxX: minX + modules * 12, minZ: 52, maxZ: 77 },
    modules: [],
    gates: [],
    obstacles: LIFT.walls.map((w) => ({
      x: ELEVATOR.x + w.x,
      z: ELEVATOR.z + w.z,
      w: w.w,
      d: w.d,
      type: 'lift-wall' as const,
    })),
  };
  for (let i = 0; i < modules; i++) {
    const x = minX + i * 12;
    world.obstacles.push(
      { x: x + 4.5, z: 60.5, w: 3, d: 1.5, type: 'shelf' },
      { x: x + 9.5, z: 65.5, w: 1, d: 4, type: 'low-wall', height: 'low' },
    );
    world.gates.push({ x: x + 2.5, z: 53.5 }, { x: x + 10.5, z: 71.5 });
  }
  let area = 0;
  for (let z = 52; z < 74; z++)
    for (let x = minX; x < minX + modules * 12; x++)
      if (walkable({ x: x + 0.5, z: z + 0.5 }, 0.42, world)) area++;
  world.seasonLayout = {
    kind: floor === 4 ? 'preparation' : shared ? 'checkpoint' : 'private',
    area,
    entrances: [
      { ...ELEVATOR },
      ...Array.from({ length: 11 }, (_, i) =>
        i < 6
          ? { x: minX + 0.5, z: 54.5 + i * 3.5 }
          : { x: minX + modules * 12 - 0.5, z: 54.5 + (i - 6) * 4 },
      ),
    ],
  };
  return world;
}
export function nearestSeasonGround(
  world: RoomWorld,
  position: Point,
): Point | null {
  const reachable = flood({ x: ELEVATOR.x, z: ELEVATOR.z - 2.4 }, world);
  const candidates: Point[] = [];
  for (let z = 0; z < ROOM.depth; z++)
    for (let x = 0; x < ROOM.width; x++) {
      const p = { x: x + 0.5, z: z + 0.5 };
      if (reachable[cellKey(p)] >= 0 && walkable(p, 0.42, world) && p.z < 74)
        candidates.push(p);
    }
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - position.x, a.z - position.z) -
        Math.hypot(b.x - position.x, b.z - position.z) ||
      a.x - b.x ||
      a.z - b.z,
  );
  return candidates[0] || null;
}
export function createSeasonRoom(
  seed: number,
  floor: number,
  actor = 'player',
): SurvivalState {
  const roomSeed = seasonRoomSeed(seed, floor, actor),
    base = createSurvival(roomSeed),
    world = createSeasonWorld(roomSeed, floor);
  const kinds: Item['kind'][] =
    floor === 4
      ? []
      : [
          'food',
          'water',
          'medicine',
          'scrap',
          'scrap',
          'food',
          'water',
          floor >= 20 ? 'laser' : 'nail',
        ];
  const points = [
    { x: 45.5, z: 70.5 },
    { x: 51.5, z: 70.5 },
    { x: 47.5, z: 64.5 },
    { x: 38.5, z: 67.5 },
    { x: 57.5, z: 67.5 },
    { x: 41.5, z: 55.5 },
    { x: 55.5, z: 55.5 },
    { x: 48.5, z: 54.5 },
  ];
  const caches: Cache[] = kinds.map((kind, i) => {
    const point = nearestSeasonGround(world, points[i])!;
    const item = {
      ...ITEMS[kind],
      uid: `season:${seed}:${seasonRoomKey(floor, actor)}:cache:${i}`,
    };
    return {
      ...point,
      id: `season-cache:${seed}:${seasonRoomKey(floor, actor)}:${i}`,
      item,
      contents: [item],
      container: i < 3 ? 'locker' : 'crate',
      searched: false,
      opened: false,
      available: 0,
      manualEquip: true,
    };
  });
  const guardian =
    floor === 4
      ? []
      : [
          {
            id: `season:${seed}:${seasonRoomKey(floor, actor)}:guardian`,
            kind: 'boss' as const,
            x: 48.5,
            z: 56.5,
            hp: 110 + Math.floor(floor / 10) * 18,
            maxHp: 110 + Math.floor(floor / 10) * 18,
            level: 4 + Math.min(4, Math.floor(floor / 20)),
            nextAttack: 120,
            awake: false,
            hitAt: -100,
            windup: 0,
            aim: null,
            pursuit: 'territorial' as const,
            home: { x: 48.5, z: 56.5 },
          },
        ];
  return {
    ...base,
    seed: roomSeed,
    rng: roomSeed,
    world,
    fog: revealFog(
      ELEVATOR,
      {
        explored: Array(ROOM.width * ROOM.depth).fill(0),
        visible: Array(ROOM.width * ROOM.depth).fill(0),
      },
      world,
      12,
    ),
    floor,
    seasonRules: true,
    notice: '',
    noticeUntil: 0,
    lootBudget: floor === 4 ? 0 : 36,
    status: 'ready',
    bag: [],
    safe: [],
    equipment: [],
    warehouse: [],
    caches,
    enemies: guardian,
    spawns: [],
    kills: 0,
    bossDefeated: false,
    nextWave: 270,
    player: { ...base.player, ...ELEVATOR },
    liftLightOn: true,
    liftLevel: 2,
  };
}
export function seasonWorldSnapshot(room: SurvivalState): SeasonWorld {
  const {
    seed,
    world,
    fog,
    rng,
    tick,
    serial,
    caches,
    enemies,
    spawns,
    nextWave,
    wave,
    kills,
    bossDefeated,
    damage,
    lootBudget,
  } = room;
  return {
    seed,
    world,
    fog,
    rng,
    tick,
    serial,
    caches,
    enemies,
    spawns,
    nextWave,
    wave,
    kills,
    bossDefeated,
    damage,
    lootBudget,
  };
}
export function preparationFog(room: SurvivalState): SurvivalState {
  if (room.floor !== 4) return room;
  const explored = Array(ROOM.width * ROOM.depth).fill(0),
    visible = [...explored],
    b = room.world.bounds!;
  for (let z = Math.floor(b.minZ); z < b.maxZ; z++)
    for (let x = Math.floor(b.minX); x < b.maxX; x++) {
      const i = z * ROOM.width + x;
      explored[i] = visible[i] = 1;
    }
  return { ...room, fog: { explored, visible } };
}
/** Ledger references never constitute a second physical inventory. */
export function materializeSeasonGolden(
  room: SurvivalState,
  season: SeasonState,
): { room: SurvivalState; season: SeasonState } {
  const floor = room.floor || 1,
    pool = season.checkpoints.find((p) => p.floor === floor);
  if (!pool || pool.frozenAt === null) return { room, season };
  let nextRoom = room,
    nextSeason = season;
  for (const token of season.golden.filter(
    (g) => g.floor === floor && g.status === 'ground',
  )) {
    if (
      nextRoom.caches.some(
        (c) => !c.opened && c.contents.some((i) => i.uid === token.id),
      )
    )
      continue;
    const position = nearestSeasonGround(room.world, token.position);
    if (!position) throw new Error('Golden pass has no reachable placement');
    const item = { ...ITEMS.golden, uid: token.id };
    nextRoom = {
      ...nextRoom,
      caches: [
        ...nextRoom.caches,
        {
          ...position,
          id: `gold-cache:${token.id}`,
          item,
          contents: [item],
          container: 'loose',
          searched: false,
          opened: false,
          available: room.tick,
          manualEquip: true,
          manualPickup: true,
          loose: true,
        },
      ],
    };
    nextSeason = {
      ...nextSeason,
      golden: nextSeason.golden.map((g) =>
        g.id === token.id ? { ...g, position } : g,
      ),
    };
  }
  return { room: nextRoom, season: nextSeason };
}
