import { ITEMS, createSurvival, type SurvivalState } from './survival-room.ts';
import {
  ROOM,
  ELEVATOR,
  revealFog,
  type Obstacle,
  type RoomWorld,
} from './survival-world.ts';

// Creature silhouettes ship with the architecture pack; combat stats stay in the room engine.
export const GARDEN_CREATURES = {
  crawler: '灯魇',
  runner: '丧鸢',
  brute: '铜餮',
  boss: '祠守',
} as const;
export const GARDEN_SIGHT_HEIGHT = {
  hall: 'tall',
  pavilion: 'tall',
  'moon-gate': 'tall',
  wall: 'tall',
  pond: 'low',
  tree: 'tall',
  bamboo: 'tall',
  lantern: 'low',
} as const;
export const GARDEN_ASSET_PACK = {
  id: 'jiangnan-1',
  creatures: GARDEN_CREATURES,
  creatureRenderer: 'jiangnan-spirits-1',
  sightHeights: GARDEN_SIGHT_HEIGHT,
} as const;

export type PavilionMood = 'rain' | 'feast' | 'relic';
export const GARDEN_GATE = { radius: 1.9, centerY: 1.5, opening: 2.1 } as const;
export type GardenAsset =
  | 'hall'
  | 'pavilion'
  | 'moon-gate'
  | 'wall'
  | 'pond'
  | 'tree'
  | 'bamboo'
  | 'lantern';
export type GardenInstance = {
  id: string;
  asset: GardenAsset;
  x: number;
  z: number;
  w: number;
  d: number;
  turn: 0 | 1;
};
export type GardenManifest = {
  pack: 'jiangnan-1';
  version: 1;
  seed: number;
  mood: PavilionMood;
  instances: GardenInstance[];
};
export const GARDEN_MOODS = {
  rain: {
    name: '雨夜听荷',
    note: '青瓦 · 旧朱漆 · 雨幕',
    wood: '#4e2929',
    plaster: '#aaa99a',
    tile: '#283c40',
    tileEdge: '#647776',
    stone: '#727c7a',
    foliage: '#284b42',
    leaf: '#56745a',
    lamp: '#ffaf58',
    paper: '#ae693e',
    sky: '#122528',
    moon: '#a1c0cf',
    exposure: 1.05,
    fog: 0.016,
  },
  feast: {
    name: '朱灯夜宴',
    note: '绛红 · 金饰 · 重重灯影',
    wood: '#862d31',
    plaster: '#b2a389',
    tile: '#333841',
    tileEdge: '#696970',
    stone: '#716563',
    foliage: '#7a302e',
    leaf: '#c47749',
    lamp: '#ff8f46',
    paper: '#d73b28',
    sky: '#251f2c',
    moon: '#a6accf',
    exposure: 1.02,
    fog: 0.014,
  },
  relic: {
    name: '月下荒祠',
    note: '褪色木作 · 白幡 · 寒月',
    wood: '#444c49',
    plaster: '#b1bcb0',
    tile: '#435452',
    tileEdge: '#8b9a8a',
    stone: '#77847e',
    foliage: '#33433b',
    leaf: '#6f7d66',
    lamp: '#a3d3ba',
    paper: '#b6c5aa',
    sky: '#182124',
    moon: '#bdcbd2',
    exposure: 0.9,
    fog: 0.023,
  },
} as const;

export function validGardenManifest(value: unknown): value is GardenManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as GardenManifest;
  return (
    m.pack === 'jiangnan-1' &&
    m.version === 1 &&
    Number.isSafeInteger(m.seed) &&
    ['rain', 'feast', 'relic'].includes(m.mood) &&
    Array.isArray(m.instances) &&
    m.instances.length > 0 &&
    m.instances.length <= 160 &&
    new Set(m.instances.map((a) => a?.id)).size === m.instances.length &&
    m.instances.every(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        a.id.length > 0 &&
        [
          'hall',
          'pavilion',
          'moon-gate',
          'wall',
          'pond',
          'tree',
          'bamboo',
          'lantern',
        ].includes(a.asset) &&
        [a.x, a.z, a.w, a.d].every(Number.isFinite) &&
        a.w > 0 &&
        a.d > 0 &&
        a.w < 50 &&
        a.d < 50 &&
        (a.turn === 0 || a.turn === 1),
    )
  );
}

