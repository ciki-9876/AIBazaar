import { layout } from './cargo-layout.ts';
import { rng, hash } from './design-model.ts';
import {
  CARDS,
  cardDef,
  FOUR,
  FACILITIES,
  RARITY as OLD_RARITY,
} from './prototype-v04.ts';
import {
  floorRoute,
  sceneTitle,
  eventSpec,
  puzzleSpec,
} from './demo-content.ts';
import { WEATHER as OLD_WEATHER } from './prototype-v03.ts';
import { simulateDuel } from './demo-combat.ts';
import type { Duel, FighterCard } from './demo-combat.ts';
export { CARDS, RARITY, WEATHER };
export const RARITY_LABELS = ['普通', '罕见', '稀有', '传说', '奇迹'];
const RARITY = OLD_RARITY.map((r, i) => ({ ...r, name: RARITY_LABELS[i] }));
const WEATHER = OLD_WEATHER.map((weather, index) => ({
  ...weather,
  explore: [
    '搜索消耗 10 精力；潮湿地形适合导电索，强风会延缓普通卡。',
    '搜索消耗 10 精力；寒冷与强风延缓冷却，精制遮雨棚可以保护同路牌。',
    '隐蔽路线使搜索只需 6 精力，适合补给紧张时出发。',
    '搜索消耗 10 精力；炎热地形适合精制蓄热砖，强风需要提前应对。',
  ][index],
}));
export const SAVE_KEY = 'f9.elevator.demo1.local';
export const QUALITY = ['基础', '精制', '大师'];
export const FACILITY = FACILITIES.map((f) => ({
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
  routeVersion?: 2 | 3;
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
  scanner: 3,
};
export const FACILITY_LEVEL: Record<string, number> = {
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
  '活下去：补给用于出勤和睡眠。带回实体，在桌面免费鉴定。',
  '学会利用剩余物资：金币培养卡牌，废料回收为金币，药品恢复精力。',
  '把电带进门外：燃料发电，电力补充鉴定电荷，带上便携鉴定仪。',
  '建立稳定补给：电力与金币种植补给，观测天气再选择路线。',
  '为危险做准备：用金币与电力制作地形适应装备，降低探索消耗。',
  '完整构筑：九格战斗布局，围绕天气、护甲和弹道组织卡牌。',
];
export const unlockedItem = (s: Run, id: string) =>
  s.level >= (RESOURCE_LEVEL[id] ?? 1);
export const checkpoint = (s: Run) => s.stopFloor ?? s.best;
export type Run = {
  stopFloor?: number;
  departureFloor?: number;
  interaction?: 'search' | 'trade' | null;
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
  scanner: '便携鉴定仪',
  material: '金币',
  supply: '密封补给',
  power: '储能电池',
  fuel: '燃料罐',
  medicine: '医疗包',
  scrap: '废料束',
  core: '任务核心',
};
export function itemName(x: Item) {
  return NAMES[x.id] ?? cardDef(x.id).name;
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
    type,
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
    quality: 0,
    level: 0,
  };
}
export function newRun(seed = Date.now() >>> 0): Run {
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
      nodes: floorRoute(seed, i + 1),
      routeVersion: 3,
      soldOffers: [],
      stock: [
        loot(theme[2], 'resource', 3),
        loot('material', 'resource', 4 + Math.floor(i / 3)),
        loot('supply', 'resource', 3),
        loot('scrap', 'resource', 3),
        loot('fuel', 'resource', 1),
        loot('medicine', 'resource', 1),
        ...Array.from({ length: 6 }, () =>
          loot(CARDS[Math.floor(random() * CARDS.length)].id, 'physical'),
        ),
      ],
      searched: false,
      cleared: false,
      tradeSold: false,
      visitors: [],
      history: [],
    };
  });
  return {
    version: 1,
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
    charges: 1,
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
  event: '异象事件',
  search: '搜刮区域',
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
export const searchCost = (s: Run) =>
  Math.max(2, (weatherAt(s) === 2 ? 6 : 10) - (s.prepared ? 4 : 0));
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
  sceneTitle(currentFloor(s).name, currentFloor(s).nodes[index] ?? 'exit');
export const sellPrice = (x: Item) =>
  x.type === 'card'
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
    if (x.type === 'physical')
      need(x.rarity === undefined, '实体不应拥有稀有度');
  } else {
    need(
      x.type === 'tool'
        ? ['apple', 'lighter', 'scanner'].includes(x.id)
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
function hasTool(s: Run, id: string) {
  return s.items.some(
    (x) => x.id === id && (x.zone === 'bag' || x.zone === 'safe'),
  );
}
function consumeTool(s: Run, id: string) {
  const x = s.items.find(
    (x) => x.id === id && (x.zone === 'bag' || x.zone === 'safe'),
  );
  need(x, '没有携带对应工具');
  s.items = s.items.filter((i) => i.uid !== x.uid);
}
function deposit(s: Run) {
  for (const x of s.items.filter((x) => x.type === 'resource')) {
    if (x.id === 'core') continue;
    const key = x.id as
      | 'material'
      | 'supply'
      | 'power'
      | 'fuel'
      | 'medicine'
      | 'scrap';
    if (key === 'fuel') {
      const room = (s.installed.includes('storage') ? 10 : 6) - s.fuel;
      const n = Math.min(room, x.amount);
      s.fuel += n;
      x.amount -= n;
    } else {
      s[key] += x.amount;
      x.amount = 0;
    }
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
      botRescue(
        b,
        `${b.floor} 层构筑强度 ${Math.round(b.strength)} 低于环境挑战 ${danger}`,
      );
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
      ? ['knife']
      : floor <= 4
        ? ['knife', 'brick']
        : floor <= 6
          ? ['knife', 'brick', 'bottle']
          : ['knife', 'brick', 'shelter', 'wire'];
  const ats = [0, 3, 6, 8];
  if (floor >= 9) {
    ids.push('bell');
    ats.push(2);
  }
  const enemy = ids.map((id, i) => ({
    uid: `enemy-${i}`,
    id: i === 0 && hash(`${s.seed}/${floor}/guard`) % 2 === 0 ? 'wire' : id,
    at: ats[i],
    rarity: 0,
    quality: floor >= 5 ? 1 : 0,
    level: Math.floor((floor - 1) / 4),
  }));
  return {
    player: playerCards(s),
    enemy,
    maxHp: [
      240 + (s.level - 1) * 10,
      Math.round((65 + floor * 17) * scale) + (kind === 'survivor' ? 20 : 0),
    ],
    weather: weatherAt(s),
    layout: layoutAt(s),
    name:
      kind === 'survivor'
        ? `幸存者 #${String(s.encounter).padStart(3, '0')}`
        : sceneTitle(currentFloor(s).name, currentNode(s)),
    stage,
    kind,
    botId: kind === 'survivor' ? s.encounter : null,
  };
}
export function migrateCargo(source: Run): Run {
  const s = structuredClone(source);
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
    const knife = makeItem('starter-knife', 'knife', 'card', 'board');
    knife.rarity = 0;
    knife.at = 6;
    const wire = makeItem('starter-wire', 'wire', 'card', 'board');
    wire.rarity = 0;
    wire.at = 0;
    const shelter = makeItem('starter-shelter', 'shelter', 'card', 'board');
    shelter.rarity = 0;
    shelter.at = 3;
    s.items = [
      knife,
      wire,
      shelter,
      makeItem('apple', 'apple', 'tool'),
      makeItem('lighter', 'lighter', 'tool'),
    ];
    say(
      s,
      '协议生效：100 名幸存者各自困于电梯。终端已鉴定水果刀，并通过送物口发放导电索与遮雨棚。门外只能向上；未通关撤离会回到原停靠点。',
    );
    return s;
  }
  need(s.phase !== 'intro', '请先确认幸存者协议');
  if (a.type === 'resolve') {
    need(s.phase === 'combat' && s.duel, '没有待结算战斗');
    const result = simulateDuel(s.duel);
    const kind = s.duel.kind;
    const stage = s.duel.stage ?? (kind === 'guardian' ? 'boss' : 'normal');
    const bot = s.bots.find((x) => x.id === s.duel!.botId);
    s.duel = null;
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
    if (kind === 'survivor') {
      if (bot) botRescue(bot, '封锁对决败北');
      s.encounterDone = true;
      say(
        s,
        '第 1/2 场：幸存者封锁战已胜利。下一场是本层守卫，点击后才会开战；现在也可以提前撤离。',
      );
    } else if (stage !== 'boss') {
      const floor = currentFloor(s),
        node = currentNode(s);
      if (!(floor.battleRewards ?? []).includes(node)) {
        s.material += stage === 'elite' ? 2 : 1;
        (floor.battleRewards ??= []).push(node);
      }
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
    return s;
  }
  need(s.phase !== 'combat', '战斗开始后不可修改物品或基地');
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
      need(s.level >= 3, '电梯 Lv.3 解锁便携鉴定');
      need(x.zone === 'bag' || x.zone === 'safe', '只能鉴定随身携带的实体');
      need(
        hasTool(s, 'scanner') && s.charges > 0,
        '楼层鉴定需要携带鉴定仪且有电荷',
      );
      s.charges--;
    }
    const roll = hash(`${s.seed}/${x.uid}/rarity`) % 10000;
    x.rarity =
      roll < 6000 ? 0 : roll < 8600 ? 1 : roll < 9700 ? 2 : roll < 9980 ? 3 : 4;
    x.type = 'card';
    say(
      s,
      `鉴定完成：${itemName(x)} / ${RARITY[x.rarity].name}。稀有度已锁定${x.rarity === 4 ? '，获得奇迹回响' : ''}。`,
    );
    return s;
  }
  if (a.type === 'consume') {
    const x = s.items.find((x) => x.uid === a.id);
    need(
      x && (x.zone === 'bag' || x.zone === 'safe'),
      '请先把物品装入随身容器',
    );
    need(x.id === 'apple', '该工具通过节点选项使用');
    need(s.stamina < 100, '精力已经充足');
    s.stamina = Math.min(100, s.stamina + 25);
    s.items = s.items.filter((i) => i.uid !== x.uid);
    say(s, '吃掉苹果，恢复 25 精力。');
    return s;
  }
  if (a.type === 'drop') {
    const x = s.items.find((x) => x.uid === a.id);
    need(x, '物品不存在');
    need(x.zone !== 'board', '请先卸下卡牌');
    need(s.phase === 'floor', '基地物品可回收，不需要丢弃');
    s.items = s.items.filter((i) => i.uid !== x.uid);
    currentFloor(s).stock.push({ ...x, zone: 'bag' });
    say(s, '物品留在本层，可以再次拾取，也可能被其他幸存者带走。');
    return s;
  }
  if (a.type === 'recycle') {
    need(s.phase === 'base', '请回基地回收');
    need(s.level >= 2, '电梯 Lv.2 解锁分解回收');
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.zone !== 'board', '请先卸下物品');
    s.material += 2 + x.level * 2 + x.quality * 2;
    s.items = s.items.filter((i) => i.uid !== x.uid);
    say(s, '物品已分解为金币，培养投入部分返还。');
    return s;
  }
  if (a.type === 'grow' || a.type === 'refine') {
    need(s.phase === 'base', '请回终端培养');
    need(s.level >= 2, '电梯 Lv.2 解锁卡牌培养');
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.type === 'card', '请选择卡牌');
    const cost = a.type === 'grow' ? 3 + x.level * 2 : 5 + x.quality * 4;
    need(s.material >= cost, '金币不足');
    need(a.type === 'grow' ? x.level < 5 : x.quality < 2, '已达培养上限');
    s.material -= cost;
    if (a.type === 'grow') x.level++;
    else x.quality++;
    say(s, `培养完成，消耗 ${cost} 金币。稀有度保持不变。`);
    return s;
  }
  if (a.type === 'sleep') {
    need(s.phase === 'base', '只能回到床上睡觉');
    planBots(s);
    finishBots(s);
    const fed = s.supply > 0;
    if (fed) s.supply--;
    s.stamina = Math.min(100, s.stamina + (fed ? 50 : 15));
    s.quota--;
    s.day++;
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
    say(
      s,
      `第 ${s.day} 天：${fed ? '消耗 1 补给，恢复 50' : '缺少补给，仅恢复 15'} 精力；生命 -1。`,
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
    const f = FACILITY.find((f) => f.id === a.id);
    if (a.type === 'expand') {
      need(s.moduleCap < 10 && s.material >= 6, '扩建需要 6 金币，上限 10 槽');
      s.moduleCap += 2;
      s.material -= 6;
    } else if (a.type === 'upgrade') {
      const cost = 5 + s.level;
      need(s.level < 6 && s.material >= cost, `升级需 ${cost} 金币，上限 Lv.6`);
      s.material -= cost;
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
        need(f.id !== 'storage' || s.fuel <= 6, '先消耗超出基础上限的燃料');
        s.installed = s.installed.filter((i) => i !== f.id);
        s.material += Math.floor(f.cost / 2);
      } else {
        need(
          s.installed.includes(f.id) && !s.facilityUsed.includes(f.id),
          '设施未建造或今天已使用',
        );
        switch (f.id) {
          case 'grow':
            need(s.material >= 1 && s.power >= 3, '需要 1 金币、3 电力');
            s.material--;
            s.power -= 3;
            s.supply += 2;
            break;
          case 'generator':
            need(s.fuel > 0, '需要燃料');
            s.fuel--;
            s.power += 8;
            break;
          case 'clinic':
            need(s.medicine > 0 && s.stamina < 100, '需要药品且精力未满');
            s.medicine--;
            s.stamina = Math.min(100, s.stamina + 35);
            break;
          case 'weather':
            s.forecast = true;
            break;
          case 'recycle':
            need(s.scrap >= 2, '需要 2 废料');
            s.scrap -= 2;
            s.material += 3;
            break;
          case 'workshop':
            need(
              s.material >= 1 && s.power >= 2 && s.charges < 4,
              '需要金币、电力且电荷未满',
            );
            s.material--;
            s.power -= 2;
            s.charges++;
            break;
          case 'storage':
            need(s.scrap >= 2 && s.fuel < 10, '需要废料且燃料未满');
            s.scrap -= 2;
            s.fuel++;
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
    s.items.push(makeItem(`scanner-${s.serial++}`, 'scanner', 'tool'));
    validateItems(s);
    s.material -= 4;
    s.power -= 2;
    say(s, '鉴定仪已重新制造；剩余电荷沿用终端记录，设备台可补充电荷。');
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
    need(s.supply >= 1 && s.stamina >= 12, '出勤需 1 补给和至少 12 精力');
    need(playerCards(s).length > 0, '请至少上阵一张卡');
    planBots(s);
    s.departureFloor = checkpoint(s);
    s.floor = a.floor!;
    if (
      currentFloor(s).routeVersion !== 3 &&
      !currentFloor(s).visitors.includes(0) &&
      !currentFloor(s).cleared
    ) {
      currentFloor(s).nodes = floorRoute(s.seed, s.floor);
      currentFloor(s).routeVersion = 3;
    }
    s.used = true;
    s.supply--;
    s.stamina -= 4;
    s.phase = 'floor';
    s.node = 0;
    s.interaction = null;
    s.objective = false;
    s.puzzleErrors = 0;
    s.prepared = s.adapted;
    s.adapted = false;
    s.encounterDone = false;
    const peers = s.bots.filter((b) => b.alive && b.plan === s.floor);
    s.encounter =
      peers.length && hash(`${s.seed}/${s.day}/${s.floor}/encounter`) % 100 < 28
        ? peers[0].id
        : null;
    currentFloor(s).visitors = [...new Set([...currentFloor(s).visitors, 0])];
    say(
      s,
      `抵达 ${s.floor} 层 · ${currentFloor(s).name}。${s.encounter ? '检测到其他幸存者，封锁对决前可提前撤离。' : '电梯停靠点已标记。'}返回需要预留 8 精力。`,
    );
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
      s.supply += 2;
    }
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
    rescue(s, '主动发送回收信号');
    return s;
  }
  if (a.type === 'fight') {
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
    s.phase = 'combat';
    say(
      s,
      kind === 'survivor'
        ? '封锁对决开始，本场只能有一名胜者继续。'
        : '守卫战开始。攻击削减同路前排卡牌的生命；卡牌归零后进入幽魂并等待复活。空路直击宿主。',
    );
    return s;
  }
  const node = currentNode(s);
  if (a.type === 'next-node') {
    need(
      (s.interaction === 'search' && node === 'search') ||
        (s.interaction === 'trade' && node === 'merchant'),
      '当前没有可结束的搜查或交易',
    );
    s.interaction = null;
    s.node++;
    say(s, '已收好行囊，前往下个目的地。未带走的物资仍留在本层。');
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
  if (a.type === 'sell') {
    need(s.interaction === 'trade' && node === 'merchant', '请先进入交易状态');
    const x = s.items.find((x) => x.uid === a.id);
    need(
      x && ['bag', 'safe'].includes(x.zone) && x.id !== 'core',
      '只能出售随身物品；上阵卡请先卸下',
    );
    const amount = sellPrice(x);
    s.items = s.items.filter((i) => i.uid !== x.uid);
    s.material += amount;
    say(s, `售出${itemName(x)}，获得 ${amount} 金币，背包容量已释放。`);
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
      need(s.level >= 2 && s.medicine > 0, '需要 Lv.2 与 1 药品');
      s.medicine--;
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
    need(node === 'search', '当前不是搜索节点');
    need(!s.interaction, '已经进入搜查状态，无需重复消耗精力');
    need(s.stamina >= searchCost(s), '搜索精力不足');
    s.stamina -= searchCost(s);
    currentFloor(s).searched = true;
    s.interaction = 'search';
    say(
      s,
      `正在搜查，发现 ${currentFloor(s).stock.filter((x) => unlockedItem(s, x.id)).length} 件可用物资。拾取后立即进入右侧背包；整理完成后再前往下个目的地。`,
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
              'puzzle',
              'merchant',
              'guardian',
              'patrol',
              'elite',
              'cache',
              'bargain',
              'rest',
              'hazard',
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
        f.battleRewards === undefined ||
          (Array.isArray(f.battleRewards) &&
            f.battleRewards.every((x) => ['patrol', 'elite'].includes(x))),
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
