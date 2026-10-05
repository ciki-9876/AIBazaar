import {
  itemCount,
  itemName,
  itemIds,
  withIds,
  type BrainQuality,
} from './survival-stacks.ts';
import { hasTrait, ITEM_PROPERTIES } from './survival-item-traits.ts';
import { transferItem, type Transfer } from './survival-transfer.ts';
import { activeCaches } from './survival-cache-lifecycle.ts';
import {
  isEquipment,
  adjacent,
  fits,
  firstFit,
} from './survival-equipment-rules.ts';
export {
  EQUIPMENT_SIZE,
  isEquipment,
  adjacent,
  fits,
  firstFit,
} from './survival-equipment-rules.ts';
import {
  putInBag,
  packBag,
  unplaced,
  warehouseRows,
} from './survival-cargo.ts';
import {
  PLAYER_RADIUS,
  LIFT,
  DEPARTURE_TICKS,
  departureDistance,
  insideLift,
} from './survival-lift.ts';
import {
  ROOM,
  ELEVATOR,
  DEFAULT_WORLD,
  generateWorld,
  walkable,
  clearSight,
  cellKey,
  center,
  flood,
  revealFog,
  visionRange,
  isVisible,
  type RoomWorld,
  type Fog,
} from './survival-world.ts';
export {
  ROOM,
  ELEVATOR,
  OBSTACLES,
  GATES,
  walkable,
  clearSight,
  isVisible,
} from './survival-world.ts';
// This slice owns its world. Nothing here reads or migrates adventure saves.
export const STEP = 1 / 30;
export const foodSpeed = (food: number) =>
  0.5 + Math.max(0, Math.min(50, food)) / 100;
export const thirstDistortion = (water: number) =>
  Math.max(0, Math.min(1, (50 - water) / 50));
export const BAG_SIZE = 16;
export const SAFE_SIZE = 1;
export type Point = { x: number; z: number };
export type ItemKind =
  | 'phone'
  | 'flashlight'
  | 'energy-core'
  | 'lift-material'
  | 'nail'
  | 'laser'
  | 'capacitor'
  | 'coolant'
  | 'scrap'
  | 'coil'
  | 'blade'
  | 'water'
  | 'food'
  | 'bread'
  | 'medicine'
  | 'golden'
  | 'core';
export type Item = {
  stack?: string[];
  quality?: BrainQuality;
  uid: string;
  kind: ItemKind;
  name: string;
  size: number;
  value: number;
  slot?: number;
  rotated?: boolean;
};
export const ITEMS: Record<ItemKind, Omit<Item, 'uid'>> = {
  phone: { kind: 'phone', name: '手机', size: 1, value: 0 },
  flashlight: { kind: 'flashlight', name: '电筒', size: 2, value: 0 },
  'energy-core': {
    kind: 'energy-core',
    name: '能源核心（电容）',
    size: 1,
    value: 0,
  },
  'lift-material': { kind: 'lift-material', name: '脑浆', size: 1, value: 0 },
  nail: { kind: 'nail', name: '破门钉枪', size: 2, value: 12 },
  laser: { kind: 'laser', name: '棱镜切割器', size: 3, value: 36 },
  capacitor: { kind: 'capacitor', name: '增幅模块', size: 1, value: 14 },
  coolant: { kind: 'coolant', name: '冷却模块', size: 1, value: 14 },
  scrap: { kind: 'scrap', name: '机械零件', size: 1, value: 8 },
  coil: { kind: 'coil', name: '电弧线圈', size: 2, value: 16 },
  blade: { kind: 'blade', name: '回旋锯环', size: 2, value: 20 },
  water: { kind: 'water', name: '净水瓶', size: 1, value: 3 },
  bread: { kind: 'bread', name: '面包', size: 1, value: 0 },
  food: { kind: 'food', name: '压缩口粮', size: 1, value: 3 },
  medicine: { kind: 'medicine', name: '急救包', size: 1, value: 5 },
  golden: { kind: 'golden', name: '黄金通行证', size: 1, value: 0 },
  core: { kind: 'core', name: '净水机芯', size: 2, value: 48 },
};
export type Cache = Point & {
  id: string;
  // Appearance/label metadata only; contents is the authoritative owned loot.
  item: Item;
  contents: Item[];
  container: 'loose' | 'crate' | 'locker' | 'backpack';
  searched: boolean;
  opened: boolean;
  available: number;
  loose?: boolean;
  pickup?: 'touch';
  manualEquip?: boolean;
  manualPickup?: boolean;
};
export type EnemyKind = 'crawler' | 'runner' | 'brute' | 'boss';
export type Enemy = Point & {
  level?: number;
  pursuit?: 'territorial' | 'ambush';
  home?: Point;
  lastSeen?: Point;
  lastSeenTick?: number;
  sight?: number;
  id: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  nextAttack: number;
  awake: boolean;
  hitAt: number;
  windup: number;
  aim: Point | null;
};
export type Effect = {
  id: number;
  kind:
    | 'shot'
    | 'arc'
    | 'blade'
    | 'laser'
    | 'phone-beam'
    | 'torch-beam'
    | 'hit'
    | 'heal'
    | 'death'
    | 'pickup';
  label?: string;
  itemUid?: string;
  stack?: number;
  from: Point;
  to: Point;
  amount: number;
  tick: number;
};
export type Spawn = Point & {
  id: number;
  at: number;
  kind: EnemyKind;
  pursuit?: 'territorial' | 'ambush';
};
export type SurvivalState = {
  seasonRules?: boolean;
  lootBudget?: number;
  forbidGolden?: boolean;
  rescueReserved?: string[];
  resting?: boolean;
  floor?: number;
  liftLevel?: number;
  liftExperience?: number;
  liftParts?: number;
  warehouse?: Item[];
  liftLightOn?: boolean;
  seed: number;
  world: RoomWorld;
  fog: Fog;
  equipment: Equipment[];
  rng: number;
  tick: number;
  serial: number;
  status: 'ready' | 'departing' | 'running' | 'extracted' | 'dead';
  departureTick: number;
  player: Point & {
    hp: number;
    food: number;
    water: number;
    energy: number;
    hurtUntil: number;
    facing: number;
  };
  bag: Item[];
  safe: Item[];
  lost: Item[];
  caches: Cache[];
  enemies: Enemy[];
  spawns: Spawn[];
  effects: Effect[];
  path: Point[];
  searching: string | null;
  searchTicks: number;
  extraction: number;
  leftLift: boolean;
  nextWave: number;
  wave: number;
  kills: number;
  bossDefeated: boolean;
  damage: number;
  cooldowns: Record<string, number>;
  notice: string;
  noticeUntil: number;
};
export type SurvivalInput = {
  x?: number;
  z?: number;
  interact?: boolean;
  cache?: string;
};
export type SurvivalAction =
  | Transfer
  | { type: 'start' }
  | { type: 'move'; to: Point }
  | { type: 'extract' }
  | { type: 'protect'; uid: string }
  | { type: 'unprotect'; uid: string }
  | { type: 'discard'; uid: string }
  | { type: 'drop'; uid: string; quantity?: number }
  | { type: 'destroy'; uid: string }
  | { type: 'consume'; uid: string }
  | { type: 'equip'; uid: string; slot: number }
  | { type: 'unequip'; uid: string }
  | { type: 'cargo-move'; uid: string; slot: number; rotated: boolean }
  | { type: 'cargo-pack' }
  | { type: 'warehouse-pack' };
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const capacity = (items: Item[]) =>
  items.reduce((n, item) => n + item.size, 0);
