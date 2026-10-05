/** Deterministic off-screen experiment. External model choices are recorded inputs, never random rewards. */
import { randomStream } from '../../packages/core/random.ts';
import { PROFILES } from './encounter.ts';
import type { Profile } from './encounter.ts';
import { fingerprint } from './protocol.ts';

export const FLOORS = [
  '灰烬荒原',
  '维保廊',
  '听雨庭',
  '沙海驿站',
  '倒悬书库',
  '终点',
];
export type Resource = 'brain' | 'part' | 'water' | 'food';
export const RESOURCE_NAMES: Record<Resource, string> = {
  brain: '脑浆',
  part: '零件',
  water: '水',
  food: '食物',
};
export type Unit = { uid: string; kind: Resource };
export type CampaignAction =
  | 'explore'
  | 'return'
  | 'lift'
  | 'ward'
  | 'storage'
  | 'ascend'
  | 'rest'
  | 'drink'
  | 'eat';
export type CampaignActor = {
  id: Profile;
  floor: number;
  lift: number;
  ward: number;
  storage: number;
  hp: number;
  food: number;
  water: number;
  location: 'home' | 'field';
  zone: number;
  bag: Unit[];
  stock: Unit[];
  status: 'active' | 'dead' | 'finished';
  revision: number;
  plan: {
    action: CampaignAction;
    start: number;
    finish: number;
    reason: string;
    source: string;
  } | null;
  memory: string[];
};
type Site = {
  floor: number;
  zone: number;
  risk: number;
  items: Unit[];
  searched: boolean;
};
export type Campaign = {
  product: 'f9-ai-campaign';
  rules: 'campaign-v1';
  seed: number;
  session: string;
  tick: number;
  actors: CampaignActor[];
  sites: Record<Profile, Site[]>;
  events: { tick: number; actor: Profile; text: string }[];
  receipts: {
    tick: number;
    request: CampaignRequest;
    choice: CampaignChoice;
  }[];
};
export type CampaignChoice = {
  action: CampaignAction;
  reason: string;
  model: string;
};
export type CampaignRequest = {
  schema: 'f9-campaign-request-v1';
  id: string;
  actor: Profile;
  revision: number;
  self: Omit<CampaignActor, 'bag' | 'stock'> & {
    bag: Record<Resource, number>;
    stock: Record<Resource, number>;
  };
  options: {
    action: CampaignAction;
    title: string;
    duration: number;
    cost: Partial<Record<Resource, number>>;
  }[];
  nextSite: { zone: number; risk: number } | null;
  standings: { name: string; floor: number; status: string }[];
};
export const counts = (items: Unit[]) =>
  Object.fromEntries(
    (Object.keys(RESOURCE_NAMES) as Resource[]).map((kind) => [
      kind,
      items.filter((u) => u.kind === kind).length,
    ]),
  ) as Record<Resource, number>;
const costOfLift = (a: CampaignActor) => ({
  brain: a.lift * 6,
  part: a.lift + 1,
});
export function createCampaign(seed: number, session: string): Campaign {
  if (!Number.isSafeInteger(seed) || !session)
    throw new Error('Invalid campaign input');
  const actors = (Object.keys(PROFILES) as Profile[]).map(
    (id): CampaignActor => ({
      id,
      floor: 1,
      lift: 1,
      ward: 0,
      storage: 0,
      hp: 100,
      food: 76,
      water: 68,
      location: 'home',
      zone: 0,
      bag: [],
      stock: ['water', 'water', 'food', 'food'].map((kind, i) => ({
        uid: `${session}:${id}:initial:${i}`,
        kind: kind as Resource,
      })),
      status: 'active',
      revision: 0,
      plan: null,
      memory: [],
    }),
  );
  const sites = {} as Record<Profile, Site[]>;
  for (const id of Object.keys(PROFILES) as Profile[]) {
    const rng = randomStream(seed, 'f9-campaign-sites-v1:' + id);
    sites[id] = Array.from({ length: 20 }, (_, i) => {
      const floor = Math.floor(i / 4) + 1,
        zone = (i % 4) + 1;
      const kinds: Resource[] = [
        ...Array(3 + floor).fill('brain'),
        ...Array(1 + (zone % 2)).fill('part'),
        'water',
        'food',
      ];
      return {
        floor,
        zone,
        risk: 4 + floor * 2 + zone + Math.floor(rng() * 4),
        searched: false,
        items: kinds.map((kind, j) => ({
          uid: `${session}:${id}:site:${i}:${j}`,
          kind,
        })),
      };
    });
  }
  return {
    product: 'f9-ai-campaign',
    rules: 'campaign-v1',
    seed,
    session,
    tick: 0,
    actors,
    sites,
    events: [],
    receipts: [],
  };
}
const actorOf = (s: Campaign, id: Profile) =>
  s.actors.find((a) => a.id === id)!;
