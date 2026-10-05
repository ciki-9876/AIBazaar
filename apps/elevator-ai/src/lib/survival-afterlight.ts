import { itemUnits } from './survival-stacks.ts';
import {
  createSurvival,
  enemyLimit,
  ITEMS,
  ELEVATOR,
  adjacent,
  weaponStats,
  distance,
  type SurvivalState,
  type Item,
  type Cache,
} from './survival-room.ts';
import { revealFog, ROOM, walkable } from './survival-world.ts';

export type Afterlight = {
  phase:
    | 'recover-opening'
    | 'dormant'
    | 'quiet'
    | 'home'
    | 'question'
    | 'safe'
    | 'rule'
    | 'offer-food'
    | 'serve-food'
    | 'eat-food'
    | 'depart'
    | 'explore'
    | 'report'
    | 'equip-module'
    | 'upgrade-goal'
    | 'ascend'
    | 'branches'
    | 'complete';
  tick: number;
  safeChoice: 'pending' | 'protected' | 'skipped';
  mapSeen: boolean;
  needsSeen: boolean;
  breadGiven: boolean;
  breadEaten: boolean;
  moduleSeen: boolean;
  moduleDeferred: boolean;
  linked: boolean;
  tracesSeen: boolean;
  freedomSeen: boolean;
  hint: string;
  hintUntil: number;
  collected: Item[];
  used: Item[];
  departureOwned: string[];
  returnCount: number;
  equipmentTaught: boolean;
  waterFound: boolean;
  failedReturn: boolean;
};
export const createAfterlight = (): Afterlight => ({
  phase: 'dormant',
  tick: 0,
  safeChoice: 'pending',
  mapSeen: false,
  needsSeen: false,
  breadGiven: false,
  breadEaten: false,
  moduleSeen: false,
  moduleDeferred: false,
  linked: false,
  tracesSeen: false,
  freedomSeen: false,
  hint: '',
  hintUntil: 0,
  collected: [],
  used: [],
  departureOwned: [],
  returnCount: 0,
  equipmentTaught: false,
  waterFound: false,
  failedReturn: false,
});
export const MAINTENANCE_SEED = 92621;
export const MAINTENANCE_POINTS = {
  loose: { x: 44.5, z: 69 },
  cabinet: { x: 52, z: 64 },
  traces: { x: 48.5, z: 51 },
  deep: { x: 60, z: 46 },
};
const owned = (r: SurvivalState) =>
  itemUnits([...r.bag, ...r.safe, ...r.equipment.map((e) => e.item)]);
