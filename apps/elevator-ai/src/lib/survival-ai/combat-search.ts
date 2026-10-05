import { fingerprint } from './protocol.ts';
import {
  createCombatModel,
  rankCombat,
  COMBAT_ACTIONS,
  type CombatModel,
  type CombatObservation,
  type CombatAction,
} from './combat-lab.ts';
import {
  validateEncounterModel,
  type EncounterModel,
} from './encounter-policy.ts';

type P = { x: number; z: number };
type Wall = CombatObservation['walls'][number];
export const SEARCH_SCHEMA = 'f9-combat-search-v1';
export const SEARCH_FEATURES = [
  'bias',
  'hp',
  'hold',
  'clue',
  'frontier',
  'continuation',
  'distance',
  'route-length',
  'new-goal-view',
  'new-route-view',
  'stale-goal-view',
  'stale-route-view',
  'clue-freshness',
  'goal-age',
  'map-unseen',
  'map-staleness',
  'goal-recently-checked',
  'recent-backtrack',
  'clue-count',
  'idle-age',
  'blocked-age',
  'goal-time',
  'direction-continue',
  'direction-reverse',
  'dx',
  'dz',
  'edge-clearance',
  'goal-visible',
  'near-clue',
  'route-efficiency',
  'search-progress',
  'recent-injury',
  'route-newness-per-meter',
  'route-staleness-per-meter',
] as const;
export type SearchMemory = {
  viewed: Record<string, number>;
  clues: Record<string, P & { tick: number }>;
  checked: Record<string, number>;
  trail: (P & { tick: number })[];
  idleSince: number;
  goal?: { key: string; to: P; started: number; distance: number };
};
export type SearchModel = {
  schema: typeof SEARCH_SCHEMA;
  featureNames: readonly string[];
  core: EncounterModel;
};
export type SearchChoice = {
  key: string;
  to: P;
  type: 'hold' | 'clue' | 'frontier';
  path: P[];
  features: number[];
  utility: number;
};
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.z - b.z);
const cap = (v: number) => Math.max(0, Math.min(1, v));
const key = (p: P) => `${p.x},${p.z}`;
const landmarks: P[] = Array.from({ length: 49 }, (_, i) => ({
  x: ((i % 7) - 3) * 3,
  z: (Math.floor(i / 7) - 3) * 3,
}));
function walkable(p: P, walls: Wall[]) {
  return (
    Math.abs(p.x) < 11.7 &&
    Math.abs(p.z) < 11.7 &&
    !walls.some(
      (w) =>
        Math.abs(p.x - w.x) < w.w / 2 + 0.27 &&
        Math.abs(p.z - w.z) < w.d / 2 + 0.27,
    )
  );
}
function segment(a: P, b: P, walls: Wall[], collision = false) {
  const steps = Math.max(1, Math.ceil(dist(a, b) / 0.2));
  for (let i = 0; i <= steps; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / steps,
      z: a.z + ((b.z - a.z) * i) / steps,
    };
    if (
      collision
        ? !walkable(p, walls)
        : walls.some(
            (w) =>
              Math.abs(p.x - w.x) < w.w / 2 && Math.abs(p.z - w.z) < w.d / 2,
          )
    )
      return false;
  }
  return true;
}
const visible = (a: P, b: P, walls: Wall[]) =>
  dist(a, b) <= 12 && segment(a, b, walls);