export const cargoValue = (items: Item[]) =>
  items.reduce((n, item) => n + item.value, 0);
export const hasWeapon = (s: SurvivalState, kind: ItemKind) =>
  s.equipment.some((e) => e.item.kind === kind);
export type Equipment = { item: Item; slot: number };
export const enemyLimit = (s: Pick<SurvivalState, 'floor'>) =>
  s.floor === 1 ? 3 : s.floor === 2 ? 16 : s.floor === 3 ? 22 : 24;
export function weaponStats(
  s: Pick<SurvivalState, 'equipment'>,
  gear: Equipment,
) {
  const base = (
    {
      nail: [23, 23, 7],
      coil: [22, 60, 4.8],
      blade: [32, 36, 2.8],
      laser: [58, 90, 11],
      phone: [13, 69, 9],
      flashlight: [21, 87, 9],
    } as Record<string, number[]>
  )[gear.item.kind];
  if (!base) return null;
  const neighbors = s.equipment.filter((e) => e !== gear && adjacent(e, gear));
  const amp = neighbors.filter((e) => e.item.kind === 'capacitor').length;
  const cooling = neighbors.filter((e) => e.item.kind === 'coolant').length;
  return {
    damage: Math.round(base[0] * (1 + 0.25 * amp)),
    interval: Math.max(1, Math.round(base[1] / (1 + 0.2 * cooling))),
    range: base[2],
    amp,
    cooling,
  };
}
function arrangeEquipment(
  state: SurvivalState,
  action: Extract<SurvivalAction, { type: 'equip' | 'unequip' }>,
): SurvivalState {
  const placed = state.equipment.find((e) => e.item.uid === action.uid);
  const item = placed?.item || state.bag.find((i) => i.uid === action.uid);
  if (!item || !isEquipment(item)) return state;
  if (action.type === 'unequip') {
    const bag = putInBag(state.bag, unplaced(item));
    if (!placed || !bag) return state;
    return {
      ...state,
      equipment: state.equipment.filter((e) => e.item.uid !== item.uid),
      bag,
      notice: `${item.name}已卸入背包，停止生效。`,
      noticeUntil: state.tick + 120,
    };
  }
  if (!fits(state.equipment, item.size, action.slot, item.uid)) return state;
  const equipment = [
    ...state.equipment.filter((e) => e.item.uid !== item.uid),
    { item: unplaced(item), slot: action.slot },
  ].sort((a, b) => a.slot - b.slot);
  return {
    ...state,
    equipment,
    bag: state.bag.filter((i) => i.uid !== item.uid),
    notice: '装备布局已更新。紧贴的相邻模块立即生效。',
    noticeUntil: state.tick + 120,
  };
}
export function pathTo(
  from: Point,
  target: Point,
  world: RoomWorld = DEFAULT_WORLD,
): Point[] {
  if (!walkable(target, PLAYER_RADIUS, world)) return [];
  if (clearSight(from, target, world, PLAYER_RADIUS + 0.02, true))
    return [{ ...target }];
  const field = flood(target, world),
    path: Point[] = [];
  let key = cellKey(from);
  if (field[key] < 0) return [];
  for (let i = 0; i < ROOM.width * ROOM.depth && field[key] > 0; i++) {
    const p = center(key);
    const next = [key - ROOM.width, key - 1, key + 1, key + ROOM.width].find(
      (k) =>
        k >= 0 &&
        k < field.length &&
        field[k] === field[key] - 1 &&
        distance(p, center(k)) < 1.1,
    );
    if (next === undefined) break;
    key = next;
    path.push(center(key));
  }
  path.push({ ...target });
  return path;
}
export function createSurvival(seed = 92601): SurvivalState {
  const cache = (
    id: string,
    kind: ItemKind,
    x: number,
    z: number,
    container: Cache['container'] = 'loose',
    extras: ItemKind[] = [],
  ): Cache => ({
    id,
    x,
    z,
    item: { ...ITEMS[kind], uid: `room-${seed}-${id}` },
    contents: [kind, ...extras].map((k, i) => ({
      ...ITEMS[k],
      uid: i ? `room-${seed}-${id}-${i}` : `room-${seed}-${id}`,
    })),
    container,
    searched: false,
    opened: false,
    available: 0,
  });
  const world = generateWorld(seed);
  const size = ROOM.width * ROOM.depth;
  let fog = revealFog(
    ELEVATOR,
    { explored: Array(size).fill(0), visible: Array(size).fill(0) },
    world,
  );
  const caches: Cache[] = [
    cache('coil', 'coil', 48, 69),
    cache('blade', 'blade', 54, 70, 'crate', ['scrap', 'food']),
    cache('laser', 'laser', 48, 60),
    cache('coolant', 'coolant', 60, 62, 'locker', ['water', 'medicine']),
    cache('water-entry', 'water', 42, 70, 'locker', ['food', 'medicine']),
  ];
  world.modules.forEach((m, i) => {
    if (i === 13 || i === 14) return;
    const kind: ItemKind = (['scrap', 'water', 'food', 'medicine'] as const)[
      i % 4
    ];
    caches.push(
      cache(m.id + '-supply', kind, m.x + 12, m.z + 10, 'locker', [
        'water',
        'food',
      ]),
    );
    caches.push(
      cache(m.id + '-parts', 'scrap', m.x + 2, m.z + 16, 'crate', [
        'scrap',
        'scrap',
      ]),
    );
  });
  for (const c of caches)
    if (c.container !== 'loose')
      world.obstacles.push({
        x: c.x,
        z: c.z - 0.9,
        w: 1.4,
        d: 0.9,
        type: 'container',
      });
  fog = revealFog(ELEVATOR, fog, world);
  return {
    seed,
    world,
    fog,
    equipment: [
      { slot: 0, item: { ...ITEMS.nail, uid: 'starter-nail' } },
      { slot: 2, item: { ...ITEMS.capacitor, uid: 'starter-capacitor' } },
    ],
    rng: seed >>> 0,
    tick: 0,
    serial: 1,
    status: 'ready',
    departureTick: 0,
    player: {
      ...ELEVATOR,
      hp: 100,
      food: 100,
      water: 100,
      energy: 100,
      hurtUntil: 0,
      facing: Math.PI,
    },
    bag: [],
    safe: [],
    lost: [],
    caches,
    enemies: [
      {
        id: 'warden',
        kind: 'boss',
        x: 60,
        z: 10,
        hp: 480,
        maxHp: 480,
        nextAttack: 0,
        awake: false,
        hitAt: -100,
        windup: 0,
        aim: null,
      },
    ],
    spawns: [],
    effects: [],
    path: [],
    searching: null,
    searchTicks: 0,
    extraction: 0,
    leftLift: false,
    nextWave: 240,
    wave: 0,
    kills: 0,
    bossDefeated: false,
    damage: 0,
    cooldowns: {},
    notice: '先找到电弧线圈，再决定是否深入。',
    noticeUntil: 180,
  };
}
export const cacheTitle = (cache: Cache) =>
  cache.container === 'crate'
    ? '设备箱'
    : cache.container === 'locker'
      ? '补给柜'
      : cache.item.name;