/** The compact recipe is expanded ONCE. Save the result, never regenerate a visited floor. */
export function gardenManifest(
  seed = 92623,
  mood: PavilionMood = 'rain',
): GardenManifest {
  const instances: GardenInstance[] = [];
  const add = (
    asset: GardenAsset,
    x: number,
    z: number,
    w = 1,
    d = 1,
    turn: 0 | 1 = 0,
  ) =>
    instances.push({
      id: `jiangnan-${seed}-${instances.length}`,
      asset,
      x,
      z,
      w,
      d,
      turn,
    });
  add('hall', 47, 37, 14, 7);
  add('pavilion', 31, 53, 8, 6, 1);
  add('pavilion', 66, 44, 8, 6);
  add('moon-gate', 48.5, 65.5, 18, 0.65);
  add('wall', 26, 46, 15, 0.65, 1);
  add('wall', 68, 66, 13, 0.65, 1);
  add('pond', 60, 56, 8.5, 11);
  add('tree', 35.5, 41.5, 1, 1);
  add('tree', 64.5, 65.5, 0.8, 0.8);
  add('bamboo', 28, 61, 1.1, 1.1);
  add('bamboo', 59, 35, 1.3, 1.3);
  add('bamboo', 27, 37, 1.2, 1.2);
  add('lantern', 44.7, 69, 0.45, 0.45);
  add('lantern', 52.3, 69, 0.45, 0.45);
  add('lantern', 40, 45.5, 0.45, 0.45);
  add('lantern', 53.5, 45.5, 0.45, 0.45);
  return { pack: 'jiangnan-1', version: 1, seed, mood, instances };
}

export function gardenObstacles(manifest: GardenManifest): Obstacle[] {
  return manifest.instances.flatMap((a): Obstacle[] => {
    const rect = (
      x: number,
      w: number,
      d: number,
      type: Obstacle['type'] = 'wall',
    ): Obstacle => ({
      x: a.x + (a.turn ? 0 : x),
      z: a.z + (a.turn ? -x : 0),
      w: a.turn ? d : w,
      d: a.turn ? w : d,
      type,
      height: GARDEN_SIGHT_HEIGHT[a.asset],
    });
    if (a.asset === 'moon-gate') {
      const half = GARDEN_GATE.opening / 2,
        side = (a.w - GARDEN_GATE.opening) / 2;
      return [
        rect(-(half + side / 2), side, a.d),
        rect(half + side / 2, side, a.d),
      ];
    }
    return [
      rect(
        0,
        a.w,
        a.d,
        ['pond', 'bamboo', 'lantern', 'tree'].includes(a.asset)
          ? 'low-wall'
          : 'wall',
      ),
    ];
  });
}

export function gardenWorld(
  seed = 92623,
  mood: PavilionMood = 'rain',
): RoomWorld {
  const garden = gardenManifest(seed, mood);
  return {
    version: 6,
    seed,
    theme: 'pavilion',
    garden,
    bounds: { minX: 23, maxX: 73, minZ: 29, maxZ: 78 },
    modules: [],
    obstacles: gardenObstacles(garden),
    gates: [
      { x: 34, z: 70 },
      { x: 61, z: 72 },
      { x: 41, z: 53 },
      { x: 54.8, z: 46.5 },
      { x: 65, z: 35 },
    ],
  };
}

export function pavilionRoom(): SurvivalState {
  const r = createSurvival(92623);
  r.floor = 3;
  r.world = gardenWorld(r.seed);
  r.caches = [
    { x: 51.5, z: 70.5, kinds: ['water', 'food'] as const },
    { x: 37.5, z: 54, kinds: ['scrap', 'coolant'] as const },
    { x: 62.5, z: 48.5, kinds: ['laser'] as const },
  ].map((c, n) => {
    const contents = c.kinds.map((kind, i) => ({
      ...ITEMS[kind],
      uid: `jiangnan-cache-${n}-${i}`,
    }));
    return {
      id: `jiangnan-cache-${n}`,
      x: c.x,
      z: c.z,
      item: contents[0],
      contents,
      container: 'crate',
      searched: false,
      opened: false,
      available: 0,
      manualEquip: true,
    };
  });
  for (const c of r.caches)
    r.world.obstacles.push({
      x: c.x,
      z: c.z - 0.9,
      w: 1.4,
      d: 0.9,
      type: 'container',
    });
  r.enemies = [
    {
      ...r.enemies[0],
      id: 'jiangnan-guardian',
      x: 48.5,
      z: 46,
      hp: 600,
      maxHp: 600,
    },
  ];
  r.fog = revealFog(
    ELEVATOR,
    {
      explored: Array(ROOM.width * ROOM.depth).fill(0),
      visible: Array(ROOM.width * ROOM.depth).fill(0),
    },
    r.world,
  );
  return r;
}
