import {
  startMinigame,
  MINIGAMES,
  rewardStars,
  type MinigameState,
} from './minigame.ts';
import { pipeConnected } from './tutorial-pipes.ts';
import { CARDS, cardDef, identifyVariant } from './demo-cards.ts';
import { layout } from './cargo-layout.ts';
import { rarityOf, growthCost, growthRefund } from './demo-card-rules.ts';
import { rng, hash } from './design-model.ts';
import { FOUR, FACILITIES, RARITY as OLD_RARITY } from './demo-config.ts';
import {
  floorRoute,
  sceneTitle,
  eventSpec,
  puzzleSpec,
} from './demo-content.ts';
import { WEATHER as OLD_WEATHER } from './demo-config.ts';
import { simulateDuel } from './demo-combat.ts';
import type { Duel, FighterCard } from './demo-combat.ts';
import {
  OBJECTS,
  FIELD_NODES,
  FIELD_TITLES,
  fieldTask,
  isFieldNode,
} from './field-items.ts';
import {
  RETIRED_CARDS,
  RETIRED_SALE_CREDIT,
  retiredSize,
} from './card-migration.ts';
export { CARDS, RARITY, WEATHER };
export const RARITY_LABELS = ['普通', '罕见', '稀有', '传说', '奇迹'];
const RARITY = OLD_RARITY.map((r, i) => ({ ...r, name: RARITY_LABELS[i] }));
const WEATHER = OLD_WEATHER.map((weather, index) => ({
  ...weather,
  explore: [
    '搜索消耗 10 精力；本轮天气只作场景表现。',
    '搜索消耗 10 精力；可携带实体工具应对现场机关。',
    '隐蔽路线使搜索只需 6 精力，适合补给紧张时出发。',
    '搜索消耗 10 精力；带回实体后，可保留工具用途或转化上阵。',
  ][index],
}));
export const SAVE_KEY = 'f9.elevator.demo1.local';
export const QUALITY = ['基础', '精制', '大师'];
export const FACILITY = [
  {
    id: 'identify',
    name: '鉴定台',
    slots: 0,
    cost: 0,
    desc: 'Lv.4 开放，每次鉴定消耗 2 金币，不限次数',
    effect: 'identify',
  },
  ...FACILITIES.filter((f) => f.id !== 'weather'),
].map((f) => ({
  ...f,
  name: f.name.replaceAll('材料', '金币'),
  cost: f.id === 'weather' ? 8 : f.cost,
  desc:
    f.id === 'weather'
      ? '免费观测下一天天气，并给出路线建议'
      : f.desc.replaceAll('材料', '金币'),
}));
export type Zone = 'bag' | 'safe' | 'warehouse' | 'board';
export type Item = {
  slot?: number;
  rotated?: boolean;
  uid: string;
  id: string;
  type: 'physical' | 'card' | 'tool' | 'resource';
  zone: Zone;
  volume: number;
  amount: number;
  rarity?: number;
  quality: number;
  level: number;
  at?: number;
};
export type Floor = {
  routeVersion?: 2 | 3 | 4 | 5 | 6;
  workResolved?: string[];
  battleRewards?: string[];
  soldOffers?: string[];
  id: number;
  name: string;
  detail: string;
  focus: string;
  nodes: string[];
  stock: Item[];
  searched: boolean;
  cleared: boolean;
  tradeSold: boolean;
  visitors: number[];
  history: string[];
};
export type Bot = {
  id: number;
  floor: number;
  best: number;
  quota: number;
  streak: number;
  strength: number;
  stamina: number;
  alive: boolean;
  status: string;
  plan: number;
};
export const RESOURCE_LEVEL: Record<string, number> = {
  supply: 1,
  material: 1,
  medicine: 2,
  scrap: 2,
  power: 3,
  fuel: 3,
  scanner: 1,
};
export const FACILITY_LEVEL: Record<string, number> = {
  identify: 4,
  clinic: 2,
  recycle: 2,
  generator: 3,
  workshop: 3,
  storage: 3,
  grow: 4,
  weather: 4,
  adapt: 5,
};
export const LEVEL_GUIDE = [
  '物品、布阵与消耗品鉴定',
  '卡牌强化、吞噬升阶、医疗设施',
  '便携鉴定、电力与燃料设施',
  '鉴定台、补给种植',
  '探索整备',
  '九格战斗布局',
];
export const unlockedItem = (s: Run, id: string) =>
  (id === 'scanner' && s.floors[0]?.routeVersion === 6 && s.floor === 1) ||
  s.level >= (RESOURCE_LEVEL[id] ?? 1);