export const searchDuration = (cache: Cache, energy: number) =>
  cache.searched
    ? 1
    : Math.round(
        (cache.container === 'loose'
          ? 24
          : cache.container === 'crate'
            ? 90
            : 150) * (energy < 25 ? 1.7 : 1),
      );
function tell(s: SurvivalState, message: string) {
  s.notice = message;
  s.noticeUntil = s.tick + 100;
}
export function survivalAction(
  state: SurvivalState,
  action: SurvivalAction,
): SurvivalState {
  if (
    'uid' in action &&
    state.rescueReserved?.includes(action.uid) &&
    !['cargo-move'].includes(action.type)
  )
    return state;
  if ('uid' in action) {
    const item = [
      ...state.bag,
      ...state.safe,
      ...state.equipment.map((e) => e.item),
      ...(state.warehouse || []),
    ].find((i) => i.uid === action.uid);
    if (
      item?.kind === 'golden' &&
      ['destroy', 'protect', 'discard'].includes(action.type)
    )
      return state;
  }
  if (action.type === 'drop') {
    if (state.status !== 'running') return state;
    const item = [...state.bag, ...state.equipment.map((e) => e.item)].find(
      (i) => i.uid === action.uid,
    );
    const quantity = action.quantity ?? 1;
    if (
      !item ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > itemCount(item) ||
      (item.kind === 'golden' && insideLift(state.player, ELEVATOR))
    )
      return state;
    const candidates = [
      { x: state.player.x, z: state.player.z },
      ...Array.from({ length: 25 }, (_, i) => ({
        x: Math.floor(state.player.x) + (i % 5) - 1.5,
        z: Math.floor(state.player.z) + Math.floor(i / 5) - 1.5,
      })),
    ]
      .filter((p) => walkable(p, PLAYER_RADIUS, state.world))
      .sort(
        (a, b) =>
          distance(a, state.player) - distance(b, state.player) ||
          a.x - b.x ||
          a.z - b.z,
      );
    const at = candidates[0];
    if (!at) return state;
    const ids = itemIds(item),
      dropped = unplaced(withIds(item, ids.slice(0, quantity))),
      left = ids.slice(quantity);
    const bag = state.bag.flatMap((i) =>
      i.uid !== item.uid ? [i] : left.length ? [withIds(i, left)] : [],
    );
    if (!state.bag.some((i) => i.uid === item.uid) && left.length) return state;
    const next = {
      ...state,
      serial: state.serial + 1,
      bag,
      equipment: state.equipment.filter((e) => e.item.uid !== item.uid),
      caches: [
        ...state.caches,
        {
          id: `dropped-${state.seed}-${state.serial}`,
          ...at,
          item: dropped,
          contents: [dropped],
          container: 'loose' as const,
          searched: false,
          opened: false,
          available: state.tick,
          loose: true,
          manualEquip: true,
          manualPickup: true,
        },
      ],
      notice: `已扔下 ${itemName(dropped)} ×${quantity}`,
      noticeUntil: state.tick + 90,
    };
    return {
      ...next,
      fog: revealFog(next.player, next.fog, next.world, visionRange(next)),
    };
  }
  if (action.type === 'start')
    return state.status === 'ready'
      ? { ...state, status: 'departing', departureTick: 0 }
      : state;
  if (
    state.status !== 'running' &&
    !(
      state.status === 'extracted' &&
      [
        'equip',
        'unequip',
        'protect',
        'unprotect',
        'cargo-move',
        'cargo-pack',
        'consume',
        'transfer',
        'destroy',
        'warehouse-pack',
      ].includes(action.type)
    )
  )
    return state;
  if (action.type === 'warehouse-pack') {
    if (state.status !== 'extracted') return state;
    const warehouse = packBag(
      state.warehouse || [],
      warehouseRows(state.liftLevel),
    );
    return warehouse ? { ...state, warehouse } : state;
  }
  if (action.type === 'destroy') {
    const owned = [
      ...state.bag,
      ...state.safe,
      ...state.equipment.map((e) => e.item),
      ...(state.warehouse || []),
    ];
    if (!owned.some((i) => i.uid === action.uid)) return state;
    const next = {
      ...state,
      bag: state.bag.filter((i) => i.uid !== action.uid),
      safe: state.safe.filter((i) => i.uid !== action.uid),
      equipment: state.equipment.filter((e) => e.item.uid !== action.uid),
      ...(state.warehouse
        ? { warehouse: state.warehouse.filter((i) => i.uid !== action.uid) }
        : {}),
    };
    return {
      ...next,
      fog: revealFog(next.player, next.fog, next.world, visionRange(next)),
    };
  }
  if (action.type === 'transfer') {
    if (
      state.status !== 'extracted' &&
      (action.zone === 'warehouse' ||
        state.warehouse?.some((i) => i.uid === action.uid))
    )
      return state;
    const next = transferItem(state, action);
    return next === state
      ? state
      : {
          ...next,
          fog: revealFog(next.player, next.fog, next.world, visionRange(next)),
        };
  }
  if (action.type === 'move') {
    const path = pathTo(state.player, action.to, state.world);
    return path.length ? { ...state, path, extraction: 0 } : state;
  }
  if (action.type === 'extract') {
    if (
      !state.leftLift ||
      !insideLift(state.player, ELEVATOR) ||
      state.extraction > 0
    )
      return state;
    return {
      ...state,
      path: [],
      extraction: 1,
      searching: null,
      searchTicks: 0,
    };
  }
  if (action.type === 'consume') {
    const item = state.bag.find((i) => i.uid === action.uid);
    const use = item && ITEM_PROPERTIES[item.kind].use;
    if (!item || !use || !hasTrait(item.kind, 'usable')) return state;
    const gain = Math.min(use.gain, 100 - state.player[use.stat]);
    if (gain <= 0) return state;
    return {
      ...state,
      bag: hasTrait(item.kind, 'consumable')
        ? state.bag.filter((i) => i.uid !== item.uid)
        : state.bag,
      player: { ...state.player, [use.stat]: state.player[use.stat] + gain },
      serial: state.serial + 1,
      effects: [
        ...state.effects,
        {
          id: state.serial,
          kind: 'heal',
          from: { ...state.player },
          to: { ...state.player },
          amount: gain,
          itemUid: item.uid,
          tick: state.tick,
        },
      ],
      notice: `使用${item.name}`,
      noticeUntil: state.tick + 90,
    };
  }
  if (action.type === 'cargo-pack') {
    const bag = packBag(state.bag);
    return bag
      ? {
          ...state,
          bag,
          notice: '背包已按尺寸整理。',
          noticeUntil: state.tick + 100,
        }
      : state;
  }
  if (action.type === 'cargo-move') {
    const item = state.bag.find((i) => i.uid === action.uid);
    if (!item) return state;
    const bag = putInBag(state.bag, item, action.slot, action.rotated);
    return bag ? { ...state, bag } : state;
  }
  if (action.type === 'equip' || action.type === 'unequip') {
    const next = arrangeEquipment(state, action);
    return next === state
      ? state
      : {
          ...next,
          fog: revealFog(next.player, next.fog, next.world, visionRange(next)),
        };
  }
  const from =
    action.type === 'unprotect'
      ? state.safe
      : [...state.bag, ...state.equipment.map((e) => e.item)];
  const item = from.find((i) => i.uid === action.uid);
  if (!item) return state;
  if (action.type === 'protect' && capacity(state.safe) + item.size > SAFE_SIZE)
    return state;
  const returnedBag =
    action.type === 'unprotect' ? putInBag(state.bag, unplaced(item)) : null;
  if (action.type === 'unprotect' && !returnedBag) return state;
  const s = { ...state, bag: [...state.bag], safe: [...state.safe] };
  if (action.type === 'unprotect') {
    s.safe = s.safe.filter((i) => i.uid !== item.uid);
    s.bag = returnedBag!;
  } else {
    s.bag = s.bag.filter((i) => i.uid !== item.uid);
    s.equipment = s.equipment.filter((e) => e.item.uid !== item.uid);
    if (action.type === 'protect') s.safe.push(unplaced(item));
    else
      s.caches = [
        ...s.caches,
        {
          id: `dropped-${s.serial++}`,
          ...state.player,
          item: unplaced(item),
          contents: [unplaced(item)],
          container: 'loose',
          searched: false,
          opened: false,
          available: s.tick + 150,
          loose: true,
        },
      ];
  }
  tell(
    s,
    action.type === 'protect'
      ? `${item.name}已放入安全容器，不再自动生效。`
      : action.type === 'unprotect'
        ? `${item.name}已取回普通背包。`
        : `${item.name}留在原地，稍后可以重新搜取。`,
  );
  if (visionRange(s) !== visionRange(state))
    s.fog = revealFog(s.player, s.fog, s.world, visionRange(s));
  return s;
}
/** One receipt per actual item transfer, including multi-item containers. */
export function recordPickup(s: SurvivalState, item: Item) {
  const stack = s.effects.filter(
    (e) => e.kind === 'pickup' && s.tick - e.tick < 35,
  ).length;
  s.effects.push({
    id: s.serial++,
    kind: 'pickup',
    from: { ...s.player },
    to: { ...s.player },
    amount: itemCount(item),
    label: itemName(item),
    itemUid: item.uid,
    stack,
    tick: s.tick,
  });
}
function collectCache(s: SurvivalState, cache: Cache) {
  if (s.forbidGolden && cache.contents.some((i) => i.kind === 'golden')) return;
  const firstSearch = !cache.searched;
  cache.searched = true;
  const obtained: string[] = [],
    remaining: Item[] = [];
  for (const item of cache.contents) {
    const slot =
      !cache.manualEquip && isEquipment(item)
        ? firstFit(s.equipment, item.size)
        : -1;
    const bag = slot < 0 ? putInBag(s.bag, item) : null;
    if (slot >= 0) s.equipment.push({ item: unplaced(item), slot });
    else if (bag) s.bag = bag;
    else {
      remaining.push(item);
      continue;
    }
    obtained.push(item.name);
    recordPickup(s, item);
  }
  cache.contents = remaining;
  cache.opened = remaining.length === 0;
  if (obtained.length || firstSearch)
    tell(
      s,
      obtained.length
        ? '获得 ' +
            obtained.join('、') +
            (remaining.length ? ` · 还有 ${remaining.length} 件留在容器中` : '')
        : `空间不足，${remaining.length} 件物品留在原处。整理背包后可继续拿取。`,
    );
}
function random(s: SurvivalState) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function effect(
  s: SurvivalState,
  kind: Effect['kind'],
  from: Point,
  to: Point,
  amount = 0,
) {
  s.effects.push({
    id: s.serial++,
    kind,
    from: { x: from.x, z: from.z },
    to: { x: to.x, z: to.z },
    amount,
    tick: s.tick,
  });
}
function moveBody(
  body: Point,
  dx: number,
  dz: number,
  world: RoomWorld,
  radius = PLAYER_RADIUS,
) {
  if (walkable({ x: body.x + dx, z: body.z }, radius, world)) body.x += dx;
  if (walkable({ x: body.x, z: body.z + dz }, radius, world)) body.z += dz;
}
function hitEnemy(s: SurvivalState, enemy: Enemy, amount: number) {
  if (enemy.hp <= 0) return;
  const actual = Math.min(enemy.hp, amount);
  enemy.hp -= actual;
  enemy.hitAt = s.tick;
  enemy.awake = true;
  s.damage += actual;
  effect(s, 'hit', enemy, enemy, actual);
  if (enemy.hp > 0) return;
  s.kills++;
  effect(s, 'death', enemy, enemy);
  const rank =
    enemy.kind === 'boss'
      ? 3
      : enemy.kind === 'brute'
        ? 2
        : enemy.kind === 'runner'
          ? 1
          : 0;
  const tier = Math.min(
    3,
    Math.max(
      0,
      (s.floor || 1) -
        1 +
        (random(s) < Math.min(0.9, ((enemy.level ?? rank + 1) - 1) * 0.2)
          ? 1
          : 0),
    ),
  );
  const quality = (['low', 'normal', 'fine', 'supreme'] as const)[tier];
  const baseDrops =
    enemy.kind === 'boss'
      ? 6
      : enemy.kind === 'brute'
        ? 3
        : enemy.kind === 'runner'
          ? 2
          : 1;
  const drops = Math.min(baseDrops, s.lootBudget ?? baseDrops);
  if (s.lootBudget !== undefined) s.lootBudget -= drops;
  if (drops > 0) {
    const brain = {
      ...ITEMS['lift-material'],
      quality,
      name: `${({ low: '低质', normal: '普通', fine: '精良', supreme: '极品' } as const)[quality]}脑浆`,
      uid: `brain-${s.seed}-${s.serial++}`,
    };
    const contents = [
      {
        ...brain,
        ...(drops > 1
          ? {
              stack: Array.from(
                { length: drops - 1 },
                () => `brain-${s.seed}-${s.serial++}`,
              ),
            }
          : {}),
      },
    ];
    s.caches.push({
      id: `brain-cache-${s.serial++}`,
      x: enemy.x,
      z: enemy.z,
      item: contents[0],
      contents,
      container: 'loose',
      searched: false,
      opened: false,
      available: s.tick + 12,
      pickup: 'touch',
      loose: true,
    });
  }
  if (enemy.kind === 'boss' && !s.bossDefeated) {
    s.bossDefeated = true;
    s.caches.push({
      id: 'warden-core',
      x: enemy.x,
      z: enemy.z,
      item: { ...ITEMS.core, uid: `room-${s.seed}-warden-core` },
      contents: [{ ...ITEMS.core, uid: `room-${s.seed}-warden-core` }],
      container: 'loose',
      searched: false,
      opened: false,
      available: s.tick + 15,
      loose: true,
      pickup: 'touch',
    });
    tell(s, '驻守者已倒下。净水机芯占两格，带回电梯才算收获。');
  }
}
function hurtPlayer(s: SurvivalState, amount: number) {
  if (s.seasonRules && insideLift(s.player, ELEVATOR)) return;
  if (s.tick < s.player.hurtUntil) return;
  const actual = Math.min(s.player.hp, amount);
  s.player.hp = Math.max(0, s.player.hp - actual);
  s.player.hurtUntil = s.tick + 15;
  effect(s, 'hit', s.player, s.player, -actual);
  if (s.extraction) {
    s.extraction = 0;
    tell(s, '受到攻击，撤离中断。清理附近再试。');
  }
}
function supply(
  s: SurvivalState,
  kind: ItemKind,
  stat: 'hp' | 'food' | 'water',
  threshold: number,
  gain: number,
) {
  if (s.player[stat] > threshold) return;
  const index = s.bag.findIndex((i) => i.kind === kind);
  if (index < 0) return;
  const item = s.bag.splice(index, 1)[0],
    actual = Math.min(gain, 100 - s.player[stat]);
  s.player[stat] += actual;
  effect(s, 'heal', s.player, s.player, actual);
  s.effects[s.effects.length - 1].itemUid = item.uid;
  tell(
    s,
    `${item.name}自动使用 · ${stat === 'hp' ? (s.floor ? '精神力' : '生命') : stat === 'water' ? '饮水' : '饱食'} +${Math.round(actual)}`,
  );
}
function finish(s: SurvivalState, status: 'dead' | 'extracted') {
  s.status = status;
  s.path = [];
  s.extraction = 0;
  s.searching = null;
  if (status === 'dead') {
    s.lost = [...s.bag, ...(s.floor ? [] : s.equipment.map((e) => e.item))];
    if (s.floor && s.lost.length) {
      const contents = s.lost.map(unplaced);
      s.caches.push({
        id: `lost-backpack-${s.seed}-${s.serial++}`,
        x: s.player.x,
        z: s.player.z,
        item: { ...contents[0], name: '遗落的背包' },
        contents,
        container: 'backpack',
        manualEquip: true,
        searched: false,
        opened: false,
        available: s.tick,
      });
    }
    s.bag = [];
    if (!s.floor) s.equipment = [];
  }
}
// Exactly one simulation step. Fixed tick inputs, RNG and serials are serializable.
export function stepSurvival(
  state: SurvivalState,
  input: SurvivalInput = {},
  rules: {
    needs?: boolean;
    waves?: boolean;
    combat?: boolean;
    search?: boolean;
    supplies?: boolean;
  } = {},
): SurvivalState {
  // One-time arrival: open, walk through the door, then raise the camera.
  // Expedition time, needs and enemies begin only when this sequence completes.
  if (state.status === 'departing') {
    const departureTick = Math.min(DEPARTURE_TICKS, state.departureTick + 1);
    const player = {
      ...state.player,
      x: ELEVATOR.x,
      z: ELEVATOR.z - departureDistance(departureTick),
      facing: Math.PI,
    };
    return {
      ...state,
      departureTick,
      player,
      fog: revealFog(player, state.fog, state.world, visionRange(state)),
      leftLift: player.z < ELEVATOR.z + LIFT.doorZ - PLAYER_RADIUS,
      status: departureTick === DEPARTURE_TICKS ? 'running' : 'departing',
    };
  }
  if (state.status !== 'running') return state;
  const s: SurvivalState = {
    ...state,
    tick: state.tick + 1,
    player: { ...state.player },
    bag: [...state.bag],
    equipment: [...state.equipment],
    safe: [...state.safe],
    path: [...state.path],
    enemies: state.enemies.map((e) => ({ ...e })),
    caches: activeCaches(state.caches).map((c) => ({
      ...c,
      contents: [...c.contents],
    })),
    spawns: [...state.spawns],
    effects: state.effects.filter(
      (e) => state.tick - e.tick < (e.kind === 'pickup' ? 72 : 27),
    ),
    cooldowns: { ...state.cooldowns },
  };
  const p = s.player;
  let dx = Number.isFinite(input.x) ? input.x || 0 : 0,
    dz = Number.isFinite(input.z) ? input.z || 0 : 0;
  if (Math.hypot(dx, dz) > 0) {
    s.path = [];
    s.extraction = 0;
  } else if (s.path.length) {
    while (s.path.length && distance(p, s.path[0]) < 0.15) s.path.shift();
    if (s.path.length) {
      dx = s.path[0].x - p.x;
      dz = s.path[0].z - p.z;
    }
  }
  const magnitude = Math.hypot(dx, dz),
    before = { x: p.x, z: p.z };
  if (magnitude > 0) {
    const amount = Math.min(
      3.8 * (s.floor ? foodSpeed(p.food) : 1) * STEP,
      s.path.length ? magnitude : Infinity,
    );
    moveBody(p, (dx / magnitude) * amount, (dz / magnitude) * amount, s.world);
    p.facing = Math.atan2(dx, dz);
  }
  const moved = distance(before, p) > 0.002;
  if (s.tick % 3 === 0 || cellKey(before) !== cellKey(p))
    s.fog = revealFog(p, s.fog, s.world, visionRange(s));
  if (p.z < ELEVATOR.z + LIFT.doorZ - PLAYER_RADIUS) s.leftLift = true;
  if (s.leftLift && rules.needs !== false) {
    p.water = Math.max(0, p.water - STEP * (0.2 + (moved ? 0.11 : 0)));
    p.food = Math.max(0, p.food - STEP * 0.14);
    if (!s.floor)
      p.energy = Math.max(0, p.energy - STEP * (0.18 + (moved ? 0.08 : 0)));
  }
  for (const kind of Object.keys(ITEM_PROPERTIES) as ItemKind[]) {
    const use = ITEM_PROPERTIES[kind].use;
    if (rules.supplies !== false && use?.automaticBelow !== undefined)
      supply(s, kind, use.stat, use.automaticBelow, use.gain);
  }
  if (
    rules.needs !== false &&
    (p.water <= 0 || p.food <= 0 || (!s.floor && p.energy <= 0))
  )
    p.hp = Math.max(0, p.hp - STEP * 1.5);
  if (rules.waves !== false && s.leftLift && s.tick >= s.nextWave) {
    s.wave++;
    const count = [4, 6, 4, 8][(s.wave - 1) % 4];
    s.nextWave = s.tick + [330, 390, 270, 420][(s.wave - 1) % 4];
    const eligible = s.world.gates.filter(
      (g) => distance(p, g) > 10 && distance(p, g) < 23,
    );
    for (
      let i = 0;
      i < count &&
      s.enemies.length + s.spawns.length < enemyLimit(s) &&
      eligible.length;
      i++
    ) {
      const gate = eligible[Math.floor(random(s) * eligible.length)];
      const offset = (random(s) - 0.5) * 0.5;
      const kind: EnemyKind =
        s.wave > 3 && i === 0
          ? 'brute'
          : (s.wave + i) % 3 === 0
            ? 'runner'
            : 'crawler';
      s.spawns.push({
        id: s.serial++,
        x: gate.x + offset,
        z: gate.z,
        at: s.tick + 36 + i * 4,
        kind,
        pursuit: 'territorial',
      });
    }
    if (
      s.wave % 2 === 0 &&
      s.enemies.length + s.spawns.length < enemyLimit(s)
    ) {
      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = random(s) * Math.PI * 2,
          radius = 6 + random(s) * 3;
        const at = {
          x: p.x + Math.cos(angle) * radius,
          z: p.z + Math.sin(angle) * radius,
        };
        if (!walkable(at, 0.45, s.world)) continue;
        s.spawns.push({
          ...at,
          id: s.serial++,
          at: s.tick + 36,
          kind: 'runner',
          pursuit: 'ambush',
        });
        break;
      }
    }
  }
  const waiting: Spawn[] = [];
  for (const spawn of s.spawns) {
    if (spawn.at > s.tick || s.enemies.length >= enemyLimit(s)) {
      waiting.push(spawn);
      continue;
    }
    if (spawn.pursuit === 'ambush' && distance(spawn, p) < 5) {
      waiting.push({ ...spawn, at: s.tick + 15 });
      continue;
    }
    const hp = spawn.kind === 'runner' ? 27 : spawn.kind === 'brute' ? 115 : 44;
    s.enemies.push({
      id: `enemy-${spawn.id}`,
      kind: spawn.kind,
      x: spawn.x,
      z: spawn.z,
      hp,
      maxHp: hp,
      awake: false,
      pursuit: spawn.pursuit || 'territorial',
      home: { x: spawn.x, z: spawn.z },
      hitAt: -100,
      nextAttack: s.tick + 20,
      windup: 0,
      aim: null,
    });
  }
  s.spawns = waiting;
  const pursuitFields = new Map<number, ReturnType<typeof flood>>();
  for (const e of s.enemies) {
    e.level ??=
      e.kind === 'boss'
        ? 4
        : e.kind === 'brute'
          ? 3
          : e.kind === 'runner'
            ? 2
            : 1;
    e.home ||= { x: e.x, z: e.z };
    e.pursuit ||= e.kind === 'boss' ? 'territorial' : 'ambush';
    const dist = distance(e, p);
    const sees =
      dist <= (e.sight || (e.kind === 'boss' ? 10 : 12)) &&
      clearSight(e, p, s.world);
    if (sees) {
      e.awake = true;
      e.lastSeen = { x: p.x, z: p.z };
      e.lastSeenTick = s.tick;
    }
    const searching = !!e.lastSeen && s.tick - (e.lastSeenTick ?? -999) <= 90;
    if (!sees && !searching) {
      e.awake = false;
      e.windup = 0;
      e.aim = null;
    }
    const destination = sees
      ? p
      : searching
        ? e.lastSeen!
        : e.pursuit === 'territorial'
          ? e.home
          : null;
    if (!destination) continue;
    if (e.kind === 'boss' && e.windup > 0) {
      if (s.tick >= e.windup) {
        if (e.aim && distance(p, e.aim) < 2.5) hurtPlayer(s, 24);
        if (e.aim) effect(s, 'blade', e.aim, e.aim, 2.5);
        e.windup = 0;
        e.aim = null;
        e.nextAttack = s.tick + 100;
      }
      continue;
    }
    if (sees && e.kind === 'boss' && dist < 4 && s.tick >= e.nextAttack) {
      e.windup = s.tick + 39;
      e.aim = { x: p.x, z: p.z };
      continue;
    }
    if (
      distance(e, destination) >
      (sees ? (e.kind === 'boss' ? 2.2 : 0.72) : 0.18)
    ) {
      let target: Point = destination;
      if (!clearSight(e, destination, s.world, 0.46, true)) {
        const destinationCell = cellKey(destination);
        let field = pursuitFields.get(destinationCell);
        if (!field) {
          field = flood(destination, s.world);
          pursuitFields.set(destinationCell, field);
        }
        const key = cellKey(e),
          choices = [key, key - ROOM.width, key - 1, key + 1, key + ROOM.width]
            .filter(
              (k) =>
                k >= 0 &&
                k < field.length &&
                field[k] >= 0 &&
                distance(e, center(k)) < 2.1,
            )
            .sort((a, b) => field[a] - field[b]);
        if (choices.length) target = center(choices[0]);
      }
      const length = distance(e, target);
      const speed =
        e.kind === 'runner'
          ? 2.35
          : e.kind === 'brute'
            ? 1.02
            : e.kind === 'boss'
              ? 0.82
              : 1.5;
      if (length > 0.05)
        moveBody(
          e,
          ((target.x - e.x) / length) * speed * STEP,
          ((target.z - e.z) / length) * speed * STEP,
          s.world,
          0.35,
        );
    }
    if (
      sees &&
      e.kind !== 'boss' &&
      distance(e, p) < 0.85 &&
      s.tick >= e.nextAttack
    ) {
      hurtPlayer(s, e.kind === 'brute' ? 14 : e.kind === 'runner' ? 5 : 8);
      e.nextAttack = s.tick + 36;
    }
  }
  const visible = s.enemies
    .filter((e) => e.hp > 0 && e.awake && isVisible(s, e))
    .sort(
      (a, b) =>
        distance(p, a) - distance(p, b) || a.id.localeCompare(b.id, 'en'),
    );
  for (const gear of s.equipment) {
    if (rules.combat === false) continue;
    const stats = weaponStats(s, gear);
    if (!stats || s.tick < (s.cooldowns[gear.item.uid] || 0)) continue;
    const targets = visible.filter(
      (e) => e.hp > 0 && distance(p, e) <= stats.range,
    );
    if (!targets.length) continue;
    if (gear.item.kind === 'phone' || gear.item.kind === 'flashlight') {
      const side = gear.item.kind === 'phone' ? -0.34 : 0.34;
      const origin = {
        x: p.x + Math.cos(p.facing) * side,
        z: p.z - Math.sin(p.facing) * side,
      };
      effect(
        s,
        gear.item.kind === 'phone' ? 'phone-beam' : 'torch-beam',
        origin,
        targets[0],
      );
      hitEnemy(s, targets[0], stats.damage);
    } else if (gear.item.kind === 'nail') {
      effect(s, 'shot', p, targets[0]);
      hitEnemy(s, targets[0], stats.damage);
    } else if (gear.item.kind === 'coil') {
      targets.slice(0, 4).forEach((e) => {
        effect(s, 'arc', p, e);
        hitEnemy(s, e, stats.damage);
      });
    } else if (gear.item.kind === 'blade') {
      effect(s, 'blade', p, p, stats.range);
      targets.forEach((e) => hitEnemy(s, e, stats.damage));
    } else if (gear.item.kind === 'laser') {
      const target = targets[0],
        length = Math.max(0.001, distance(p, target));
      const direction = {
        x: (target.x - p.x) / length,
        z: (target.z - p.z) / length,
      };
      let reach = stats.range;
      while (
        reach > length &&
        !clearSight(
          p,
          { x: p.x + direction.x * reach, z: p.z + direction.z * reach },
          s.world,
        )
      )
        reach -= 0.25;
      const end = {
        x: p.x + direction.x * reach,
        z: p.z + direction.z * reach,
      };
      effect(s, 'laser', p, end);
      targets.forEach((e) => {
        const along = (e.x - p.x) * direction.x + (e.z - p.z) * direction.z;
        const across = Math.abs(
          (e.x - p.x) * direction.z - (e.z - p.z) * direction.x,
        );
        if (along >= 0 && along <= reach + 0.1 && across < 0.65)
          hitEnemy(s, e, stats.damage);
      });
    }
    s.cooldowns[gear.item.uid] = s.tick + stats.interval;
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  if (p.hp <= 0) {
    finish(s, 'dead');
    return s;
  }
  if (s.extraction) {
    if (moved || !insideLift(p, ELEVATOR)) s.extraction = 0;
    else if (++s.extraction >= 66) {
      finish(s, 'extracted');
      return s;
    }
  }
  // Dropped materials are gathered while moving, even during combat. Full bags
  // leave the untransferred item in the world and produce no false receipt.
  for (const c of s.caches)
    if (
      c.pickup === 'touch' &&
      !c.opened &&
      c.available <= s.tick &&
      distance(p, c) <= 1.65 &&
      clearSight(p, c, s.world)
    )
      collectCache(s, c);
  const cache =
    rules.search !== false && !s.extraction && !moved
      ? s.caches
          .filter(
            (c) =>
              !c.opened &&
              (!input.cache || input.cache === c.id) &&
              c.pickup !== 'touch' &&
              (!c.manualPickup || !!input.interact) &&
              c.available <= s.tick &&
              distance(p, c) <= 1.65 &&
              clearSight(p, c, s.world),
          )
          .sort((a, b) => distance(p, a) - distance(p, b))[0]
      : undefined;
  if (cache) {
    if (s.searching !== cache.id) {
      s.searching = cache.id;
      s.searchTicks = 0;
    }
    s.searchTicks++;
    const duration = searchDuration(cache, p.energy);
    if (s.searchTicks >= duration) {
      collectCache(s, cache);
      if (cache.opened) {
        s.searching = null;
        s.searchTicks = 0;
      } else s.searchTicks = duration;
    }
  } else {
    s.searching = null;
    s.searchTicks = 0;
  }
  s.caches = activeCaches(s.caches);
  return s;
}