export function twoSidedAmplifier(r: Pick<SurvivalState, 'equipment'>) {
  return r.equipment.some(
    (m) =>
      m.item.kind === 'capacitor' &&
      r.equipment.filter((w) => adjacent(m, w) && weaponStats(r, w)).length ===
        2,
  );
}
/** One seeded floor for this chapter. Re-entry resumes its caches, fog and enemies. */
export function maintenanceRoom(): SurvivalState {
  const r = createSurvival(MAINTENANCE_SEED);
  r.floor = 2;
  r.world = {
    ...r.world,
    theme: 'maintenance',
    version: 5,
    bounds: { minX: 16.5, maxX: 80.5, minZ: 18, maxZ: 78 },
    modules: [],
    obstacles: [
      { x: 39, z: 64, w: 4.2, d: 4.2, type: 'tank' },
      { x: 61, z: 68, w: 5, d: 2.8, type: 'pump' },
      { x: 34, z: 46, w: 4.2, d: 4.2, type: 'tank' },
      { x: 39, z: 39, w: 4.2, d: 4.2, type: 'tank' },
      { x: 69, z: 49, w: 3.4, d: 1.6, type: 'shelf' },
      { x: 56, z: 31, w: 5, d: 2.8, type: 'pump' },
      { x: 27, z: 59, w: 5.5, d: 1.6, type: 'shelf' },
      { x: 43, z: 58, w: 8, d: 0.7, type: 'low-wall' },
      { x: 39.4, z: 54.8, w: 0.7, d: 6, type: 'low-wall' },
      { x: 56.5, z: 56, w: 0.7, d: 8, type: 'low-wall' },
      { x: 60, z: 52.4, w: 7, d: 0.7, type: 'low-wall' },
      { x: 65, z: 61, w: 6, d: 0.7, type: 'low-wall' },
      { x: 46, z: 42, w: 0.7, d: 8, type: 'low-wall' },
      { x: 49.6, z: 38.4, w: 7, d: 0.7, type: 'low-wall' },
      { x: 29, z: 32, w: 7, d: 0.7, type: 'low-wall' },
      { x: 71, z: 30, w: 0.7, d: 7, type: 'low-wall' },
      { x: 33, z: 70, w: 3, d: 0.7, type: 'low-wall' },
    ],
    gates: r.world.gates.filter(
      (p) => p.x > 19 && p.x < 78 && p.z > 21 && p.z < 70,
    ),
  };
  const make = (
    id: string,
    p: { x: number; z: number },
    kinds: (keyof typeof ITEMS)[],
    container: Cache['container'],
  ): Cache => ({
    id,
    ...p,
    item: { ...ITEMS[kinds[0]], uid: `maintenance-${id}-0` },
    contents: kinds.map((k, i) => ({
      ...ITEMS[k],
      uid: `maintenance-${id}-${i}`,
    })),
    container,
    manualEquip: true,
    searched: false,
    opened: false,
    available: 0,
  });
  r.caches = [
    make('loose', MAINTENANCE_POINTS.loose, ['scrap'], 'loose'),
    make(
      'cabinet',
      MAINTENANCE_POINTS.cabinet,
      ['water', 'capacitor'],
      'locker',
    ),
    make('deep', MAINTENANCE_POINTS.deep, ['water', 'scrap', 'food'], 'locker'),
  ];
  r.caches.forEach((c) => {
    if (c.container !== 'loose')
      r.world.obstacles.push({
        x: c.x,
        z: c.z - 0.9,
        w: 1.4,
        d: 0.9,
        type: 'container',
      });
  });
  r.enemies = [
    {
      id: 'maintenance-guardian',
      kind: 'boss',
      x: 61,
      z: 43,
      hp: 480,
      maxHp: 480,
      nextAttack: 0,
      awake: false,
      hitAt: -100,
      windup: 0,
      aim: null,
    },
  ];
  r.nextWave = 300;
  r.fog = revealFog(
    ELEVATOR,
    {
      explored: Array(ROOM.width * ROOM.depth).fill(0),
      visible: Array(ROOM.width * ROOM.depth).fill(0),
    },
    r.world,
  );
  r.notice = '';
  return r;
}
export function stepAfterlightHome(
  a: Afterlight,
  r: SurvivalState,
): Afterlight {
  const next = { ...a, tick: a.tick + 1 };
  const timed: Partial<
    Record<Afterlight['phase'], [number, Afterlight['phase']]>
  > = {
    quiet: [90, 'home'],
    home: [150, 'question'],
    question: [180, 'safe'],
    rule: [150, 'offer-food'],
    'offer-food': [120, 'serve-food'],
  };
  if (a.phase === 'dormant') return { ...next, phase: 'quiet', tick: 0 };
  const beat = timed[a.phase];
  if (beat && next.tick >= beat[0]) return { ...next, phase: beat[1], tick: 0 };
  if (a.phase === 'safe' && r.safe.length)
    return { ...next, phase: 'rule', safeChoice: 'protected', tick: 0 };
  return next;
}
export function afterlightLine(a: Afterlight) {
  const lines: Partial<Record<Afterlight['phase'], string>> = {
    home: '你可以叫这里“家”。只要这扇门还认得你，就有回来的路。',
    question: '先活过今天。上面有人，比我知道得多。',
    safe: '这东西先留着。至于留在哪里，由你决定。',
    rule: '精神力归零，普通背包会留在原地。活着回去，还能找回来。已装备物品和安全容器保留。',
    'offer-food': '你饿了吧，吃点儿',
    'serve-food': '你饿了吧，吃点儿',
    'eat-food': '吃吧。至少它不是梦里的面包。',
    depart: '再找点水。二层的维保廊，应该还有。',
    report: '看看这次带回了什么。',
    'equip-module': '把找到的增幅器拖到装备栏，紧贴一件武器。',
    'upgrade-goal': '想去更高处，就帮我找齐这些零件。',
    ascend: '上面是另一个世界。踏进去，就回不了低层了。',
    branches: '这次，可不是我替你做的决定。',
    complete: '准备好了，随时出发。',
  };
  return lines[a.phase] || '';
}
export function stepAfterlightField(
  a: Afterlight,
  before: SurvivalState,
  room: SurvivalState,
): { lesson: Afterlight; room: SurvivalState } {
  let n = {
    ...a,
    tick: a.tick + 1,
    collected: [...a.collected],
    used: [...a.used],
  };
  const hint = (text: string) => {
    n = { ...n, hint: text, hintUntil: room.tick + 180 };
  };
  const priorContents = itemUnits(before.caches.flatMap((c) => c.contents));
  for (const item of owned(room))
    if (
      priorContents.some((i) => i.uid === item.uid) &&
      !n.collected.some((i) => i.uid === item.uid)
    )
      n.collected.push(item);
  for (const e of room.effects)
    if (
      e.kind === 'heal' &&
      e.itemUid &&
      !n.used.some((i) => i.uid === e.itemUid)
    ) {
      const item = before.bag.find((i) => i.uid === e.itemUid);
      if (item) n.used.push(item);
    }
  if (!n.mapSeen && distance(room.player, ELEVATOR) > 7) {
    n.mapSeen = true;
    hint('门的位置不会忘。');
  }
  const live =
    room.enemies.some((e) => e.kind !== 'boss') || room.spawns.length > 0;
  if (n.collected.some((i) => i.kind === 'water')) n.waterFound = true;
  if (!n.moduleSeen && owned(room).some((i) => i.kind === 'capacitor'))
    n.moduleSeen = true;
  if (twoSidedAmplifier(room) && !n.linked) {
    n.linked = true;
  }
  if (!n.tracesSeen && distance(room.player, MAINTENANCE_POINTS.traces) < 8) {
    n.tracesSeen = true;
    hint('空箱子……还有脚印。这里有别人？');
  }
  if (!n.freedomSeen && (n.linked || n.tracesSeen || room.tick > 1800)) {
    n.freedomSeen = true;
    hint('带回来，才算你的。');
  }
  // First two packs use the same creature. Their telegraph is inside the player's
  // actual sight radius; the near-door third remains a quiet refuge.
  if (
    room.floor === 2 &&
    room.wave < 2 &&
    distance(room.player, ELEVATOR) > 7 &&
    room.tick >= room.nextWave &&
    (room.wave === 0 || (!live && (n.linked || room.tick >= 2100)))
  ) {
    const spawns = [...room.spawns];
    let serial = room.serial;
    for (
      let i = 0;
      i < 4 && room.enemies.length + spawns.length < enemyLimit(room);
      i++
    ) {
      const p = { x: room.player.x + (i - 1.5) * 2, z: room.player.z - 8 };
      if (walkable(p, 0.4, room.world))
        spawns.push({
          ...p,
          id: serial++,
          kind: 'crawler',
          pursuit: 'ambush',
          at: room.tick + 75 + i * 6,
        });
    }
    if (spawns.length > room.spawns.length) {
      room = {
        ...room,
        serial,
        spawns,
        wave: room.wave + 1,
        nextWave: room.tick + 900,
      };
      if (room.wave === 1) hint('跑起来，手上的东西会处理剩下的。');
    }
  }
  return { lesson: n, room };
}
export function afterlightSettlement(a: Afterlight, r: SurvivalState) {
  const all = owned(r);
  if (a.failedReturn)
    return r.lost.map((item) => ({ ...item, location: '遗失' }));
  return a.collected
    .filter((i) => !a.departureOwned.includes(i.uid))
    .map((item) => ({
      ...item,
      location: itemUnits(r.safe).some((i) => i.uid === item.uid)
        ? '安全容器'
        : all.some((i) => i.uid === item.uid)
          ? '带回'
          : a.used.some((i) => i.uid === item.uid)
            ? '途中使用'
            : '未带回',
    }));
}
export const departureIdentities = (r: SurvivalState) =>
  owned(r).map((i) => i.uid);