export function emptySearchMemory(tick = 0): SearchMemory {
  return { viewed: {}, clues: {}, checked: {}, trail: [], idleSince: tick };
}
export function updateSearchMemory(
  previous: SearchMemory,
  o: CombatObservation,
): SearchMemory {
  const m = structuredClone(previous);
  const seen = new Set(o.mobs.map((b) => b.id));
  for (const [id, c] of Object.entries(m.clues)) {
    if (
      (!seen.has(id) && visible(o.player, c, o.walls)) ||
      o.tick - c.tick > 1200
    )
      delete m.clues[id];
  }
  for (const b of o.mobs) m.clues[b.id] = { x: b.x, z: b.z, tick: o.tick };
  for (const p of landmarks)
    if (walkable(p, o.walls) && visible(o.player, p, o.walls))
      m.viewed[key(p)] = o.tick;
  m.trail = [
    ...m.trail.filter((p) => o.tick - p.tick <= 240),
    { x: o.player.x, z: o.player.z, tick: o.tick },
  ];
  if (o.mobs.length) {
    delete m.goal;
    m.idleSince = o.tick;
  }
  if (m.goal && m.goal.key !== 'hold' && dist(o.player, m.goal.to) < 0.65) {
    m.checked[m.goal.key] = o.tick;
    delete m.goal;
  }
  return m;
}
function routeMap(from: P, walls: Wall[]) {
  const roots = [
    { x: Math.round(from.x), z: Math.round(from.z) },
    ...Array.from({ length: 9 }, (_, i) => ({
      x: Math.round(from.x) + (i % 3) - 1,
      z: Math.round(from.z) + Math.floor(i / 3) - 1,
    })),
  ]
    .filter((p) => walkable(p, walls) && segment(from, p, walls, true))
    .sort((a, b) => dist(a, from) - dist(b, from));
  if (!roots.length) return new Map<string, P[]>();
  const root = roots[0],
    queue = [root],
    parent = new Map<string, P | null>([[key(root), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const d of [
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 },
      { x: 0, z: -1 },
    ]) {
      const n = { x: p.x + d.x, z: p.z + d.z };
      if (
        !parent.has(key(n)) &&
        walkable(n, walls) &&
        segment(p, n, walls, true)
      ) {
        parent.set(key(n), p);
        queue.push(n);
      }
    }
  }
  const paths = new Map<string, P[]>();
  for (const p of queue) {
    const route: P[] = [];
    for (let n: P | null = p; n; n = parent.get(key(n)) || null)
      route.unshift(n);
    paths.set(key(p), route);
  }
  return paths;
}
function pathFrom(map: Map<string, P[]>, from: P, to: P, walls: Wall[]) {
  if (segment(from, to, walls, true)) return [to];
  const route = map.get(key({ x: Math.round(to.x), z: Math.round(to.z) }));
  if (!route) return [];
  const points = [...route, to],
    smooth: P[] = [];
  let p = from,
    index = 0;
  while (index < points.length) {
    let far = index;
    for (let j = index; j < points.length; j++)
      if (segment(p, points[j], walls, true)) far = j;
    smooth.push(points[far]);
    p = points[far];
    index = far + 1;
  }
  return smooth;
}
export function searchChoices(
  o: CombatObservation,
  m: SearchMemory,
): SearchChoice[] {
  const map = routeMap(o.player, o.walls);
  const goals: {
    key: string;
    to: P;
    type: SearchChoice['type'];
    age?: number;
  }[] = [
    { key: 'hold', to: o.player, type: 'hold' },
    ...Object.entries(m.clues).map(([id, p]) => ({
      key: `clue:${id}`,
      to: p,
      type: 'clue' as const,
      age: o.tick - p.tick,
    })),
    ...landmarks
      .filter((p) => p.x % 9 === 0 && p.z % 9 === 0 && walkable(p, o.walls))
      .map((p) => ({
        key: `frontier:${key(p)}`,
        to: p,
        type: 'frontier' as const,
      })),
  ];
  const total = landmarks.filter((p) => walkable(p, o.walls));
  const stale = (p: P) => cap((o.tick - (m.viewed[key(p)] ?? -600)) / 600);
  const unseen = (p: P) => Number(m.viewed[key(p)] === undefined);
  return goals.flatMap((g) => {
    const path =
      g.type === 'hold' ? [] : pathFrom(map, o.player, g.to, o.walls);
    if (g.type !== 'hold' && (!path.length || dist(o.player, g.to) < 0.8))
      return [];
    const length = path.reduce(
      (n, p, i) => n + dist(i ? path[i - 1] : o.player, p),
      0,
    );
    const at = total.filter((p) => visible(g.to, p, o.walls)),
      along = total.filter((p) => path.some((q) => visible(q, p, o.walls)));
    const newGoal = at.reduce((n, p) => n + unseen(p), 0) / total.length,
      newRoute = along.reduce((n, p) => n + unseen(p), 0) / total.length;
    const staleGoal = at.reduce((n, p) => n + stale(p), 0) / total.length,
      staleRoute = along.reduce((n, p) => n + stale(p), 0) / total.length;
    const checked = cap(1 - (o.tick - (m.checked[g.key] ?? -1000)) / 300);
    const backtrack = m.trail.some(
      (p) => dist(g.to, p) < 1 && o.tick - p.tick > 30,
    );
    const fresh = g.type === 'clue' ? cap(1 - (g.age || 0) / 1200) : 0;
    const same = g.key === m.goal?.key,
      goalTime = cap((o.tick - (m.goal?.started || o.tick)) / 240);
    const nowDist = dist(o.player, g.to),
      direction = path[0] || g.to,
      norm =
        Math.hypot(o.player.direction.x, o.player.direction.z) *
        Math.max(0.01, dist(direction, o.player));
    const dot = norm
      ? ((direction.x - o.player.x) * o.player.direction.x +
          (direction.z - o.player.z) * o.player.direction.z) /
        norm
      : 0;
    const nearestClue = Math.min(
      24,
      ...Object.values(m.clues).map((c) => dist(g.to, c)),
    );
    const moved = m.trail.length ? dist(o.player, m.trail[0]) : 0;
    const utility =
      3 * newRoute +
      1.5 * staleRoute +
      0.6 * fresh -
      0.045 * length -
      0.8 * checked -
      0.35 * Number(backtrack) -
      Number(g.type === 'hold') * 0.8;
    return [
      {
        ...g,
        path,
        utility,
        features: [
          1,
          o.player.hp / 100,
          Number(g.type === 'hold'),
          Number(g.type === 'clue'),
          Number(g.type === 'frontier'),
          Number(same),
          cap(nowDist / 32),
          cap(length / 40),
          newGoal,
          newRoute,
          staleGoal,
          staleRoute,
          fresh,
          cap((o.tick - (m.checked[g.key] ?? -600)) / 600),
          total.reduce((n, p) => n + unseen(p), 0) / total.length,
          total.reduce((n, p) => n + stale(p), 0) / total.length,
          checked,
          Number(backtrack),
          cap(Object.keys(m.clues).length / 10),
          cap((o.tick - m.idleSince) / 300),
          Number(m.trail.length > 15 && moved < 0.5),
          goalTime,
          Math.max(0, dot),
          Number(dot < -0.5),
          (g.to.x - o.player.x) / 24,
          (g.to.z - o.player.z) / 24,
          cap((11.7 - Math.max(Math.abs(g.to.x), Math.abs(g.to.z))) / 5),
          Number(visible(o.player, g.to, o.walls)),
          1 - nearestClue / 24,
          length ? nowDist / length : 1,
          same && m.goal ? cap(1 - nowDist / Math.max(1, m.goal.distance)) : 0,
          cap(1 - (o.tick - o.player.hurtAt) / 90),
          newRoute / (1 + length / 5),
          staleRoute / (1 + length / 5),
        ],
      },
    ];
  });
}
export function createSearchModel(seed: number): SearchModel {
  const core = createCombatModel(seed).core;
  core.version = `search-zero-${seed}`;
  core.training.source = 'synthetic-utility-imitation';
  return { schema: SEARCH_SCHEMA, featureNames: [...SEARCH_FEATURES], core };
}
export function rankSearch(model: SearchModel, choices: SearchChoice[]) {
  if (
    model.schema !== SEARCH_SCHEMA ||
    fingerprint(model.featureNames) !== fingerprint(SEARCH_FEATURES)
  )
    throw new Error('Incompatible search schema');
  validateEncounterModel(model.core);
  return choices
    .map((c, order) => {
      const h = model.core.b1.map((b, i) =>
        Math.tanh(
          b +
            c.features.reduce(
              (n, x, j) => n + x * model.core.w1[i * 34 + j],
              0,
            ),
        ),
      );
      return {
        ...c,
        order,
        score: h.reduce((n, x, i) => n + x * model.core.w2[i], 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order);
}
export function searchDirection(o: CombatObservation, to: P): CombatAction {
  const path = segment(o.player, to, o.walls, true)
    ? [to]
    : pathFrom(routeMap(o.player, o.walls), o.player, to, o.walls);
  const waypoint = path.find((p) => dist(p, o.player) > 0.4) || to;
  const reachable = COMBAT_ACTIONS.filter((a) =>
    segment(
      o.player,
      { x: o.player.x + a.x * 0.38, z: o.player.z + a.z * 0.38 },
      o.walls,
      true,
    ),
  );
  return (
    [...reachable].sort(
      (a, b) =>
        dist(
          { x: o.player.x + a.x * 0.38, z: o.player.z + a.z * 0.38 },
          waypoint,
        ) -
        dist(
          { x: o.player.x + b.x * 0.38, z: o.player.z + b.z * 0.38 },
          waypoint,
        ),
    )[0] || COMBAT_ACTIONS[0]
  );
}
export function controllerDecision(
  o: CombatObservation,
  m: SearchMemory,
  combat: CombatModel,
  search: SearchModel | 'teacher' | null,
) {
  if (o.mobs.length || search === null)
    return {
      action: rankCombat(combat, o)[0],
      memory: m,
      mode: 'combat' as const,
      goal: '',
    };
  const next = structuredClone(m);
  if (!next.goal || o.tick - next.goal.started > 150) {
    const choices = searchChoices(o, next),
      chosen =
        search === 'teacher'
          ? [...choices].sort((a, b) => b.utility - a.utility)[0]
          : rankSearch(search, choices)[0];
    next.goal = {
      key: chosen.key,
      to: chosen.to,
      started: o.tick,
      distance: dist(o.player, chosen.to),
    };
  }
  const goal = next.goal!;
  if (goal.key === 'hold')
    return {
      action: COMBAT_ACTIONS[0],
      memory: next,
      mode: 'search' as const,
      goal: goal.key,
    };
  return {
    action: searchDirection(o, goal.to),
    memory: next,
    mode: 'search' as const,
    goal: goal.key,
  };
}
