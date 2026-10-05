// Small, versioned recipes generate large rooms without per-object authoring.
import { equipmentMechanics } from './survival-item-traits.ts';
import { LIFT, PLAYER_RADIUS } from './survival-lift.ts';
import type { GardenManifest } from './survival-pavilion.ts';
export type Point = { x: number; z: number };
export type Obstacle = Point & {
  height?: 'low' | 'tall';
  w: number;
  d: number;
  type:
    | 'tank'
    | 'pump'
    | 'shelf'
    | 'low-wall'
    | 'wall'
    | 'lift-wall'
    | 'lift-fixture'
    | 'container';
};
export const OBSTACLE_HEIGHT: Record<Obstacle['type'], 'low' | 'tall'> = {
  tank: 'tall',
  pump: 'tall',
  shelf: 'tall',
  'low-wall': 'low',
  wall: 'tall',
  'lift-wall': 'tall',
  'lift-fixture': 'low',
  container: 'low',
};
export const blocksVision = (o: Obstacle) =>
  (o.height || OBSTACLE_HEIGHT[o.type]) === 'tall';
export const ROOM = { width: 96, depth: 80 };
// Real-width doorway centred on a navigation cell.
export const ELEVATOR = { x: 48.5, z: 75.5 };
export const SIGHT = 12;
export const WORLD_VERSION = 4;
export type RoomWorld = {
  theme?: 'wasteland' | 'maintenance' | 'dunes' | 'pavilion';
  garden?: GardenManifest;
  sight?: number;
  version: number;
  seed: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  modules: {
    id: string;
    x: number;
    z: number;
    recipe: number;
    mirrored: boolean;
  }[];
  obstacles: Obstacle[];
  gates: Point[];
};
export function generateWorld(seed = 92601): RoomWorld {
  let rng = seed >>> 0;
  const random = () =>
    (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
  const world: RoomWorld = {
    version: WORLD_VERSION,
    seed,
    modules: [],
    obstacles: [],
    gates: [],
  };
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const x = col * 24,
        z = row * 20;
      const recipe = Math.floor(random() * 3),
        mirrored = random() > 0.5;
      world.modules.push({
        id: `sector-${row}-${col}`,
        x,
        z,
        recipe,
        mirrored,
      });
      const add = (
        px: number,
        pz: number,
        w: number,
        d: number,
        type: Obstacle['type'],
      ) =>
        world.obstacles.push({
          x: x + (mirrored ? 24 - px : px),
          z: z + pz,
          w,
          d,
          type,
        });
      // The perimeter and central cross remain open in EVERY recipe. Adjoining
      // modules therefore have connected routes without a probabilistic repair.
      if (recipe === 0) {
        add(6, 6, 4.8, 4.8, 'tank');
        add(18, 14, 4.8, 4.8, 'tank');
        add(18, 5, 5, 2.4, 'pump');
        add(6, 15, 4, 1.6, 'shelf');
      } else if (recipe === 1) {
        add(6, 6, 5, 2.8, 'pump');
        add(18, 6, 5, 2.8, 'pump');
        add(6, 14, 4, 2, 'shelf');
        add(18, 14, 4, 2, 'shelf');
      } else {
        add(6, 6, 5.4, 1, 'wall');
        add(18, 14, 5.4, 1, 'wall');
        add(6, 14, 4.8, 4.8, 'tank');
        add(18, 6, 4.8, 4.8, 'tank');
      }
      world.gates.push({ x: x + 2, z: z + 10 }, { x: x + 12, z: z + 2 });
    }
  for (const rect of LIFT.walls)
    world.obstacles.push({
      x: ELEVATOR.x + rect.x,
      z: ELEVATOR.z + rect.z,
      w: rect.w,
      d: rect.d,
      type: 'lift-wall',
    });
  for (const rect of LIFT.fixtures)
    world.obstacles.push({
      x: ELEVATOR.x + rect.x,
      z: ELEVATOR.z + rect.z,
      w: rect.w,
      d: rect.d,
      type: 'lift-fixture',
    });
  return world;
}
export const DEFAULT_WORLD = generateWorld();
export const OBSTACLES = DEFAULT_WORLD.obstacles;
export const GATES = DEFAULT_WORLD.gates;
export function walkable(
  p: Point,
  radius = PLAYER_RADIUS,
  world: RoomWorld = DEFAULT_WORLD,
) {
  const bounds = world.bounds;
  if (
    bounds &&
    (p.x < bounds.minX + radius ||
      p.x > bounds.maxX - radius ||
      p.z < bounds.minZ + radius ||
      p.z > bounds.maxZ - radius)
  )
    return false;
  if (
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.z) ||
    p.x < radius + 0.4 ||
    p.x > ROOM.width - radius - 0.4 ||
    p.z < radius + 0.4 ||
    p.z > ROOM.depth - radius - 0.4
  )
    return false;
  return !world.obstacles.some(
    (o) =>
      Math.abs(p.x - o.x) < o.w / 2 + radius &&
      Math.abs(p.z - o.z) < o.d / 2 + radius,
  );
}
// Segment / expanded-AABB intersection also supports safe body navigation.
export function clearSight(
  a: Point,
  b: Point,
  world: RoomWorld = DEFAULT_WORLD,
  radius = 0.03,
  movement = false,
) {
  return !world.obstacles.some((o) => {
    if (!movement && !blocksVision(o)) return false;
    let lo = 0,
      hi = 1;
    for (const axis of ['x', 'z'] as const) {
      const half = (axis === 'x' ? o.w : o.d) / 2 + radius,
        delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-9) {
        if (Math.abs(a[axis] - o[axis]) >= half) return false;
      } else {
        const t1 = (o[axis] - half - a[axis]) / delta,
          t2 = (o[axis] + half - a[axis]) / delta;
        lo = Math.max(lo, Math.min(t1, t2));
        hi = Math.min(hi, Math.max(t1, t2));
        if (lo > hi) return false;
      }
    }
    return hi > 0.001 && lo < 0.999;
  });
}
export const cellKey = (p: Point) =>
  Math.floor(p.z) * ROOM.width + Math.floor(p.x);