export const CONSUMABLES = ['supply', 'fuel', 'medicine', 'scrap'] as const;
export function itemCount(
  s: Run,
  id: string,
  carried = s.phase === 'floor' || s.phase === 'combat',
) {
  return s.items
    .filter(
      (x) =>
        x.id === id &&
        (carried ? ['bag', 'safe'].includes(x.zone) : x.zone !== 'board'),
    )
    .reduce((n, x) => n + x.amount, 0);
}
function grantItem(s: Run, id: string, amount: number) {
  const existing = s.items.find(
    (x) => x.id === id && x.zone === 'warehouse' && x.type === 'tool',
  );
  if (existing) existing.amount += amount;
  else
    s.items.push(
      makeItem('stock-' + s.serial++, id, 'tool', 'warehouse', amount),
    );
}
function spendItem(s: Run, id: string, amount = 1) {
  need(itemCount(s, id) >= amount, '缺少' + (NAMES[id] ?? id) + '物品');
  let remaining = amount;
  for (const x of s.items.filter(
    (x) =>
      x.id === id && (s.phase === 'base' || ['bag', 'safe'].includes(x.zone)),
  )) {
    const take = Math.min(remaining, x.amount);
    x.amount -= take;
    remaining -= take;
    if (!remaining) break;
  }
  s.items = s.items.filter((x) => x.amount > 0);
}
export const checkpoint = (s: Run) => s.stopFloor ?? s.best;
export type Run = {
  openingVersion?: 2;
  experienceVersion?: 3;
  systemsUnlocked?: boolean;
  scannerVersion?: 2;
  minigame?: MinigameState;
  lootQueue?: NonNullable<Run['loot']>[];
  homeGuide?: 'sell' | 'buy' | 'scan' | 'sleep' | 'done';
  shopDay?: number;
  shopBought?: number;
  expedition?: {
    active: boolean;
    acquired: Item[];
    spent: Record<string, number>;
    gained: Record<string, number>;
  };
  identification?: { uid: string };
  defenseExplained?: boolean;
  bagUnlocked?: boolean;
  equipmentExplained?: boolean;
  energyExplained?: boolean;
  tutorialRewardUid?: string;
  loot?: {
    item: Item;
    source: 'battle' | 'workshop';
    sourceName: string;
    sourceUid?: string;
    revealed: boolean;
  } | null;
  tutorialBattleStep?: number;
  catalogVersion?: 2;
  utilityUsed?: string[];
  fieldPrep?: { hp: number; barrier: number[]; steps: number };
  fieldResearch?: { vitality: number; credit: number };
  stopFloor?: number;
  departureFloor?: number;
  interaction?: 'search' | 'trade' | null;
  dailyReport?: {
    day: number;
    rows: {
      id: number;
      floor: number;
      previousFloor: number;
      alive: boolean;
      wasAlive: boolean;
      status: string;
    }[];
  };
  dayStartBots?: { id: number; floor: number; alive: boolean }[];
  version: 1;
  seed: number;
  phase: 'intro' | 'base' | 'floor' | 'combat' | 'ended';
  day: number;
  quota: number;
  streak: number;
  stamina: number;
  material: number;
  power: number;
  supply: number;
  fuel: number;
  medicine: number;
  scrap: number;
  charges: number;
  level: number;
  moduleCap: number;
  installed: string[];
  facilityUsed: string[];
  forecast: boolean;
  adapted: boolean;
  prepared: boolean;
  used: boolean;
  botsDone: boolean;
  floor: number;
  best: number;
  node: number;
  objective: boolean;
  puzzleErrors: number;
  items: Item[];
  floors: Floor[];
  bots: Bot[];
  encounter: number | null;
  encounterDone: boolean;
  duel: Duel | null;
  notice: string;
  log: string[];
  ending: string;
  serial: number;
  clears: number[];
};
export type Action = {
  turns?: number[];
  ids?: string[];
  slot?: number;
  rotated?: boolean;
  type: string;
  id?: string;
  to?: Zone;
  at?: number;
  floor?: number;
  choice?: number;
};
const THEMES = [
  ['月面金库', '低重力中，金币像鱼群一样游动。', 'material'],
  ['漂浮皇宫', '龙椅在天花板上，宫女的影子没有主人。', 'supply'],
  ['倒置医院', '病历写着明天的你，药柜却通向昨日。', 'medicine'],
  ['鲸腹车站', '广播用心跳报站，站台在潮水中呼吸。', 'fuel'],
  ['玻璃雨林', '树叶透明，雨滴落地变成了齿轮。', 'scrap'],
  ['记忆银行', '人们把梦存进保险柜，利息是一段陌生记忆。', 'material'],
  ['深海剧院', '观众都是潜水服，舞台下有一轮太阳。', 'power'],
  ['无昼机房', '风扇卷起灼热雪花，机器拒绝承认停机。', 'scrap'],
  ['纸折战场', '纸鹤叼来军令，折痕下藏着真正的天空。', 'supply'],
  ['云端旧街', '雨从路面落向天空，门牌每眨一次眼便变动。', 'medicine'],
  ['黑日果园', '苹果内部有星空，果核是一只走慢的表。', 'supply'],
  ['梦境邮局', '所有信件的收件人都是尚未出生的你。', 'power'],
];
export const NAMES: Record<string, string> = {
  apple: '苹果',
  lighter: '打火机',
  scanner: '鉴定仪',
  relic: '镀金纪念章',
  material: '金币',
  supply: '密封补给',
  power: '储能电池',
  fuel: '燃料罐',
  medicine: '医疗包',
  scrap: '废料束',
  core: '任务核心',
};
export function itemName(x: Item) {
  return (
    NAMES[x.id] ??
    (x.type === 'physical' ? OBJECTS[x.id]?.name : undefined) ??
    cardDef(x.id).name
  );
}
export function makeItem(
  uid: string,
  id: string,
  type: Item['type'],
  zone: Zone = 'bag',
  amount = 1,
): Item {
  return {
    uid,
    id,
    type: ['supply', 'fuel', 'medicine', 'scrap', 'core'].includes(id)
      ? 'tool'
      : type,
    zone,
    volume:
      type === 'physical' || type === 'card'
        ? cardDef(id).size
        : id === 'scanner'
          ? 2
          : id === 'core'
            ? 2
            : 1,
    amount,
    ...(type === 'card' ? { rarity: rarityOf(id) } : {}),
    quality: 0,
    level: 0,
  };
}
export function newRun(seed = Date.now() >>> 0, tutorial = false): Run {
  const random = rng(seed),
    pool = [...THEMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const floors: Floor[] = Array.from({ length: 10 }, (_, i) => {
    const theme = pool[i];
    let serial = 0;
    const loot = (id: string, type: Item['type'], amount = 1) =>
      makeItem(`f${i + 1}-${serial++}`, id, type, 'bag', amount);
    return {
      id: i + 1,
      name: theme[0],
      detail: theme[1],
      focus: theme[2],
      nodes:
        tutorial && i === 0
          ? ['patrol', 'search', 'pressure', 'antechamber', 'guardian']
          : floorRoute(seed, i + 1, true),
      routeVersion: i === 0 ? (tutorial ? 6 : 5) : 4,
      workResolved: [],
      soldOffers: [],
      stock: [
        loot(theme[2], 'resource', 3),
        loot('material', 'resource', 4 + Math.floor(i / 3)),
        loot('supply', 'resource', 3),
        loot('scrap', 'resource', 3),
        loot('fuel', 'resource', 1),
        loot('medicine', 'resource', 1),
        ...Array.from({ length: 6 }, (_, index) =>
          loot(
            index === 0 && i < 2
              ? i === 0
                ? 'rubber'
                : 'distiller'
              : CARDS[Math.floor(random() * CARDS.length)].id,
            'physical',
          ),
        ),
      ],
      searched: false,
      cleared: false,
      tradeSold: false,
      visitors: [],
      history: [],
    };
  });
  // Keep the first haul small without changing RNG consumption for later floors.
  const firstStock = floors[0].stock;
  floors[0].stock = [
    { ...firstStock.find((x) => x.id === 'material')!, amount: 4 },
    { ...firstStock.find((x) => x.id === 'supply')!, amount: 2 },
    firstStock.find((x) => x.id === 'rubber' && x.type === 'physical')!,
  ];
  if (tutorial)
    floors[0].stock = [
      makeItem('tutorial-sealant', 'sealant', 'physical'),
      makeItem('tutorial-rubber', 'rubber', 'physical'),
    ];
  return {
    ...(tutorial
      ? {
          tutorialBattleStep: 0,
          openingVersion: 2 as const,
          experienceVersion: 3 as const,
          bagUnlocked: false,
        }
      : {}),
    version: 1,
    scannerVersion: 2,
    catalogVersion: 2,
    utilityUsed: [],
    fieldPrep: { hp: 0, barrier: [0, 0, 0], steps: 0 },
    fieldResearch: { vitality: 0, credit: 0 },
    stopFloor: 0,
    departureFloor: 0,
    seed,
    phase: 'intro',
    day: 1,
    quota: 12,
    streak: 0,
    stamina: 100,
    material: 18,
    power: 12,
    supply: 6,
    fuel: 3,
    medicine: 2,
    scrap: 4,
    charges: 0,
    level: 1,
    moduleCap: 6,
    installed: [],
    facilityUsed: [],
    forecast: false,
    adapted: false,
    prepared: false,
    used: false,
    botsDone: false,
    floor: 0,
    best: 0,
    node: 0,
    objective: false,
    puzzleErrors: 0,
    items: [],
    floors,
    bots: Array.from({ length: 99 }, (_, i) => ({
      id: i + 1,
      floor: 0,
      best: 0,
      quota: 12,
      streak: 0,
      strength: 30 + (i % 7) * 3,
      stamina: 100,
      alive: true,
      status: '正在电梯内准备',
      plan: 0,
    })),
    encounter: null,
    encounterDone: false,
    duel: null,
    notice: '电梯没有下行按钮。',
    log: [],
    ending: '',
    serial: 0,
    clears: [],
  };
}
function need(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
export const rescueCost = (s: Run) => 3 + 2 * s.streak;
export const bagCap = (s: Run) => (s.level >= 5 ? 20 : s.level >= 3 ? 16 : 12);
export const safeCap = (s: Run) => (s.level >= 5 ? 6 : s.level >= 3 ? 4 : 2);
export const openCells = (s: Run) => [
  ...FOUR,
  ...[1, 2, 5, 7, 8].slice(0, s.level - 1),
];
export function autoBoardPosition(s: Run, item: Item): number | null {
  const available = new Set(openCells(s));
  const occupied = new Set(
    s.items
      .filter((x) => x.zone === 'board' && x.uid !== item.uid)
      .flatMap((x) => Array.from({ length: x.volume }, (_, i) => x.at! + i)),
  );
  for (let at = 0; at < 9; at++) {
    if (Math.floor(at / 3) !== Math.floor((at + item.volume - 1) / 3)) continue;
    if (
      Array.from({ length: item.volume }, (_, i) => at + i).every(
        (c) => available.has(c) && !occupied.has(c),
      )
    )
      return at;
  }
  return null;
}
export const tutorialFloor = (s: Run) =>
  s.floor === 1 && s.floors[0]?.routeVersion === 6 && !s.clears.includes(1);
export function identificationState(s: Run) {
  const table =
    s.phase === 'base' && s.level >= 4 && s.installed.includes('identify');
  const count = itemCount(s, 'scanner');
  const allowed =
    ['base', 'floor'].includes(s.phase) &&
    (table ? s.material >= 2 : count > 0);
  return {
    cost: table ? 2 : 1,
    charges: count,
    allowed,
    table,
    reason: table
      ? '鉴定台 · 2 金币 / 次'
      : count
        ? '消耗 1 个鉴定仪'
        : '需要 1 个鉴定仪',
  };
}
export function previewPlacement(s: Run, id: string, at: number) {
  try {
    act(s, { type: 'place', id, at });
    return { allowed: true, reason: '位置合法，确认后生效' };
  } catch (e) {
    return {
      allowed: false,
      reason: e instanceof Error ? e.message : '无法放置',
    };
  }
}
export function refineIngredient(s: Run, item: Item) {
  return s.items
    .filter(
      (x) =>
        x.type === 'card' &&
        x.uid !== item.uid &&
        x.id === item.id &&
        x.quality === item.quality &&
        x.zone !== 'board',
    )
    .sort((a, b) => a.level - b.level || a.uid.localeCompare(b.uid))[0];
}
export const volume = (items: Item[]) =>
  items.reduce((n, x) => n + x.volume, 0);
export const moduleUsed = (s: Run) =>
  2 +
  s.installed.reduce(
    (n, id) => n + FACILITY.find((f) => f.id === id)!.slots,
    0,
  );
export const weatherAt = (s: Run, floor = s.floor, day = s.day) =>
  hash(`${s.seed}/${floor}/${day}/weather`) % 4;
export const layoutAt = (s: Run) =>
  hash(`${s.seed}/${s.floor}/${s.day}/layout`) % 3;
export const currentFloor = (s: Run) => s.floors[s.floor - 1];
export const nodeName: Record<string, string> = {
  ...FIELD_TITLES,
  event: '异象事件',
  search: '搜刮区域',
  antechamber: '守卫前室',
  puzzle: '密码机关',
  merchant: '游商交易',
  guardian: 'BOSS',
  patrol: '普通战',
  elite: '精英战',
  cache: '急救箱',
  bargain: '体力交易',
  rest: '休整点',
  hazard: '危险区域',
  exit: '撤离出口',
};
export const currentNode = (s: Run) => currentFloor(s)?.nodes[s.node] ?? 'exit';
export const searchCost = (s: Run) => Math.max(2, 10 - (s.prepared ? 4 : 0));
export const travelCost = (s: Run) => ((s.fieldPrep?.steps ?? 0) > 0 ? 1 : 3);
export const upgradeCost = (s: Run) =>
  5 + s.level - (s.fieldResearch?.credit ?? 0);
export function fieldToolState(s: Run, uid: string) {
  const item = s.items.find((x) => x.uid === uid),
    node = currentNode(s);
  if (s.phase !== 'floor' || !isFieldNode(node))
    return { allowed: false, reason: '只能在对应现场节点使用' };
  if (currentFloor(s).workResolved?.includes(node))
    return { allowed: false, reason: '本层此处已处理，不能重复领取' };
  if (!item || item.type !== 'physical' || !['bag', 'safe'].includes(item.zone))
    return { allowed: false, reason: '需要随身携带尚未转化的实体' };
  if (OBJECTS[item.id]?.node !== node)
    return { allowed: false, reason: '这件工具不适用于此处' };
  if (s.utilityUsed?.includes(uid))
    return { allowed: false, reason: '这件工具本次出勤已使用' };
  return { allowed: true, reason: '可使用；操作2精力，前往下一节点另计路费' };
}
export function fieldWorkPreview(
  s: Run,
  selection: string | string[],
  lane = 0,
) {
  const ids = typeof selection === 'string' ? [selection] : selection;
  const invalid = ids
    .map((uid) => fieldToolState(s, uid))
    .find((x) => !x.allowed);
  const defs = ids
    .map((uid) => s.items.find((x) => x.uid === uid))
    .flatMap((item) => (item && OBJECTS[item.id] ? [OBJECTS[item.id]] : []));
  const effects = defs.map((def) => def.effect);
  const values = {
    stamina: s.stamina - 2,
    power: s.power,
    material: s.material + (ids.length ? 0 : 2),
    fieldPrep: structuredClone(
      s.fieldPrep ?? { hp: 0, barrier: [0, 0, 0], steps: 0 },
    ),
    fieldResearch: structuredClone(
      s.fieldResearch ?? { vitality: 0, credit: 0 },
    ),
  };
  const prep = values.fieldPrep,
    research = values.fieldResearch;
  for (const def of defs)
    if (Number.isInteger(lane) && lane >= 0 && lane < 3)
      switch (def.effect) {
        case 'salvage':
          values.material += 2;
          prep.barrier[lane] = Math.min(36, prep.barrier[lane] + 12);
          break;
        case 'gold':
          values.material += 4;
          break;
        case 'power':
          values.power += 3;
          break;
        case 'vitality':
          prep.hp = Math.min(32, prep.hp + 16);
          break;
        case 'route':
          prep.steps = 3;
          break;
        case 'credit':
          research.credit = Math.min(4, research.credit + 2);
          break;
        case 'barrier':
          prep.barrier[lane] = Math.min(36, prep.barrier[lane] + 24);
          break;
        case 'rest':
          values.stamina = Math.min(100, values.stamina + 12);
          break;
        case 'etch':
          values.material += 6;
          break;
        case 'research':
          research.vitality = Math.min(10, research.vitality + 2);
          break;
        case 'pump':
          values.power += 2;
          prep.barrier[lane] = Math.min(36, prep.barrier[lane] + 8);
          break;
        case 'water':
          values.stamina = Math.min(100, values.stamina + 20);
          break;
      }
  const road =
    s.openingVersion === 2 && tutorialFloor(s) && currentNode(s) === 'pressure'
      ? 0
      : s.node + 1 < currentFloor(s).nodes.length
        ? prep.steps > 0
          ? 1
          : 3
        : 0;
  const hpBefore =
      240 +
      (s.level - 1) * 10 +
      (s.fieldResearch?.vitality ?? 0) +
      (s.fieldPrep?.hp ?? 0),
    hpAfter = 240 + (s.level - 1) * 10 + research.vitality + prep.hp;
  const barriersBefore = Array.from(
    { length: 3 },
    (_, i) => Math.round(hpBefore * 0.3) + (s.fieldPrep?.barrier[i] ?? 0),
  );
  const barriersAfter = Array.from(
    { length: 3 },
    (_, i) => Math.round(hpAfter * 0.3) + prep.barrier[i],
  );
  const deltas: string[] = [];
  if (values.material !== s.material)
    deltas.push(`金币 +${values.material - s.material}`);
  if (values.power !== s.power) deltas.push(`电力 +${values.power - s.power}`);
  if (effects.some((effect) => ['vitality', 'research'].includes(effect)))
    deltas.push(`宿主上限 ${hpBefore}→${hpAfter}`);
  if (
    effects.some((effect) =>
      ['salvage', 'barrier', 'pump', 'vitality', 'research'].includes(effect),
    )
  )
    for (let i = 0; i < 3; i++) {
      if (barriersBefore[i] !== barriersAfter[i] || i === lane)
        deltas.push(
          `下场${['左', '中', '右'][i]}路屏障 ${barriersBefore[i]}→${barriersAfter[i]}`,
        );
    }
  if (effects.includes('credit'))
    deltas.push(`升级抵扣 ${s.fieldResearch?.credit ?? 0}→${research.credit}`);
  if (effects.includes('route'))
    deltas.push(
      `便捷路程 ${s.fieldPrep?.steps ?? 0}→${prep.steps} 段（包含本次离开）`,
    );
  deltas.push(`结算后精力 ${s.stamina}→${values.stamina - road}`);
  const reason =
    new Set(ids).size !== ids.length
      ? '同一件工具不能重复选择'
      : !Number.isInteger(lane) || lane < 0 || lane > 2
        ? '请选择准备作用的路线'
        : invalid
          ? invalid.reason
          : s.stamina < 2
            ? '操作需要2精力'
            : values.stamina < road
              ? '精力不足以完成操作并前往下一节点'
              : '';
  return { values, road, allowed: !reason, reason, summary: deltas.join('；') };
}
export function puzzle(s: Run) {
  return puzzleSpec(s.seed, s.floor, s.node);
}
export const eventAt = (s: Run) => {
  const spec = eventSpec(s.seed, s.floor, s.node, currentFloor(s).name);
  return spec.kind === 1 && s.level < 3
    ? { ...spec, kind: 2, alt: '用 2 金币修复通路，恢复 6 精力' }
    : spec;
};
export const nodeTitle = (s: Run, index = s.node) =>
  FIELD_TITLES[currentFloor(s).nodes[index] as keyof typeof FIELD_TITLES] ??
  sceneTitle(currentFloor(s).name, currentFloor(s).nodes[index] ?? 'exit');
export const sellPrice = (x: Item) =>
  x.id === 'relic'
    ? 30
    : x.type === 'card'
      ? 2 + x.level + 2 * x.quality + (x.rarity ?? 0)
      : x.type === 'physical'
        ? 2
        : x.type === 'resource'
          ? Math.max(1, Math.floor(x.amount / 2))
          : 1;
export const offerPrice = (x: Item) =>
  x.type === 'physical'
    ? 3 + x.volume
    : x.id === 'scanner'
      ? 6
      : x.type === 'resource'
        ? 3
        : 2;
export function merchantOffers(s: Run) {
  const random = rng(hash(`${s.seed}/${s.floor}/${s.node}/offers`));
  const choices = Array.from({ length: 3 }, () =>
    makeItem(
      `offer-${s.floor}-${s.node}-${Math.floor(random() * 1000000)}`,
      CARDS[Math.floor(random() * CARDS.length)].id,
      'physical',
    ),
  );
  choices.push(
    makeItem(
      `offer-tool-${s.floor}-${s.node}`,
      random() < 0.5 ? 'apple' : 'scanner',
      'tool',
    ),
  );
  choices.push(
    makeItem(
      `offer-supply-${s.floor}-${s.node}`,
      'supply',
      'resource',
      'bag',
      3,
    ),
  );
  // A single low-cost, one-cell option survives old saves and needs no new loot system.
  if (s.floor <= 3)
    choices[0] = makeItem(
      `offer-early-${s.floor}-${s.node}`,
      s.floor === 1 ? 'rubber' : 'distiller',
      'physical',
    );
  return choices.filter(
    (x) =>
      unlockedItem(s, x.id) &&
      !(currentFloor(s).soldOffers ?? []).includes(x.uid),
  );
}
function say(s: Run, text: string) {
  s.notice = text;
  s.log.unshift(`D${s.day} · ${text}`);
  s.log = s.log.slice(0, 80);
}
function validateItem(x: Item) {
  need(
    x && typeof x.uid === 'string' && x.uid.length > 0 && x.uid.length < 100,
    '物品编号无效',
  );
  need(['bag', 'safe', 'warehouse', 'board'].includes(x.zone), '容器无效');
  need(
    ['physical', 'card', 'tool', 'resource'].includes(x.type),
    '物品类型无效',
  );
  need(
    Number.isInteger(x.amount) && x.amount > 0 && x.amount <= 10000,
    '物品数量无效',
  );
  if (x.type === 'physical' || x.type === 'card') {
    need(x.volume === cardDef(x.id).size && x.amount === 1, '卡牌容积无效');
    need(
      Number.isInteger(x.level) &&
        x.level >= 0 &&
        x.level <= 5 &&
        [0, 1, 2].includes(x.quality),
      '培养属性无效',
    );
    if (x.type === 'card' && x.id.includes('~'))
      need(x.rarity === rarityOf(x.id), '变种稀有度不匹配');
    if (x.type === 'physical')
      need(x.rarity === undefined, '实体不应拥有稀有度');
  } else {
    need(
      x.type === 'tool'
        ? [
            'apple',
            'lighter',
            'relic',
            'scanner',
            'supply',
            'fuel',
            'medicine',
            'scrap',
            'core',
          ].includes(x.id)
        : [
            'material',
            'supply',
            'power',
            'fuel',
            'medicine',
            'scrap',
            'core',
          ].includes(x.id),
      '未知物品',
    );
    need(
      x.volume === (['scanner', 'core'].includes(x.id) ? 2 : 1),
      '工具容积无效',
    );
  }
  if (x.type === 'card')
    need(
      Number.isInteger(x.rarity) && x.rarity! >= 0 && x.rarity! <= 4,
      '稀有度无效',
    );
  need(x.zone !== 'safe' || x.id !== 'core', '任务核心禁止进入安全格');
}
export const cargoShape = (s: Run, zone: Zone) => ({
  columns:
    zone === 'safe'
      ? safeCap(s) === 6
        ? 3
        : safeCap(s)
      : zone === 'warehouse'
        ? 6
        : 4,
  capacity:
    zone === 'safe'
      ? safeCap(s)
      : zone === 'warehouse'
        ? Math.max(
            24,
            Math.ceil(
              (s.items
                .filter((x) => x.zone === zone)
                .reduce((n, x) => n + x.volume, 0) +
                12) /
                6,
            ) * 6,
            ...s.items
              .filter((x) => x.zone === zone)
              .map((x) => (x.slot ?? 0) + x.volume * 6),
          )
        : bagCap(s),
});
export function cargoItems(s: Run, zone: Zone) {
  const shape = cargoShape(s, zone);
  return layout(
    s.items.filter((x) => x.zone === zone),
    shape.columns,
    shape.capacity,
  );
}
function validateItems(s: Run, persist = true) {
  const ids = new Set<string>(),
    occupied = new Set<number>();
  for (const x of s.items) {
    validateItem(x);
    need(
      x.slot === undefined ||
        (Number.isInteger(x.slot) && x.slot >= 0 && x.slot < 1200),
      '背包位置无效',
    );
    need(
      x.rotated === undefined || typeof x.rotated === 'boolean',
      '物品朝向无效',
    );
    need(!ids.has(x.uid), '重复物品');
    ids.add(x.uid);
    need(Number.isFinite(x.volume) && x.volume > 0, '物品容积无效');
    if (x.zone === 'board') {
      need(x.type === 'card', '实体不能上阵');
      need(Number.isInteger(x.at), '格位无效');
      const at = x.at!;
      need(
        at >= 0 &&
          at + x.volume <= 9 &&
          Math.floor(at / 3) === Math.floor((at + x.volume - 1) / 3),
        '多格卡牌不可跨路',
      );
      for (let c = at; c < at + x.volume; c++) {
        need(openCells(s).includes(c), '需要连续的已解锁格');
        need(!occupied.has(c), '目标位置被占用，请先移走卡牌');
        occupied.add(c);
      }
    }
    if (x.type === 'card')
      need(
        Number.isInteger(x.rarity) &&
          x.rarity! >= 0 &&
          x.rarity! < 5 &&
          Number.isInteger(x.level) &&
          x.level >= 0 &&
          x.level <= 5 &&
          [0, 1, 2].includes(x.quality),
        '卡牌属性无效',
      );
  }
  need(
    volume(s.items.filter((x) => x.zone === 'bag')) <= bagCap(s),
    '背包已满，可上阵卡牌或转入安全格',
  );
  need(
    volume(s.items.filter((x) => x.zone === 'safe')) <= safeCap(s),
    '安全容器容量不足',
  );
  for (const zone of ['bag', 'safe', 'warehouse'] as Zone[]) {
    const arranged = cargoItems(s, zone);
    if (persist)
      for (const placed of arranged)
        Object.assign(
          s.items.find((x) => x.uid === placed.uid)!,
          placed,
        );
  }
}
function consumeTool(s: Run, id: string) {
  const x = s.items.find(
    (x) => x.id === id && (x.zone === 'bag' || x.zone === 'safe'),
  );
  need(x, '没有携带对应工具');
  x.amount--;
  s.items = s.items.filter((i) => i.amount > 0);
}
function deposit(s: Run) {
  for (const x of s.items.filter(
    (x) => x.type === 'resource' && ['material', 'power'].includes(x.id),
  )) {
    s[x.id as 'material' | 'power'] += x.amount;
    x.amount = 0;
  }
  s.items = s.items.filter((x) => x.amount > 0);
}
function planBots(s: Run) {
  if (s.botsDone) return;
  const random = rng(hash(`${s.seed}/plan/${s.day}`));
  for (const b of s.bots) {
    if (!b.alive) continue;
    b.plan = Math.min(
      10,
      Math.max(b.floor, b.best + 1) + Math.floor(random() * 2),
    );
    b.plan = Math.max(1, b.plan);
    b.status = `准备挑战 ${b.plan} 层`;
  }
}
function botRescue(b: Bot, reason: string) {
  const cost = 3 + 2 * b.streak;
  b.quota = Math.max(0, b.quota - cost);
  b.streak++;
  b.alive = b.quota > 0;
  b.status = `${reason}，回收 -${cost} 生命${b.alive ? '' : '，淘汰'}`;
}
function finishBots(s: Run) {
  if (s.botsDone) return;
  const random = rng(hash(`${s.seed}/bots/${s.day}`));
  const sealedLosers = new Set<number>();
  // A small number of actual co-located bots enter a sealed duel; only its winner continues.
  for (const floor of s.floors) {
    const peers = s.bots.filter(
      (b) => b.alive && b.plan === floor.id && b.id !== s.encounter,
    );
    if (peers.length < 2 || random() >= 0.22) continue;
    const start = Math.floor(random() * peers.length);
    const a = peers[start],
      b = peers[(start + 1) % peers.length];
    const winner = a.strength * (0.85 + random() * 0.3) >= b.strength ? a : b;
    const loser = winner === a ? b : a;
    loser.floor = floor.id;
    loser.stamina = Math.max(0, loser.stamina - 25);
    botRescue(loser, `${floor.id} 层封锁对决败于 #${winner.id}`);
    loser.strength += 5;
    sealedLosers.add(loser.id);
    floor.visitors = [...new Set([...floor.visitors, winner.id, loser.id])];
    floor.history.unshift(
      `D${s.day} / #${winner.id} 在封锁对决中击败 #${loser.id}`,
    );
    floor.history = floor.history.slice(0, 12);
  }
  for (const b of s.bots) {
    if (
      !b.alive ||
      (b.id === s.encounter && s.encounterDone) ||
      sealedLosers.has(b.id)
    )
      continue;
    const floor = s.floors[b.plan - 1];
    if (!floor) continue;
    b.floor = b.plan;
    const danger = 16 + b.floor * 5;
    const success = b.strength * (0.9 + random() * 0.5) >= danger;
    if (success) {
      b.best = Math.max(b.best, b.floor);
      b.streak = 0;
      b.strength += 7;
      b.status = `通关 ${b.floor} 层，回收物资并强化构筑`;
      if (floor.stock.length && random() < 0.12) {
        const i = Math.floor(random() * floor.stock.length);
        floor.stock.splice(i, 1);
        floor.history.unshift(`D${s.day} / #${b.id} 带走一件物资`);
        floor.history = floor.history.slice(0, 12);
      }
    } else {
      botRescue(b, `${b.floor} 层挑战未通过（环境波动后的表现未达要求）`);
      b.strength += 5;
    }
    b.stamina = Math.max(0, b.stamina - 25);
    floor.visitors = [...new Set([...floor.visitors, b.id])];
  }
  s.botsDone = true;
}
function endIfNeeded(s: Run) {
  if (s.quota <= 0) {
    s.quota = 0;
    s.phase = 'ended';
    s.ending = '生命耗尽';
  }
}
function rescue(s: Run, reason: string) {
  const cost = rescueCost(s);
  s.quota = Math.max(0, s.quota - cost);
  s.streak++;
  s.items = s.items.filter((x) => x.zone !== 'bag');
  deposit(s);
  s.phase = 'base';
  s.interaction = null;
  s.objective = false;
  s.duel = null;
  finishBots(s);
  s.floor = s.departureFloor ?? checkpoint(s);
  s.stopFloor = s.floor;
  say(
    s,
    `${reason}，返回 ${s.floor} 层停靠点。强制回收消耗 ${cost} 生命，普通背包丢失，上阵卡、安全格和基地保留。`,
  );
  endIfNeeded(s);
}
export function playerCards(s: Run): FighterCard[] {
  return s.items
    .filter((x) => x.zone === 'board')
    .map((x) => ({
      uid: x.uid,
      id: x.id,
      at: x.at!,
      rarity: x.rarity!,
      quality: x.quality,
      level: x.level,
    }));
}
export function makeDuel(s: Run, kind: 'guardian' | 'survivor'): Duel {
  const floor = s.floor;
  const stage =
    kind === 'survivor'
      ? 'normal'
      : currentNode(s) === 'patrol'
        ? 'normal'
        : currentNode(s) === 'elite'
          ? 'elite'
          : 'boss';
  const scale = stage === 'normal' ? 0.55 : stage === 'elite' ? 0.8 : 1;
  const ids =
    floor <= 2
      ? ['gapblade']
      : floor <= 4
        ? ['gapblade', 'nailer']
        : floor <= 6
          ? ['gapblade', 'nailer', 'distiller']
          : ['gapblade', 'nailer', 'recoil', 'sealant'];
  const ats = [0, 3, 6, 8];
  if (floor >= 9) {
    ids.push('catalyst');
    ats.push(2);
  }
  if (kind === 'guardian' && floor <= 3 && stage !== 'normal') {
    // Local early encounters: a same-lane burst pair, then a split repair line.
    ids.splice(
      0,
      ids.length,
      ...(stage === 'elite' ? ['nailer', 'fuse'] : ['springbow', 'sealant']),
    );
    ats.splice(0, ats.length, ...(stage === 'elite' ? [0, 2] : [3, 6]));
  }
  if (tutorialFloor(s) && stage === 'normal') ats[0] = 6;
  const enemy = ids.map((id, i) => ({
    uid: `enemy-${i}`,
    id:
      i === 0 &&
      !(kind === 'guardian' && floor <= 3 && stage !== 'normal') &&
      hash(`${s.seed}/${floor}/guard`) % 2 === 0
        ? 'gapblade'
        : id,
    at: ats[i],
    rarity: rarityOf(
      i === 0 &&
        !(kind === 'guardian' && floor <= 3 && stage !== 'normal') &&
        hash(`${s.seed}/${floor}/guard`) % 2 === 0
        ? 'gapblade'
        : id,
    ),
    quality: floor >= 5 ? 1 : 0,
    level: Math.floor((floor - 1) / 4),
  }));
  const playerHp =
    240 +
    (s.level - 1) * 10 +
    (s.fieldResearch?.vitality ?? 0) +
    (s.fieldPrep?.hp ?? 0);
  const enemyHp =
    tutorialFloor(s) && stage === 'normal'
      ? 30
      : Math.round((65 + floor * 17) * scale) + (kind === 'survivor' ? 20 : 0);
  return {
    player: playerCards(s),
    enemy,
    maxHp: [playerHp, enemyHp],
    barrierHp: [
      Array.from(
        { length: 3 },
        (_, lane) =>
          Math.round(playerHp * 0.3) + (s.fieldPrep?.barrier[lane] ?? 0),
      ),
      Array(3).fill(Math.round(enemyHp * 0.3)),
    ],
    heroPassives: false,
    weather: 0,
    weatherEnabled: false,
    layout: layoutAt(s),
    name:
      kind === 'survivor'
        ? `幸存者 #${String(s.encounter).padStart(3, '0')}`
        : sceneTitle(
            currentFloor(s).name,
            currentNode(s) === 'antechamber' ? 'guardian' : currentNode(s),
          ),
    stage,
    kind,
    botId: kind === 'survivor' ? s.encounter : null,
  };
}
export function migrateCargo(source: Run): Run {
  need(
    source &&
      (source.catalogVersion === undefined || source.catalogVersion === 2),
    '卡池版本不支持',
  );
  const s = structuredClone(source);
  const checkOldBoard = (
    cards: { id: string; at?: number }[],
    open = Array.from({ length: 9 }, (_, i) => i),
  ) => {
    if (!cards.some((c) => RETIRED_CARDS[c.id])) return;
    const used = new Set<number>();
    for (const c of cards) {
      const size = RETIRED_CARDS[c.id] ? retiredSize(c.id) : cardDef(c.id).size,
        at = c.at;
      need(
        Number.isInteger(at) &&
          at! >= 0 &&
          at! + size <= 9 &&
          Math.floor(at! / 3) === Math.floor((at! + size - 1) / 3),
        '旧阵容跨路或位置无效',
      );
      for (let cell = at!; cell < at! + size; cell++) {
        need(
          open.includes(cell) && !used.has(cell),
          '旧阵容占用冲突或格位未解锁',
        );
        used.add(cell);
      }
    }
  };
  checkOldBoard(
    s.items.filter((x) => x.zone === 'board'),
    openCells(s),
  );
  if (s.duel) {
    checkOldBoard(s.duel.player);
    checkOldBoard(s.duel.enemy);
  }
  let migrated = 0,
    credit = 0;
  for (const item of [...s.items, ...s.floors.flatMap((f) => f.stock)]) {
    if (!['physical', 'card'].includes(item.type) || !RETIRED_CARDS[item.id])
      continue;
    need(item.volume === retiredSize(item.id), '旧物品尺寸无效');
    if (s.items.includes(item) && item.type === 'card')
      credit += RETIRED_SALE_CREDIT[item.id] ?? 0;
    item.id = RETIRED_CARDS[item.id];
    item.volume = cardDef(item.id).size;
    migrated++;
  }
  if (s.duel) {
    for (const card of [...s.duel.player, ...s.duel.enemy])
      if (RETIRED_CARDS[card.id]) {
        card.id = RETIRED_CARDS[card.id];
        migrated++;
      }
    delete s.duel.heroes;
    s.duel.heroPassives = false;
  }
  if (migrated) {
    s.material += credit;
    s.notice = `旧卡已转入12张新卡池；保留编号、位置、品质与等级，原3格牌缩为2格。售价值补差 +${credit} 金币；进行中战斗按已迁移快照重播。`;
  }
  s.catalogVersion = 2;
  s.utilityUsed ??= [];
  s.fieldPrep ??= { hp: 0, barrier: [0, 0, 0], steps: 0 };
  s.fieldResearch ??= { vitality: 0, credit: 0 };
  for (const f of s.floors) f.workResolved ??= [];
  for (const row of [...s.bots, ...(s.dailyReport?.rows ?? [])])
    row.status = row.status.replace(
      /构筑强度 \d+ 低于环境挑战 \d+/,
      '挑战未通过（当时环境波动后的表现未达要求）',
    );
  for (const item of [...s.items, ...s.floors.flatMap((f) => f.stock)])
    if (item.type === 'card') item.rarity ??= rarityOf(item.id);
  if (s.duel)
    for (const card of [...s.duel.player, ...s.duel.enemy])
      card.rarity ??= rarityOf(card.id);
  for (const id of CONSUMABLES) {
    need(
      Number.isInteger(s[id]) && s[id] >= 0 && s[id] <= 10000,
      '旧库存数量无效',
    );
    if (s[id] > 0) grantItem(s, id, s[id]);
    s[id] = 0;
  }
  for (const x of [...s.items, ...s.floors.flatMap((f) => f.stock)])
    if ([...CONSUMABLES, 'core'].includes(x.id)) x.type = 'tool';
  if (s.installed.includes('weather')) s.material += 8;
  s.installed = s.installed.filter((id) => id !== 'weather');
  s.facilityUsed = s.facilityUsed.filter((id) => id !== 'weather');
  if (s.level >= 4 && !s.installed.includes('identify'))
    s.installed.unshift('identify');
  if (s.level < 4) s.installed = s.installed.filter((id) => id !== 'identify');
  if (s.scannerVersion !== 2) {
    const count = itemCount(s, 'scanner', false);
    if (s.charges > count) grantItem(s, 'scanner', s.charges - count);
    s.charges = 0;
    s.scannerVersion = 2;
  }
  s.forecast = false;
  if (s.duel) s.duel.weatherEnabled = false;
  s.dayStartBots ??= s.bots.map(({ id, floor, alive }) => ({
    id,
    floor,
    alive,
  }));

  for (const zone of ['bag', 'safe', 'warehouse'] as Zone[]) {
    const items = s.items.filter((x) => x.zone === zone);
    if (!items.some((x) => x.rotated)) continue;
    items.forEach((x) => {
      x.rotated = false;
      x.slot = undefined;
    });
    const shape = cargoShape(s, zone);
    const fitted: Item[] = [];
    for (const x of [...items].sort((a, b) => b.volume - a.volume)) {
      try {
        const placed = layout([...fitted, x], shape.columns, shape.capacity);
        fitted.splice(0, fitted.length, ...placed);
      } catch {
        x.zone = 'warehouse';
        x.slot = undefined;
        s.notice = '旧版竖放物品已改为横放；容器放不下的物品保存在基地仓库。';
      }
    }
    for (const x of fitted)
      Object.assign(
        s.items.find((i) => i.uid === x.uid)!,
        x,
      );
  }
  for (const floor of s.floors)
    if (floor.stock.some((x) => x.rotated))
      floor.stock = layout(
        floor.stock.map((x) => ({ ...x, rotated: false, slot: undefined })),
        4,
        96,
      );
  return s;
}
export function act(old: Run, a: Action): Run {
  const next = applyAction(old, a);
  if (
    next.phase === 'floor' &&
    next.floor === old.floor &&
    next.node > old.node &&
    next.node < currentFloor(next).nodes.length
  ) {
    const cost = travelCost(next);
    if (a.type !== 'resolve')
      need(
        next.stamina >= cost,
        `前往下个节点需要 ${cost} 精力，可先恢复精力或撤离`,
      );
    next.stamina = Math.max(0, next.stamina - cost);
    if (next.fieldPrep && next.fieldPrep.steps > 0) next.fieldPrep.steps--;
    say(next, `${next.notice} 路程消耗 ${cost} 精力。`);
  }
  if (next.phase === 'base' && ['floor', 'combat'].includes(old.phase))
    next.fieldPrep = { hp: 0, barrier: [0, 0, 0], steps: 0 };
  if (a.type === 'enter')
    next.expedition = { active: true, acquired: [], spent: {}, gained: {} };
  if (next.expedition?.active) {
    const ledger = next.expedition;
    for (const key of [
      'stamina',
      'material',
      'power',
      'quota',
      'supply',
      'scanner',
    ]) {
      const before = ['supply', 'scanner'].includes(key)
        ? itemCount(old, key, false) + (key === 'supply' ? old.supply : 0)
        : Number(old[key as keyof Run]);
      const after = ['supply', 'scanner'].includes(key)
        ? itemCount(next, key, false)
        : Number(next[key as keyof Run]);
      const delta = after - before;
      if (delta) {
        const bucket = delta > 0 ? ledger.gained : ledger.spent;
        bucket[key] = (bucket[key] ?? 0) + Math.abs(delta);
      }
    }
    for (const x of next.items)
      if (
        !old.items.some((y) => y.uid === x.uid) &&
        !ledger.acquired.some((y) => y.uid === x.uid)
      )
        ledger.acquired.push({ ...x });
    if (next.phase === 'base') ledger.active = false;
  }
  validateItems(next);
  for (const floor of next.floors) floor.stock = layout(floor.stock, 4, 96);
  return next;
}
function applyAction(old: Run, a: Action): Run {
  const s = migrateCargo(old);
  s.stopFloor ??= s.best;
  s.departureFloor ??= s.stopFloor;
  if (s.phase === 'base') s.floor = s.stopFloor;
  need(a.rotated !== true, '物品只能横向摆放');
  need(s.phase !== 'ended', '本局已结算，请重新开始');
  if (a.type === 'begin') {
    need(s.phase === 'intro', '协议已确认');
    s.phase = 'base';
    const knife = makeItem(
      s.openingVersion === 2 ? 'starter-slingshot' : 'starter-gapblade',
      s.openingVersion === 2 ? 'slingshot' : 'gapblade',
      'card',
      'board',
    );
    knife.rarity = 0;
    knife.at = 6;
    const wire = makeItem('starter-sealant', 'sealant', 'card', 'board');
    wire.rarity = 0;
    wire.at = 0;
    const shelter = makeItem('starter-nailer', 'nailer', 'card', 'board');
    shelter.rarity = rarityOf('nailer');
    shelter.at = 3;
    s.items = [
      ...s.items.filter((x) =>
        CONSUMABLES.includes(x.id as (typeof CONSUMABLES)[number]),
      ),
      knife,
      wire,
      shelter,
      makeItem('apple', 'apple', 'tool'),
      makeItem('lighter', 'lighter', 'tool'),
      makeItem('starter-object-rubber', 'rubber', 'physical'),
    ];
    if (s.floors[0].routeVersion === 6)
      s.items = [
        ...s.items.filter((x) =>
          CONSUMABLES.includes(x.id as (typeof CONSUMABLES)[number]),
        ),
        knife,
      ];
    say(
      s,
      s.floors[0].routeVersion === 6
        ? '协议生效：你握紧手中的武器，门外传来脚步声。'
        : '协议生效：猎隙刃、破门钉枪与补漏胶已上阵。背包里的缓冲垫可以在泄压气室使用，也可回家免费转化为卡牌。门外只能向上；未通关撤离会回到原停靠点。',
    );
    return s;
  }
  need(s.phase !== 'intro', '请先确认幸存者协议');
  if (a.type === 'tutorial-step') {
    need(
      tutorialFloor(s) && s.phase === 'combat' && currentNode(s) === 'patrol',
      '不在首战引导中',
    );
    need(a.choice === (s.tutorialBattleStep ?? 0), '引导步骤已更新');
    s.tutorialBattleStep = Math.min(8, (s.tutorialBattleStep ?? 0) + 1);
    return s;
  }
  if (a.type === 'resolve') {
    need(s.phase === 'combat' && s.duel, '没有待结算战斗');
    const result = simulateDuel(s.duel);
    const kind = s.duel.kind;
    const defeatedCards = s.duel.enemy;
    const stage = s.duel.stage ?? (kind === 'guardian' ? 'boss' : 'normal');
    const bot = s.bots.find((x) => x.id === s.duel!.botId);
    s.duel = null;
    if (result.timedOut) {
      s.stamina = Math.max(0, s.stamina - 15);
      s.interaction = null;
      if (kind === 'survivor' || stage === 'boss') {
        if (bot) {
          bot.status = '封锁对决超时，双方撤离';
          s.encounterDone = true;
        }
        finishBots(s);
        s.phase = 'base';
        s.objective = false;
        s.floor = s.departureFloor ?? checkpoint(s);
        s.stopFloor = s.floor;
        say(
          s,
          '90 秒未分胜负：本次出勤结束，返回停靠点。消耗 15 精力，生命与物品保留，无奖励、无通关进度。',
        );
      } else {
        s.phase = 'floor';
        s.node++;
        say(
          s,
          '90 秒未分胜负：消耗 15 精力，绕过敌人继续下一个节点，不领取奖励。',
        );
      }
      return s;
    }
    if (result.winner !== 0) {
      if (bot) {
        bot.floor = s.floor;
        s.encounterDone = true;
        if (result.winner === -1) botRescue(bot, '封锁对决同归于尽');
        else {
          bot.best = Math.max(bot.best, s.floor);
          bot.strength += 7;
          bot.streak = 0;
          bot.status = '封锁对决胜出并完成楼层挑战';
        }
      }
      if (stage === 'boss' || kind === 'survivor')
        rescue(
          s,
          kind === 'survivor'
            ? '幸存者 AI 对战失败'
            : result.winner === -1
              ? '与 BOSS 同归于尽'
              : 'BOSS 战失败',
        );
      else {
        s.stamina = Math.max(0, s.stamina - 35);
        s.phase = 'floor';
        s.interaction = null;
        s.node++;
        say(
          s,
          '普通或精英战败：损失 35 精力，继续当前楼层的下一个节点；生命与背包保留，不领取战斗奖励。',
        );
      }
      return s;
    }
    s.phase = 'floor';
    const rewardFloor = currentFloor(s);
    const rewardKey =
      kind === 'survivor' ? `survivor-${s.encounter}` : currentNode(s);
    let rewardText = '';
    if (!(rewardFloor.battleRewards ?? []).includes(rewardKey)) {
      (rewardFloor.battleRewards ??= []).push(rewardKey);
      const gold =
        kind === 'survivor'
          ? 3
          : stage === 'boss'
            ? 4
            : stage === 'elite'
              ? 2
              : 1;
      s.material += gold;
      rewardText = `战利品：金币 +${gold}。`;
    }
    const weapons = defeatedCards.filter((c) =>
      ['damage', 'corrode'].includes(cardDef(c.id).kind),
    );
    if (weapons.length) {
      const card =
        weapons[
          hash(`${s.seed}/${s.day}/${s.floor}/${rewardKey}/${s.serial}`) %
            weapons.length
        ];
      const loot = {
        ...makeItem(`trophy-${s.serial++}`, card.id, 'card'),
        rarity: card.rarity,
        quality: card.quality,
        level: card.level,
      };
      s.loot = {
        item: loot,
        source: 'battle',
        sourceName: '敌方武器',
        sourceUid: card.uid,
        revealed: false,
      };
      s.bagUnlocked = true;
      if (
        s.openingVersion === 2 &&
        tutorialFloor(s) &&
        currentNode(s) === 'patrol' &&
        !s.tutorialRewardUid
      )
        s.tutorialRewardUid = loot.uid;
    }
    if (kind === 'survivor') {
      if (bot) botRescue(bot, '封锁对决败北');
      s.encounterDone = true;
      say(
        s,
        '第 1/2 场：幸存者封锁战已胜利。下一场是本层守卫，点击后才会开战；现在也可以提前撤离。',
      );
    } else if (stage !== 'boss') {
      s.node++;
      say(
        s,
        `${stage === 'elite' ? '精英' : '普通'}战胜利，继续前进。BOSS 仍在本层深处。`,
      );
    } else {
      s.objective = true;
      s.node++;
      say(s, '楼层守卫已击败，全部战斗结束。主目标完成，成功撤离后提交记录。');
    }
    if (stage === 'boss') {
      const chest = [
        {
          item: makeItem(
            tutorialFloor(s) && s.openingVersion === 2
              ? 'tutorial-relic'
              : `relic-${s.serial++}`,
            'relic',
            'tool',
          ),
          source: 'workshop' as const,
          sourceName: '终极宝箱',
          revealed: false,
        },
        {
          item: makeItem(
            tutorialFloor(s) && s.openingVersion === 2
              ? 'tutorial-boss-weapon'
              : `boss-weapon-${s.serial++}`,
            'springbow',
            'physical',
          ),
          source: 'workshop' as const,
          sourceName: '终极宝箱',
          revealed: false,
        },
      ];
      s.lootQueue = chest;
      if (!s.loot) s.loot = s.lootQueue.shift()!;
    }
    if (rewardText) say(s, `${s.notice} ${rewardText}`);
    return s;
  }
  if (a.type === 'close-identification') {
    s.identification = undefined;
    return s;
  }
  if (a.type === 'defense-explained') {
    need(
      s.items.some(
        (x) =>
          x.uid === 'tutorial-rubber' &&
          x.zone === 'board' &&
          Math.floor(x.at! / 3) === 1,
      ),
      '先把缓冲垫放到中路',
    );
    s.defenseExplained = true;
    return s;
  }
  if (a.type === 'buy-scanner') {
    need(s.phase === 'base', '请回电梯商店');
    if (s.shopDay !== s.day) {
      s.shopDay = s.day;
      s.shopBought = 0;
    }
    need((s.shopBought ?? 0) < 2, '今日已售罄');
    need(s.material >= 12, '需要 12 金币');
    s.items.push(
      makeItem(`scanner-${s.serial++}`, 'scanner', 'tool', 'warehouse'),
    );
    s.material -= 12;
    s.shopBought = (s.shopBought ?? 0) + 1;
    if (s.homeGuide === 'buy') s.homeGuide = 'scan';
    say(s, '购入鉴定仪，消耗 12 金币。');
    return s;
  }
  if (a.type === 'sell-relic') {
    need(s.phase === 'base', '请回电梯商店');
    const relic = s.items.find((x) => x.id === 'relic');
    need(relic, '没有可售出的纪念章');
    s.items = s.items.filter((x) => x.uid !== relic.uid);
    s.material += 30;
    if (s.homeGuide === 'sell') s.homeGuide = 'buy';
    say(s, '售出镀金纪念章，获得 30 金币。');
    return s;
  }
  if (a.type.startsWith('minigame-')) {
    need(
      s.phase === 'floor' && currentNode(s) === 'pressure',
      '当前不在特殊玩法房间',
    );
    need(!currentFloor(s).workResolved?.includes('pressure'), '房间已经结算');
    const game = (s.minigame ??= startMinigame(s.seed));
    const definition = MINIGAMES[game.key as keyof typeof MINIGAMES];
    need(!!definition, '未知玩法');
    need(game.status === 'playing', '本次玩法已结束');
    if (a.type === 'minigame-play') {
      need(game.used < game.moves + game.bonus, '步数用尽，可以重置或使用道具');
      game.board = definition.play(game.board, a.choice!);
      game.used++;
    } else if (a.type === 'minigame-tool') {
      const tool = s.items.find(
        (x) =>
          x.uid === a.id &&
          x.type === 'physical' &&
          ['bag', 'safe'].includes(x.zone),
      );
      need(tool && ['sealant', 'rubber'].includes(tool.id), '需要可用实体工具');
      // Reserve the only tutorial defensive specimen for the identification lesson.
      need(
        !(tutorialFloor(s) && tool.uid === 'tutorial-rubber'),
        '留下缓冲垫用于鉴定；可以使用补漏胶增加步数',
      );
      s.items = s.items.filter((x) => x.uid !== tool.uid);
      game.bonus += 4;
    } else if (a.type === 'minigame-reset') {
      game.board = definition.initial(s.seed);
      game.used = 0;
    } else if (a.type === 'minigame-skip') {
      game.status = 'skipped';
      s.node++;
      say(s, '绕过气室，未领取奖励。');
    } else if (a.type === 'minigame-complete') {
      need(definition.complete(game.board), '管道尚未接通');
      need(s.stamina >= 2, '需要 2 精力');
      game.stars = rewardStars(game.moves + game.bonus - game.used);
      game.status = 'completed';
      s.stamina -= 2;
      s.material += game.stars * 2;
      currentFloor(s).workResolved!.push('pressure');
      s.loot = {
        item: makeItem('tutorial-scanner', 'scanner', 'tool'),
        source: 'workshop',
        sourceName: `${game.stars} 星检修箱`,
        revealed: false,
      };
      say(s, `泄压成功 · ${game.stars} 星 · 金币 +${game.stars * 2}`);
    } else throw Error('未知玩法操作');
    return s;
  }
  if (a.type === 'equipment-explained') {
    need(
      s.items.some((x) => x.uid === s.tutorialRewardUid && x.zone === 'board'),
      '先放置战利品',
    );
    s.equipmentExplained = true;
    return s;
  }
  if (a.type === 'energy-explained') {
    s.energyExplained = true;
    return s;
  }
  if (a.type === 'reveal-loot') {
    need(s.loot, '没有待领取战利品');
    s.loot.revealed = true;
    return s;
  }
  if (a.type === 'claim-loot') {
    need(s.loot?.revealed, '先揭晓战利品');
    const reward = s.loot!;
    s.items.push({ ...reward.item });
    validateItems(s);
    s.loot = s.lootQueue?.shift() ?? null;
    if (s.loot?.sourceName === reward.sourceName) s.loot.revealed = true;
    say(s, `${itemName(reward.item)}已收入背包。`);
    return s;
  }
  const packing = ['place', 'equip', 'unequip', 'move', 'drop'].includes(
    a.type,
  );
  need(!s.loot || packing, '请先领取战利品；空间不足时可打开背包整理');
  need(s.phase !== 'combat' || packing, '战斗中只能整理行装；本场阵容已锁定');
  if (a.type === 'place') {
    const x = s.items.find((item) => item.uid === a.id);
    need(x?.type === 'card', '请选择已鉴定卡牌');
    need(
      s.phase === 'base' || x.zone !== 'warehouse',
      '楼层中无法访问基地仓库',
    );
    need(Number.isInteger(a.at), '请选择落点');
    const at = a.at!;
    const overlaps = s.items.filter(
      (other) =>
        other.zone === 'board' &&
        other.uid !== x.uid &&
        other.at! < at + x.volume &&
        other.at! + other.volume > at,
    );
    need(overlaps.length <= 1, '目标涉及多张牌，不支持连锁交换');
    const other = overlaps[0];
    if (other) {
      need(at === other.at, '换位请点击目标卡牌的起始格');
      other.zone = x.zone;
      other.at = x.zone === 'board' ? x.at : undefined;
      other.slot = undefined;
    }
    x.zone = 'board';
    x.at = at;
    x.slot = undefined;
    say(
      s,
      other
        ? `${itemName(x)}与${itemName(other)}已交换位置。`
        : `${itemName(x)}已放至${['左路', '中路', '右路'][Math.floor(at / 3)]}第${(at % 3) + 1}格。`,
    );
    // act validates the entire candidate once before returning it; the original is untouched.
    return s;
  }
  if (a.type === 'equip' || a.type === 'unequip') {
    const item = s.items.find((x) => x.uid === a.id);
    need(item?.type === 'card', '请选择卡牌');
    if (a.type === 'equip') {
      need(item.zone !== 'board', '该卡牌已经上阵');
      const at = autoBoardPosition(s, item);
      need(at !== null, `没有能容纳 ${item.volume} 格卡牌的连续已解锁空位`);
      return applyAction(s, { type: 'move', id: item.uid, to: 'board', at });
    }
    need(item.zone === 'board', '该卡牌尚未上阵');
    return applyAction(s, { type: 'move', id: item.uid, to: 'bag' });
  }
  if (a.type === 'move') {
    const x = s.items.find((x) => x.uid === a.id);
    need(x && a.to, '物品不存在');
    if (s.phase !== 'base')
      need(
        x.zone !== 'warehouse' && a.to !== 'warehouse',
        '楼层中无法访问基地仓库',
      );
    if (a.to === 'board') need(x.type === 'card', '只有鉴定后的卡牌可以上阵');
    if (a.to === 'safe') need(x.id !== 'core', '任务核心不能放入安全格');
    x.slot = a.slot;
    if (a.rotated !== undefined) x.rotated = a.rotated;
    x.zone = a.to;
    x.at = a.to === 'board' ? a.at : undefined;
    validateItems(s);
    say(s, `${itemName(x)}已转移；上阵卡牌不占背包容量。`);
    return s;
  }
  if (a.type === 'scan') {
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.type === 'physical', '请选择未鉴定实体');
    if (s.phase === 'floor') {
      if (tutorialFloor(s) && !s.objective)
        need(
          s.openingVersion === 2
            ? x.id === 'rubber' &&
                currentFloor(s).workResolved?.includes('pressure')
            : x.id === 'nailer',
          '先完成气室，保留工具用于解谜',
        );
      const state = identificationState(s);
      need(state.allowed, state.reason);
      need(x.zone === 'bag' || x.zone === 'safe', '只能鉴定随身携带的实体');
    }
    const state = identificationState(s);
    need(state.allowed, state.reason);
    if (state.table) s.material -= 2;
    else spendItem(s, 'scanner');
    const roll = hash(`${s.seed}/identify/${x.uid}`) % 100;
    const rarity =
      x.uid === 'tutorial-rubber'
        ? 2
        : roll < 45
          ? 0
          : roll < 73
            ? 1
            : roll < 90
              ? 2
              : roll < 98
                ? 3
                : 4;
    const variant = identifyVariant(
      x.id,
      rarity,
      x.uid === 'tutorial-rubber' ? 0 : hash(`${s.seed}/variant/${x.uid}`),
    );
    x.id = variant.id;
    x.rarity = variant.rarity!;
    x.type = 'card';
    x.quality = x.rarity >= 4 ? 2 : x.rarity >= 2 ? 1 : 0;
    s.identification = { uid: x.uid };
    if (s.homeGuide === 'scan' && x.uid === 'tutorial-boss-weapon')
      s.homeGuide = 'sleep';
    say(
      s,
      `鉴定完成：${itemName(x)} / ${RARITY[x.rarity].name}。${state.table ? '消耗 2 金币。' : '消耗 1 个鉴定仪。'}`,
    );
    return s;
  }
  if (a.type === 'consume') {
    const x = s.items.find((x) => x.uid === a.id);
    need(
      x && (s.phase === 'base' || x.zone === 'bag' || x.zone === 'safe'),
      '请先把物品装入随身容器',
    );
    need(
      ['apple', 'supply', 'medicine'].includes(x.id),
      '该物品通过设施或节点选项使用',
    );
    need(s.stamina < 100, '精力已经充足');
    const gain = x.id === 'medicine' ? 35 : 25;
    s.stamina = Math.min(100, s.stamina + gain);
    x.amount--;
    s.items = s.items.filter((i) => i.amount > 0);
    say(s, `使用${itemName(x)}，恢复 ${gain} 精力。`);
    return s;
  }
  if (a.type === 'drop') {
    need(!tutorialFloor(s), '引导关的物品请先留在行囊中');
    const x = s.items.find((x) => x.uid === a.id);
    need(x, '物品不存在');
    need(x.zone !== 'board', '请先卸下卡牌');
    need(['floor', 'combat'].includes(s.phase), '基地物品可回收，不需要丢弃');
    s.items = s.items.filter((i) => i.uid !== x.uid);
    currentFloor(s).stock.push({ ...x, zone: 'bag', slot: undefined });
    say(s, '物品留在本层，可以再次拾取，也可能被其他幸存者带走。');
    return s;
  }
  if (a.type === 'recycle') {
    need(s.phase === 'base', '请回基地回收');
    need(s.level >= 2, '电梯 Lv.2 解锁分解回收');
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.zone !== 'board', '请先卸下物品');
    s.material += 2 + x.quality * 2;
    if (growthRefund(x.level)) grantItem(s, 'scrap', growthRefund(x.level));
    s.items = s.items.filter((i) => i.uid !== x.uid);
    say(s, '物品已回收为金币，返还 80% 强化废料（向下取整）。');
    return s;
  }
  if (a.type === 'grow' || a.type === 'refine') {
    need(s.phase === 'base', '请回终端培养');
    need(s.level >= 2, '电梯 Lv.2 解锁卡牌培养');
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.type === 'card', '请选择卡牌');
    need(a.type === 'grow' ? x.level < 5 : x.quality < 2, '已达培养上限');
    if (a.type === 'grow') {
      const cost = growthCost(x.level);
      need(itemCount(s, 'scrap', false) >= cost, '强化废料不足');
      spendItem(s, 'scrap', cost);
      x.level++;
      say(s, `强化至 Lv ${x.level}，消耗 ${cost} 废料。`);
    } else {
      const duplicate = refineIngredient(s, x);
      need(duplicate, '需要一张未上阵、同名且同品阶的卡牌');
      s.items = s.items.filter((item) => item.uid !== duplicate.uid);
      if (growthRefund(duplicate.level))
        grantItem(s, 'scrap', growthRefund(duplicate.level));
      x.quality++;
      say(
        s,
        `吞噬同卡，升为${QUALITY[x.quality]}；主卡等级保留，素材卡返还 80% 强化废料。`,
      );
    }
    return s;
  }
  if (a.type === 'sleep') {
    need(s.phase === 'base', '只能回到床上睡觉');
    planBots(s);
    finishBots(s);
    const supplyBefore = itemCount(s, 'supply');
    const supplySource = s.items.find(
      (x) => x.id === 'supply' && x.zone !== 'board',
    );
    const fed = supplyBefore > 0;
    if (fed) spendItem(s, 'supply');
    s.stamina = Math.min(100, s.stamina + (fed ? 50 : 15));
    s.quota--;
    s.day++;
    if (s.homeGuide === 'sleep') s.homeGuide = 'done';
    s.used = false;
    s.botsDone = false;
    s.forecast = false;
    s.facilityUsed = [];
    for (const b of s.bots) {
      if (!b.alive) continue;
      b.quota = Math.max(0, b.quota - 1);
      b.stamina = Math.min(100, b.stamina + 50);
      if (!b.quota) {
        b.alive = false;
        b.status = '生命耗尽';
      }
    }
    s.dailyReport = {
      day: s.day - 1,
      rows: s.bots.map((b) => ({
        id: b.id,
        floor: b.floor,
        previousFloor:
          s.dayStartBots?.find((x) => x.id === b.id)?.floor ?? b.floor,
        alive: b.alive,
        wasAlive: s.dayStartBots?.find((x) => x.id === b.id)?.alive ?? b.alive,
        status: b.status,
      })),
    };
    s.dayStartBots = s.bots.map(({ id, floor, alive }) => ({
      id,
      floor,
      alive,
    }));
    say(
      s,
      `第 ${s.day} 天：${fed ? `消耗${supplySource?.zone === 'warehouse' ? '仓库' : supplySource?.zone === 'safe' ? '安全容器' : '背包'} 1 补给（基地可用总量 ${supplyBefore} → ${supplyBefore - 1}），恢复 50` : '缺少补给，仅恢复 15'} 精力；生命 -1。`,
    );
    endIfNeeded(s);
    return s;
  }
  if (
    a.type === 'build' ||
    a.type === 'remove' ||
    a.type === 'facility' ||
    a.type === 'expand' ||
    a.type === 'upgrade'
  ) {
    need(s.phase === 'base', '基地操作需要回到电梯');
    need(
      s.experienceVersion !== 3 || s.level > 1 || s.systemsUnlocked === true,
      '电梯系统尚未随引导开启',
    );
    const f = FACILITY.find((f) => f.id === a.id);
    if (a.type === 'expand') {
      need(s.moduleCap < 10 && s.material >= 6, '扩建需要 6 金币，上限 10 槽');
      s.moduleCap += 2;
      s.material -= 6;
    } else if (a.type === 'upgrade') {
      const cost = upgradeCost(s);
      need(s.level < 6 && s.material >= cost, `升级需 ${cost} 金币，上限 Lv.6`);
      s.material -= cost;
      s.fieldResearch!.credit = 0;
      s.level++;
      if (s.level === 3 && !s.items.some((x) => x.id === 'scanner'))
        s.items.push(makeItem('scanner', 'scanner', 'tool', 'warehouse'));
    } else {
      need(f, '未知设施');
      need(
        s.level >= FACILITY_LEVEL[f.id] || s.installed.includes(f.id),
        `电梯 Lv.${FACILITY_LEVEL[f.id]} 解锁此设施`,
      );
      if (a.type === 'build') {
        need(
          !s.installed.includes(f.id) && moduleUsed(s) + f.slots <= s.moduleCap,
          '设施已建造或空间不足',
        );
        need(s.material >= f.cost, '金币不足');
        s.material -= f.cost;
        s.installed.push(f.id);
      } else if (a.type === 'remove') {
        need(s.installed.includes(f.id), '设施未建造');
        need(f.id !== 'identify', '初始鉴定台不可拆除');
        s.installed = s.installed.filter((i) => i !== f.id);
        s.material += Math.floor(f.cost / 2);
      } else {
        need(
          s.installed.includes(f.id) && !s.facilityUsed.includes(f.id),
          '设施未建造或今天已使用',
        );
        switch (f.id) {
          case 'identify':
            say(s, '前往鉴定台选择实体物品');
            break;
          case 'grow':
            need(s.material >= 1 && s.power >= 3, '需要 1 金币、3 电力');
            s.material--;
            s.power -= 3;
            grantItem(s, 'supply', 2);
            break;
          case 'generator':
            need(itemCount(s, 'fuel') > 0, '需要燃料');
            spendItem(s, 'fuel');
            s.power += 8;
            break;
          case 'clinic':
            need(
              itemCount(s, 'medicine') > 0 && s.stamina < 100,
              '需要药品且精力未满',
            );
            spendItem(s, 'medicine');
            s.stamina = Math.min(100, s.stamina + 35);
            break;
          case 'weather':
            s.forecast = true;
            break;
          case 'recycle':
            need(itemCount(s, 'scrap') >= 2, '需要 2 废料');
            spendItem(s, 'scrap', 2);
            s.material += 3;
            break;
          case 'workshop':
            need(s.material >= 8 && s.power >= 2, '需要 8 金币和 2 电力');
            s.material -= 8;
            s.power -= 2;
            grantItem(s, 'scanner', 1);
            break;
          case 'storage':
            need(itemCount(s, 'scrap') >= 2, '需要 2 废料束');
            spendItem(s, 'scrap', 2);
            grantItem(s, 'fuel', 1);
            break;
          case 'adapt':
            need(
              s.material >= 2 && s.power >= 2 && !s.adapted,
              '需要 2 金币、2 电力，且没有待用装备',
            );
            s.material -= 2;
            s.power -= 2;
            s.adapted = true;
            break;
        }
        s.facilityUsed.push(f.id);
      }
    }
    say(
      s,
      a.type === 'upgrade'
        ? `电梯升至 Lv.${s.level}。${LEVEL_GUIDE[s.level - 1]}${s.level === 3 ? '便携鉴定仪已送入仓库，终端已解封电力与燃料库存。' : ''}`
        : a.type === 'expand'
          ? '电梯扩建完成。'
          : `${f!.name} · ${a.type === 'build' ? '建造完成' : a.type === 'remove' ? '拆除返还一半金币，当日使用记录保留' : '今日处理完成'}`,
    );
    return s;
  }
  if (a.type === 'deposit') {
    need(s.phase === 'base', '回到基地才能交付物资');
    deposit(s);
    say(s, '资源已存入基地；燃料溢出部分继续留在容器里。');
    return s;
  }
  if (a.type === 'craft-scanner') {
    need(s.phase === 'base', '需要回到终端');
    need(s.level >= 3, '电梯 Lv.3 解锁便携鉴定');
    need(
      !s.items.some((x) => x.id === 'scanner'),
      '已经拥有鉴定仪，可从仓库取回',
    );
    need(s.material >= 4 && s.power >= 2, '重新制造需要 4 金币与 2 电力');
    s.items.push(
      makeItem(`scanner-${s.serial++}`, 'scanner', 'tool', 'warehouse'),
    );
    validateItems(s);
    s.material -= 4;
    s.power -= 2;
    say(s, '已制造一个一次性鉴定仪。');
    return s;
  }
  if (a.type === 'enter') {
    need(s.phase === 'base' && !s.used, '每天只能出勤一次，睡眠后恢复');
    need(
      Number.isInteger(a.floor) &&
        a.floor! >= Math.max(1, checkpoint(s)) &&
        a.floor! <= 10,
      '电梯只能向上，或重试当前层',
    );
    need(
      itemCount(s, 'supply') >= 1 && s.stamina >= 12,
      '出勤需 1 补给和至少 12 精力',
    );
    need(playerCards(s).length > 0, '请至少上阵一张卡');
    planBots(s);
    s.departureFloor = checkpoint(s);
    s.floor = a.floor!;
    if (![4, 5, 6].includes(currentFloor(s).routeVersion ?? 0)) {
      currentFloor(s).nodes = floorRoute(s.seed, s.floor);
      currentFloor(s).routeVersion = 4;
    }
    s.used = true;
    spendItem(s, 'supply');
    s.stamina -= 4;
    s.phase = 'floor';
    s.node = 0;
    s.utilityUsed = [];
    s.minigame = undefined;
    s.fieldPrep = { hp: 0, barrier: [0, 0, 0], steps: 0 };
    s.interaction = null;
    s.objective = false;
    s.puzzleErrors = 0;
    s.prepared = s.adapted;
    s.adapted = false;
    s.encounterDone = false;
    const peers = s.bots.filter((b) => b.alive && b.plan === s.floor);
    s.encounter =
      ![5, 6].includes(currentFloor(s).routeVersion ?? 0) &&
      peers.length &&
      hash(`${s.seed}/${s.day}/${s.floor}/encounter`) % 100 < 28
        ? peers[0].id
        : null;
    currentFloor(s).visitors = [...new Set([...currentFloor(s).visitors, 0])];
    say(
      s,
      `抵达 ${s.floor} 层 · ${currentFloor(s).name}。${s.encounter ? '检测到其他幸存者，封锁对决前可提前撤离。' : '电梯停靠点已标记。'}返回需要预留 8 精力。`,
    );
    return s;
  }
  if (a.type === 'sell') {
    need(
      s.phase === 'base' ||
        (s.interaction === 'trade' && currentNode(s) === 'merchant'),
      '请先进入交易状态',
    );
    const x = s.items.find((x) => x.uid === a.id);
    need(
      x &&
        (s.phase === 'base'
          ? ['bag', 'safe', 'warehouse']
          : ['bag', 'safe']
        ).includes(x.zone) &&
        x.id !== 'core',
      '只能出售随身物品；上阵卡请先卸下',
    );
    const amount = sellPrice(x);
    s.items = s.items.filter((i) => i.uid !== x.uid);
    s.material += amount;
    if (s.phase === 'base' && x.id === 'relic' && s.homeGuide === 'sell')
      s.homeGuide = 'buy';
    say(s, `售出${itemName(x)}，获得 ${amount} 金币，背包容量已释放。`);
    return s;
  }
  need(s.phase === 'floor', '请先进入楼层');
  if (a.type === 'arrange-stock') {
    need(s.interaction === 'search', '请先搜查区域');
    const x = currentFloor(s).stock.find((x) => x.uid === a.id);
    need(x && unlockedItem(s, x.id), '物品不可用');
    x.slot = a.slot;
    x.rotated = a.rotated ?? x.rotated;
    currentFloor(s).stock = layout(currentFloor(s).stock, 4, 96);
    return s;
  }
  if (a.type === 'pickup') {
    const floor = currentFloor(s);
    need(s.interaction === 'search', '请在搜查状态中拾取物资');
    const x = floor.stock.find((x) => x.uid === a.id);
    need(x, '这件物资已被拿走');
    need(unlockedItem(s, x.id), '电梯升级后可识别这类物资');
    need(!a.to || ['bag', 'safe'].includes(a.to), '只能拾取到随身容器');
    if (x.type === 'resource' && ['material', 'power'].includes(x.id)) {
      s[x.id as 'material' | 'power'] += x.amount;
      floor.stock = floor.stock.filter((i) => i.uid !== x.uid);
      say(s, `取得${itemName(x)} ×${x.amount}`);
      return s;
    }
    s.items.push({
      ...x,
      zone: a.to ?? 'bag',
      at: undefined,
      slot: a.slot,
      rotated: a.rotated ?? x.rotated,
    });
    validateItems(s);
    floor.stock = floor.stock.filter((i) => i.uid !== x.uid);
    say(s, `取得${itemName(x)}，物资从共享楼层中移除。`);
    return s;
  }
  if (a.type === 'extract') {
    need(!tutorialFloor(s) || s.objective, '先完成引导关，再乘电梯返回');
    need(s.stamina >= 8, '返回需 8 精力，可吃苹果或请求救援');
    s.stamina -= 8;
    s.phase = 'base';
    s.interaction = null;
    s.streak = 0;
    const firstClear = s.objective && !s.clears.includes(s.floor);
    if (firstClear) {
      s.best = Math.max(s.best, s.floor);
      s.clears.push(s.floor);
      currentFloor(s).cleared = true;
      s.material += 4 + Math.ceil(s.floor / 2);
      grantItem(s, 'supply', 2);
    }
    if (firstClear && s.floor === 1 && s.openingVersion === 2)
      s.homeGuide = 'sell';
    deposit(s);
    finishBots(s);
    say(
      s,
      s.objective
        ? `已撤回，通关记录 ${s.best} 层。${firstClear ? `首次通关奖励 ${4 + Math.ceil(s.floor / 2)} 金币、2 补给。` : '本层奖励已领取，不重复发放。'}`
        : '提前撤离，保住随身物资；本层未计入通关高度。',
    );
    if (s.objective) s.stopFloor = Math.max(checkpoint(s), s.floor);
    if (s.objective && s.floor === 10) {
      s.phase = 'ended';
      s.ending = '十层幸存者协议完成';
    }
    s.floor = checkpoint(s);
    if (!s.objective)
      say(
        s,
        `提前撤离，返回 ${s.floor} 层停靠点；保住随身物资，未提交新高度。`,
      );
    return s;
  }
  if (a.type === 'rescue') {
    need(!tutorialFloor(s), '引导关不启用紧急回收');
    rescue(s, '主动发送回收信号');
    return s;
  }
  if (a.type === 'fight') {
    need(
      s.stamina >= 3,
      '精力不足：开始下一场战斗至少需要 3 精力，可使用苹果或撤离',
    );
    need(
      ['patrol', 'elite', 'guardian'].includes(currentNode(s)),
      '尚未到达战斗节点',
    );
    need(playerCards(s).length > 0, '请先上阵卡牌');
    const kind =
      currentNode(s) === 'guardian' && s.encounter !== null && !s.encounterDone
        ? 'survivor'
        : 'guardian';
    s.duel = makeDuel(s, kind);
    s.fieldPrep = { hp: 0, barrier: [0, 0, 0], steps: s.fieldPrep?.steps ?? 0 };
    s.phase = 'combat';
    say(
      s,
      kind === 'survivor'
        ? '封锁对决开始，本场只能有一名胜者继续。'
        : '守卫战开始。攻击先削减同路屏障，损毁后直击宿主；卡牌持续运转，屏障本场不重建。',
    );
    return s;
  }
  const node = currentNode(s);
  if (a.type === 'approach-guardian') {
    need(node === 'antechamber', '尚未到达守卫前室');
    if (
      s.experienceVersion === 3 &&
      s.items.some((x) => x.uid === 'tutorial-rubber' && x.type === 'card')
    )
      need(s.defenseExplained, '先观察敌情，把缓冲垫放到中路');
    s.node++;
    say(s, '你推开内门。守卫转过身，归返信标就在它的身后。');
    return s;
  }
  if (a.type === 'tutorial-continue') {
    need(
      s.openingVersion === 2 &&
        tutorialFloor(s) &&
        currentNode(s) === 'pressure' &&
        currentFloor(s).workResolved?.includes('pressure'),
      '气室尚未完成',
    );
    need(
      s.items.some((x) => x.uid === 'tutorial-rubber' && x.type === 'card'),
      '先鉴定缓冲垫',
    );
    s.node++;
    say(s, '检修完成，前往守卫前室。');
    return s;
  }
  if (a.type === 'pipe-work') {
    need(s.experienceVersion !== 3, '请使用当前机关的完成按钮');
    need(tutorialFloor(s) && node === 'pressure', '当前不是引导气室');
    need(!currentFloor(s).workResolved?.includes(node), '气室已完成');
    need(pipeConnected(a.turns), '管道尚未接通');
    need(a.id === 'tutorial-rubber', '需要刚才拾取的缓冲垫');
    const tool = fieldToolState(s, a.id);
    need(tool.allowed, tool.reason);
    const ids = s.openingVersion === 2 ? [a.id, 'tutorial-sealant'] : [a.id];
    const lane = Math.floor(
      (s.items.find((x) => x.uid === s.tutorialRewardUid && x.zone === 'board')
        ?.at ?? 3) / 3,
    );
    const preview = fieldWorkPreview(s, ids, lane);
    need(preview.allowed, preview.reason);
    Object.assign(s, preview.values);
    s.utilityUsed!.push(...ids);
    if (s.openingVersion === 2)
      s.items = s.items.filter((x) => x.uid !== 'tutorial-sealant');
    currentFloor(s).workResolved!.push(node);
    if (s.openingVersion === 2)
      s.loot = {
        item: makeItem('tutorial-scanner', 'scanner', 'tool'),
        source: 'workshop',
        sourceName: '气室检修箱',
        revealed: false,
      };
    else s.node++;
    say(s, `蒸汽顺着管道排出。${preview.summary}，缓冲垫已收回。`);
    return s;
  }
  if (a.type === 'field-work') {
    need(
      !(s.openingVersion === 2 && tutorialFloor(s)),
      '请完成气室检修与鉴定后继续',
    );
    need(
      !tutorialFloor(s) || currentFloor(s).workResolved?.includes(node),
      '请接通泄压管道',
    );
    need(isFieldNode(node), '当前不是物品机关节点');
    const done = currentFloor(s).workResolved!;
    if (done.includes(node)) {
      need(a.choice === -2, '此处已处理，不能再次领取奖励');
      s.node++;
      say(s, '沿已处理的通道继续前进，没有重复奖励。');
      return s;
    }
    if (a.choice === -1) {
      need(s.stamina >= 6, '绕行需要6精力，另计前往下个节点的路费');
      s.stamina -= 6;
      done.push(node);
      s.node++;
      say(s, '绕过机关，不消耗工具，不领取奖励。');
      return s;
    }
    const ids = a.ids ?? (a.id ? [a.id] : []);
    need(
      Array.isArray(ids) && ids.every((id) => typeof id === 'string'),
      '请选择工具',
    );
    need(new Set(ids).size === ids.length, '同一件工具不能重复选择');
    for (const uid of ids) {
      const state = fieldToolState(s, uid);
      need(state.allowed, state.reason);
    }
    const selected = ids.map((uid) => s.items.find((x) => x.uid === uid)!);
    const task = fieldTask(s.seed, s.floor, node);
    need(
      Number.isInteger(a.choice) && a.choice! >= 0 && a.choice! <= 999,
      '请完成机关操作',
    );
    need(
      Number.isInteger(a.at) && a.at! >= 0 && a.at! < 3,
      '请选择准备作用的路线',
    );
    need(s.stamina >= 2, '操作需要2精力');
    s.stamina -= 2;
    if (a.choice !== task.answer) {
      s.puzzleErrors++;
      say(s, '机关仍未稳定 · 精力 −2，工具完好。');
      return s;
    }
    // The same pure calculation powers UI preview and the atomic successful commit.
    s.stamina += 2;
    const preview = fieldWorkPreview(s, ids, a.at);
    need(preview.allowed, preview.reason);
    Object.assign(s, preview.values);
    s.utilityUsed!.push(...ids);
    const consumed = new Set(
      selected.filter((x) => OBJECTS[x.id].consumed).map((x) => x.uid),
    );
    s.items = s.items.filter((x) => !consumed.has(x.uid));
    done.push(node);
    s.node++;
    say(
      s,
      `作业完成：${preview.summary}。${consumed.size ? `用尽 ${consumed.size} 件工具。` : ''}`,
    );
    return s;
  }
  if (a.type === 'next-node') {
    if (tutorialFloor(s) && node === 'search' && s.openingVersion === 2)
      need(
        ['tutorial-rubber', 'tutorial-sealant'].every((uid) =>
          s.items.some(
            (x) =>
              x.uid === uid &&
              x.type === 'physical' &&
              ['bag', 'safe'].includes(x.zone),
          ),
        ),
        '先拾取两件解谜工具',
      );
    if (tutorialFloor(s) && node === 'search' && s.openingVersion !== 2)
      need(
        s.items.some(
          (x) => x.uid === 'tutorial-nailer' && x.zone === 'board',
        ) &&
          s.items.some(
            (x) =>
              x.uid === 'tutorial-rubber' &&
              x.type === 'physical' &&
              ['bag', 'safe'].includes(x.zone),
          ),
        '先鉴定并装备钉枪，带上缓冲垫',
      );
    need(
      (s.interaction === 'search' && node === 'search') ||
        (s.interaction === 'trade' && node === 'merchant'),
      '当前没有可结束的搜查或交易',
    );
    s.interaction = null;
    s.node++;
    say(s, '已收好行囊，继续前进。');
    return s;
  }
  if (a.type === 'open-trade') {
    need(node === 'merchant' && !s.interaction, '当前无法开始交易');
    s.interaction = 'trade';
    say(
      s,
      '交易已开启，可购买、出售和整理随身物品；结束后主动前往下个目的地。',
    );
    return s;
  }
  if (a.type === 'cache') {
    need(node === 'cache', '不在急救箱节点');
    if (a.choice !== 2)
      s.items.push(
        makeItem(
          `cache-${s.serial++}`,
          a.choice === 1 ? 'lighter' : 'apple',
          'tool',
        ),
      );
    s.node++;
    say(
      s,
      a.choice === 2 ? '保留急救箱，继续前进。' : '已取得应急用品，放入背包。',
    );
    return s;
  }
  if (a.type === 'bargain') {
    need(node === 'bargain', '不在交易节点');
    if (a.choice === 1) {
      need(s.stamina >= 12, '需要 12 精力');
      s.stamina -= 12;
      s.material += 4;
    }
    s.node++;
    say(
      s,
      a.choice === 1 ? '用 12 精力换取 4 金币。' : '拒绝体力交易，继续前进。',
    );
    return s;
  }
  if (a.type === 'rest') {
    need(node === 'rest', '当前不是休整点');
    if (a.choice === 1) {
      need(
        s.level >= 2 && itemCount(s, 'medicine') > 0,
        '需要 Lv.2 与携带 1 医疗包',
      );
      spendItem(s, 'medicine');
      s.stamina = Math.min(100, s.stamina + 25);
    } else s.stamina = Math.min(100, s.stamina + 8);
    s.node++;
    say(s, '完成短暂休整，日期没有推进。');
    return s;
  }
  if (a.type === 'hazard') {
    need(node === 'hazard', '当前不是危险区域');
    if (a.choice === 1) {
      need(s.level >= 3 && s.power >= 2, '需要 Lv.3 与 2 电力');
      s.power -= 2;
    } else {
      need(s.stamina >= 8, '穿越危险区域需要 8 精力');
      s.stamina -= 8;
    }
    s.node++;
    say(s, '已穿过危险区域，继续前进。');
    return s;
  }
  if (a.type === 'event') {
    need(node === 'event', '当前不是事件节点');
    const spec = eventAt(s);
    if (a.choice === 1) {
      if (spec.kind === 0) {
        consumeTool(s, 'lighter');
        s.stamina = Math.min(100, s.stamina + 8);
      }
      if (spec.kind === 1) {
        need(s.level >= 3 && s.power >= 2, '需要 Lv.3 与 2 电力');
        s.power -= 2;
        s.stamina = Math.min(100, s.stamina + 12);
      }
      if (spec.kind === 2) {
        need(s.material >= 2, '需要 2 金币');
        s.material -= 2;
        s.stamina = Math.min(100, s.stamina + 6);
      }
      say(s, `已解决${spec.title}：${spec.alt}。`);
    } else {
      need(s.stamina >= spec.safeCost, `需要 ${spec.safeCost} 精力`);
      s.stamina -= spec.safeCost;
      say(s, `绕过${spec.title}，消耗 ${spec.safeCost} 精力。`);
    }
    s.node++;
    return s;
  }
  if (a.type === 'search') {
    if (tutorialFloor(s) && s.openingVersion === 2)
      need(
        s.items.some(
          (x) => x.uid === s.tutorialRewardUid && x.zone === 'board',
        ),
        '先打开背包，上阵刚获得的武器',
      );
    need(node === 'search', '当前不是搜索节点');
    need(!s.interaction, '已经进入搜查状态，无需重复消耗精力');
    need(s.stamina >= searchCost(s), '搜索精力不足');
    s.stamina -= searchCost(s);
    currentFloor(s).searched = true;
    s.interaction = 'search';
    say(
      s,
      currentFloor(s).routeVersion === 5
        ? '你掀开箱盖，拂去积灰。'
        : `正在搜查，发现 ${currentFloor(s).stock.filter((x) => unlockedItem(s, x.id)).length} 件可用物资。拾取后立即进入右侧背包；整理完成后再前往下个目的地。`,
    );
    return s;
  }
  if (a.type === 'puzzle') {
    need(node === 'puzzle', '当前不是机关节点');
    need(s.stamina >= 4, '解谜需至少 4 精力');
    s.stamina -= 4;
    if (a.choice === puzzle(s).answer) {
      s.node++;
      say(s, '数字归位。通向守卫的门打开了。');
    } else {
      s.puzzleErrors++;
      say(s, `答案错误，损失 4 精力。提示：${puzzle(s).hint}`);
    }
    return s;
  }
  if (a.type === 'trade') {
    need(node === 'merchant' && s.interaction === 'trade', '请先进入交易状态');
    const x = merchantOffers(s).find((x) => x.uid === a.id);
    need(x, '商品已售出或不存在');
    const price = offerPrice(x);
    need(s.material >= price, `需要 ${price} 金币`);
    need(!a.to || ['bag', 'safe'].includes(a.to), '只能购买到随身容器');
    s.items.push({
      ...x,
      zone: a.to ?? 'bag',
      slot: a.slot,
      rotated: a.rotated ?? x.rotated,
    });
    validateItems(s);
    s.material -= price;
    (currentFloor(s).soldOffers ??= []).push(x.uid);
    say(s, `购入${itemName(x)}，已放入背包。消耗 ${price} 金币。`);
    return s;
  }
  if (a.type === 'skip') {
    need(!tutorialFloor(s), '先搜查这间房的物资');
    need(['search', 'merchant'].includes(node), '这个节点不能直接跳过');
    need(!s.interaction, '请点击“前往下个目的地”结束当前状态');
    s.node++;
    say(s, '保留资源，继续前进。');
    return s;
  }
  throw Error('未知操作');
}
export function validSave(value: unknown): value is Run {
  try {
    const s = migrateCargo(value as Run);
    need(s && s.version === 1 && Number.isInteger(s.seed), '存档版本不支持');
    if (s.loot) {
      need(
        ['battle', 'workshop'].includes(s.loot.source) &&
          typeof s.loot.revealed === 'boolean' &&
          typeof s.loot.sourceName === 'string',
        '战利品记录无效',
      );
      validateItem(s.loot.item);
      need(
        s.phase === 'floor' &&
          s.loot.item.zone === 'bag' &&
          (s.loot.source === 'battle'
            ? s.loot.item.type === 'card' &&
              ['damage', 'corrode'].includes(cardDef(s.loot.item.id).kind)
            : (['scanner', 'relic'].includes(s.loot.item.id) &&
                s.loot.item.type === 'tool') ||
              s.loot.item.type === 'physical'),
        '战利品类型无效',
      );
      need(!s.items.some((x) => x.uid === s.loot!.item.uid), '战利品重复');
    }

    const rewardIds = new Set(s.items.map((x) => x.uid));
    for (const reward of [s.loot, ...(s.lootQueue ?? [])].filter(Boolean)) {
      validateItem(reward!.item);
      need(!rewardIds.has(reward!.item.uid), '待领取物品重复');
      rewardIds.add(reward!.item.uid);
    }
    if (s.minigame) {
      const g = s.minigame;
      need(
        g.key === 'pressure' &&
          Array.isArray(g.board) &&
          g.board.length === 9 &&
          g.board.every((n) => Number.isInteger(n) && n >= 0 && n < 4),
        '玩法棋盘无效',
      );
      need(
        [g.moves, g.bonus, g.used, g.stars].every(
          (n) => Number.isInteger(n) && n >= 0,
        ) &&
          g.moves === 12 &&
          g.bonus <= 10000 &&
          g.used <= g.moves + g.bonus &&
          g.stars <= 3 &&
          ['playing', 'completed', 'skipped'].includes(g.status),
        '玩法进度无效',
      );
    }
    need(
      s.tutorialBattleStep === undefined ||
        (Number.isInteger(s.tutorialBattleStep) &&
          s.tutorialBattleStep >= 0 &&
          s.tutorialBattleStep <= 8),
      '引导步骤无效',
    );
    need(
      s.catalogVersion === 2 &&
        Array.isArray(s.utilityUsed) &&
        s.utilityUsed.length <= 200 &&
        s.utilityUsed.every((x) => typeof x === 'string' && x.length < 100),
      '工具使用记录无效',
    );
    need(
      s.fieldPrep &&
        Number.isInteger(s.fieldPrep.hp) &&
        s.fieldPrep.hp >= 0 &&
        s.fieldPrep.hp <= 32 &&
        Number.isInteger(s.fieldPrep.steps) &&
        s.fieldPrep.steps >= 0 &&
        s.fieldPrep.steps <= 3 &&
        Array.isArray(s.fieldPrep.barrier) &&
        s.fieldPrep.barrier.length === 3 &&
        s.fieldPrep.barrier.every(
          (x) => Number.isInteger(x) && x >= 0 && x <= 36,
        ),
      '出勤准备无效',
    );
    need(
      s.fieldResearch &&
        Number.isInteger(s.fieldResearch.vitality) &&
        s.fieldResearch.vitality >= 0 &&
        s.fieldResearch.vitality <= 10 &&
        Number.isInteger(s.fieldResearch.credit) &&
        s.fieldResearch.credit >= 0 &&
        s.fieldResearch.credit <= 4,
      '研究收益无效',
    );
    for (const height of [s.stopFloor, s.departureFloor])
      need(
        height === undefined ||
          (Number.isInteger(height) && height >= 0 && height <= s.best),
        '停靠点无效',
      );
    need(
      ['intro', 'base', 'floor', 'combat', 'ended'].includes(s.phase),
      '阶段无效',
    );
    for (const k of [
      'day',
      'quota',
      'streak',
      'stamina',
      'material',
      'power',
      'supply',
      'fuel',
      'medicine',
      'scrap',
      'charges',
      'level',
      'moduleCap',
      'floor',
      'best',
      'node',
      'serial',
    ] as const)
      need(Number.isInteger(s[k]) && s[k] >= 0 && s[k] <= 100000, '数值无效');
    need(
      s.quota <= 12 &&
        s.stamina <= 100 &&
        s.level >= 1 &&
        s.level <= 6 &&
        s.floor <= 10 &&
        s.best <= 10 &&
        s.node <= 14 &&
        s.day >= 1 &&
        s.day <= 13 &&
        [6, 8, 10].includes(s.moduleCap) &&
        s.charges <= 4 &&
        s.fuel <= 10,
      '数值越界',
    );
    need(
      Array.isArray(s.items) &&
        Array.isArray(s.floors) &&
        s.floors.length === 10 &&
        Array.isArray(s.bots) &&
        s.bots.length === 99 &&
        Array.isArray(s.log) &&
        Array.isArray(s.clears),
      '结构无效',
    );
    need(
      s.installed.every((id) => FACILITY.some((f) => f.id === id)) &&
        new Set(s.installed).size === s.installed.length &&
        moduleUsed(s) <= s.moduleCap &&
        Array.isArray(s.facilityUsed),
      '设施无效',
    );
    need(
      s.items.length <= 200 &&
        s.log.length <= 80 &&
        s.log.every((x) => typeof x === 'string') &&
        typeof s.notice === 'string' &&
        typeof s.ending === 'string',
      '存档文本无效',
    );
    need(
      [
        'used',
        'botsDone',
        'forecast',
        'adapted',
        'prepared',
        'objective',
        'encounterDone',
      ].every((k) => typeof s[k as keyof Run] === 'boolean'),
      '状态标记无效',
    );
    need(
      !['floor', 'combat'].includes(s.phase) || s.floor >= 1,
      '活动楼层无效',
    );
    need(
      s.interaction == null ||
        (s.phase === 'floor' &&
          ((s.interaction === 'search' && currentNode(s) === 'search') ||
            (s.interaction === 'trade' && currentNode(s) === 'merchant'))),
      '搜查/交易状态无效',
    );
    need(
      s.encounter === null ||
        (Number.isInteger(s.encounter) &&
          s.encounter >= 1 &&
          s.encounter <= 99),
      '遭遇对象无效',
    );
    validateItems(s, false);
    const ids = new Set(s.items.map((x) => x.uid));
    for (const [index, f] of s.floors.entries()) {
      need(
        f.id === index + 1 &&
          typeof f.name === 'string' &&
          typeof f.detail === 'string' &&
          f.nodes.length >= 3 &&
          f.nodes.length <= 14 &&
          new Set(f.nodes).size === f.nodes.length &&
          f.nodes.every((n) =>
            [
              'event',
              'search',
              'antechamber',
              'puzzle',
              'merchant',
              'guardian',
              'patrol',
              'elite',
              'cache',
              'bargain',
              'rest',
              'hazard',
              ...FIELD_NODES,
            ].includes(n),
          ) &&
          Array.isArray(f.stock) &&
          Array.isArray(f.visitors) &&
          Array.isArray(f.history),
        '楼层无效',
      );
      need(
        !f.soldOffers ||
          (Array.isArray(f.soldOffers) &&
            f.soldOffers.every((id) => typeof id === 'string')),
        '商人库存无效',
      );
      need(
        Array.isArray(f.workResolved) &&
          f.workResolved.length <= 6 &&
          new Set(f.workResolved).size === f.workResolved.length &&
          f.workResolved.every(isFieldNode),
        '物品机关记录无效',
      );
      need(
        f.battleRewards === undefined ||
          (Array.isArray(f.battleRewards) &&
            f.battleRewards.every(
              (x) =>
                ['patrol', 'elite', 'guardian'].includes(x) ||
                /^survivor-([1-9]|[1-9][0-9])$/.test(x),
            )),
        '战斗奖励记录无效',
      );
      layout(f.stock, 4, 96);
      for (const item of f.stock) {
        validateItem(item);
        need(!ids.has(item.uid), '重复物品账本');
        ids.add(item.uid);
      }
    }
    for (const [index, b] of s.bots.entries())
      need(
        b.id === index + 1 &&
          Number.isInteger(b.quota) &&
          b.quota >= 0 &&
          b.quota <= 12 &&
          b.floor >= 0 &&
          b.floor <= 10 &&
          b.best <= 10 &&
          b.best >= 0 &&
          typeof b.status === 'string' &&
          typeof b.alive === 'boolean' &&
          Number.isFinite(b.strength) &&
          b.strength > 0 &&
          b.plan >= 0 &&
          b.plan <= 10,
        '幸存者无效',
      );
    if (s.phase === 'combat') {
      need(
        s.duel && s.duel.player.length <= 9 && s.duel.enemy.length <= 9,
        '战斗快照缺失',
      );
      need(
        s.duel.maxHp.length === 2 &&
          s.duel.maxHp.every(
            (h) => Number.isFinite(h) && h > 0 && h <= 10000,
          ) &&
          [0, 1, 2, 3].includes(s.duel.weather) &&
          [0, 1, 2].includes(s.duel.layout) &&
          typeof s.duel.name === 'string',
        '战斗属性无效',
      );
      need(
        s.duel.stage === undefined ||
          ['normal', 'elite', 'boss'].includes(s.duel.stage),
        '战斗阶段无效',
      );
      need(
        s.duel.barrierHp === undefined ||
          (Array.isArray(s.duel.barrierHp) &&
            s.duel.barrierHp.length === 2 &&
            s.duel.barrierHp.every(
              (lanes) =>
                Array.isArray(lanes) &&
                lanes.length === 3 &&
                lanes.every((h) => Number.isFinite(h) && h > 0 && h <= 10000),
            )),
        '屏障初始值无效',
      );
      for (const board of [s.duel.player, s.duel.enemy]) {
        const occupied = new Set<number>();
        for (const p of board) {
          need(
            p.flightTime === undefined ||
              (Number.isFinite(p.flightTime) &&
                p.flightTime >= 0.5 &&
                p.flightTime <= 3),
            '弹道时长无效',
          );
          validateItem({
            ...p,
            type: 'card',
            zone: 'bag',
            volume: cardDef(p.id).size,
            amount: 1,
          });
          const end = p.at + cardDef(p.id).size;
          need(
            Number.isInteger(p.at) &&
              p.at >= 0 &&
              end <= 9 &&
              Math.floor(p.at / 3) === Math.floor((end - 1) / 3),
            '战斗格位无效',
          );
          for (let cell = p.at; cell < end; cell++) {
            need(!occupied.has(cell), '战斗卡牌重叠');
            occupied.add(cell);
          }
        }
      }
      simulateDuel(s.duel);
    }
    return true;
  } catch {
    return false;
  }
}
export function ranking(s: Run) {
  return [
    {
      id: 0,
      best: s.best,
      alive: s.phase !== 'ended' || s.ending.includes('完成'),
      floor: s.floor,
      quota: s.quota,
      status: '你',
    },
    ...s.bots,
  ]
    .sort((a, b) => b.best - a.best || a.id - b.id)
    .map((x, _, all) => ({
      ...x,
      rank: all.filter((y) => y.best > x.best).length + 1,
    }));
}
