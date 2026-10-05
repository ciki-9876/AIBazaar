/** Public contest rules. AI decisions enter through the same resource/action rules. */
export const RACE_TARGET = 100;
export const RACE_SEGMENT_TICKS = 12 * 60 * 30;
export const PASS_CAPACITY = 10;
export const PLAYER_CONTESTANT = 'player';
export type RaceScene =
  | 'briefing'
  | 'live'
  | 'review'
  | 'promotion'
  | 'victory'
  | 'eliminated';
export type Pass = { id: string; segment: number; source: string };
export type Contestant = {
  id: string;
  number: string;
  name: string;
  floor: number;
  status: 'pending' | 'active' | 'eliminated' | 'winner';
  passes: Pass[];
  qualified: number[];
  deadline: number;
  arrivedAt: number;
};
export type PassSource = {
  id: string;
  floor: number;
  x: number;
  z: number;
  title: string;
  amount: number;
  duration: number;
  repeat: boolean;
  guarded: boolean;
  cycle: number;
  nextAt: number;
  exhausted: boolean;
};
export type RaceEvent = {
  id: number;
  at: number;
  actor: string;
  floor: number;
  kind:
    | 'enrolled'
    | 'passes'
    | 'transfer'
    | 'ascend'
    | 'qualified'
    | 'eliminated'
    | 'winner';
  text: string;
};
export type RaceState = {
  version: 1;
  seed: number;
  tick: number;
  serial: number;
  scene: RaceScene;
  contestants: Contestant[];
  sources: PassSource[];
  events: RaceEvent[];
  work: Record<string, { source: string; ticks: number }>;
  result: { floor: number; converted: number } | null;
};
export const raceSegment = (floor: number) =>
  Math.max(1, Math.ceil(floor / 10));
export const raceCheckpoint = (floor: number) =>
  Math.min(100, raceSegment(floor) * 10);
export const raceNextCheckpoint = (
  c: Pick<Contestant, 'floor' | 'qualified'>,
) =>
  raceCheckpoint(
    c.floor % 10 === 0 && c.qualified.includes(c.floor) ? c.floor + 1 : c.floor,
  );
export const raceSpan = (level: number) =>
  Math.min(9, 3 + Math.max(0, level - 2) * 2);
export const racePlayer = (race: RaceState) =>
  race.contestants.find((c) => c.id === PLAYER_CONTESTANT)!;
