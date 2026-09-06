export type WorldFloor = {
  id: number;
  name: string;
  anomaly: string;
  objective: string;
  resource: string;
  hazard: string;
  nodes: string[];
  budget: number;
  stock: number;
  fallback: boolean;
};
export function rng(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function hash(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function createWorld(seed: number, fallback = false): WorldFloor[] {
  const random = rng(seed);
  const themes = [
    '月面金库',
    '漂浮皇宫',
    '倒置医院',
    '鲸腹车站',
    '玻璃雨林',
    '记忆银行',
    '纸折战场',
    '深海歌剧院',
    '黄昏太空港',
    '无尽厨房',
    '废弃太阳',
    '钟表墓园',
  ];
  const anomalies = [
    '时间每隔三分钟倒流一次',
    '重力只作用于金属',
    '所有谎言都会结成冰',
    '火焰不会熄灭但吞噬声音',
    '光线可以被装进瓶子',
    '记忆被当作货币交易',
    '雨水向天空坠落',
    '影子会替主人执行命令',
    '机器只能靠梦境供电',
    '说出名字的东西会消失',
  ];
  const goals = [
    '带回最后一段广播',
    '修复出口供能',
    '夺回通行印章',
    '解开四音密码',
    '护送迷路的信使',
    '关闭异常核心',
  ];
  const resources = [
    '医疗 / 恢复素材',
    '机械 / 导电组件',
    '食物 / 生存补给',
    '武器 / 破损工具',
    '遗物 / 改造素材',
  ];
  const hazards = [
    '缺氧 · 消耗补给',
    '过热 · 灼烧压力',
    '黑暗 · 需要照明',
    '失重 · 工具变速',
    '噪声敏感 · 避免强拆',
  ];
  const pick = <T>(a: T[]) => a[Math.floor(random() * a.length)];
  const seen = new Set<string>();
  return Array.from({ length: 100 }, (_, i) => {
    let name = pick(themes),
      anomaly = pick(anomalies),
      objective = pick(goals);
    let key = name + anomaly + objective;
    while (seen.has(key)) {
      name = pick(themes);
      anomaly = pick(anomalies);
      objective = pick(goals);
      key = name + anomaly + objective;
    }
    seen.add(key);
    const middle = pick([
      ['探索', '解谜'],
      ['事件', '商人'],
      ['探索', '战斗'],
      ['商人', '解谜'],
    ]);
    return {
      id: i + 1,
      name,
      anomaly,
      objective,
      resource: pick(resources),
      hazard: pick(hazards),
      nodes: ['入口', ...middle, '主目标', '撤离'],
      budget: Math.round(12 + (i + 1) * 2.5),
      stock: 8 + Math.floor(random() * 9),
      fallback,
    };
  });
}
export type Expedition = {
  node: number;
  phase: 'exploring' | 'returning' | 'extracted' | 'dead';
  supply: number;
  stamina: number;
  noise: number;
  loot: string[];
  bagCapacity: number;
  carried: number;
  objective: boolean;
  returnLeft: number;
  emergency: boolean;
  best: number;
  notice: string;
};
export const expeditionStart = (): Expedition => ({
  node: 0,
  phase: 'exploring',
  supply: 9,
  stamina: 86,
  noise: 0,
  loot: [],
  bagCapacity: 12,
  carried: 6,
  objective: false,
  returnLeft: 0,
  emergency: true,
  best: 7,
  notice: '位于第 12 层入口。背包已有 6 容积带入物。',
});
export type ExpeditionAction =
  | 'advance'
  | 'search'
  | 'retreat'
  | 'return-step'
  | 'emergency'
  | 'defeat';
export function expeditionAction(
  old: Expedition,
  type: ExpeditionAction,
): Expedition {
  const s = structuredClone(old);
  const need = (test: boolean, msg: string) => {
    if (!test) throw Error(msg);
  };
  if (type === 'advance' || type === 'search') {
    need(s.phase === 'exploring', '此阶段不能继续搜索。');
    need(!s.objective || type === 'search', '主目标已完成，可以搜刮或撤离。');
    need(s.supply >= 1 && s.stamina >= 8, '补给或精力不足。');
    if (type === 'search')
      need(s.carried + 2 <= s.bagCapacity, '背包已满，当前样例需要 2 容积。');
    s.supply--;
    s.stamina -= 8;
    s.noise += type === 'search' ? 18 : 9;
    if (type === 'search') {
      s.carried += 2;
      s.loot.push(['弹弓', '损坏的电池组', '密封药箱'][s.loot.length % 3]);
      s.notice = '获得一件实体物资。尚未带回，不属于安全资产。';
    } else {
      s.node++;
      s.objective = s.node >= 3;
      s.notice = s.objective
        ? '主目标已完成。活着撤回后才能提交通关。'
        : '路线已推进；本验收样例使用已解决的节点结果。';
    }
    return s;
  }
  if (type === 'retreat') {
    need(s.phase === 'exploring', '当前不能发起撤离。');
    const distance = Math.max(1, s.node + 1);
    need(
      s.supply >= distance && s.stamina >= distance * 4,
      '返回资源不足，可使用预带的紧急回程器。',
    );
    s.phase = 'returning';
    s.returnLeft = distance;
    s.notice = `撤离途中：还需 ${distance} 个节点。`;
    return s;
  }
  if (type === 'return-step') {
    need(s.phase === 'returning' && s.returnLeft > 0, '尚未进入撤离路线。');
    need(s.supply >= 1 && s.stamina >= 4, '撤离资源不足。');
    s.supply--;
    s.stamina -= 4;
    s.returnLeft--;
    if (s.returnLeft === 0) {
      s.phase = 'extracted';
      if (s.objective) s.best = 12;
      s.notice = s.objective
        ? '回收成功，第 12 层通关已提交。'
        : '提前回收成功，物资保住，但最高通关仍为第 7 层。';
    }
    return s;
  }
  if (type === 'emergency') {
    need(
      s.phase === 'exploring' && s.emergency,
      '回程器只能在探索安全阶段使用。',
    );
    s.emergency = false;
    s.carried -= 2;
    s.phase = 'extracted';
    if (s.objective) s.best = 12;
    s.notice = '紧急回程器已消耗；已携带物资回收，未完成的主目标不会补算。';
    return s;
  }
  need(s.phase === 'returning', '只在撤离中演示失败分支。');
  s.phase = 'dead';
  s.loot = [];
  s.carried = 0;
  s.notice = '撤离战败，本局结束。未保全物资丢失，最高通关保持第 7 层。';
  return s;
}
export const RARITIES = [
  { name: '普通', base: 1, growth: 1, color: '#bbc4b3' },
  { name: '罕见', base: 1.08, growth: 1.12, color: '#9ab983' },
  { name: '稀有', base: 1.18, growth: 1.25, color: '#8eb6c7' },
  { name: '异常', base: 1.3, growth: 1.4, color: '#d7aa73' },
];
export function rarityFor(seed: number, uid: string) {
  const roll = hash(`${seed}:${uid}:rarity-v1`) % 100;
  return roll < 60 ? 0 : roll < 87 ? 1 : roll < 98 ? 2 : 3;
}
export const QUALITY = ['粗制', '标准', '精制', '大师'];
export function cardPower(rarity: number, quality: number, level: number) {
  return Math.round(
    20 * RARITIES[rarity].base * [1, 1.35, 1.75, 2.25][quality] +
      level * 3 * RARITIES[rarity].growth,
  );
}
export type Cargo = {
  uid: string;
  name: string;
  size: number;
  kind: 'physical' | 'device' | 'supply' | 'card';
  rarity?: number;
};
export const CARGO: Cargo[] = [
  { uid: 'knife-001', name: '水果刀', size: 1, kind: 'physical' },
  { uid: 'apple-001', name: '苹果', size: 1, kind: 'supply' },
  { uid: 'lighter-001', name: '打火机', size: 1, kind: 'physical' },
  { uid: 'scanner-001', name: '便携鉴定器', size: 2, kind: 'device' },
  { uid: 'return-001', name: '紧急回程器', size: 2, kind: 'device' },
  { uid: 'sling-001', name: '弹弓', size: 2, kind: 'physical' },
  { uid: 'battery-001', name: '电池组', size: 3, kind: 'physical' },
  { uid: 'medkit-001', name: '密封药箱', size: 3, kind: 'physical' },
];
export type CargoState = {
  bag: Cargo[];
  available: Cargo[];
  charges: number;
  cycles: number;
  receipts: Record<string, Cargo>;
  notice: string;
};
export const cargoStart = (): CargoState => ({
  bag: structuredClone(CARGO.slice(0, 4)),
  available: structuredClone(CARGO.slice(4)),
  charges: 2,
  cycles: 0,
  receipts: {},
  notice: '先装包，再试着鉴定一件实体。扫描不会减少这件战利品的占用。',
});
export function cargoVolume(s: CargoState) {
  return s.bag.reduce((n, x) => n + x.size, 0);
}
export function cargoAction(
  old: CargoState,
  type: 'take' | 'drop' | 'scan',
  uid: string,
): CargoState {
  const s = structuredClone(old);
  if (type === 'take') {
    const i = s.available.findIndex((x) => x.uid === uid);
    if (i < 0) throw Error('该物品已不在地面。');
    if (cargoVolume(s) + s.available[i].size > 12)
      throw Error('容量不足，请先丢下其他物品。');
    s.bag.push(s.available.splice(i, 1)[0]);
    s.notice = '已装入背包，占用与带入物共享的容量。';
    return s;
  }
  if (type === 'scan' && s.receipts[uid]) {
    s.notice = '重复请求：返回已有鉴定记录，不重复扣电荷。';
    return s;
  }
  const i = s.bag.findIndex((x) => x.uid === uid);
  if (i < 0) throw Error('物品不在你的背包。');
  const x = s.bag[i];
  if (type === 'drop') {
    s.available.push(s.bag.splice(i, 1)[0]);
    s.notice = '物品留在当前节点，身份与状态保留。';
    return s;
  }
  if (x.kind !== 'physical') throw Error('请选择尚未鉴定的实体战斗道具。');
  if (!s.bag.some((c) => c.uid === 'scanner-001'))
    throw Error('必须先携带便携鉴定器。');
  if (s.charges <= 0) throw Error('鉴定器电荷已经耗尽。');
  const card: Cargo = {
    ...x,
    uid: 'card-' + x.uid,
    kind: 'card',
    rarity: rarityFor(907, x.uid),
  };
  s.bag[i] = card;
  s.receipts[x.uid] = card;
  s.charges--;
  s.cycles++;
  s.notice = `${x.name}被鉴定为${RARITIES[card.rarity!].name}卡牌。占用仍为 ${x.size}，消耗 1 电荷 / 1 周期。`;
  return s;
}
export type Survivor = {
  id: number;
  floor: number;
  alive: boolean;
  power: number;
  personality: '谨慎' | '搜刮' | '激进' | '掠夺';
  best: number;
};
export type LedgerEvent = {
  cycle: number;
  floor: number;
  actor: number;
  amount: number;
  text: string;
  after: Survivor;
};
export type LedgerWorld = {
  cycle: number;
  seed: number;
  bots: Survivor[];
  stock: number[];
  initial: number[];
  events: LedgerEvent[];
  taken: number[];
};
export function newLedger(): LedgerWorld {
  const random = rng(907);
  const initial = Array.from(
    { length: 100 },
    () => 8 + Math.floor(random() * 9),
  );
  return {
    cycle: 0,
    seed: 907,
    bots: Array.from({ length: 99 }, (_, i) => ({
      id: i + 2,
      floor: 1,
      alive: true,
      power: 10 + Math.floor(random() * 8),
      personality: (['谨慎', '搜刮', '激进', '掠夺'] as const)[i % 4],
      best: 0,
    })),
    stock: [...initial],
    initial,
    events: [],
    taken: Array(100).fill(0),
  };
}
export function tickLedger(old: LedgerWorld): LedgerWorld {
  const s = structuredClone(old);
  s.cycle++;
  const random = rng(s.seed + s.cycle * 7919);
  const order = [
    ...s.bots.slice(s.cycle % s.bots.length),
    ...s.bots.slice(0, s.cycle % s.bots.length),
  ];
  const emit = (b: Survivor, text: string, amount = 0) =>
    s.events.push({
      cycle: s.cycle,
      floor: b.floor,
      actor: b.id,
      amount,
      text,
      after: { ...b },
    });
  const intents = order
    .filter((b) => b.alive)
    .map((b) => ({
      b,
      roll: random(),
      jump: (b.personality === '激进' ? 3 : 1) + Math.floor(random() * 2),
    }));
  const exploring: Survivor[] = [];
  for (const { b, roll, jump } of intents) {
    const id = String(b.id).padStart(3, '0');
    if (roll >= 0.45 && roll < 0.6) {
      emit(b, `${id} 在电梯内整备，未领取楼层奖励。`);
      continue;
    }
    if (roll < 0.45) {
      b.floor = Math.min(100, b.floor + jump);
      emit(b, `${id} 上行至 ${b.floor} 层。`);
    }
    exploring.push(b);
  }
  for (const b of exploring) {
    if (random() < Math.min(0.3, 0.015 + b.floor * 0.004)) {
      b.alive = false;
      emit(
        b,
        `${String(b.id).padStart(3, '0')} 在 ${b.floor} 层挑战失败，失去生命信号。`,
      );
    }
  }
  // Only two actors enter each explicit sealed encounter. Resolve it before loot allocation.
  const grouped = new Map<number, Survivor[]>();
  for (const b of exploring.filter((x) => x.alive)) {
    const group = grouped.get(b.floor) || [];
    group.push(b);
    grouped.set(b.floor, group);
  }
  for (const [floor, group] of grouped) {
    if (group.length < 2 || random() > 0.14) continue;
    const a = group[0],
      b = group[1];
    const loser = a.power + random() * 6 >= b.power + random() * 6 ? b : a;
    loser.alive = false;
    emit(
      loser,
      `${String(loser.id).padStart(3, '0')} 在 ${floor} 层封锁遭遇中被淘汰。`,
    );
  }
  for (const b of exploring) {
    if (!b.alive) continue;
    const amount = Math.min(
      s.stock[b.floor - 1],
      b.personality === '搜刮' ? 2 : 1,
    );
    s.stock[b.floor - 1] -= amount;
    s.taken[b.floor - 1] += amount;
    b.power += amount;
    b.best = Math.max(b.best, b.floor);
    emit(
      b,
      `${String(b.id).padStart(3, '0')} 完成 ${b.floor} 层摘要挑战并回收 ${amount} 单位物资，战力 +${amount}。`,
      amount,
    );
  }
  return s;
}
export function replayLedger(
  events: LedgerEvent[],
  cycle: number,
): LedgerWorld {
  const s = newLedger();
  s.cycle = cycle;
  for (const e of events) {
    const i = s.bots.findIndex((b) => b.id === e.actor);
    if (i < 0 || e.amount < 0 || e.amount > s.stock[e.floor - 1])
      throw Error('非法账本事件');
    s.bots[i] = { ...e.after };
    s.stock[e.floor - 1] -= e.amount;
    s.taken[e.floor - 1] += e.amount;
    s.events.push(structuredClone(e));
  }
  return s;
}
export type RankEntry = {
  id: string;
  cleared: number;
  reached: number;
  exit: boolean;
  cycles: number;
  alive: boolean;
  rank?: number;
};
export function rankEntries(entries: RankEntry[]): RankEntry[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.cleared - a.cleared ||
      Number(b.exit) - Number(a.exit) ||
      a.cycles - b.cycles,
  );
  let rank = 1;
  return sorted.map((x, i) => {
    const p = sorted[i - 1];
    if (
      i &&
      !(p.cleared === x.cleared && p.exit === x.exit && p.cycles === x.cycles)
    )
      rank = i + 1;
    return { ...x, rank };
  });
}
