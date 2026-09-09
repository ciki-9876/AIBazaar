import { rng, hash } from './design-model.ts';
import { CARDS, cardDef, FOUR, FACILITIES, RARITY } from './prototype-v04.ts';
import { WEATHER as OLD_WEATHER } from './prototype-v03.ts';
import { simulateDuel } from './demo-combat.ts';
import type { Duel, FighterCard } from './demo-combat.ts';
export { CARDS, RARITY, WEATHER };
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
  cost: f.id === 'weather' ? 8 : f.cost,
  desc: f.id === 'weather' ? '免费观测下一天天气，并给出路线建议' : f.desc,
}));
export type Zone = 'bag' | 'safe' | 'warehouse' | 'board';
export type Item = {
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
export type Run = {
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
  material: '机械组件',
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
      nodes:
        i % 2
          ? ['event', 'merchant', 'search', 'puzzle', 'guardian']
          : ['event', 'search', 'puzzle', 'merchant', 'guardian'],
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
  guardian: '楼层守卫',
  exit: '撤离出口',
};
export const currentNode = (s: Run) => currentFloor(s)?.nodes[s.node] ?? 'exit';
export const searchCost = (s: Run) =>
  Math.max(2, (weatherAt(s) === 2 ? 6 : 10) - (s.prepared ? 4 : 0));
export function puzzle(s: Run) {
  const a = (hash(`${s.seed}/${s.floor}/puzzle`) % 7) + 2,
    b = (s.floor % 3) + 2;
  return {
    text: `门上刻着 ${a}、${a + b}、${a + 2 * b}、？。输入规律中的下一个数。`,
    answer: a + 3 * b,
    options: [a + 3 * b, a + 3 * b + 2, a + 3 * b - 1].sort((x, y) => x - y),
  };
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
function validateItems(s: Run) {
  const ids = new Set<string>(),
    occupied = new Set<number>();
  for (const x of s.items) {
    validateItem(x);
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
  b.status = `${reason}，回收 -${cost} 配额${b.alive ? '' : '，淘汰'}`;
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
    s.ending = '生命维持配额耗尽';
  }
}
function rescue(s: Run, reason: string) {
  const cost = rescueCost(s);
  s.quota = Math.max(0, s.quota - cost);
  s.streak++;
  s.items = s.items.filter((x) => x.zone !== 'bag');
  deposit(s);
  s.phase = 'base';
  s.objective = false;
  s.duel = null;
  finishBots(s);
  say(
    s,
    `${reason}。强制回收消耗 ${cost} 配额，普通背包丢失，上阵卡、安全格和基地保留。`,
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
    id,
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
      65 + floor * 17 + (kind === 'survivor' ? 20 : 0),
    ],
    weather: weatherAt(s),
    layout: layoutAt(s),
    name:
      kind === 'survivor'
        ? `幸存者 #${String(s.encounter).padStart(3, '0')}`
        : `${currentFloor(s).name} · 守门人`,
    kind,
    botId: kind === 'survivor' ? s.encounter : null,
  };
}
export function act(old: Run, a: Action): Run {
  const s = structuredClone(old);
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
      makeItem('scanner', 'scanner', 'tool'),
    ];
    say(
      s,
      '协议生效：100 名幸存者各自困于电梯。终端已鉴定水果刀，并通过送物口发放导电索、遮雨棚与便携鉴定仪。当前开放前十层。',
    );
    return s;
  }
  need(s.phase !== 'intro', '请先确认幸存者协议');
  if (a.type === 'resolve') {
    need(s.phase === 'combat' && s.duel, '没有待结算战斗');
    const result = simulateDuel(s.duel);
    const kind = s.duel.kind;
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
      rescue(s, result.winner === -1 ? '同归于尽，双方被回收' : '战斗失败');
      return s;
    }
    s.phase = 'floor';
    if (kind === 'survivor') {
      if (bot) botRescue(bot, '封锁对决败北');
      s.encounterDone = true;
      say(s, '封锁解除。对方已被强制回收，只有你能继续本次楼层挑战。');
    } else {
      s.objective = true;
      s.node++;
      say(s, '守门人倒下。主目标完成；成功撤离后才会提交通关记录。');
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
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.zone !== 'board', '请先卸下物品');
    s.material += 2 + x.level * 2 + x.quality * 2;
    s.items = s.items.filter((i) => i.uid !== x.uid);
    say(s, '物品已分解为材料，培养投入部分返还。');
    return s;
  }
  if (a.type === 'grow' || a.type === 'refine') {
    need(s.phase === 'base', '请回终端培养');
    const x = s.items.find((x) => x.uid === a.id);
    need(x && x.type === 'card', '请选择卡牌');
    const cost = a.type === 'grow' ? 3 + x.level * 2 : 5 + x.quality * 4;
    need(s.material >= cost, '材料不足');
    need(a.type === 'grow' ? x.level < 5 : x.quality < 2, '已达培养上限');
    s.material -= cost;
    if (a.type === 'grow') x.level++;
    else x.quality++;
    say(s, `培养完成，消耗 ${cost} 材料。稀有度保持不变。`);
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
        b.status = '生命维持配额耗尽';
      }
    }
    say(
      s,
      `第 ${s.day} 天：${fed ? '消耗 1 补给，恢复 50' : '缺少补给，仅恢复 15'} 精力；生命维持配额 -1。`,
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
      need(s.moduleCap < 10 && s.material >= 6, '扩建需要 6 材料，上限 10 槽');
      s.moduleCap += 2;
      s.material -= 6;
    } else if (a.type === 'upgrade') {
      const cost = 5 + s.level;
      need(s.level < 6 && s.material >= cost, `升级需 ${cost} 材料，上限 Lv.6`);
      s.material -= cost;
      s.level++;
    } else {
      need(f, '未知设施');
      if (a.type === 'build') {
        need(
          !s.installed.includes(f.id) && moduleUsed(s) + f.slots <= s.moduleCap,
          '设施已建造或空间不足',
        );
        need(s.material >= f.cost, '材料不足');
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
            need(s.material >= 1 && s.power >= 3, '需要 1 材料、3 电力');
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
              '需要材料、电力且电荷未满',
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
              '需要 2 材料、2 电力，且没有待用装备',
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
        ? `电梯升至 Lv.${s.level}，战斗格与容器容量已同步。`
        : a.type === 'expand'
          ? '电梯扩建完成。'
          : `${f!.name} · ${a.type === 'build' ? '建造完成' : a.type === 'remove' ? '拆除返还一半材料，当日使用记录保留' : '今日处理完成'}`,
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
    need(
      !s.items.some((x) => x.id === 'scanner'),
      '已经拥有鉴定仪，可从仓库取回',
    );
    need(s.material >= 4 && s.power >= 2, '重新制造需要 4 材料与 2 电力');
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
        a.floor! >= Math.max(1, s.floor) &&
        a.floor! <= 10,
      '电梯只能向上，或重试当前层',
    );
    need(s.supply >= 1 && s.stamina >= 12, '出勤需 1 补给和至少 12 精力');
    need(playerCards(s).length > 0, '请至少上阵一张卡');
    planBots(s);
    s.floor = a.floor!;
    s.used = true;
    s.supply--;
    s.stamina -= 4;
    s.phase = 'floor';
    s.node = 0;
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
  if (a.type === 'pickup') {
    const floor = currentFloor(s);
    need(floor.searched, '先搜索区域以发现物资');
    const x = floor.stock.find((x) => x.uid === a.id);
    need(x, '这件物资已被拿走');
    s.items.push({ ...x, zone: 'bag', at: undefined });
    validateItems(s);
    floor.stock = floor.stock.filter((i) => i.uid !== x.uid);
    say(s, `取得${itemName(x)}，物资从共享楼层中移除。`);
    return s;
  }
  if (a.type === 'extract') {
    need(s.stamina >= 8, '返回需 8 精力，可吃苹果或请求救援');
    s.stamina -= 8;
    s.phase = 'base';
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
        ? `已撤回，通关记录 ${s.best} 层。${firstClear ? `首次通关奖励 ${4 + Math.ceil(s.floor / 2)} 材料、2 补给。` : '本层奖励已领取，不重复发放。'}`
        : '提前撤离，保住随身物资；本层未计入通关高度。',
    );
    if (s.objective && s.floor === 10) {
      s.phase = 'ended';
      s.ending = '十层幸存者协议完成';
    }
    return s;
  }
  if (a.type === 'rescue') {
    rescue(s, '主动发送回收信号');
    return s;
  }
  if (a.type === 'fight') {
    need(currentNode(s) === 'guardian', '尚未到达守卫节点');
    need(playerCards(s).length > 0, '请先上阵卡牌');
    const kind =
      s.encounter !== null && !s.encounterDone ? 'survivor' : 'guardian';
    s.duel = makeDuel(s, kind);
    s.phase = 'combat';
    say(
      s,
      kind === 'survivor'
        ? '封锁对决开始，本场只能有一名胜者继续。'
        : '守卫战开始。同路前排卡牌承受攻击，护甲减伤后传给宿主。空路直击宿主。',
    );
    return s;
  }
  const node = currentNode(s);
  if (a.type === 'event') {
    need(node === 'event', '当前不是事件节点');
    if (a.choice === 1) {
      need(hasTool(s, 'lighter'), '需要携带打火机');
      consumeTool(s, 'lighter');
      s.stamina = Math.min(100, s.stamina + 8);
      say(s, '点亮那根不存在的蜡烛，异象消失。恢复 8 精力，打火机耗尽。');
    } else {
      need(s.stamina >= 6, '需要 6 精力');
      s.stamina -= 6;
      say(s, '你绕过了倒流的人群，消耗 6 精力。');
    }
    s.node++;
    return s;
  }
  if (a.type === 'search') {
    need(node === 'search', '当前不是搜索节点');
    need(s.stamina >= searchCost(s), '搜索精力不足');
    s.stamina -= searchCost(s);
    currentFloor(s).searched = true;
    s.node++;
    say(
      s,
      `搜索完成，发现 ${currentFloor(s).stock.length} 件剩余物资。请在物品界面挑选；背包不会自动塞满。`,
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
      say(
        s,
        '答案错误，机关重新排列声音，但刻字仍然遵循等差规律。损失 4 精力。',
      );
    }
    return s;
  }
  if (a.type === 'trade') {
    need(node === 'merchant' && !currentFloor(s).tradeSold, '交易已经结束');
    need(s.material >= 4, '交易需要 4 材料');
    const id = CARDS[(s.floor + hash(`${s.seed}/trade`)) % CARDS.length].id;
    const x = makeItem(`trade-${s.floor}`, id, 'physical');
    s.items.push(x);
    validateItems(s);
    s.material -= 4;
    currentFloor(s).tradeSold = true;
    say(s, `购入${itemName(x)}实体，回到终端或使用便携仪鉴定。`);
    return s;
  }
  if (a.type === 'skip') {
    need(['search', 'merchant'].includes(node), '这个节点不能直接跳过');
    s.node++;
    say(s, '保留资源，继续前进。');
    return s;
  }
  throw Error('未知操作');
}
export function validSave(value: unknown): value is Run {
  try {
    const s = value as Run;
    need(s && s.version === 1 && Number.isInteger(s.seed), '存档版本不支持');
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
        s.node <= 5 &&
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
      s.encounter === null ||
        (Number.isInteger(s.encounter) &&
          s.encounter >= 1 &&
          s.encounter <= 99),
      '遭遇对象无效',
    );
    validateItems(s);
    const ids = new Set(s.items.map((x) => x.uid));
    for (const [index, f] of s.floors.entries()) {
      need(
        f.id === index + 1 &&
          typeof f.name === 'string' &&
          typeof f.detail === 'string' &&
          f.nodes.length === 5 &&
          new Set(f.nodes).size === 5 &&
          f.nodes.every((n) =>
            ['event', 'search', 'puzzle', 'merchant', 'guardian'].includes(n),
          ) &&
          Array.isArray(f.stock) &&
          Array.isArray(f.visitors) &&
          Array.isArray(f.history),
        '楼层无效',
      );
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
      for (const board of [s.duel.player, s.duel.enemy]) {
        const occupied = new Set<number>();
        for (const p of board) {
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
