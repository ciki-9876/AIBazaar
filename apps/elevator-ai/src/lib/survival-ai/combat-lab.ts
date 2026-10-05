import { randomStream } from '../../packages/core/random.ts';
import { fingerprint } from './protocol.ts';
import {
  validateEncounterModel,
  type EncounterModel,
} from './encounter-policy.ts';

/** An executable training capability, not a change to the live encounter rules. */
export const COMBAT_RULES = 'f9-combat-lab-v1';
export const COMBAT_CASES = [
  'kite',
  'cluster',
  'choke',
  'flank',
  'spitters',
  'cover',
] as const;
export type CombatCase = (typeof COMBAT_CASES)[number];
type P = { x: number; z: number };
type Wall = { x: number; z: number; w: number; d: number };
type Mob = P & {
  id: string;
  kind: 'grunt' | 'stalker' | 'spitter';
  hp: number;
  speed: number;
  attackAt: number;
  lastSeen: P;
  seenAt: number;
};
export type CombatAction = P & { key: string };
export const COMBAT_ACTIONS: CombatAction[] = [
  { key: 'hold', x: 0, z: 0 },
  ...Array.from({ length: 8 }, (_, i) => ({
    key: `move:${i}`,
    x: Math.cos((i * Math.PI) / 4),
    z: Math.sin((i * Math.PI) / 4),
  })),
];
export const COMBAT_FEATURES = [
  'bias',
  'hp',
  'moving',
  'blocked',
  'shot-ready',
  'aoe-radius',
  'range',
  'nearest-now',
  'nearest-after',
  'contact-risk-now',
  'contact-risk-after',
  'targets-in-range',
  'targets-in-blast',
  'targets-in-blast-after',
  'firing-after',
  'firing-now',
  'edge-clearance',
  'edge-clearance-after',
  'cluster-tightness',
  'cluster-tightness-after',
  'distance-to-shooting-band',
  'distance-to-shooting-band-after',
  'incoming-danger',
  'incoming-danger-after',
  'continue-direction',
  'reversal',
  'visible-stalkers',
  'visible-spitters',
  'safe-fire-after',
  'safe-fire-now',
  'cooldown-safety',
  'ready-cluster',
  'unseen-fraction',
  'wall-clearance-after',
] as const;
export type CombatState = {
  rules: typeof COMBAT_RULES;
  seed: number;
  scenario: CombatCase;
  tick: number;
  player: P & { hp: number; direction: P; hurtAt: number };
  weapon: {
    range: number;
    radius: number;
    damage: number;
    interval: number;
    fireAt: number;
  };
  walls: Wall[];
  mobs: Mob[];
  projectiles: (P & { id: string; impactAt: number })[];
  events: { tick: number; type: string; ids?: string[]; amount?: number }[];
  metrics: {
    kills: number;
    damage: number;
    hits: number;
    shots: number;
    hitsByShot: number[];
    movingSafeKills: number;
    groupedKills: number;
    projectileDodges: number;
    blockedTicks: number;
    traveled: number;
  };
  initial: number;
  initiallySeparated: string[][];
};
export type CombatObservation = Pick<
  CombatState,
  'rules' | 'tick' | 'player' | 'weapon' | 'walls' | 'projectiles' | 'initial'
