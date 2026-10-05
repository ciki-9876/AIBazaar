import type { Item, Point, SurvivalState } from './survival-room.ts';

/** The season executor owns outcomes. External controllers supply actions, never facts. */
export const SEASON_VERSION = 1;
export const SEASON_PLAYER = 'player';
export const SEASON_PASS_CAPACITY = 10;
export const GATHERING_TICKS = 20 * 30;
export const BROADCAST_PART_TICKS = 11 * 30;
export const SEASON_RULES = [
  ['终点在100F', '带回终局金票，才能成为本季优胜。'],
  ['通行证决定路线', '每上升一层用一张；跳过的低层永久关闭。'],
  ['平时各自探索', '第五层开赛。普通房间属于各自的电梯。'],
  ['每十层同场争夺', '据点共享资源；黄金通行证决定晋级名额。'],
  ['只能带回一张金票', '多余金票扔在地上；带回后绑定本人资格。'],
  ['补给决定你能走多远', '倒下消耗预存药食水救援。储备不足，将永久死亡。'],
] as const;
export type SeasonPhase =
  | 'entry'
  | 'gathering'
  | 'broadcast'
  | 'boarding'
  | 'live'
  | 'victory'
  | 'defeat';
export type SeasonActor = {
  id: string;
  number: string;
  name: string;
  controller: 'player' | 'external';
  floor: number;
  status: 'alive' | 'dead' | 'winner';
  position: Point;
  inLift: boolean;
  hp: number;
  food: number;
  water: number;
  passes: { id: string; source: string }[];
  qualified: number[];
};
export type GoldenPass = {
  id: string;
  floor: number;
  position: Point;
  status: 'ground' | 'carried' | 'redeemed';
  owner: string | null;
};
export type SeasonCheckpoint = {
  floor: number;
  arrived: string[];
  frozenAt: number | null;
  roster: string[];
  x: number;
  issued: number;
  settled: boolean;
};
export type SeasonSource = Point & {
  id: string;
  actor: string;
  floor: number;
  amount: number;
  title: string;
  duration: number;
  taken: boolean;
};
export type SeasonWorld = Pick<
  SurvivalState,
  | 'seed'
  | 'world'
  | 'fog'
  | 'rng'
  | 'tick'
  | 'serial'
  | 'caches'
  | 'enemies'
  | 'spawns'
  | 'nextWave'
  | 'wave'
  | 'kills'
  | 'bossDefeated'
  | 'damage'
  | 'lootBudget'
>;
export type SeasonEvent = {
  id: number;
  at: number;
  actor: string;
  floor: number;
  kind:
    | 'ticket'
    | 'arrival'
    | 'golden'
    | 'qualification'
    | 'pool'
    | 'rescue'
    | 'death'
    | 'start'
    | 'victory';
  text: string;
};
export type SeasonState = {
  version: 1;
  seed: number;
  tick: number;
  serial: number;
  phase: SeasonPhase;
  phaseTick: number;
  initialized: boolean;
  eliminations: number;
  tutorialTicket: boolean;
  broadcastSeen: boolean;
  actors: SeasonActor[];
  checkpoints: SeasonCheckpoint[];
  golden: GoldenPass[];
  sources: SeasonSource[];
  work: Record<string, { source: string; ticks: number }>;
  worlds: Record<string, SeasonWorld>;
  events: SeasonEvent[];
  result: { actor: string; floor: number; reason: string } | null;
};
export const seasonPlayer = (s: SeasonState) =>
  s.actors.find((a) => a.id === SEASON_PLAYER)!;
export const seasonHeld = (s: SeasonState, actor = SEASON_PLAYER) =>
  s.golden.filter((g) => g.status === 'carried' && g.owner === actor);
export const seasonStopped = (s?: SeasonState) =>
  !!s && ['victory', 'defeat'].includes(s.phase);
export const seasonCheckpoint = (a: Pick<SeasonActor, 'floor' | 'qualified'>) =>
  Math.min(
    100,
    Math.ceil(
      (a.floor % 10 === 0 && a.qualified.includes(a.floor)
        ? a.floor + 1
        : a.floor) / 10,
    ) * 10,
  );
export const seasonSpan = (level: number) =>
  Math.min(9, 3 + Math.max(0, level - 2) * 2);
export const seasonRoomKey = (floor: number, actor = SEASON_PLAYER) =>
  floor === 4 || floor % 10 === 0 ? `shared:${floor}` : `${actor}:${floor}`;