export const center = (key: number): Point => ({
  x: (key % ROOM.width) + 0.5,
  z: Math.floor(key / ROOM.width) + 0.5,
});
const masks = new WeakMap<RoomWorld, Uint8Array>();
const fields = new WeakMap<RoomWorld, Map<number, Int16Array>>();
export function walkMask(world: RoomWorld) {
  let mask = masks.get(world);
  if (!mask) {
    mask = Uint8Array.from(
      { length: ROOM.width * ROOM.depth },
      (_, i) => +walkable(center(i), 0.42, world),
    );
    masks.set(world, mask);
  }
  return mask;
}
export function flood(target: Point, world: RoomWorld) {
  const start = cellKey(target);
  let cache = fields.get(world);
  if (!cache) {
    cache = new Map();
    fields.set(world, cache);
  }
  const cached = cache.get(start);
  if (cached) return cached;
  const mask = walkMask(world),
    result = new Int16Array(mask.length).fill(-1),
    queue = [start];
  result[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head];
    for (const next of [key - ROOM.width, key - 1, key + 1, key + ROOM.width]) {
      if (
        !mask[next] ||
        result[next] !== -1 ||
        Math.abs((next % ROOM.width) - (key % ROOM.width)) > 1
      )
        continue;
      result[next] = result[key] + 1;
      queue.push(next);
    }
  }
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  cache.set(start, result);
  return result;
}
export type Fog = { explored: number[]; visible: number[] };
export const visionRange = (s: {
  world: RoomWorld;
  equipment?: { item: { kind: string } }[];
}) => (s.world.sight ?? SIGHT) + equipmentMechanics(s.equipment).vision;
export function revealFog(
  player: Point,
  previous: Fog,
  world: RoomWorld,
  sight = world.sight ?? SIGHT,
): Fog {
  const explored = [...previous.explored],
    visible = Array<number>(ROOM.width * ROOM.depth).fill(0);
  for (
    let z = Math.max(0, Math.floor(player.z - sight));
    z < Math.min(ROOM.depth, player.z + sight);
    z++
  )
    for (
      let x = Math.max(0, Math.floor(player.x - sight));
      x < Math.min(ROOM.width, player.x + sight);
      x++
    ) {
      const p = { x: x + 0.5, z: z + 0.5 },
        dist = Math.hypot(p.x - player.x, p.z - player.z);
      // Show the front face of occluders, without seeing through their volume.
      const inset = Math.max(0, dist - 0.8) / Math.max(0.001, dist);
      if (
        dist <= sight &&
        clearSight(
          player,
          {
            x: player.x + (p.x - player.x) * inset,
            z: player.z + (p.z - player.z) * inset,
          },
          world,
        )
      ) {
        const key = z * ROOM.width + x;
        visible[key] = 1;
        explored[key] = 1;
      }
    }
  // Reveal the silhouette of a machine once its near face is seen. Only its
  // footprint is filled; this never opens a sight ray through it to enemies.
  const sightRays = [...visible];
  for (const o of world.obstacles) {
    const keys: number[] = [];
    for (
      let z = Math.max(0, Math.floor(o.z - o.d / 2));
      z < Math.min(ROOM.depth, o.z + o.d / 2);
      z++
    )
      for (
        let x = Math.max(0, Math.floor(o.x - o.w / 2));
        x < Math.min(ROOM.width, o.x + o.w / 2);
        x++
      )
        keys.push(z * ROOM.width + x);
    if (keys.some((key) => sightRays[key]))
      for (const key of keys) {
        visible[key] = 1;
        explored[key] = 1;
      }
  }
  return { explored, visible };
}
export const isVisible = (
  s: {
    player: Point;
    fog: Fog;
    world: RoomWorld;
    equipment?: { item: { kind: string } }[];
  },
  p: Point,
) =>
  !!s.fog.visible[cellKey(p)] &&
  Math.hypot(p.x - s.player.x, p.z - s.player.z) <= visionRange(s) &&
  clearSight(s.player, p, s.world);
