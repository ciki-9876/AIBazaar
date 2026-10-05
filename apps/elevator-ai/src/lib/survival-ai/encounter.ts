/** Independent multi-actor experiment. Production saves and the single-player RNG are untouched. */
import { randomStream } from '../../packages/core/random.ts';
import {
  ITEMS,
  STEP,
  foodSpeed,
  weaponStats,
  searchDuration,
  pathTo,
} from '../survival-room.ts';
import type {
  Item,
  ItemKind,
  Equipment,
  Cache,
  Enemy,
  Point,
} from '../survival-room.ts';
import {
  ELEVATOR,
  walkable,
  clearSight,
  revealFog,
  isVisible,
} from '../survival-world.ts';
import type { RoomWorld, Fog } from '../survival-world.ts';
import { putInBag, unplaced } from '../survival-cargo.ts';
import { itemIds, itemCount, itemName } from '../survival-stacks.ts';
import { ITEM_PROPERTIES } from '../survival-item-traits.ts';
import { fingerprint } from './protocol.ts';
import {
  createMail,
  currentAgreement,
  advanceMail,
  performMailTrade,
  finishAgreement,
} from './mail.ts';
import type { MailState, MailCase } from './mail.ts';

export const PROFILES = {
  ally: {
    name: '林砚',
    title: '互保',
    color: '#9bcca9',
    traits: [1, 0.2, 0.05],
    description: '重视互惠，愿意分出补给；受伤或遭到背叛时会自保。',
  },
  broker: {
    name: '许衡',
    title: '套利',
    color: '#d7b674',
    traits: [0.15, 1, 0.25],
    description: '争夺有价值的物资，计算风险；援助也要考虑自己的余量。',
  },
  predator: {
    name: '祁烈',
    title: '压制',
    color: '#d47e73',
    traits: [0.05, 0.45, 1],
    description: '抢占资源，主动逼退竞争者；濒危时同样会撤退。',
  },
} as const;
export type Profile = keyof typeof PROFILES;
export const SCENARIOS = [
  {
    id: 'water',
    title: '最后一瓶水',
    description: '你们都缺水。出口旁只剩一瓶可直接拾取的水。',
    rule: '共享拾取物只有一个归属；使用补给才恢复饮水。',
  },
  {
    id: 'search',
    title: '谁来翻柜子',
    description: '柜子需要持续翻找，附近的异形正在靠近。',
    rule: '同一容器只能由一人翻找；离开或受击会中断。',
  },
  {
    id: 'help',
    title: '开口求援',
    description: '你没有水，竞争者有两瓶。按 H 告诉对方你需要水。',
    rule: '求援信号可被看见；赠送真实转移物品，不凭空生成。',
  },
  {
    id: 'cargo',
    title: '满载的代价',
    description: '竞争者行囊已满，仍面临补给和机械零件的取舍。',
    rule: '16 格容量；装不下不能拾取，使用或丢弃会腾出空间。',
  },
  {
    id: 'cover',
    title: '墙后的追击',
    description: '高墙遮挡视野，矮墙只阻挡移动。尝试甩开追击。',
    rule: '怪物丢失视野继续追踪 3 秒；双方各有独立迷雾。',
  },
  {
    id: 'boss',
    title: '守卫的战利品',
    description: '精英守着补给箱。合作击杀后，战利品仍需争夺。',
    rule: '共享怪物只死一次；脑浆落在现场，不按伤害复制。',
  },
  {
    id: 'deathbag',
    title: '遗留的背包',
    description: '地上有一名遇难者的行囊。资源并未绑定给谁。',
    rule: '死亡留下普通行囊，双方都能翻找；装备保留。',
  },
  {
    id: 'exit',
    title: '现在撤，还是再搜',
    description: '你们精神力偏低，出口和一只未开的柜子都在附近。',
    rule: '撤离需要 2.2 秒，移动或受击会打断。没有额外倒计时。',
  },
] as const;
export type Scenario = (typeof SCENARIOS)[number]['id'];
export type Intent =
  | { type: 'wait' }
  | { type: 'move'; to: Point }
  | { type: 'search'; cacheId: string }
  | { type: 'consume'; uid: string }
  | { type: 'discard'; uid: string }
  | { type: 'give'; uid: string; actorId: string }
  | { type: 'trade'; agreementId: string }
  | { type: 'assist'; enemyId: string }
  | { type: 'engage'; actorId: string }
  | { type: 'extract' };