> & { mobs: Mob[] };
export type CombatModel = {
  schema: 'f9-combat-policy-v1';
  featureNames: readonly string[];
  core: EncounterModel;
};
const distance = (a: P, b: P) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
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
function clear(a: P, b: P, walls: Wall[]) {
  const n = Math.max(1, Math.ceil(distance(a, b) / 0.2));
  for (let i = 1; i < n; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / n,
      z: a.z + ((b.z - a.z) * i) / n,
    };
    if (
      walls.some(
        (w) => Math.abs(p.x - w.x) < w.w / 2 && Math.abs(p.z - w.z) < w.d / 2,
      )
    )
      return false;
  }
  return true;
}
function move(p: P, direction: P, meters: number, walls: Wall[]): P {
  const to = { x: p.x + direction.x * meters, z: p.z + direction.z * meters };
  if (walkable(to, walls)) return to;
  const x = { x: to.x, z: p.z },
    z = { x: p.x, z: to.z };
  return walkable(x, walls) ? x : walkable(z, walls) ? z : { x: p.x, z: p.z };
}
function toward(p: P, to: P, speed: number, walls: Wall[]): P {
  const d = distance(p, to);
  if (d < 0.001) return p;
  const direct = move(
    p,
    { x: (to.x - p.x) / d, z: (to.z - p.z) / d },
    speed,
    walls,
  );
  if (distance(direct, p) > speed * 0.7) return direct;
  // Deterministic local steering; this controls monsters, never the learned contestant.
  return COMBAT_ACTIONS.slice(1)
    .map((a) => move(p, a, speed, walls))
    .sort((a, b) => distance(a, to) - distance(b, to))[0];
}
export function createCombat(seed: number, scenario: CombatCase): CombatState {
  if (!Number.isSafeInteger(seed) || !COMBAT_CASES.includes(scenario))
    throw new Error('Invalid combat seed or case');
  const r = randomStream(seed, `${COMBAT_RULES}:${scenario}`);
  const walls: Wall[] =
    scenario === 'choke'
      ? [
          { x: -3.3, z: 1, w: 1.8, d: 9 },
          { x: 3.3, z: 1, w: 1.8, d: 9 },
        ]
      : scenario === 'cover'
        ? [
            { x: -2, z: 1, w: 1.2, d: 5 },
            { x: 3, z: -2, w: 4, d: 1.2 },
          ]
        : [];
  const count =
    scenario === 'kite'
      ? 6
      : scenario === 'cluster' || scenario === 'choke'
        ? 10
        : 8;
  const mobs: Mob[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.25;
    const radius = 5.2 + r() * 2.5;
    let p = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
    if (scenario === 'choke')
      p = { x: (i % 2 ? 1 : -1) * (4.8 + r() * 3), z: 7 + r() * 3.5 };
    while (!walkable(p, walls)) p = { x: p.x + 0.5, z: p.z + 0.5 };
    const kind =
      (scenario === 'spitters' || scenario === 'cover') && i < 3
        ? 'spitter'
        : (scenario === 'flank' && i < 3) || (scenario === 'kite' && i === 0)
          ? 'stalker'
          : 'grunt';
    return {
      ...p,
      id: `mob:${i}`,
      kind,
      hp: scenario === 'kite' ? 28 : 24,
      speed: kind === 'stalker' ? 3.15 : kind === 'spitter' ? 1.15 : 1.75,
      attackAt: 36 + i * 3,
      lastSeen: { x: 0, z: 0 },
      seenAt: -1000,
    };
  });
  const radius = scenario === 'kite' ? 0 : 2.3 + r() * 0.5;
  return {
    rules: COMBAT_RULES,
    seed,
    scenario,
    tick: 0,
    player: {
      x: 0,
      z: scenario === 'choke' ? 8 : -1,
      hp: 100,
      direction: { x: 0, z: 0 },
      hurtAt: -1000,
    },
    weapon: {
      range: 7 + r(),
      radius,
      damage: 14,
      interval: scenario === 'kite' ? 27 : 54,
      fireAt: 24,
    },
    walls,
    mobs,
    projectiles: [],
    events: [],
    initial: count,
    initiallySeparated: mobs.flatMap((a, i) =>
      mobs
        .slice(i + 1)
        .filter((b) => distance(a, b) > radius * 2 + 0.25)
        .map((b) => [a.id, b.id]),
    ),
    metrics: {
      kills: 0,
      damage: 0,
      hits: 0,
      shots: 0,
      hitsByShot: [],
      movingSafeKills: 0,
      groupedKills: 0,
      projectileDodges: 0,
      blockedTicks: 0,
      traveled: 0,
    },
  };
}
export function observeCombat(s: CombatState): CombatObservation {
  return structuredClone({
    rules: s.rules,
    tick: s.tick,
    player: s.player,
    weapon: s.weapon,
    walls: s.walls,
    projectiles: s.projectiles.filter((p) => distance(p, s.player) <= 12),
    initial: s.initial,
    mobs: s.mobs.filter(
      (m) => distance(m, s.player) <= 12 && clear(m, s.player, s.walls),
    ),
  });
}
export function beliefCombat(s: CombatState): CombatState {
  const o = observeCombat(s);
  return {
    ...structuredClone(s),
    ...o,
    mobs: o.mobs,
    projectiles: o.projectiles,
  };
}
export function advanceCombat(
  initial: CombatState,
  action: CombatAction,
  ticks: number,
): CombatState {
  if (
    !Number.isSafeInteger(ticks) ||
    ticks < 0 ||
    !COMBAT_ACTIONS.some(
      (a) => a.key === action.key && a.x === action.x && a.z === action.z,
    )
  )
    throw new Error('Invalid combat input');
  const s = structuredClone(initial);
  for (let k = 0; k < ticks && s.player.hp > 0 && s.mobs.length; k++) {
    s.tick++;
    const p = s.player,
      next = move(p, action, 3.8 / 30, s.walls),
      traveled = distance(p, next);
    p.direction = { x: (next.x - p.x) * 30, z: (next.z - p.z) * 30 };
    Object.assign(p, next);
    s.metrics.traveled += traveled;
    if (action.key !== 'hold' && traveled < 0.025) s.metrics.blockedTicks++;
    for (const m of s.mobs) {
      if (distance(m, p) < 14 && clear(m, p, s.walls)) {
        m.lastSeen = { x: p.x, z: p.z };
        m.seenAt = s.tick;
      }
      if (
        s.tick - m.seenAt <= 90 &&
        (m.kind !== 'spitter' || distance(m, p) > 6)
      )
        Object.assign(m, toward(m, m.lastSeen, m.speed / 30, s.walls));
      if (m.attackAt <= s.tick && clear(m, p, s.walls)) {
        if (m.kind === 'spitter' && distance(m, p) <= 9) {
          s.projectiles.push({
            x: p.x,
            z: p.z,
            id: `${m.id}:${s.tick}`,
            impactAt: s.tick + 18,
          });
          m.attackAt = s.tick + 72;
        } else if (distance(m, p) < 1) {
          const amount = Math.min(p.hp, m.kind === 'stalker' ? 10 : 7);
          p.hp -= amount;
          p.hurtAt = s.tick;
          s.metrics.damage += amount;
          s.metrics.hits++;
          m.attackAt = s.tick + 30;
          s.events.push({
            tick: s.tick,
            type: 'melee-hit',
            ids: [m.id],
            amount,
          });
        }
      }
    }
    for (const shot of s.projectiles.filter((b) => b.impactAt <= s.tick)) {
      if (distance(shot, p) < 1.1) {
        const amount = Math.min(p.hp, 12);
        p.hp -= amount;
        p.hurtAt = s.tick;
        s.metrics.damage += amount;
        s.metrics.hits++;
        s.events.push({ tick: s.tick, type: 'projectile-hit', amount });
      } else s.metrics.projectileDodges++;
    }
    s.projectiles = s.projectiles.filter((b) => b.impactAt > s.tick);
    if (p.hp <= 0) break;
    if (s.weapon.fireAt <= s.tick) {
      const target = s.mobs
        .filter((m) => distance(p, m) <= s.weapon.range && clear(p, m, s.walls))
        .sort(
          (a, b) => distance(p, a) - distance(p, b) || a.id.localeCompare(b.id),
        )[0];
      if (target) {
        const hit = s.mobs.filter(
          (m) =>
            m.id === target.id ||
            (distance(m, target) <= s.weapon.radius &&
              clear(target, m, s.walls)),
        );
        const safe =
          Math.hypot(p.direction.x, p.direction.z) > 0.1 &&
          Math.min(...s.mobs.map((m) => distance(p, m))) >= 1.4 &&
          s.tick - p.hurtAt >= 30;
        hit.forEach((m) => {
          m.hp -= s.weapon.damage;
        });
        const dead = hit.filter((m) => m.hp <= 0);
        const grouped =
          hit.length >= 3 &&
          s.initiallySeparated.some(
            ([a, b]) =>
              hit.some((m) => m.id === a) && hit.some((m) => m.id === b),
          );
        s.metrics.kills += dead.length;
        if (safe) s.metrics.movingSafeKills += dead.length;
        if (grouped) s.metrics.groupedKills += dead.length;
        s.metrics.shots++;
        s.metrics.hitsByShot.push(hit.length);
        s.events.push({
          tick: s.tick,
          type: 'auto-shot',
          ids: hit.map((m) => m.id),
          amount: dead.length,
        });
        s.mobs = s.mobs.filter((m) => m.hp > 0);
        s.weapon.fireAt = s.tick + s.weapon.interval;
      }
    }
  }
  return s;
}
function shotShape(
  p: P,
  mobs: Mob[],
  weapon: CombatState['weapon'],
  walls: Wall[],
) {
  const visible = mobs.filter((m) => clear(p, m, walls));
  const target = visible
    .filter((m) => distance(p, m) <= weapon.range)
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  const hits = target
    ? visible.filter(
        (m) => m.id === target.id || distance(m, target) <= weapon.radius,
      ).length
    : 0;
  const near = Math.min(15, ...mobs.map((m) => distance(p, m)));
  const risk = mobs.reduce((n, m) => n + clamp((2 - distance(p, m)) / 2), 0);
  const tight = target
    ? mobs.reduce((n, m) => n + clamp(1 - distance(m, target) / 5), 0) /
      Math.max(1, mobs.length)
    : 0;
  return {
    hits,
    near,
    risk,
    tight,
    ranged: visible.filter((m) => distance(p, m) <= weapon.range).length,
  };
}
export function combatChoices(o: CombatObservation) {
  const now = shotShape(o.player, o.mobs, o.weapon, o.walls);
  return COMBAT_ACTIONS.map((a) => {
    let p: P = o.player;
    for (let i = 0; i < 18; i++) p = move(p, a, 3.8 / 30, o.walls);
    const predicted = o.mobs.map((m) => ({
      ...m,
      ...toward(
        m,
        p,
        m.kind === 'spitter' && distance(m, p) <= 6 ? 0 : m.speed * 0.6,
        o.walls,
      ),
    }));
    const after = shotShape(p, predicted, o.weapon, o.walls);
    const edge = (q: P) =>
      clamp((11.7 - Math.max(Math.abs(q.x), Math.abs(q.z))) / 5);
    const danger = (q: P) =>
      Math.min(
        1,
        o.projectiles.reduce((v, b) => v + clamp(1 - distance(b, q) / 2), 0),
      );
    const norm = Math.hypot(o.player.direction.x, o.player.direction.z);
    const dot = norm
      ? (a.x * o.player.direction.x + a.z * o.player.direction.z) / norm
      : 0;
    const ready = clamp(1 - (o.weapon.fireAt - o.tick) / o.weapon.interval);
    const safeNow = now.risk === 0 ? now.hits / 8 : 0,
      safeAfter = after.risk === 0 ? after.hits / 8 : 0;
    const wallNear = Math.min(
      5,
      ...o.walls.map((w) =>
        Math.hypot(
          Math.max(0, Math.abs(p.x - w.x) - w.w / 2),
          Math.max(0, Math.abs(p.z - w.z) - w.d / 2),
        ),
      ),
    );
    return {
      ...a,
      features: [
        1,
        o.player.hp / 100,
        Number(a.key !== 'hold'),
        Number(a.key !== 'hold' && distance(p, o.player) < 0.7),
        ready,
        o.weapon.radius / 3,
        o.weapon.range / 10,
        now.near / 15,
        after.near / 15,
        Math.min(1, now.risk / 3),
        Math.min(1, after.risk / 3),
        after.ranged / 10,
        now.hits / 10,
        after.hits / 10,
        Number(after.hits > 0),
        Number(now.hits > 0),
        edge(o.player),
        edge(p),
        now.tight,
        after.tight,
        Math.min(1, Math.abs(now.near - 4) / 8),
        Math.min(1, Math.abs(after.near - 4) / 8),
        danger(o.player),
        danger(p),
        Math.max(0, dot),
        Number(dot < -0.5),
        o.mobs.filter((m) => m.kind === 'stalker').length / 10,
        o.mobs.filter((m) => m.kind === 'spitter').length / 10,
        safeAfter,
        safeNow,
        (1 - ready) * Math.min(1, after.risk),
        (ready * after.hits) / 10,
        1 - o.mobs.length / o.initial,
        wallNear / 5,
      ],
    };
  });
}
export function createCombatModel(seed: number): CombatModel {
  const r = randomStream(seed, 'f9-combat-policy-init-v1');
  return {
    schema: 'f9-combat-policy-v1',
    featureNames: [...COMBAT_FEATURES],
    core: {
      schema: 'f9-encounter-mlp-v1',
      version: `combat-zero-${seed}`,
      inputs: 34,
      hidden: 32,
      w1: Array.from({ length: 1088 }, () => (r() - 0.5) * 0.35),
      b1: Array(32).fill(0),
      w2: Array(32).fill(0),
      training: {
        seed,
        epochs: 0,
        examples: 0,
        source: 'observed-rollout-v1',
        datasetId: 'none',
      },
    },
  };
}
export function validateCombatModel(m: CombatModel) {
  if (
    m.schema !== 'f9-combat-policy-v1' ||
    fingerprint(m.featureNames) !== fingerprint(COMBAT_FEATURES)
  )
    throw new Error('Incompatible combat feature schema');
  validateEncounterModel(m.core);
}
export function rankCombat(m: CombatModel, o: CombatObservation) {
  validateCombatModel(m);
  return combatChoices(o)
    .map((a) => {
      const hidden = m.core.b1.map((b, i) =>
        Math.tanh(
          b + a.features.reduce((n, x, j) => n + x * m.core.w1[i * 34 + j], 0),
        ),
      );
      return {
        ...a,
        score: hidden.reduce((n, x, i) => n + x * m.core.w2[i], 0),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        COMBAT_ACTIONS.findIndex((c) => c.key === a.key) -
          COMBAT_ACTIONS.findIndex((c) => c.key === b.key),
    );
}
/** Numerical teacher: only observed monsters; no future spawns or unseen facts. */
export function combatBranchUtility(before: CombatState, after: CombatState) {
  const shape = shotShape(after.player, after.mobs, after.weapon, after.walls);
  return (
    (after.metrics.kills - before.metrics.kills) * 0.8 +
    (after.metrics.hitsByShot.reduce((a, b) => a + b, 0) -
      before.metrics.hitsByShot.reduce((a, b) => a + b, 0)) *
      0.2 -
    (after.metrics.damage - before.metrics.damage) * 0.16 -
    Number(after.player.hp <= 0) * 12 -
    shape.risk * 1.1 +
    Math.min(1, shape.near / 3) * 0.2 +
    Number(shape.hits > 0) * 0.25 +
    shape.hits * 0.18 -
    Math.max(0, shape.near - after.weapon.range + 0.5) * 0.22 -
    (after.metrics.blockedTicks - before.metrics.blockedTicks) * 0.01
  );
}
export function teacherCombat(s: CombatState, horizon = 36) {
  const belief = beliefCombat(s);
  return combatChoices(observeCombat(s))
    .map((a) => ({
      ...a,
      utility: combatBranchUtility(belief, advanceCombat(belief, a, horizon)),
    }))
    .sort(
      (a, b) =>
        b.utility - a.utility ||
        COMBAT_ACTIONS.findIndex((c) => c.key === a.key) -
          COMBAT_ACTIONS.findIndex((c) => c.key === b.key),
    );
}