export function seasonHash(text: string, seed: number) {
  let hash = seed >>> 0;
  for (const c of text)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return hash;
}
export const seasonRoomSeed = (
  seed: number,
  floor: number,
  actor = SEASON_PLAYER,
) => seasonHash(seasonRoomKey(floor, actor), seed);
const event = (
  s: SeasonState,
  actor: string,
  kind: SeasonEvent['kind'],
  text: string,
): SeasonState => ({
  ...s,
  serial: s.serial + 1,
  events: [
    ...s.events,
    {
      id: s.serial,
      at: s.tick,
      actor,
      floor: s.actors.find((a) => a.id === actor)?.floor || 0,
      kind,
      text,
    },
  ].slice(-128),
});
const updateActor = (
  s: SeasonState,
  actor: string,
  f: (a: SeasonActor) => SeasonActor,
): SeasonState => ({
  ...s,
  actors: s.actors.map((a) => (a.id === actor ? f(a) : a)),
});
export function createSeason(
  seed: number,
  count = 12,
  eliminations = 1,
): SeasonState {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 32 ||
    !Number.isInteger(eliminations) ||
    eliminations < 0 ||
    eliminations > 31
  )
    throw new Error('Invalid season configuration');
  const names = [
    '林岚',
    '周砚',
    '许照',
    '沈禾',
    '陆宁',
    '苏灯',
    '陈屿',
    '江澄',
    '温乔',
    '何野',
    '叶青',
  ];
  const actors: SeasonActor[] = Array.from({ length: count }, (_, i) => ({
    id: i ? `contestant-${i}` : SEASON_PLAYER,
    number: String(i ? i + 10 : 7).padStart(3, '0'),
    name: i ? names[(i - 1) % names.length] : '你',
    controller: i ? 'external' : 'player',
    floor: i ? 4 : 3,
    status: 'alive',
    position: i
      ? { x: 33.5 + (i % 6) * 5.5, z: 56.5 + Math.floor(i / 6) * 11 }
      : { x: 48.5, z: 75.5 },
    inLift: !i,
    hp: 100,
    food: 100,
    water: 100,
    passes: i ? [] : [{ id: `tutorial:${seed}`, source: '第三层通关' }],
    qualified: [],
  }));
  return event(
    {
      version: 1,
      seed,
      tick: 0,
      serial: 1,
      phase: 'entry',
      phaseTick: 0,
      initialized: false,
      eliminations,
      tutorialTicket: true,
      broadcastSeen: false,
      actors,
      checkpoints: Array.from({ length: 10 }, (_, i) => ({
        floor: (i + 1) * 10,
        arrived: [],
        frozenAt: null,
        roster: [],
        x: 0,
        issued: 0,
        settled: false,
      })),
      golden: [],
      sources: [],
      work: {},
      worlds: {},
      events: [],
      result: null,
    },
    SEASON_PLAYER,
    'ticket',
    '第三层通关 · 获得首张通行证',
  );
}
export function tickSeason(s: SeasonState): SeasonState {
  if (seasonStopped(s)) return s;
  const phaseTick = s.phaseTick + 1;
  let next = { ...s, tick: s.tick + 1, phaseTick };
  if (s.phase === 'gathering' && phaseTick >= GATHERING_TICKS)
    next = { ...next, phase: 'broadcast', phaseTick: 0 };
  if (
    s.phase === 'broadcast' &&
    phaseTick >= SEASON_RULES.length * BROADCAST_PART_TICKS
  )
    next = { ...next, phase: 'boarding', phaseTick: 0, broadcastSeen: true };
  return refreshSeasonCheckpoints(next);
}
export function startSeason(s: SeasonState): SeasonState {
  if (
    s.phase !== 'boarding' ||
    !s.broadcastSeen ||
    !seasonPlayer(s).inLift ||
    s.initialized
  )
    return s;
  return event(
    {
      ...s,
      phase: 'live',
      phaseTick: 0,
      initialized: true,
      actors: s.actors.map((a) => ({
        ...a,
        floor: 5,
        hp: 100,
        food: 100,
        water: 100,
        position: { x: 48.5, z: 75.5 },
        inLift: true,
      })),
    },
    SEASON_PLAYER,
    'start',
    '第五层开赛 · 没有资格倒计时',
  );
}
export function seasonDestinationReason(
  s: SeasonState,
  actor: string,
  to: number,
  level: number,
): string | null {
  const a = s.actors.find((a) => a.id === actor);
  if (
    !a ||
    a.status !== 'alive' ||
    !Number.isInteger(to) ||
    to > 100 ||
    to < a.floor
  )
    return '低层已关闭';
  if (s.phase === 'entry')
    return actor === SEASON_PLAYER && to === 4 && a.passes.length
      ? null
      : '先进入第四层集结';
  if (s.phase !== 'live') return '比赛尚未开放';
  if (to === a.floor) return null;
  if (a.floor % 10 === 0) {
    if (!a.qualified.includes(a.floor)) return '带回一张本点金票才能晋级';
    if (to !== a.floor + 1) return `先进入${a.floor + 1}F`;
    return null;
  }
  if (to > seasonCheckpoint(a)) return '不能越过据点';
  if (to - a.floor > seasonSpan(level)) return '超过电梯跨度';
  if (to - a.floor > a.passes.length) return '通行证不足';
  return null;
}
export function ascendSeason(
  s: SeasonState,
  actor: string,
  to: number,
  level: number,
): SeasonState {
  if (seasonDestinationReason(s, actor, to, level)) return s;
  const a = s.actors.find((a) => a.id === actor)!;
  if (to === a.floor) return s;
  const cost = a.floor % 10 === 0 ? 0 : to - a.floor;
  let next = updateActor(s, actor, (a) => ({
    ...a,
    floor: to,
    passes: a.passes.slice(cost),
    position: { x: 48.5, z: 75.5 },
    inLift: true,
  }));
  if (to === 4) next = { ...next, phase: 'gathering', phaseTick: 0 };
  if (to % 10 === 0)
    next = {
      ...next,
      checkpoints: next.checkpoints.map((p) =>
        p.floor === to && !p.arrived.includes(actor)
          ? { ...p, arrived: [...p.arrived, actor] }
          : p,
      ),
    };
  return refreshSeasonCheckpoints(
    event(next, actor, 'arrival', `${a.name}抵达${to}F`),
  );
}
export function refreshSeasonCheckpoints(s: SeasonState): SeasonState {
  if (s.phase !== 'live') return s;
  let next = s;
  for (const initial of s.checkpoints) {
    let p = next.checkpoints.find((p) => p.floor === initial.floor)!;
    const previous = next.checkpoints.find((q) => q.floor === p.floor - 10);
    if (
      p.frozenAt === null &&
      p.arrived.length &&
      (!previous || previous.settled)
    ) {
      const roster = next.actors
        .filter(
          (a) =>
            a.status !== 'dead' &&
            (!previous || a.qualified.includes(previous.floor)),
        )
        .map((a) => a.id);
      const x =
        p.floor === 100
          ? Math.max(0, roster.length - 1)
          : Math.min(next.eliminations, Math.max(0, roster.length - 1));
      const issued = roster.length - x;
      p = { ...p, roster, x, issued, frozenAt: next.tick };
      next = {
        ...next,
        checkpoints: next.checkpoints.map((q) => (q.floor === p.floor ? p : q)),
        golden: [
          ...next.golden,
          ...Array.from(
            { length: issued },
            (_, i): GoldenPass => ({
              id: `gold:${next.seed}:${p.floor}:${i}`,
              floor: p.floor,
              position: {
                x: 33.5 + (i % 4) * 9,
                z: 52.5 + Math.floor(i / 4) * 6,
              },
              status: 'ground',
              owner: null,
            }),
          ),
        ],
      };
      next = event(
        next,
        SEASON_PLAYER,
        'pool',
        `${p.floor}F · ${issued}个晋级名额`,
      );
    }
    if (
      p.frozenAt !== null &&
      !p.settled &&
      (next.golden.filter((g) => g.floor === p.floor && g.status === 'redeemed')
        .length === p.issued ||
        p.roster.every((id) => {
          const a = next.actors.find((a) => a.id === id)!;
          return a.status === 'dead' || a.qualified.includes(p.floor);
        }))
    ) {
      next = {
        ...next,
        checkpoints: next.checkpoints.map((q) =>
          q.floor === p.floor ? { ...q, settled: true } : q,
        ),
      };
    }
  }
  return next;
}
export function pickupSeasonGolden(
  s: SeasonState,
  actor: string,
  ids: string[],
): SeasonState {
  const a = s.actors.find((a) => a.id === actor);
  if (
    s.phase !== 'live' ||
    !a ||
    a.status !== 'alive' ||
    a.inLift ||
    a.qualified.includes(a.floor) ||
    !ids.length ||
    new Set(ids).size !== ids.length
  )
    return s;
  const p = s.checkpoints.find((p) => p.floor === a.floor);
  if (!p?.roster.includes(actor)) return s;
  const selected = s.golden.filter((g) => ids.includes(g.id));
  if (
    selected.length !== ids.length ||
    selected.some(
      (g) =>
        g.status !== 'ground' ||
        g.floor !== a.floor ||
        Math.hypot(g.position.x - a.position.x, g.position.z - a.position.z) >
          1.65,
    )
  )
    return s;
  return event(
    {
      ...s,
      golden: s.golden.map((g) =>
        ids.includes(g.id) ? { ...g, status: 'carried', owner: actor } : g,
      ),
    },
    actor,
    'golden',
    `${a.name}取得黄金通行证`,
  );
}
/** Stable ordering removes both input-order and player-first contention advantages. */
export function resolveSeasonGolden(
  s: SeasonState,
  requests: { actor: string; id: string; completedAt: number }[],
): SeasonState {
  return [...requests]
    .filter((r) => Number.isInteger(r.completedAt) && r.completedAt === s.tick)
    .sort(
      (a, b) =>
        seasonHash(`${a.id}:${a.actor}:${s.tick}`, s.seed) -
          seasonHash(`${b.id}:${b.actor}:${s.tick}`, s.seed) ||
        (a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0),
    )
    .reduce((state, r) => pickupSeasonGolden(state, r.actor, [r.id]), s);
}
export function dropSeasonGolden(
  s: SeasonState,
  actor: string,
  ids: string[],
  position: Point,
): SeasonState {
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.z)
  )
    return s;
  const owned = seasonHeld(s, actor);
  if (ids.some((id) => !owned.some((g) => g.id === id))) return s;
  return {
    ...s,
    golden: s.golden.map((g) =>
      ids.includes(g.id)
        ? { ...g, status: 'ground', owner: null, position: { ...position } }
        : g,
    ),
  };
}
export function redeemSeasonGolden(s: SeasonState, actor: string): SeasonState {
  const a = s.actors.find((a) => a.id === actor),
    held = seasonHeld(s, actor);
  const p = a && s.checkpoints.find((p) => p.floor === a.floor);
  if (
    s.phase !== 'live' ||
    !a ||
    a.status !== 'alive' ||
    !a.inLift ||
    held.length !== 1 ||
    held[0].floor !== a.floor ||
    a.qualified.includes(a.floor) ||
    !p?.roster.includes(actor)
  )
    return s;
  let next = updateActor(
    {
      ...s,
      golden: s.golden.map((g) =>
        g.id === held[0].id ? { ...g, status: 'redeemed' } : g,
      ),
    },
    actor,
    (a) => ({ ...a, qualified: [...a.qualified, a.floor] }),
  );
  next = event(
    next,
    actor,
    'qualification',
    `${a.name}获得${a.floor === 100 ? '终局' : `${a.floor + 1}F`}资格`,
  );
  if (a.floor === 100)
    next = event(
      {
        ...updateActor(next, actor, (a) => ({ ...a, status: 'winner' })),
        phase: 'victory',
        result: { actor, floor: 100, reason: '带回终局金票' },
      },
      actor,
      'victory',
      `${a.name}成为本季优胜`,
    );
  return refreshSeasonCheckpoints(next);
}
export function seasonDeath(s: SeasonState, actor: string): SeasonState {
  const a = s.actors.find((a) => a.id === actor);
  if (!a || a.status !== 'alive') return s;
  const position = a.inLift ? { x: 48.5, z: 73.1 } : a.position;
  let next = dropSeasonGolden(
    s,
    actor,
    seasonHeld(s, actor).map((g) => g.id),
    position,
  );
  next = updateActor(next, actor, (a) => ({ ...a, status: 'dead', hp: 0 }));
  next = refreshSeasonCheckpoints(
    event(next, actor, 'death', `${a.name}永久死亡`),
  );
  return actor === SEASON_PLAYER
    ? {
        ...next,
        phase: 'defeat',
        result: { actor, floor: a.floor, reason: '精力耗尽，救援储备不足' },
      }
    : next;
}
export function syncSeasonActor(
  s: SeasonState,
  actor: string,
  observation: Pick<
    SeasonActor,
    'position' | 'inLift' | 'hp' | 'food' | 'water'
  >,
): SeasonState {
  if (
    ![
      observation.position.x,
      observation.position.z,
      observation.hp,
      observation.food,
      observation.water,
    ].every(Number.isFinite) ||
    [observation.hp, observation.food, observation.water].some(
      (v) => v < 0 || v > 100,
    )
  )
    return s;
  return updateActor(s, actor, (a) => ({ ...a, ...observation }));
}
export function addSeasonSources(
  s: SeasonState,
  actor: string,
  floor: number,
  positions: Point[],
): SeasonState {
  if (
    floor < 5 ||
    floor % 10 === 0 ||
    s.sources.some((q) => q.actor === actor && q.floor === floor)
  )
    return s;
  return {
    ...s,
    sources: [
      ...s.sources,
      ...positions.map((p, i) => ({
        ...p,
        actor,
        floor,
        id: `ordinary:${s.seed}:${actor}:${floor}:${i}`,
        amount: i ? 2 : 1,
        title: i ? '封存票匣' : '登记箱',
        duration: 90,
        taken: false,
      })),
    ],
  };
}
export function workSeasonSource(
  s: SeasonState,
  actor: string,
  working: boolean,
  blocked: string[] = [],
): SeasonState {
  const a = s.actors.find((a) => a.id === actor);
  if (s.phase !== 'live' || !a || a.status !== 'alive') return s;
  const q =
    working &&
    !a.inLift &&
    s.sources.find(
      (q) =>
        q.actor === actor &&
        q.floor === a.floor &&
        !q.taken &&
        !blocked.includes(q.id) &&
        Math.hypot(a.position.x - q.x, a.position.z - q.z) <= 1.8 &&
        a.passes.length + q.amount <= SEASON_PASS_CAPACITY,
    );
  const work = { ...s.work };
  delete work[actor];
  if (!q) return s.work[actor] ? { ...s, work } : s;
  const ticks = s.work[actor]?.source === q.id ? s.work[actor].ticks + 1 : 1;
  if (ticks < q.duration)
    return { ...s, work: { ...work, [actor]: { source: q.id, ticks } } };
  return event(
    updateActor(
      {
        ...s,
        work,
        sources: s.sources.map((p) =>
          p.id === q.id ? { ...p, taken: true } : p,
        ),
      },
      actor,
      (a) => ({
        ...a,
        passes: [
          ...a.passes,
          ...Array.from({ length: q.amount }, (_, i) => ({
            id: `${q.id}:${i}`,
            source: q.id,
          })),
        ],
      }),
    ),
    actor,
    'ticket',
    `${a.name}登记通行证 +${q.amount}`,
  );
}
export function reserveRescue(
  room: SurvivalState,
  enabled: boolean,
): SurvivalState {
  if (room.status !== 'extracted') return room;
  if (!enabled)
    return room.rescueReserved?.length ? { ...room, rescueReserved: [] } : room;
  const items = room.warehouse || [];
  const medicine = items.find((i) => i.kind === 'medicine'),
    food = items.find((i) => i.kind === 'food' || i.kind === 'bread'),
    water = items.find((i) => i.kind === 'water');
  if (!medicine || !food || !water) return room;
  return { ...room, rescueReserved: [medicine.uid, food.uid, water.uid] };
}
export function rescueUnits(room: SurvivalState): Item[] | null {
  const ids = room.rescueReserved || [],
    items = (room.warehouse || []).filter((i) => ids.includes(i.uid));
  return ids.length === 3 &&
    new Set(ids).size === 3 &&
    items.length === 3 &&
    items.some((i) => i.kind === 'medicine') &&
    items.some((i) => i.kind === 'food' || i.kind === 'bread') &&
    items.some((i) => i.kind === 'water')
    ? items
    : null;
}
export function consumeRescue(room: SurvivalState): SurvivalState | null {
  const items = rescueUnits(room);
  if (!items) return null;
  const ids = new Set(items.map((i) => i.uid));
  return {
    ...room,
    warehouse: (room.warehouse || []).filter((i) => !ids.has(i.uid)),
    rescueReserved: [],
    player: {
      ...room.player,
      hp: 45,
      food: Math.min(100, room.player.food + 45),
      water: Math.min(100, room.player.water + 45),
    },
  };
}