export type Actor = Point & {
  id: string;
  hp: number;
  food: number;
  water: number;
  facing: number;
  status: 'active' | 'dead' | 'extracted';
  bag: Item[];
  equipment: Equipment[];
  fog: Fog;
  path: Point[];
  intent: Intent;
  label: string;
  cooldowns: Record<string, number>;
  searching: string | null;
  searchTicks: number;
  extraction: number;
  hostile: string[];
  help: { kind: 'water' | 'food'; until: number } | null;
  relation: number;
  hurtAt: number;
  decisions: number;
  navigation?: {
    goalKey: string;
    holdUntil: number;
    stalled: number;
    recoveries: number;
    trail: { x: number; z: number; tick: number }[];
    blocked: { x: number; z: number; until: number }[];
  };
};
export type ArenaEvent = {
  id: number;
  tick: number;
  text: string;
  actorId?: string;
  visibleToPlayer: boolean;
};
export type ArenaEffect = {
  id: number;
  tick: number;
  kind: 'beam' | 'hit' | 'pickup';
  from: Point;
  to: Point;
  amount: number;
  color: string;
  label?: string;
};
export type Encounter = {
  version: 'f9-encounter-v1' | 'f9-encounter-v2';
  seed: number;
  sessionId: string;
  tick: number;
  serial: number;
  profile: Profile;
  scenario: Scenario;
  world: RoomWorld;
  actors: Actor[];
  caches: (Cache & { guardId?: string; openedBy?: string })[];
  enemies: Enemy[];
  events: ArenaEvent[];
  effects: ArenaEffect[];
  mail?: MailState;
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const point = (p: Point) => ({ x: p.x, z: p.z });
const actorVisible = (state: Encounter, actor: Actor, p: Point) =>
  isVisible(
    {
      player: actor,
      fog: actor.fog,
      world: state.world,
      equipment: actor.equipment,
    },
    p,
  );
export const canSee = actorVisible;
const say = (s: Encounter, text: string, actorId?: string, at?: Point) => {
  const body = actorId && s.actors.find((row) => row.id === actorId);
  const visibleToPlayer =
    actorId === 'player' ||
    (body
      ? actorVisible(s, s.actors[0], body)
      : at
        ? actorVisible(s, s.actors[0], at)
        : true);
  s.events.push({
    id: ++s.serial,
    tick: s.tick,
    text,
    actorId,
    visibleToPlayer,
  });
  s.events = s.events.slice(-24);
};
const effect = (
  s: Encounter,
  kind: ArenaEffect['kind'],
  from: Point,
  to: Point,
  amount: number,
  color: string,
  label?: string,
) =>
  s.effects.push({
    id: ++s.serial,
    tick: s.tick,
    kind,
    from: point(from),
    to: point(to),
    amount,
    color,
    label,
  });

export function createEncounter(
  seed: number,
  profile: Profile,
  scenario: Scenario,
  sessionId: string,
): Encounter {
  if (
    !Number.isSafeInteger(seed) ||
    !(profile in PROFILES) ||
    !SCENARIOS.some((row) => row.id === scenario) ||
    !sessionId
  )
    throw new Error('Invalid encounter');
  const random = randomStream(seed, 'f9-encounter-room-v1');
  const world: RoomWorld = {
    version: 4,
    seed,
    theme: 'maintenance',
    sight: 9,
    bounds: { minX: 34, maxX: 65, minZ: 46, maxZ: 78 },
    gates: [],
    modules: [],
    obstacles: [
      { x: 44, z: 62, w: 1, d: 7, type: 'wall', height: 'tall' },
      { x: 55, z: 66, w: 6, d: 0.7, type: 'low-wall', height: 'low' },
      { x: 54, z: 54, w: 1.1, d: 7, type: 'wall', height: 'tall' },
      { x: 38, z: 53, w: 3.2, d: 2.4, type: 'tank', height: 'tall' },
      { x: 59, z: 60, w: 3, d: 1.8, type: 'pump', height: 'tall' },
      { x: 39, z: 69, w: 3, d: 0.65, type: 'low-wall', height: 'low' },
    ],
  };
  let serial = 0;
  const item = (kind: ItemKind): Item => ({
    ...ITEMS[kind],
    uid: sessionId + ':item:' + ++serial,
    ...(kind === 'lift-material' ? { quality: 'normal' as const } : {}),
  });
  const cache = (
    x: number,
    z: number,
    container: Cache['container'],
    kinds: ItemKind[],
  ) => {
    const contents = kinds.map(item);
    return {
      id: 'cache:' + ++serial,
      x,
      z,
      container,
      contents,
      item: contents[0],
      searched: container === 'loose',
      opened: false,
      available: 0,
      pickup: container === 'loose' ? ('touch' as const) : undefined,
    };
  };
  const actor = (id: string, x: number, z: number): Actor => ({
    id,
    x,
    z,
    hp: 100,
    food: 72,
    water: 62,
    facing: 0,
    status: 'active',
    equipment: [
      { item: item('phone'), slot: 0 },
      { item: item('flashlight'), slot: 1 },
    ],
    bag: [],
    fog: { visible: [], explored: [] },
    path: [],
    intent: { type: 'wait' },
    label: '观察周围',
    cooldowns: {},
    searching: null,
    searchTicks: 0,
    extraction: 0,
    hostile: [],
    help: null,
    relation: 0,
    hurtAt: -100,
    decisions: 0,
  });
  const player = actor('player', 48.5, 72);
  const rival = actor('rival', 51.5, 71);
  const caches = [
    cache(49.5, 67.8, 'loose', ['water']),
    cache(50, 60, 'locker', ['water', 'scrap', 'lift-material']),
    cache(40.5, 63, 'crate', ['bread', 'scrap', 'capacitor']),
    cache(58, 70, 'crate', ['lift-material', 'lift-material', 'water']),
    cache(49, 50, 'locker', ['core', 'scrap', 'medicine']),
    cache(60, 50, 'crate', ['bread', 'scrap']),
  ];
  const enemy = (
    x: number,
    z: number,
    kind: Enemy['kind'],
    pursuit: Enemy['pursuit'],
  ): Enemy => ({
    id: 'enemy:' + ++serial,
    x,
    z,
    kind,
    hp: kind === 'boss' ? 220 : 62,
    maxHp: kind === 'boss' ? 220 : 62,
    pursuit,
    home: { x, z },
    sight: 9,
    awake: false,
    nextAttack: 0,
    hitAt: -100,
    windup: 0,
    aim: null,
  });
  let enemies = Array.from({ length: 5 }, (_, i) => {
    let p = { x: 38 + random() * 23, z: 48 + i * 3.3 };
    for (let attempt = 0; !walkable(p, 0.4, world) && attempt < 40; attempt++)
      p = { x: 36 + random() * 27, z: 48 + random() * 22 };
    return enemy(p.x, p.z, i % 2 ? 'runner' : 'crawler', 'territorial');
  });
  if (scenario === 'water') {
    player.water = 21;
    rival.water = 21;
    rival.x = 50.5;
    rival.z = 72;
  }
  if (scenario === 'search') {
    caches[0] = cache(49.5, 68, 'locker', ['water', 'scrap']);
    enemies.push(enemy(50, 61, 'brute', 'territorial'));
  }
  if (scenario === 'help') {
    player.water = 12;
    rival.bag = [item('water'), item('water')];
    rival.x = 50;
    caches[0].contents = [];
    caches[0].opened = true;
    rival.water = 80;
  }
  if (scenario === 'cargo') {
    rival.bag = Array.from({ length: 16 }, () => item('scrap'));
    rival.bag = rival.bag.map((entry, slot) => ({ ...entry, slot }));
    rival.water = 28;
    rival.bag[0] = { ...item('water'), slot: 0 };
  }
  if (scenario === 'cover') {
    player.x = 42;
    player.z = 62;
    rival.x = 47;
    rival.z = 62;
    enemies = [
      enemy(42, 57, 'runner', 'territorial'),
      enemy(40, 64, 'crawler', 'ambush'),
    ];
  }
  if (scenario === 'boss') {
    player.z = 64;
    rival.z = 65;
    caches[0].opened = true;
    caches[0].contents = [];
    enemies = [enemy(50, 59, 'boss', 'territorial')];
  }
  if (scenario === 'deathbag')
    caches[0] = cache(49.5, 67.8, 'backpack', [
      'water',
      'scrap',
      'lift-material',
    ]);
  if (scenario === 'exit') {
    player.hp = 24;
    rival.hp = 24;
    caches[0] = cache(49.5, 68, 'locker', ['water', 'scrap']);
  }
  const state: Encounter = {
    version: 'f9-encounter-v2',
    sessionId,
    seed,
    profile,
    scenario,
    tick: 0,
    serial,
    world,
    actors: [player, rival],
    caches,
    enemies,
    events: [],
    effects: [],
  };
  for (const body of state.actors)
    body.fog = revealFog(body, body.fog, world, 11);
  say(state, SCENARIOS.find((row) => row.id === scenario)!.description);
  return state;
}

/** Starts inside the elevator; the same physical room, IDs and actors survive every return. */
export function createMailEncounter(
  seed: number,
  profile: Profile,
  scenario: MailCase,
  sessionId: string,
): Encounter {
  const s = createEncounter(
    seed,
    profile,
    scenario === 'help' || scenario === 'bargain' ? 'help' : 'boss',
    sessionId,
  );
  s.mail = createMail(scenario);
  const item = (kind: ItemKind): Item => ({
    ...ITEMS[kind],
    uid: sessionId + ':mail-item:' + ++s.serial,
  });
  s.actors[0].bag = [item('scrap'), item('scrap')];
  s.actors[0].water = scenario === 'help' ? 18 : 45;
  s.actors[1].water = 75;
  s.actors[1].bag = [item('water'), item('water')];
  s.actors[0].x = 48.5;
  s.actors[0].z = 72.5;
  s.actors[1].x = 50;
  s.actors[1].z = 72;
  s.actors[1].relation = scenario === 'trust' ? -0.25 : 0;
  s.caches = s.caches.filter((c) => !c.opened && c.container !== 'loose');
  if (scenario === 'guardian' || scenario === 'trust') {
    const boss = s.enemies[0];
    boss.x = 50;
    boss.z = 62.5;
    boss.home = { x: boss.x, z: boss.z };
    const contents = [item('water'), item('scrap'), item('capacitor')];
    s.caches.push({
      id: 'mail:guard-cache',
      x: 51.5,
      z: 64,
      container: 'crate',
      contents,
      item: contents[0],
      searched: false,
      opened: false,
      available: 0,
      guardId: boss.id,
    });
  } else s.enemies = [];
  for (const a of s.actors) {
    a.fog.explored = Array.from({ length: 96 * 80 }, (_, i) =>
      a.fog.explored[i] === 1 ? 1 : 0,
    );
    a.fog = revealFog(a, a.fog, s.world, 11);
  }
  s.events = [];
  s.effects = [];
  return s;
}

export type VisibleActor = Point & {
  id: string;
  hp: number;
  wanted: 'water' | 'food' | null;
  hostile: boolean;
};
export type PrivateObservation = {
  actorId: string;
  tick: number;
  self: {
    hp: number;
    food: number;
    water: number;
    free: number;
    value: number;
    relation: number;
  };
  others: VisibleActor[];
  threats: (Point & { id: string; hp: number })[];
  caches: (Point & {
    id: string;
    kind: ItemKind | null;
    searched: boolean;
    busy: boolean;
    duration: number;
  })[];
};
export type Choice = {
  id: string;
  key: string;
  label: string;
  action: Intent;
  features: number[];
};
export type EncounterRequest = {
  schema: 'f9-encounter-request-v1';
  id: string;
  sessionId: string;
  actorId: string;
  tick: number;
  observation: PrivateObservation;
  candidates: Choice[];
  socialRevision?: number;
};
export type EncounterReply = {
  requestId: string;
  candidateId: string;
  modelVersion: string;
};
export const FEATURE_COUNT = 34;
export function encounterRequest(
  s: Encounter,
  actorId = 'rival',
): EncounterRequest {
  const a = s.actors.find((row) => row.id === actorId)!;
  if (!a || a.status !== 'active') throw new Error('Actor unavailable');
  const others = s.actors
    .filter(
      (row) =>
        row.id !== actorId &&
        row.status === 'active' &&
        actorVisible(s, a, row),
    )
    .map((row) => ({
      ...point(row),
      id: row.id,
      hp: row.hp,
      wanted: row.help && row.help.until >= s.tick ? row.help.kind : null,
      hostile: a.hostile.includes(row.id),
    }));
  const threats = s.enemies
    .filter((row) => actorVisible(s, a, row))
    .map((row) => ({ ...point(row), id: row.id, hp: row.hp }));
  const caches = s.caches
    .filter(
      (row) =>
        !row.opened &&
        (row.contents.length || !row.searched) &&
        row.available <= s.tick &&
        actorVisible(s, a, row),
    )
    .map((row) => ({
      ...point(row),
      id: row.id,
      kind: row.container === 'loose' ? row.contents[0].kind : null,
      searched: row.searched,
      busy: s.actors.some(
        (body) => body.id !== a.id && body.searching === row.id,
      ),
      duration: searchDuration(row, 100),
    }));
  const free = 16 - a.bag.reduce((n, entry) => n + entry.size, 0);
  const observation: PrivateObservation = {
    actorId,
    tick: s.tick,
    self: {
      hp: a.hp,
      food: a.food,
      water: a.water,
      free,
      value: a.bag.reduce((n, row) => n + row.value, 0),
      relation: a.relation,
    },
    others,
    threats,
    caches,
  };
  const candidates: Choice[] = [];
  const traits = PROFILES[s.profile].traits;
  const near = Math.min(20, ...threats.map((t) => distance(a, t)));
  const add = (
    key: string,
    label: string,
    action: Intent,
    to: Point = a,
    gains: number[] = [0, 0, 0],
    value = 0,
    duration = 0,
    exploration = 0,
    continuation = 0,
    wanted = 0,
    hostile = 0,
  ) => {
    const types = [
      'wait',
      'move',
      'search',
      'consume',
      'discard',
      'give',
      'engage',
      'extract',
    ];
    const targetNear = Math.min(20, ...threats.map((t) => distance(to, t)));
    // Social intents use the existing tactical encoding: the LLM owns the goal, this network ranks execution.
    const encoded =
      action.type === 'trade'
        ? 'give'
        : action.type === 'assist'
          ? 'engage'
          : action.type;
    const features = [
      ...types.map((t) => Number(encoded === t)),
      1 - a.hp / 100,
      1 - a.food / 100,
      1 - a.water / 100,
      free / 16,
      ...traits,
      (a.relation + 1) / 2,
      distance(a, to) / 32,
      near / 20,
      targetNear / 20,
      ...gains.map((v) => v / 45),
      value / 48,
      duration / 150,
      exploration,
      continuation,
      wanted,
      hostile,
      (((100 - a.hp) / 100) * gains[0]) / 45,
      (((100 - a.food) / 100) * gains[1]) / 45,
      (((100 - a.water) / 100) * gains[2]) / 45,
      a.bag.reduce((n, row) => n + row.value, 0) / 128,
      Number(a.searching !== null),
      Number(a.extraction > 0),
    ];
    if (features.length !== FEATURE_COUNT)
      throw new Error('Feature schema mismatch');
    candidates.push({ id: '', key, label, action, features });
  };
  add('wait', '观察', { type: 'wait' });
  if (
    a.intent.type === 'move' &&
    a.path.length &&
    distance(a, a.intent.to) > 0.3 &&
    clearSight(a, a.intent.to, s.world, 0.42, true)
  )
    add(
      'move:continue',
      '继续移动',
      a.intent,
      a.intent.to,
      undefined,
      0,
      0,
      0.5,
      1,
    );
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4,
      to = { x: a.x + Math.cos(angle) * 4, z: a.z + Math.sin(angle) * 4 };
    if (!walkable(to, 0.42, s.world) || !clearSight(a, to, s.world, 0.42, true))
      continue;
    if (
      s.version === 'f9-encounter-v2' &&
      a.navigation?.blocked.some((p) => p.until > s.tick && distance(to, p) < 2)
    )
      continue;
    // Only own explored cells inform the frontier; no hidden loot is scored.
    let frontier = 0;
    for (let j = 0; j < 8; j++) {
      const x = Math.floor(to.x + Math.cos((j * Math.PI) / 4) * 7),
        z = Math.floor(to.z + Math.sin((j * Math.PI) / 4) * 7);
      if (
        x >= 34 &&
        x <= 65 &&
        z >= 46 &&
        z <= 78 &&
        !a.fog.explored[z * 96 + x]
      )
        frontier++;
    }
    // No unexplored frontier and no threat is not a meaningful wandering task.
    if (s.version === 'f9-encounter-v2' && !frontier && near >= 7) continue;
    add(
      'move:' + i,
      frontier ? '探索未知区域' : near < 7 ? '拉开距离' : '调整位置',
      { type: 'move', to },
      to,
      undefined,
      0,
      0,
      Math.max(
        0,
        frontier / 8 -
          (a.navigation?.trail.filter(
            (p) => s.tick - p.tick < 600 && distance(to, p) < 2.5,
          ).length || 0) /
            4,
      ),
    );
  }
  for (const cache of caches)
    if (
      !cache.busy &&
      !s.caches.some(
        (c) =>
          c.id === cache.id &&
          c.guardId &&
          s.enemies.some((e) => e.id === c.guardId),
      )
    ) {
      const gain = cache.kind ? ITEM_PROPERTIES[cache.kind].use : null;
      const gains = [
        gain?.stat === 'hp' ? gain.gain : 0,
        gain?.stat === 'food' ? gain.gain : 0,
        gain?.stat === 'water' ? gain.gain : 0,
      ];
      const visibleValue = cache.kind ? ITEMS[cache.kind].value : 12;
      if (free > 0 || cache.kind === 'lift-material')
        add(
          'search:' + cache.id,
          cache.kind ? '争取' + ITEMS[cache.kind].name : '翻找容器',
          { type: 'search', cacheId: cache.id },
          cache,
          gains,
          visibleValue,
          cache.duration,
          0,
          Number(
            a.searching === cache.id ||
              (a.intent.type === 'search' && a.intent.cacheId === cache.id),
          ),
        );
    }
  for (const entry of a.bag) {
    const use = ITEM_PROPERTIES[entry.kind].use;
    if (use && a[use.stat] < 99)
      add(
        'consume:' + entry.uid,
        '使用' + itemName(entry),
        { type: 'consume', uid: entry.uid },
        a,
        [
          use.stat === 'hp' ? use.gain : 0,
          use.stat === 'food' ? use.gain : 0,
          use.stat === 'water' ? use.gain : 0,
        ],
      );
    if (free === 0)
      add(
        'discard:' + entry.uid,
        '丢下' + itemName(entry),
        { type: 'discard', uid: entry.uid },
        a,
        undefined,
        -entry.value,
      );
    for (const other of others)
      if (distance(a, other) < 2 && other.wanted && use?.stat === other.wanted)
        add(
          'give:' + entry.uid + ':' + other.id,
          '给' + (other.wanted === 'water' ? '水' : '食物'),
          { type: 'give', uid: entry.uid, actorId: other.id },
          other,
          undefined,
          -entry.value,
          0,
          0,
          0,
          1,
          Number(other.hostile),
        );
  }
  for (const other of others)
    add(
      'engage:' + other.id,
      '压制竞争者',
      { type: 'engage', actorId: other.id },
      other,
      undefined,
      0,
      0,
      0,
      Number(a.intent.type === 'engage'),
      Number(other.wanted !== null),
      Number(other.hostile),
    );
  add(
    'extract',
    '返回电梯',
    { type: 'extract' },
    ELEVATOR,
    undefined,
    0,
    66,
    0,
    Number(a.intent.type === 'extract'),
  );
  if (s.mail && actorId === 'rival') {
    const pact = currentAgreement(s);
    if (pact) {
      const start = candidates.length;
      const receiver = others.find((o) => o.id === 'player');
      if (pact.topic === 'water') {
        if (
          receiver &&
          distance(a, receiver) < 2 &&
          pact.waterUid &&
          a.bag.some((i) => i.uid === pact.waterUid)
        )
          add(
            'mail:deliver:' + pact.id,
            pact.price ? '履行交换' : '履行赠水约定',
            pact.price
              ? { type: 'trade', agreementId: pact.id }
              : { type: 'give', uid: pact.waterUid, actorId: 'player' },
            a,
            undefined,
            0,
            0,
            0,
            1,
            1,
          );
        else {
          const destination = receiver || ELEVATOR;
          const route = pathTo(a, destination, s.world);
          const to = route[0];
          if (to)
            add(
              'mail:approach:' + pact.id,
              '前往约定交接',
              { type: 'move', to },
              to,
              undefined,
              0,
              0,
              0,
              1,
            );
          else
            add('mail:wait:' + pact.id, '等待对方进入视野', { type: 'wait' });
        }
      } else {
        const enemy = s.enemies.find(
          (e) => e.id === pact.enemyId && actorVisible(s, a, e),
        );
        const cache = s.caches.find(
          (c) => c.id === pact.cacheId && actorVisible(s, a, c),
        );
        if (
          pact.intent === 'steal-cache' &&
          !enemy &&
          cache &&
          !s.enemies.some((e) => e.id === cache.guardId)
        )
          add(
            'mail:take:' + pact.id,
            '前往战利品箱',
            { type: 'search', cacheId: cache.id },
            cache,
            undefined,
            0,
            90,
            0,
            1,
          );
        else if (enemy && pact.intent === 'assist-guard')
          add(
            'mail:assist:' + pact.id,
            '执行共同打守卫计划',
            { type: 'assist', enemyId: enemy.id },
            enemy,
            undefined,
            0,
            0,
            0,
            1,
          );
        else if (enemy && pact.intent === 'steal-cache' && cache) {
          const to = pathTo(a, cache, s.world)[0];
          if (distance(a, cache) > 1.25 && to)
            add(
              'mail:position:' + pact.id,
              '按计划调整位置',
              { type: 'move', to },
              to,
              undefined,
              0,
              0,
              0,
              1,
            );
          else add('mail:wait:' + pact.id, '等待局势变化', { type: 'wait' });
        } else if (receiver && distance(a, receiver) > 3) {
          const to = pathTo(a, receiver, s.world)[0];
          if (to)
            add(
              'mail:follow:' + pact.id,
              '寻找合作对象',
              { type: 'move', to },
              to,
              undefined,
              0,
              0,
              0,
              1,
            );
        } else add('mail:wait:' + pact.id, '等待约定目标', { type: 'wait' });
      }
      // A social commitment constrains its executor. Tactical policy cannot silently invent a contrary plan.
      const planCandidates = candidates.slice(start);
      const survival = candidates.slice(0, start).filter((c) => {
        const action = c.action;
        return (
          action.type === 'consume' &&
          action.uid !== pact.waterUid &&
          a.bag.some(
            (i) =>
              i.uid === action.uid &&
              ((ITEM_PROPERTIES[i.kind].use?.stat === 'hp' && a.hp < 60) ||
                (ITEM_PROPERTIES[i.kind].use?.stat === 'water' &&
                  a.water < 40) ||
                (ITEM_PROPERTIES[i.kind].use?.stat === 'food' && a.food < 40)),
          )
        );
      });
      if (planCandidates.length)
        candidates.splice(0, candidates.length, ...survival, ...planCandidates);
    }
  }
  // Goal commitment prevents the half-second policy from repeatedly reversing a valid route.
  // Urgent survival and binding mail plans still interrupt it immediately.
  const nav = a.navigation;
  if (
    s.version === 'f9-encounter-v2' &&
    actorId === 'rival' &&
    nav &&
    nav.holdUntil > s.tick &&
    a.hp > 25 &&
    near > 3 &&
    !currentAgreement(s)
  ) {
    const keep = candidates.find(
      (c) =>
        c.key === nav.goalKey ||
        (c.key === 'move:continue' && a.intent.type === 'move'),
    );
    if (keep && (a.path.length || a.searching || a.extraction)) {
      const urgent = candidates.filter(
        (c) =>
          c.action.type === 'consume' &&
          a.bag.some(
            (i) =>
              i.uid === (c.action as { uid: string }).uid &&
              ((ITEM_PROPERTIES[i.kind].use?.stat === 'water' &&
                a.water < 30) ||
                (ITEM_PROPERTIES[i.kind].use?.stat === 'hp' && a.hp < 45)),
          ),
      );
      candidates.splice(0, candidates.length, keep, ...urgent);
    }
  }
  const payload = {
    observation,
    candidates,
    sessionId: s.sessionId,
    profile: s.profile,
    ...(s.mail ? { socialRevision: s.mail.revision } : {}),
  };
  const id =
    s.sessionId + ':' + actorId + ':' + s.tick + ':' + fingerprint(payload);
  for (const candidate of candidates) candidate.id = id + '/' + candidate.key;
  return {
    schema: 'f9-encounter-request-v1',
    id,
    sessionId: s.sessionId,
    actorId,
    tick: s.tick,
    observation,
    candidates,
    ...(s.mail ? { socialRevision: s.mail.revision } : {}),
  };
}
const interrupt = (a: Actor) => {
  a.searching = null;
  a.searchTicks = 0;
  a.extraction = 0;
};
function setIntent(s: Encounter, a: Actor, intent: Intent, label: string) {
  const sameSearch =
    intent.type === 'search' &&
    a.intent.type === 'search' &&
    intent.cacheId === a.intent.cacheId;
  const sameExit = intent.type === 'extract' && a.intent.type === 'extract';
  if (!sameSearch && !sameExit) interrupt(a);
  a.intent = structuredClone(intent);
  a.label = label;
  if (intent.type === 'move') a.path = pathTo(a, intent.to, s.world);
  else if (intent.type === 'search') {
    const cache = s.caches.find((row) => row.id === intent.cacheId);
    if (cache && distance(a, cache) > 1.3) a.path = pathTo(a, cache, s.world);
    else a.path = [];
  } else if (intent.type === 'extract' && distance(a, ELEVATOR) > 1.5)
    a.path = pathTo(a, ELEVATOR, s.world);
  else a.path = [];
}
export function applyEncounterReply(
  s: Encounter,
  request: EncounterRequest,
  reply: unknown,
): { state: Encounter; reason: string } {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply))
    return { state: s, reason: 'malformed' };
  const obj = reply as Record<string, unknown>;
  if (
    Object.keys(obj).sort().join(',') !==
      'candidateId,modelVersion,requestId' ||
    typeof obj.modelVersion !== 'string'
  )
    return { state: s, reason: 'malformed' };
  if (obj.requestId !== request.id || request.sessionId !== s.sessionId)
    return { state: s, reason: 'wrong-request' };
  if (s.mail && request.socialRevision !== s.mail.revision)
    return { state: s, reason: 'plan-changed' };
  if (s.tick - request.tick < 0 || s.tick - request.tick > 30)
    return { state: s, reason: 'expired' };
  const a = s.actors.find((row) => row.id === request.actorId);
  const candidate = request.candidates.find(
    (row) => row.id === obj.candidateId,
  );
  if (!a || a.status !== 'active' || !candidate)
    return { state: s, reason: 'invalid-choice' };
  // Rebuild legality from CURRENT private perception; never trust worker action parameters.
  const legal = encounterRequest(s, a.id).candidates.some(
    (row) =>
      row.key === candidate.key &&
      (candidate.action.type !== 'move' ||
        (walkable(candidate.action.to, 0.42, s.world) &&
          clearSight(a, candidate.action.to, s.world, 0.42, true))),
  );
  if (!legal) return { state: s, reason: 'no-longer-legal' };
  const next = structuredClone(s),
    body = next.actors.find((row) => row.id === a.id)!;
  if (next.version === 'f9-encounter-v2') {
    body.navigation ??= {
      goalKey: '',
      holdUntil: 0,
      stalled: 0,
      recoveries: 0,
      trail: [],
      blocked: [],
    };
    if (
      candidate.key !== body.navigation.goalKey &&
      candidate.key !== 'move:continue'
    ) {
      body.navigation.goalKey = candidate.key;
      body.navigation.holdUntil = s.tick + 90;
    }
  }
  setIntent(next, body, candidate.action, candidate.label);
  body.decisions++;
  return { state: next, reason: 'applied' };
}
export function playerCommand(
  s: Encounter,
  intent: Intent | { type: 'help' },
): Encounter {
  const next = structuredClone(s),
    a = next.actors[0];
  if (a.status !== 'active') return s;
  if (intent.type === 'help') {
    a.help = { kind: 'water', until: s.tick + 360 };
    say(next, '你：我需要一瓶水。', a.id);
  } else
    setIntent(
      next,
      a,
      intent,
      intent.type === 'extract' ? '返回电梯' : '行动中',
    );
  return next;
}
function move(s: Encounter, a: Point, to: Point, speed: number) {
  const d = distance(a, to);
  if (d < 0.03) return;
  const amount = Math.min(d, speed * STEP),
    dx = ((to.x - a.x) / d) * amount,
    dz = ((to.z - a.z) / d) * amount;
  if (walkable({ x: a.x + dx, z: a.z }, 0.35, s.world)) a.x += dx;
  if (walkable({ x: a.x, z: a.z + dz }, 0.35, s.world)) a.z += dz;
}
function collect(s: Encounter, a: Actor, c: Encounter['caches'][number]) {
  if (c.guardId && s.enemies.some((e) => e.id === c.guardId)) return;
  let took = false;
  const remaining: Item[] = [];
  for (const entry of c.contents) {
    const bag = putInBag(a.bag, unplaced(entry));
    if (!bag) {
      remaining.push(entry);
      continue;
    }
    a.bag = bag;
    took = true;
    effect(
      s,
      'pickup',
      a,
      a,
      itemCount(entry),
      a.id === 'player' ? '#c9d4a8' : '#d7b674',
      '+' + itemName(entry),
    );
    say(
      s,
      (a.id === 'player' ? '你' : PROFILES[s.profile].name) +
        '取得了' +
        itemName(entry),
      a.id,
    );
  }
  c.contents = remaining;
  c.opened = remaining.length === 0;
  if (took) c.openedBy = a.id;
  c.searched = true;
  if (took) {
    interrupt(a);
    a.intent = { type: 'wait' };
    a.path = [];
  } else {
    a.label = c.contents.length ? '行囊已满' : '容器是空的';
    interrupt(a);
    a.intent = { type: 'wait' };
  }
}
function perish(s: Encounter, a: Actor) {
  if (a.status !== 'active') return;
  a.status = 'dead';
  a.path = [];
  interrupt(a);
  if (a.bag.length) {
    s.caches.push({
      ...point(a),
      id: 'deathbag:' + ++s.serial,
      item: a.bag[0],
      contents: a.bag.map(unplaced),
      container: 'backpack',
      searched: false,
      opened: false,
      available: s.tick,
    });
    a.bag = [];
  }
  say(
    s,
    (a.id === 'player' ? '你' : PROFILES[s.profile].name) +
      '倒下了，行囊留在原地。',
    a.id,
  );
}
function hurt(s: Encounter, a: Actor, amount: number, source?: Actor) {
  a.hp = Math.max(0, a.hp - amount);
  a.hurtAt = s.tick;
  interrupt(a);
  effect(s, 'hit', a, a, amount, a.id === 'player' ? '#ff5c58' : '#eee5d3');
  if (source && !a.hostile.includes(source.id)) {
    a.hostile.push(source.id);
    a.relation = -1;
    if (a.id === 'rival' && s.mail)
      for (const c of s.mail.agreements)
        if (c.status === 'accepted')
          finishAgreement(s, c, 'cancelled', '玩家主动攻击，对方退出约定。');
    say(
      s,
      (a.id === 'player' ? '你' : PROFILES[s.profile].name) +
        '遭到了竞争者攻击。',
      a.id,
    );
  }
  if (a.hp <= 0) perish(s, a);
}
export function stepEncounter(
  s: Encounter,
  input: Point = { x: 0, z: 0 },
): Encounter {
  const n = structuredClone(s);
  n.tick++;
  advanceMail(n);
  n.effects = n.effects.filter((row) => n.tick - row.tick < 42);
  // Rotate simultaneous pickup/search priority, avoiding permanent player-first bias.
  const actors = n.tick % 2 ? n.actors : [...n.actors].reverse();
  for (const a of actors) {
    if (a.status !== 'active') continue;
    const manual = a.id === 'player' && (input.x !== 0 || input.z !== 0);
    const before = point(a);
    if (manual) {
      const len = Math.hypot(input.x, input.z);
      a.path = [];
      interrupt(a);
      a.intent = { type: 'wait' };
      move(
        n,
        a,
        { x: a.x + input.x / len, z: a.z + input.z / len },
        3.8 * foodSpeed(a.food),
      );
    } else if (a.path.length) {
      move(n, a, a.path[0], 3.8 * foodSpeed(a.food));
      if (distance(a, a.path[0]) < 0.12) a.path.shift();
    }
    const moving = distance(before, a) > 0.001;
    if (n.version === 'f9-encounter-v2' && a.id === 'rival') {
      const nav = (a.navigation ??= {
        goalKey: '',
        holdUntil: 0,
        stalled: 0,
        recoveries: 0,
        trail: [],
        blocked: [],
      });
      if (n.tick % 15 === 0)
        nav.trail = [...nav.trail, { ...point(a), tick: n.tick }].slice(-40);
      nav.stalled = a.path.length && !moving ? nav.stalled + 1 : 0;
      nav.blocked = nav.blocked.filter((p) => p.until > n.tick);
      if (nav.stalled >= 30) {
        nav.blocked.push({ ...a.path[0], until: n.tick + 300 });
        nav.holdUntil = 0;
        nav.stalled = 0;
        nav.recoveries++;
        a.path = [];
        a.intent = { type: 'wait' };
        interrupt(a);
        a.label = '路径受阻，重新规划';
        say(n, '放弃受阻路径，尝试其他方向。', a.id);
      }
    }
    if (moving) a.facing = Math.atan2(a.x - before.x, a.z - before.z);
    a.food = Math.max(0, a.food - 0.14 * STEP);
    a.water = Math.max(0, a.water - (0.2 + (moving ? 0.11 : 0)) * STEP);
    if (a.food === 0 || a.water === 0) a.hp = Math.max(0, a.hp - 0.8 * STEP);
    if (a.hp <= 0) {
      perish(n, a);
      continue;
    }
    a.fog = revealFog(a, a.fog, n.world, 11);
    const intent = a.intent;
    if (intent.type === 'trade') {
      if (!performMailTrade(n, a, intent))
        a.label = '交换条件不满足，未扣除任何物品';
      a.intent = { type: 'wait' };
    }
    if (intent.type === 'consume') {
      const entry = a.bag.find((row) => row.uid === intent.uid),
        use = entry && ITEM_PROPERTIES[entry.kind].use;
      if (entry && use && a[use.stat] < 100) {
        const gain = Math.min(use.gain, 100 - a[use.stat]);
        a[use.stat] += gain;
        a.bag = a.bag.filter((row) => row.uid !== entry.uid);
        say(
          n,
          (a.id === 'player' ? '你' : PROFILES[n.profile].name) +
            '使用了' +
            itemName(entry),
          a.id,
        );
        effect(
          n,
          'pickup',
          a,
          a,
          gain,
          '#95ccb3',
          '+' +
            Math.round(gain) +
            (use.stat === 'water'
              ? ' 饮水'
              : use.stat === 'food'
                ? ' 饱食'
                : ' 精神'),
        );
      }
      a.intent = { type: 'wait' };
    }
    if (intent.type === 'discard') {
      const entry = a.bag.find((row) => row.uid === intent.uid);
      if (entry) {
        n.caches.push({
          ...point(a),
          id: 'discard:' + ++n.serial,
          item: entry,
          contents: [unplaced(entry)],
          container: 'loose',
          searched: true,
          opened: false,
          available: n.tick + 60,
        });
        a.bag = a.bag.filter((row) => row.uid !== entry.uid);
      }
      a.intent = { type: 'wait' };
    }
    if (intent.type === 'give') {
      const entry = a.bag.find((row) => row.uid === intent.uid),
        recipient = n.actors.find(
          (row) => row.id === intent.actorId && row.status === 'active',
        );
      const bag =
        entry &&
        recipient &&
        distance(a, recipient) < 2 &&
        clearSight(a, recipient, n.world)
          ? putInBag(recipient.bag, unplaced(entry))
          : null;
      if (bag && entry && recipient) {
        recipient.bag = bag;
        a.bag = a.bag.filter((row) => row.uid !== entry.uid);
        recipient.relation = Math.min(1, recipient.relation + 0.5);
        recipient.help = null;
        say(
          n,
          (a.id === 'player' ? '你' : PROFILES[n.profile].name) +
            '给了对方' +
            itemName(entry),
          a.id,
        );
        effect(
          n,
          'pickup',
          a,
          recipient,
          1,
          '#9bcca9',
          '收到' + itemName(entry),
        );
      }
      a.intent = { type: 'wait' };
    }
    if (intent.type === 'search') {
      const c = n.caches.find(
        (row) =>
          row.id === intent.cacheId &&
          !row.opened &&
          (row.contents.length || !row.searched) &&
          row.available <= n.tick,
      );
      if (
        !c ||
        !actorVisible(n, a, c) ||
        (c.guardId && n.enemies.some((e) => e.id === c.guardId))
      ) {
        a.intent = { type: 'wait' };
        interrupt(a);
      } else if (distance(a, c) <= 1.4 && !moving) {
        const owner = n.actors.some(
          (other) => other.id !== a.id && other.searching === c.id,
        );
        if (!owner) {
          a.searching = c.id;
          a.searchTicks++;
          if (a.searchTicks >= searchDuration(c, 100)) collect(n, a, c);
        } else {
          a.label = '容器正在被翻找';
          a.searchTicks = 0;
        }
      }
    }
    if (intent.type === 'assist') {
      const enemy = n.enemies.find(
        (e) => e.id === intent.enemyId && actorVisible(n, a, e),
      );
      if (!enemy) {
        a.intent = { type: 'wait' };
        a.path = [];
      } else if (
        distance(a, enemy) > 5.5 &&
        (n.tick % 15 === 0 || !a.path.length)
      )
        a.path = pathTo(a, enemy, n.world);
      else if (distance(a, enemy) <= 5.5) a.path = [];
    }
    if (intent.type === 'engage') {
      const target = n.actors.find(
        (row) => row.id === intent.actorId && row.status === 'active',
      );
      if (!target || !actorVisible(n, a, target)) {
        a.intent = { type: 'wait' };
        a.path = [];
      } else if (
        distance(a, target) > 6.5 &&
        (n.tick % 15 === 0 || !a.path.length)
      )
        a.path = pathTo(a, target, n.world);
      else if (distance(a, target) < 4) {
        const d = distance(a, target) || 1;
        move(
          n,
          a,
          { x: a.x + (a.x - target.x) / d, z: a.z + (a.z - target.z) / d },
          3.4 * foodSpeed(a.food),
        );
      }
    }
    if (intent.type === 'extract' && distance(a, ELEVATOR) < 1.5 && !moving) {
      a.extraction++;
      if (a.extraction >= 66) {
        a.status = 'extracted';
        say(
          n,
          (a.id === 'player' ? '你' : PROFILES[n.profile].name) +
            '带着物资返回了电梯。',
          a.id,
        );
      }
    }
    for (const c of n.caches)
      if (
        c.pickup === 'touch' &&
        c.contents.length &&
        c.available <= n.tick &&
        distance(a, c) < 0.85 &&
        actorVisible(n, a, c)
      )
        collect(n, a, c);
  }
  // A shared monster gets one movement/attack update, regardless of actor count.
  for (const enemy of n.enemies) {
    const targets = n.actors
      .filter(
        (a) =>
          a.status === 'active' &&
          distance(a, enemy) <= (enemy.sight || 9) &&
          clearSight(enemy, a, n.world),
      )
      .sort(
        (a, b) =>
          distance(enemy, a) - distance(enemy, b) || (a.id < b.id ? -1 : 1),
      );
    const target = targets[0];
    if (target) {
      enemy.awake = true;
      enemy.lastSeen = point(target);
      enemy.lastSeenTick = n.tick;
    }
    const memory =
      enemy.lastSeen && n.tick - (enemy.lastSeenTick ?? -100) <= 90;
    const to =
      target ||
      (memory
        ? enemy.lastSeen
        : enemy.pursuit === 'territorial'
          ? enemy.home
          : null);
    if (!target && !memory) enemy.awake = false;
    if (to && distance(enemy, to) > 0.7) {
      const route = clearSight(enemy, to, n.world, 0.35, true)
        ? [to]
        : pathTo(enemy, to, n.world);
      if (route[0])
        move(
          n,
          enemy,
          route[0],
          enemy.kind === 'runner' ? 2.35 : enemy.kind === 'boss' ? 0.82 : 1.5,
        );
    }
    if (target && distance(enemy, target) < 0.9 && enemy.nextAttack <= n.tick) {
      hurt(
        n,
        target,
        enemy.kind === 'boss' ? 18 : enemy.kind === 'brute' ? 14 : 5,
      );
      enemy.nextAttack = n.tick + 36;
    }
  }
  for (const a of actors) {
    if (a.status !== 'active') continue;
    for (const gear of a.equipment) {
      const stats = weaponStats(a, gear);
      if (!stats || (a.cooldowns[gear.item.uid] || 0) > n.tick) continue;
      const opponentId =
        a.intent.type === 'engage' ? a.intent.actorId : a.hostile[0];
      const opponent = n.actors.find(
        (row) =>
          row.id === opponentId &&
          row.status === 'active' &&
          actorVisible(n, a, row) &&
          distance(a, row) <= stats.range,
      );
      const monster = n.enemies
        .filter(
          (row) =>
            row.hp > 0 &&
            actorVisible(n, a, row) &&
            distance(a, row) <= stats.range,
        )
        .sort((x, y) => distance(a, x) - distance(a, y))[0];
      const target = opponent || monster;
      if (!target) continue;
      a.cooldowns[gear.item.uid] = n.tick + stats.interval;
      effect(
        n,
        'beam',
        a,
        target,
        0,
        gear.item.kind === 'phone' ? '#86c4d5' : '#dbc79a',
      );
      if (opponent) hurt(n, opponent, stats.damage, a);
      else if (monster) {
        monster.hp -= stats.damage;
        monster.hitAt = n.tick;
        effect(n, 'hit', monster, monster, stats.damage, '#fff2d5');
        if (monster.hp <= 0) {
          const units = monster.kind === 'boss' ? 6 : 1;
          const contents: Item[] = Array.from({ length: units }, () => ({
            ...ITEMS['lift-material'],
            quality: 'normal',
            uid: n.sessionId + ':brain:' + ++n.serial,
          }));
          n.caches.push({
            ...point(monster),
            id: 'drop:' + ++n.serial,
            item: contents[0],
            contents,
            container: 'loose',
            searched: true,
            opened: false,
            available: n.tick,
            pickup: 'touch',
          });
          say(n, '异形倒下，现场留下了脑浆。', undefined, monster);
        }
      }
    }
  }
  n.enemies = n.enemies.filter((row) => row.hp > 0);
  advanceMail(n);
  // Finite concurrency, deterministic named stream. Ambushes respect minimum 5 m from BOTH actors.
  if (n.tick % 450 === 0 && n.enemies.length < 7) {
    const random = randomStream(n.seed, 'f9-encounter-wave:' + n.tick);
    for (let attempt = 0; attempt < 40; attempt++) {
      const spawn = { x: 36 + random() * 27, z: 48 + random() * 25 };
      if (
        !walkable(spawn, 0.4, n.world) ||
        n.actors.some((a) => a.status === 'active' && distance(a, spawn) < 5)
      )
        continue;
      n.enemies.push({
        ...spawn,
        id: 'wave:' + ++n.serial,
        kind: 'crawler',
        hp: 62,
        maxHp: 62,
        pursuit: 'ambush',
        home: spawn,
        sight: 9,
        awake: false,
        nextAttack: n.tick,
        hitAt: -100,
        windup: 0,
        aim: null,
      });
      break;
    }
  }
  return n;
}
export function ownedItemIds(s: Encounter) {
  return [
    ...s.actors.flatMap((a) => [
      ...a.bag.flatMap(itemIds),
      ...a.equipment.flatMap((e) => itemIds(e.item)),
    ]),
    ...s.caches.flatMap((c) => c.contents.flatMap(itemIds)),
  ];
}