export function campaignRequest(s: Campaign, id: Profile): CampaignRequest {
  const a = actorOf(s, id),
    stock = counts(a.stock),
    bag = counts(a.bag),
    options: CampaignRequest['options'] = [];
  const site = s.sites[id].find((p) => p.floor === a.floor && !p.searched);
  const add = (
    action: CampaignAction,
    title: string,
    duration: number,
    cost: Partial<Record<Resource, number>> = {},
  ) => options.push({ action, title, duration, cost });
  if (a.status === 'active' && !a.plan) {
    const supplies = a.location === 'home' ? stock : bag;
    if (supplies.water && a.water < 95) add('drink', '喝水', 2, { water: 1 });
    if (supplies.food && a.food < 95) add('eat', '进食', 2, { food: 1 });
    if (a.location === 'field') add('return', '回电梯存放物资', 5);
    if (site && a.bag.length < 16 + 4 * a.storage)
      add('explore', '搜下一处资源点', 9 + site.zone);
    if (a.location === 'home') {
      const liftCost = costOfLift(a);
      if (
        a.lift < 6 &&
        stock.brain >= liftCost.brain &&
        stock.part >= liftCost.part
      )
        add('lift', '升级电梯，解锁高层', 7, liftCost);
      if (a.ward < 2 && stock.brain >= 4 && stock.part >= 2)
        add('ward', '建造防护，降低探索损伤', 6, { brain: 4, part: 2 });
      if (a.storage < 2 && stock.part >= 3)
        add('storage', '扩建行囊 +4格', 6, { part: 3 });
      if (a.lift > a.floor) add('ascend', '前往更高楼层，关闭旧楼层', 6);
      if (a.hp < 95 && supplies.food)
        add('rest', '吃一份食物休养', 8, { food: 1 });
    }
  }
  const payload = {
    self: { ...structuredClone(a), bag, stock },
    options,
    nextSite: site ? { zone: site.zone, risk: site.risk } : null,
    standings: s.actors.map((b) => ({
      name: PROFILES[b.id].name,
      floor: b.floor,
      status: b.status,
    })),
  };
  return {
    schema: 'f9-campaign-request-v1',
    id: `${s.session}:${id}:${a.revision}:${fingerprint(payload)}`,
    actor: id,
    revision: a.revision,
    ...payload,
  };
}
export function applyCampaignChoice(
  s: Campaign,
  r: CampaignRequest,
  c: CampaignChoice,
): { state: Campaign; reason: string } {
  const current = campaignRequest(s, r.actor),
    a = actorOf(s, r.actor);
  if (current.id !== r.id || a.plan || a.status !== 'active')
    return { state: s, reason: 'stale' };
  const option = current.options.find((o) => o.action === c.action);
  if (
    !option ||
    typeof c.reason !== 'string' ||
    !c.reason.trim() ||
    c.reason.length > 240 ||
    !c.model
  )
    return { state: s, reason: 'invalid' };
  const n = structuredClone(s),
    b = actorOf(n, r.actor);
  // Costs are reserved and consumed at acceptance; legality above checks the full bundle atomically.
  const from = b.location === 'home' ? b.stock : b.bag;
  const removed = new Set<string>();
  for (const [kind, amount] of Object.entries(option.cost)) {
    const units = from.filter((u) => u.kind === kind).slice(0, amount);
    if (units.length !== amount) return { state: s, reason: 'missing-cost' };
    units.forEach((u) => removed.add(u.uid));
  }
  if (b.location === 'home') b.stock = from.filter((u) => !removed.has(u.uid));
  else b.bag = from.filter((u) => !removed.has(u.uid));
  b.plan = {
    action: c.action,
    start: n.tick,
    finish: n.tick + option.duration,
    reason: c.reason,
    source: c.model,
  };
  if (c.action === 'explore') b.location = 'field';
  b.revision++;
  n.receipts.push({
    tick: n.tick,
    request: structuredClone(r),
    choice: structuredClone(c),
  });
  n.events.push({
    tick: n.tick,
    actor: b.id,
    text: `决定${option.title}：${c.reason}`,
  });
  return { state: n, reason: 'applied' };
}
export function stepCampaign(s: Campaign): Campaign {
  const n = structuredClone(s);
  n.tick++;
  for (const a of n.actors) {
    if (a.status !== 'active' || !a.plan) continue; // Waiting for inference does not consume biological time.
    a.food = Math.max(0, a.food - (a.location === 'field' ? 0.34 : 0.12));
    a.water = Math.max(0, a.water - (a.location === 'field' ? 0.5 : 0.17));
    if (!a.food || !a.water) a.hp = Math.max(0, a.hp - 1.5);
    if (a.hp <= 0) {
      a.status = 'dead';
      a.plan = null;
      a.revision++;
      n.events.push({
        tick: n.tick,
        actor: a.id,
        text: '精神耗尽，倒下。仓库保留，行囊留在此层。',
      });
      continue;
    }
    if (n.tick < a.plan.finish) continue;
    const action = a.plan.action;
    let result = '';
    if (action === 'explore') {
      const site = n.sites[a.id].find(
        (p) => p.floor === a.floor && !p.searched,
      );
      if (site) {
        a.zone = site.zone;
        const free = 16 + a.storage * 4 - a.bag.length,
          taken = site.items.splice(0, free);
        a.bag.push(...taken);
        site.searched = !site.items.length;
        a.hp = Math.max(0, a.hp - Math.max(2, site.risk - a.ward * 4));
        result = `搜取${taken.length}件真实物资，精神损失${Math.max(2, site.risk - a.ward * 4)}。`;
      }
    } else if (action === 'return') {
      result = `带回${a.bag.length}件，存入仓库。`;
      a.stock.push(...a.bag);
      a.bag = [];
      a.location = 'home';
      a.zone = 0;
    } else if (action === 'lift') {
      a.lift++;
      result = `电梯升至${a.lift}级，解锁${a.lift}层。`;
    } else if (action === 'ward') {
      a.ward++;
      result = `防护升至${a.ward}级。`;
    } else if (action === 'storage') {
      a.storage++;
      result = `行囊扩至${16 + a.storage * 4}格。`;
    } else if (action === 'ascend') {
      a.floor++;
      a.zone = 0;
      result = `进入${a.floor}层，旧楼层永久关闭。`;
      if (a.floor === 6) a.status = 'finished';
    } else if (action === 'drink') {
      a.water = Math.min(100, a.water + 45);
      result = '消耗一瓶水，饮水 +45。';
    } else if (action === 'eat') {
      a.food = Math.min(100, a.food + 40);
      result = '消耗一份食物，饱食 +40。';
    } else if (action === 'rest') {
      a.hp = Math.min(100, a.hp + 32);
      a.food = Math.min(100, a.food + 20);
      result = '消耗一份食物休养，精神 +32。';
    }
    a.memory = [...a.memory, `${a.floor}层：${result}`].slice(-12);
    a.plan = null;
    a.revision++;
    n.events.push({ tick: n.tick, actor: a.id, text: result });
    if (a.hp <= 0) {
      a.status = 'dead';
      n.events.push({
        tick: n.tick,
        actor: a.id,
        text: '探索时倒下，遗留行囊。',
      });
    }
  }
  n.events = n.events.slice(-100);
  return n;
}
/** Explicit comparison baseline, labelled as rules in the UI. Never presented as model inference. */
export function baselineCampaign(r: CampaignRequest): CampaignChoice {
  const s = r.self,
    available = new Set(r.options.map((o) => o.action));
  const priorities: CampaignAction[] = [
    ...(s.water < 45 ? ['drink' as const] : []),
    ...(s.food < 45 ? ['eat' as const] : []),
    ...(s.hp < 50 ? ['rest' as const] : []),
    ...(s.location === 'field' &&
    (Object.values(s.bag).reduce((n, v) => n + v, 0) >= 9 ||
      s.hp < 45 ||
      !r.nextSite)
      ? ['return' as const]
      : []),
    'ascend',
    ...(r.actor === 'ally' && !s.ward ? ['ward' as const] : []),
    'lift',
    ...(r.actor === 'broker' && !s.storage ? ['storage' as const] : []),
    'explore',
    'return',
    'rest',
    'drink',
    'eat',
    'ward',
    'storage',
  ];
  return {
    action: priorities.find((p) => available.has(p))!,
    reason: '规则对照：优先补给、保住带回物资，再建设升层。',
    model: 'rule-baseline',
  };
}
/** Explicit present tense separates completed memories from the authoritative current plan. */
export function campaignLetterFacts(r: CampaignRequest) {
  const a = r.self;
  return {
    当前位置: a.location === 'home' ? '电梯内，不在野外' : '当前楼层野外',
    当前楼层: a.floor,
    当前参赛状态: a.status,
    精神: a.hp, 饱食: a.food, 饮水: a.water,
    正在执行: a.plan
      ? { action: a.plan.action, 原因: a.plan.reason }
      : '没有进行中的行动，当前待命',
    行囊: a.bag,
    仓库: a.stock,
    电梯等级: a.lift,
    防护等级: a.ward,
    行囊容量: 16 + a.storage * 4,
    下次升级消耗: { 脑浆: a.lift * 6, 零件: a.lift + 1 },
    最近已完成事项并非进行中: a.memory.slice(-3),
    本层还有未搜完资源点: !!r.nextSite,
    可选行动但尚未开始: r.options.map((o) => o.title),
  };
}
export function replayCampaign(
  seed: number,
  session: string,
  decisions: Campaign['receipts'],
  endTick: number,
) {
  let s = createCampaign(seed, session);
  for (let i = 0; i <= endTick; i++) {
    for (const receipt of decisions.filter((d) => d.tick === i)) {
      const result = applyCampaignChoice(s, receipt.request, receipt.choice);
      if (result.reason !== 'applied')
        throw new Error('Invalid campaign replay: ' + result.reason);
      s = result.state;
    }
    if (i < endTick) s = stepCampaign(s);
  }
  return s;
}