export const racePaused = (race?: RaceState) => !!race && race.scene !== 'live';
export const raceFloorSeed = (floor: number) => 93000 + floor;
export function raceSources(floor: number): PassSource[] {
  const garden = floor % 2 === 1;
  const points = garden
    ? [
        [40.5, 70.5],
        [37.5, 54],
        [48.5, 47.5],
        [55, 70.5],
      ]
    : [
        [44.5, 69],
        [60, 46],
        [48.5, 52.5],
        [53, 72],
      ];
  return points.map(([x, z], i) => ({
    id: `pass-${floor}-${i}`,
    floor,
    x,
    z,
    title: ['登记箱', '封存票匣', '守卫封印', '应急签发器'][i],
    amount: [2, 2, 3, 1][i],
    duration: i === 3 ? 240 : 90,
    repeat: i === 3,
    guarded: i === 2,
    cycle: 0,
    nextAt: 0,
    exhausted: false,
  }));
}
function event(
  r: RaceState,
  actor: string,
  kind: RaceEvent['kind'],
  text: string,
): RaceState {
  const c = r.contestants.find((c) => c.id === actor)!;
  return {
    ...r,
    serial: r.serial + 1,
    events: [
      ...r.events,
      {
        id: r.serial,
        at: r.tick,
        actor,
        kind,
        floor: c.floor,
        text,
      },
    ].slice(-48),
  };
}
export function createRace(seed: number, floor = 3): RaceState {
  const r: RaceState = {
    version: 1,
    seed,
    tick: 0,
    serial: 1,
    scene: 'briefing',
    work: {},
    result: null,
    contestants: [
      {
        id: 'player',
        number: '007',
        name: '你',
        floor,
        status: 'active',
        passes: [],
        qualified: [],
        deadline: RACE_SEGMENT_TICKS,
        arrivedAt: 0,
      },
      ...['林岚', '周砚', '许照'].map(
        (name, i): Contestant => ({
          id: `contestant-${i + 1}`,
          number: String(i + 11).padStart(3, '0'),
          name,
          floor: 3,
          status: 'pending',
          passes: [],
          qualified: [],
          deadline: RACE_SEGMENT_TICKS,
          arrivedAt: 0,
        }),
      ),
    ],
    sources: raceSources(floor),
    events: [],
  };
  return event(r, 'player', 'enrolled', '007号选手登记。终点：100层。');
}
export function registerContestant(
  r: RaceState,
  id: string,
  name?: string,
): RaceState {
  if (r.scene !== 'live') return r;
  const c = r.contestants.find((c) => c.id === id);
  if (!c || c.status !== 'pending' || r.tick >= c.deadline) return r;
  const next = {
    ...r,
    contestants: r.contestants.map((v) =>
      v.id === id
        ? {
            ...v,
            name: name?.trim().slice(0, 20) || v.name,
            status: 'active' as const,
            arrivedAt: r.tick,
          }
        : v,
    ),
  };
  return event(
    next,
    id,
    'enrolled',
    `${next.contestants.find((v) => v.id === id)!.name}进入赛场。`,
  );
}
export function destinationReason(
  r: RaceState,
  actor: string,
  to: number,
  level: number,
): string | null {
  const c = r.contestants.find((c) => c.id === actor);
  if (!c || c.status !== 'active' || r.scene !== 'live') return '赛事尚未开放';
  if (!Number.isInteger(to) || to < c.floor || to > 100) return '低层永久关闭';
  const checkpoint = raceNextCheckpoint(c);
  const ceiling = checkpoint;
  if (to > ceiling) return `须先通过${checkpoint}层审查`;
  if (to - c.floor > raceSpan(level)) return '超过电梯单次跨度';
  const available = c.passes.filter(
    (p) => p.segment === raceSegment(to === c.floor ? to : c.floor + 1),
  ).length;
  if (to - c.floor > available) return '通行证不足';
  if (r.tick >= c.deadline && !c.qualified.includes(checkpoint))
    return '资格已过期';
  return null;
}
/** Atomic payment; invalid destinations return the original object and leave all IDs intact. */
export function ascendRace(
  r: RaceState,
  actor: string,
  to: number,
  level: number,
): RaceState {
  if (destinationReason(r, actor, to, level)) return r;
  const c = r.contestants.find((c) => c.id === actor)!;
  if (to === c.floor) return r;
  const cost = to - c.floor;
  const movingSegment = raceSegment(c.floor + 1);
  const spend = new Set(
    c.passes
      .filter((p) => p.segment === movingSegment)
      .slice(0, cost)
      .map((p) => p.id),
  );
  let next: RaceState = {
    ...r,
    work: Object.fromEntries(
      Object.entries(r.work).filter(([id]) => id !== actor),
    ),
    contestants: r.contestants.map((v) =>
      v.id === actor
        ? {
            ...v,
            floor: to,
            arrivedAt: r.tick,
            passes: v.passes.filter((p) => !spend.has(p.id)),
            status: to === 100 ? 'winner' : v.status,
            deadline: c.deadline,
          }
        : v,
    ),
    sources:
      to === 100 || r.sources.some((s) => s.floor === to)
        ? r.sources
        : [...r.sources, ...raceSources(to)],
  };
  next = event(next, actor, 'ascend', `${c.name}抵达${to}层 · 跨越${cost}层`);
  if (to === 100) {
    next = event(next, actor, 'winner', `${c.name}率先抵达100层。赛事结束。`);
    next = {
      ...next,
      work: {},
      scene: actor === PLAYER_CONTESTANT ? 'victory' : 'eliminated',
      contestants: next.contestants.map((v) =>
        v.id !== actor && v.status === 'active'
          ? { ...v, status: 'eliminated' as const }
          : v,
      ),
    };
  }
  return next;
}
export function transferPasses(
  r: RaceState,
  from: string,
  to: string,
  ids: string[],
): RaceState {
  if (
    r.scene !== 'live' ||
    from === to ||
    !ids.length ||
    new Set(ids).size !== ids.length
  )
    return r;
  const a = r.contestants.find((c) => c.id === from),
    b = r.contestants.find((c) => c.id === to);
  if (
    !a ||
    !b ||
    a.status !== 'active' ||
    b.status !== 'active' ||
    b.passes.length + ids.length > PASS_CAPACITY
  )
    return r;
  const selected = a.passes.filter((p) => ids.includes(p.id));
  if (
    selected.length !== ids.length ||
    selected.some(
      (p) =>
        p.segment !==
        raceSegment(
          b.floor === raceCheckpoint(b.floor) && b.qualified.includes(b.floor)
            ? b.floor + 1
            : b.floor,
        ),
    )
  )
    return r;
  return event(
    {
      ...r,
      contestants: r.contestants.map((c) =>
        c.id === from
          ? {
              ...c,
              passes: c.passes.filter((p) => !ids.includes(p.id)),
            }
          : c.id === to
            ? { ...c, passes: [...c.passes, ...selected] }
            : c,
      ),
    },
    from,
    'transfer',
    `${a.name}向${b.name}交付${ids.length}张通行证。`,
  );
}
export type RaceObservation = {
  actor: string;
  x: number;
  z: number;
  working: boolean;
  hurt: boolean;
  guardianAlive: boolean;
  blockedSources?: string[];
};
/** Observations come from authoritative movement/combat, never from model-written facts. */
export function tickRace(
  r: RaceState,
  observations: RaceObservation[] = [],
): RaceState {
  if (r.scene !== 'live') return r;
  let next: RaceState = { ...r, tick: r.tick + 1, work: {} };
  for (const c of r.contestants) {
    if (c.status !== 'active') continue;
    if (
      next.tick >= c.deadline &&
      !c.qualified.includes(raceNextCheckpoint(c))
    ) {
      next = event(
        {
          ...next,
          contestants: next.contestants.map((v) =>
            v.id === c.id ? { ...v, status: 'eliminated' as const } : v,
          ),
        },
        c.id,
        'eliminated',
        `${c.name}未在时限内通过审查，资格注销。`,
      );
      if (c.id === PLAYER_CONTESTANT) next = { ...next, scene: 'eliminated' };
      continue;
    }
    const o = observations.find((o) => o.actor === c.id);
    if (
      !o ||
      !o.working ||
      o.hurt ||
      c.passes.length >= PASS_CAPACITY ||
      !Number.isFinite(o.x) ||
      !Number.isFinite(o.z)
    )
      continue;
    const source = next.sources.find(
      (s) =>
        s.floor === c.floor &&
        !s.exhausted &&
        s.nextAt <= next.tick &&
        !o.blockedSources?.includes(s.id) &&
        Math.hypot(o.x - s.x, o.z - s.z) <= 1.8 &&
        !(s.guarded && o.guardianAlive),
    );
    if (!source || c.passes.length + source.amount > PASS_CAPACITY) continue;
    const old = r.work[c.id];
    const ticks = old?.source === source.id ? old.ticks + 1 : 1;
    if (ticks < source.duration) {
      next.work[c.id] = { source: source.id, ticks };
      continue;
    }
    const segment = raceSegment(
      c.floor === raceCheckpoint(c.floor) && c.qualified.includes(c.floor)
        ? c.floor + 1
        : c.floor,
    );
    const passes = Array.from(
      { length: source.amount },
      (_, i): Pass => ({
        id: `${source.id}:${source.cycle}:${i}`,
        segment,
        source: source.id,
      }),
    );
    next = event(
      {
        ...next,
        contestants: next.contestants.map((v) =>
          v.id === c.id ? { ...v, passes: [...v.passes, ...passes] } : v,
        ),
        sources: next.sources.map((s) =>
          s.id === source.id
            ? {
                ...s,
                cycle: s.cycle + 1,
                exhausted: !s.repeat,
                nextAt: next.tick + 450,
              }
            : s,
        ),
      },
      c.id,
      'passes',
      `${c.name}登记通行证 +${source.amount}`,
    );
  }
  return next;
}
export function qualifyRace(
  r: RaceState,
  actor: string,
  guardianDefeated: boolean,
): RaceState {
  const c = r.contestants.find((c) => c.id === actor);
  if (
    !c ||
    c.status !== 'active' ||
    !guardianDefeated ||
    c.floor % 10 ||
    c.floor === 100 ||
    c.qualified.includes(c.floor) ||
    c.passes.length < 2 ||
    c.passes.some((p) => p.segment !== raceSegment(c.floor)) ||
    r.tick >= c.deadline ||
    !['live', 'review'].includes(r.scene)
  )
    return r;
  const converted = Math.max(0, c.passes.length - 2) * 5;
  let next: RaceState = {
    ...r,
    result:
      actor === PLAYER_CONTESTANT ? { floor: c.floor, converted } : r.result,
    scene: actor === PLAYER_CONTESTANT ? 'promotion' : r.scene,
    contestants: r.contestants.map((v) =>
      v.id === actor
        ? {
            ...v,
            qualified: [...v.qualified, v.floor],
            passes: [0, 1].map((i) => ({
              id: `promotion-${actor}-${v.floor}-${i}`,
              segment: raceSegment(v.floor + 1),
              source: 'qualification',
            })),
            deadline: r.tick + RACE_SEGMENT_TICKS,
          }
        : v,
    ),
  };
  next = event(
    next,
    actor,
    'qualified',
    `${c.name}通过${c.floor}层审查。下一赛段开放。`,
  );
  return next;
}
export function acknowledgeRace(r: RaceState): RaceState {
  if (!['briefing', 'promotion', 'review'].includes(r.scene)) return r;
  return { ...r, scene: 'live', result: null };
}
export function validRace(value: unknown): value is RaceState {
  if (!value || typeof value !== 'object') return false;
  const r = value as RaceState;
  const integer = (v: unknown) =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  if (
    r.version !== 1 ||
    !integer(r.seed) ||
    !integer(r.tick) ||
    !integer(r.serial) ||
    ![
      'briefing',
      'live',
      'review',
      'promotion',
      'victory',
      'eliminated',
    ].includes(r.scene) ||
    !Array.isArray(r.contestants) ||
    !r.contestants.length ||
    r.contestants.length > 100 ||
    !Array.isArray(r.sources) ||
    r.sources.length > 388 ||
    !Array.isArray(r.events) ||
    r.events.length > 48 ||
    !r.work ||
    typeof r.work !== 'object' ||
    Array.isArray(r.work)
  )
    return false;
  const passes: string[] = [];
  if (
    !r.contestants.every(
      (c) =>
        c &&
        typeof c.id === 'string' &&
        !!c.id &&
        typeof c.number === 'string' &&
        typeof c.name === 'string' &&
        integer(c.floor) &&
        c.floor >= 3 &&
        c.floor <= 100 &&
        ['pending', 'active', 'eliminated', 'winner'].includes(c.status) &&
        integer(c.deadline) &&
        integer(c.arrivedAt) &&
        c.arrivedAt <= r.tick &&
        Array.isArray(c.qualified) &&
        new Set(c.qualified).size === c.qualified.length &&
        c.qualified.every(
          (f) => integer(f) && f > 0 && f < 100 && f % 10 === 0 && f <= c.floor,
        ) &&
        Array.isArray(c.passes) &&
        c.passes.length <= PASS_CAPACITY &&
        c.passes.every((p) => {
          if (
            !p ||
            typeof p.id !== 'string' ||
            !p.id ||
            typeof p.source !== 'string' ||
            !integer(p.segment) ||
            p.segment !==
              raceSegment(
                c.floor === raceCheckpoint(c.floor) &&
                  c.qualified.includes(c.floor)
                  ? c.floor + 1
                  : c.floor,
              )
          )
            return false;
          passes.push(p.id);
          return true;
        }),
    )
  )
    return false;
  if (
    new Set(r.contestants.map((c) => c.id)).size !== r.contestants.length ||
    !r.contestants.some((c) => c.id === 'player') ||
    new Set(passes).size !== passes.length
  )
    return false;
  if (
    !r.sources.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        !!s.id &&
        integer(s.floor) &&
        s.floor >= 3 &&
        s.floor < 100 &&
        Number.isFinite(s.x) &&
        Number.isFinite(s.z) &&
        typeof s.title === 'string' &&
        integer(s.amount) &&
        s.amount > 0 &&
        s.amount <= 3 &&
        integer(s.duration) &&
        s.duration > 0 &&
        integer(s.cycle) &&
        integer(s.nextAt) &&
        typeof s.repeat === 'boolean' &&
        typeof s.guarded === 'boolean' &&
        typeof s.exhausted === 'boolean',
    )
  )
    return false;
  if (new Set(r.sources.map((s) => s.id)).size !== r.sources.length)
    return false;
  if (
    !r.events.every(
      (e, i) =>
        e &&
        integer(e.id) &&
        e.id < r.serial &&
        (!i || r.events[i - 1].id < e.id) &&
        integer(e.at) &&
        e.at <= r.tick &&
        (!i || r.events[i - 1].at <= e.at) &&
        integer(e.floor) &&
        e.floor >= 3 &&
        e.floor <= 100 &&
        typeof e.text === 'string' &&
        r.contestants.some((c) => c.id === e.actor) &&
        [
          'enrolled',
          'passes',
          'transfer',
          'ascend',
          'qualified',
          'eliminated',
          'winner',
        ].includes(e.kind),
    )
  )
    return false;
  if (
    !Object.entries(r.work).every(
      ([id, w]) =>
        r.contestants.some(
          (c) =>
            c.id === id &&
            c.status === 'active' &&
            r.sources.some((s) => s.id === w?.source && s.floor === c.floor),
        ) &&
        w &&
        typeof w.source === 'string' &&
        integer(w.ticks) &&
        w.ticks > 0 &&
        r.sources.some((s) => s.id === w.source && w.ticks < s.duration),
    )
  )
    return false;
  const player = racePlayer(r),
    winners = r.contestants.filter((c) => c.status === 'winner');
  if (
    winners.length > 1 ||
    winners.some((c) => c.floor !== 100) ||
    (r.scene === 'victory'
      ? player.status !== 'winner'
      : player.status === 'winner') ||
    (r.scene === 'eliminated'
      ? player.status !== 'eliminated'
      : player.status === 'eliminated') ||
    (r.scene === 'promotion' &&
      (!r.result || !player.qualified.includes(player.floor)))
  )
    return false;
  return (
    r.result === null ||
    (!!r.result &&
      r.scene === 'promotion' &&
      integer(r.result.floor) &&
      r.result.floor === player.floor &&
      r.result.floor < 100 &&
      r.result.floor % 10 === 0 &&
      integer(r.result.converted) &&
      r.result.converted <= (PASS_CAPACITY - 2) * 5)
  );
}
