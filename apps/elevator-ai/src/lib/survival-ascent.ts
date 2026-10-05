import { brainExperience, countKind, spendUnits } from './survival-stacks.ts';
import { ITEMS, createSurvival, type SurvivalState } from './survival-room.ts';
import { ROOM, ELEVATOR, revealFog } from './survival-world.ts';
export const ASCENT_COST = [
  { kind: 'lift-material', count: 30 },
  { kind: 'scrap', count: 2 },
] as const;
export const ascentReady = (r: SurvivalState) =>
  ASCENT_COST.every(
    (c) =>
      (c.kind === 'lift-material'
        ? brainExperience(r.bag) + (r.liftExperience || 0)
        : countKind(r.bag, c.kind)) >= c.count,
  );
export function payAscent(r: SurvivalState): SurvivalState | null {
  if (!ascentReady(r) || (r.liftLevel || 1) >= 2) return null;
  let bag = r.bag;
  const beforeXP = brainExperience(bag) + (r.liftExperience || 0);
  for (const c of ASCENT_COST)
    bag = spendUnits(
      bag,
      c.kind,
      c.kind === 'lift-material'
        ? Math.max(0, c.count - (r.liftExperience || 0))
        : c.count,
      c.kind === 'lift-material',
    );
  return {
    ...r,
    bag,
    liftLevel: 2,
    liftExperience: beforeXP - brainExperience(bag) - ASCENT_COST[0].count,
  };
}
/** First playable destination beyond the tutorial. Its own manifest, not a rerolled floor 2. */
export function dunesRoom(): SurvivalState {
  const r = createSurvival(92622);
  r.floor = 3;
  r.world = {
    version: 5,
    seed: r.seed,
    theme: 'dunes',
    bounds: { minX: 12, maxX: 84, minZ: 10, maxZ: 78 },
    modules: [],
    obstacles: [
      { x: 38, z: 65, w: 1.8, d: 7, type: 'wall' },
      { x: 60, z: 62, w: 6, d: 0.8, type: 'low-wall' },
      { x: 48, z: 49, w: 8, d: 0.8, type: 'low-wall' },
      { x: 33, z: 42, w: 2.2, d: 6, type: 'wall' },
      { x: 64, z: 33, w: 2.4, d: 8, type: 'wall' },
    ],
    gates: [
      { x: 35, z: 60 },
      { x: 65, z: 58 },
      { x: 40, z: 40 },
      { x: 60, z: 42 },
      { x: 49, z: 26 },
    ],
  };
  r.caches = [
    { x: 51, z: 63, kinds: ['water', 'food'] as const },
    { x: 37, z: 49, kinds: ['scrap', 'coolant'] as const },
    { x: 63, z: 39, kinds: ['laser'] as const },
  ].map((c, n) => {
    const contents = c.kinds.map((kind, i) => ({
      ...ITEMS[kind],
      uid: `dunes-${n}-${i}`,
    }));
    return {
      id: `dunes-cache-${n}`,
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
      id: 'dunes-guardian',
      x: 55,
      z: 30,
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
