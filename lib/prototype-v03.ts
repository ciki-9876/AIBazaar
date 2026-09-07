import { cargoStart, hash, rng } from './design-model.ts';
export const WEATHER = [
  {
    name: '雷雨',
    terrain: ['潮湿', '强风', '遮蔽'],
    explore: '短接机关可节省一次搜索，但露天搜索额外消耗 4 精力。',
  },
  {
    name: '寒潮',
    terrain: ['寒冷', '遮蔽', '强风'],
    explore: '结冰路线可直接抵达目标，普通搜索额外消耗 4 精力。',
  },
  {
    name: '浓雾',
    terrain: ['遮蔽', '潮湿', '平静'],
    explore: '隐蔽路线减少搜索的精力消耗；目标线索需要多一次搜索。',
  },
  {
    name: '热浪',
    terrain: ['炎热', '强风', '平静'],
    explore: '露天探索额外消耗 4 精力；可用热源打开密封机关。',
  },
];
export const TALENTS = [
  { name: '普通', chance: 60, base: 1, growth: 1 },
  { name: '罕见', chance: 26, base: 1.08, growth: 1.12 },
  { name: '稀有', chance: 11, base: 1.18, growth: 1.25 },
  { name: '异常', chance: 2.8, base: 1.3, growth: 1.4 },
  { name: '奇迹', chance: 0.2, base: 1.45, growth: 1.6 },
];
export const CARDS = [
  {
    id: 'knife',
    name: '水果刀',
    cd: 3,
    power: 12,
    cost: 2,
    kind: 'damage',
    effect: '每第三次发动追加 6 点伤害。',
    master: '追加伤害提升为 12。',
  },
  {
    id: 'wire',
    name: '导电索',
    cd: 4,
    power: 15,
    cost: 3,
    kind: 'damage',
    effect: '潮湿时每第三次发动，推进同路另一张牌冷却 1 秒。',
    master: '推进 2 秒。',
  },
  {
    id: 'bottle',
    name: '集露瓶',
    cd: 5,
    power: 13,
    cost: 2,
    kind: 'heal',
    effect: '潮湿时每第三次发动，额外治疗主人 15。',
    master: '额外治疗 25。',
  },
  {
    id: 'shelter',
    name: '遮雨棚',
    cd: 5,
    power: 12,
    cost: 2,
    kind: 'shield',
    effect: '同路其他牌免受寒冷、强风的冷却惩罚。',
    master: '本牌发动后额外提供 5 护盾。',
  },
  {
    id: 'bell',
    name: '风铃',
    cd: 6,
    power: 1,
    cost: 2,
    kind: 'charge',
    effect: '强风时推进同路所有其他牌冷却，自身冷却 +1 秒。',
    master: '每次推进 1.5 秒。',
  },
  {
    id: 'brick',
    name: '蓄热砖',
    cd: 6,
    power: 24,
    cost: 4,
    kind: 'damage',
    effect: '炎热时每第三次发动追加 18 点热伤害。',
    master: '追加伤害 30。',
  },
  {
    id: 'box',
    name: '保温箱',
    cd: 6,
    power: 18,
    cost: 3,
    kind: 'heal',
    effect: '寒冷时溢出治疗转为最多 12 护盾。',
    master: '转换上限 20。',
  },
  {
    id: 'cell',
    name: '手摇电芯',
    cd: 4,
    power: 8,
    cost: 0,
    kind: 'shield',
    effect: '供能模式下额外回复 2 能量；天气模式额外提供 3 护盾。',
    master: '额外回复 3 能量 / 提供 6 护盾。',
  },
] as const;
export const OPEN_FOUR = [0, 3, 4, 6];
export const START_BOARD = [
  'wire',
  null,
  null,
  'knife',
  'shelter',
  null,
  'bottle',
  null,
  null,
] as (string | null)[];
export function terrainFor(weather: number, layout: number) {
  const a = WEATHER[weather].terrain;
  return a.map((_, i) => a[(i + layout) % 3]);
}
export type BattleFrame = {
  time: number;
  hp: number[];
  shield: number[];
  energy: number[];
  progress: number[][];
  fired: string[];
  log: string[];
};
export function duel(
  board: (string | null)[],
  weather: number,
  layout: number,
  mode: 'weather' | 'power',
  quality: number,
) {
  const boards = [
    board,
    ['knife', null, null, 'brick', 'shelter', null, 'wire', null, null],
  ];
  const terrain = terrainFor(weather, layout);
  const hp = [220, 220],
    shield = [0, 0],
    energy = [5, 5];
  const timers = [Array(9).fill(0), Array(9).fill(0)],
    counts = [Array(9).fill(0), Array(9).fill(0)];
  const frames: BattleFrame[] = [];
  const log: string[] = [];
  for (let step = 0; step <= 240; step++) {
    const time = step * 0.25;
    const fired: string[] = [];
    if (step) {
      for (let side = 0; side < 2; side++)
        energy[side] = Math.min(10, energy[side] + 0.25);
      const damage = [0, 0];
      for (let side = 0; side < 2; side++)
        for (let slot = 0; slot < 9; slot++) {
          const id = boards[side][slot];
          const card = CARDS.find((c) => c.id === id);
          if (!card) continue;
          const q = side === 0 ? quality : 1;
          const lane = Math.floor(slot / 3);
          const env = mode === 'weather' ? terrain[lane] : '平静';
          const protectedLane =
            q > 0 &&
            boards[side].slice(lane * 3, lane * 3 + 3).includes('shelter') &&
            id !== 'shelter';
          let cd =
            card.cd +
            ((env === '寒冷' || env === '强风') && !protectedLane ? 0.75 : 0);
          if (id === 'bell' && q > 0 && env === '强风') cd += 1;
          timers[side][slot] += 0.25;
          if (timers[side][slot] < cd) continue;
          if (mode === 'power' && energy[side] < card.cost) {
            timers[side][slot] = cd;
            continue;
          }
          if (mode === 'power') energy[side] -= card.cost;
          timers[side][slot] -= cd;
          counts[side][slot]++;
          const n = counts[side][slot];
          fired.push(`${side}-${slot}`);
          if (card.kind === 'damage') {
            let power = card.power;
            if (q > 0 && n % 3 === 0) {
              if (id === 'knife') power += q === 2 ? 12 : 6;
              if (id === 'brick' && env === '炎热') power += q === 2 ? 30 : 18;
            }
            damage[1 - side] += power;
            log.push(
              `${time.toFixed(1)}s ${side ? '对手' : '你'}·${card.name} → 主人伤害 ${power}`,
            );
          }
          if (card.kind === 'heal') {
            let amount = card.power;
            if (id === 'bottle' && q > 0 && env === '潮湿' && n % 3 === 0)
              amount += q === 2 ? 25 : 15;
            const overflow = Math.max(0, hp[side] + amount - 220);
            hp[side] = Math.min(220, hp[side] + amount);
            if (id === 'box' && q > 0 && env === '寒冷')
              shield[side] += Math.min(q === 2 ? 20 : 12, overflow);
            log.push(
              `${time.toFixed(1)}s ${side ? '对手' : '你'}·${card.name} → 治疗主人 ${amount}`,
            );
          }
          if (card.kind === 'shield') {
            shield[side] += card.power + (q === 2 && id === 'shelter' ? 5 : 0);
            if (id === 'cell' && q > 0) {
              if (mode === 'power')
                energy[side] = Math.min(10, energy[side] + (q === 2 ? 3 : 2));
              else shield[side] += q === 2 ? 6 : 3;
            }
          }
          let advance = 0;
          if (id === 'wire' && q > 0 && env === '潮湿' && n % 3 === 0)
            advance = q === 2 ? 2 : 1;
          if (id === 'bell') advance = q === 2 ? 1.5 : 1;
          if (advance) {
            const others = boards[side]
              .map((x, i) =>
                x && i !== slot && Math.floor(i / 3) === lane ? i : -1,
              )
              .filter((i) => i >= 0);
            const targets =
              id === 'bell' && q > 0 && env === '强风'
                ? others
                : others.slice(0, 1);
            for (const i of targets) timers[side][i] += advance;
            log.push(
              `${time.toFixed(1)}s ${card.name} → 推进 ${targets.length} 张同路卡冷却`,
            );
          }
        }
      for (let s = 0; s < 2; s++) {
        const absorbed = Math.min(shield[s], damage[s]);
        shield[s] -= absorbed;
        hp[s] -= damage[s] - absorbed;
        if (time >= 40) hp[s] -= 0.25 * (time - 39) * 2;
        hp[s] = Math.max(0, hp[s]);
      }
    }
    frames.push({
      time,
      hp: [...hp],
      shield: [...shield],
      energy: [...energy],
      progress: timers.map((a) => [...a]),
      fired,
      log: log.slice(-7),
    });
    if (hp.some((h) => h <= 0)) break;
  }
  const winner =
    hp[0] === hp[1] ? '平局' : hp[0] > hp[1] ? '玩家胜利' : '对手胜利';
  return { frames, winner };
}
export type DayState = {
  day: number;
  quota: number;
  stamina: number;
  supply: number;
  material: number;
  power: number;
  floor: number;
  maxFloor: number;
  best: number;
  phase: 'base' | 'floor' | 'over';
  used: boolean;
  searches: number;
  objective: boolean;
  loot: number;
  safe: number;
  capacity: number;
  slots: number;
  produced: boolean;
  notice: string;
};
export function newDay(): DayState {
  return {
    day: 1,
    quota: 12,
    stamina: 100,
    supply: 8,
    material: 18,
    power: 24,
    floor: 1,
    maxFloor: 10,
    best: 0,
    phase: 'base',
    used: false,
    searches: 0,
    objective: false,
    loot: 0,
    safe: 0,
    capacity: 12,
    slots: 4,
    produced: false,
    notice: '建议数值：12 配额，每天维持 1，救援额外消耗 3。',
  };
}
export function dayAction(
  old: DayState,
  action: string,
  target = old.floor,
  weather = 0,
) {
  const s = { ...old };
  const ensure = (v: boolean, m: string) => {
    if (!v) throw Error(m);
  };
  ensure(s.phase !== 'over', '配额耗尽，本局已结束。');
  if (action === 'depart') {
    ensure(s.phase === 'base' && !s.used, '每天仅一次出勤，睡觉后刷新。');
    ensure(
      target >= s.floor && target <= s.maxFloor,
      '仅可进入已解锁且不低于当前位置的楼层。',
    );
    const cost = target === s.floor ? 0 : 2 + Math.ceil((target - s.floor) / 5);
    ensure(s.power >= cost, '上行电力不足。');
    s.power -= cost;
    s.floor = target;
    s.phase = 'floor';
    s.used = true;
    s.searches = 0;
    s.objective = false;
    s.loot = 0;
    s.safe = 0;
    s.notice = '已出勤。主目标：取得异常核心；随后必须成功撤回。';
  } else if (action === 'search') {
    ensure(s.phase === 'floor', '先出勤进入楼层。');
    const cost = weather === 2 ? 6 : 12;
    ensure(s.supply >= 1 && s.stamina >= cost, '补给或精力不足。');
    ensure(s.loot * 2 + 4 <= s.capacity, '普通背包容量不足。');
    s.supply--;
    s.stamina -= cost;
    s.searches++;
    s.loot++;
    s.objective = s.searches >= (weather === 2 ? 3 : 2);
    s.notice = s.objective
      ? '主目标已完成，撤回才提交通关。'
      : '找到物资与线索，尚未完成目标。';
  } else if (action === 'secure') {
    ensure(
      s.phase === 'floor' && s.loot > 0 && s.safe === 0,
      '安全容器限 1 件小型样例物资。',
    );
    s.loot--;
    s.safe = 1;
    s.notice = '已放入安全容器。占用独立的 2 容积。';
  } else if (action === 'extract') {
    ensure(s.phase === 'floor', '当前不在楼层。');
    ensure(s.stamina >= 8, '常规返回需要 8 精力。');
    s.stamina -= 8;
    s.phase = 'base';
    s.material += (s.loot + s.safe) * 2;
    if (s.objective) s.best = Math.max(s.best, s.floor);
    s.loot = 0;
    s.safe = 0;
    s.notice = '成功撤回，物资已转为样例材料；今天不能再次出勤。';
  } else if (action === 'fail') {
    ensure(s.phase === 'floor', '当前不在楼层。');
    s.quota = Math.max(0, s.quota - 3);
    s.loot = 0;
    s.material += s.safe * 2;
    s.safe = 0;
    s.phase = s.quota === 0 ? 'over' : 'base';
    s.notice =
      s.quota === 0
        ? '救援后配额耗尽，永久淘汰。'
        : '强制回收：普通包丢失，安全容器保留，额外扣 3 配额；旧通关记录保留。';
  } else if (action === 'sleep') {
    ensure(s.phase === 'base', '必须先返回电梯。');
    s.quota = Math.max(0, s.quota - 1);
    if (s.quota === 0) {
      s.phase = 'over';
      s.notice = '生命维持配额耗尽，本局结束。';
      return s;
    }
    const fed = s.supply > 0;
    if (fed) s.supply--;
    s.stamina = Math.min(100, s.stamina + (fed ? 50 : 15));
    s.day++;
    s.used = false;
    s.produced = false;
    s.notice = `进入第 ${s.day} 天，消耗 1 配额${fed ? '和 1 补给，恢复 50 精力' : '；无补给，仅恢复 15 精力'}。`;
  } else if (action === 'produce') {
    ensure(s.phase === 'base' && !s.produced, '基地每天只能生产一次。');
    ensure(s.material >= 1 && s.power >= 3, '需要 1 材料和 3 电力。');
    s.material--;
    s.power -= 3;
    s.supply++;
    s.produced = true;
    s.notice = '已生产 1 补给，日期不变；每日额度已用完。';
  } else if (action === 'upgrade') {
    ensure(
      s.phase === 'base' && s.slots < 9 && s.material >= 6,
      '升级需要基地内、6 材料，格位最多 9。',
    );
    s.material -= 6;
    s.slots++;
    s.maxFloor = Math.min(100, s.maxFloor + 10);
    s.notice = '电梯升级：战斗格 +1，可达高度 +10。均为建议进度曲线。';
  } else if (action === 'bag') {
    ensure(
      s.phase === 'base' && s.capacity < 20 && s.material >= 4,
      '背包扩容需要 4 材料，样例上限 20。',
    );
    s.material -= 4;
    s.capacity += 4;
    s.notice = '探索背包扩容 +4，不改变战斗格位。';
  } else throw Error('未知行动');
  return s;
}
export function newCargo() {
  return { ...cargoStart(), capacity: 12, material: 12 };
}
export function cargoV03(
  old: ReturnType<typeof newCargo>,
  action: string,
  uid = '',
) {
  const s = structuredClone(old);
  if (action === 'expand') {
    if (s.capacity >= 20 || s.material < 4)
      throw Error('扩容需要 4 材料，上限 20');
    s.capacity += 4;
    s.material -= 4;
    s.notice = '探索包容量增加 4';
    return s;
  }
  if (action === 'scan' && s.receipts[uid]) {
    s.notice = '重用鉴定回执，不重复扣电荷。';
    return s;
  }
  const list = action === 'take' ? s.available : s.bag;
  const i = list.findIndex((x) => x.uid === uid);
  if (i < 0) throw Error('物品不在当前位置');
  const item = list[i];
  if (action === 'take') {
    if (s.bag.reduce((n, x) => n + x.size, 0) + item.size > s.capacity)
      throw Error('探索包容量不足');
    s.bag.push(s.available.splice(i, 1)[0]);
  } else if (action === 'drop') s.available.push(s.bag.splice(i, 1)[0]);
  else if (action === 'scan') {
    if (
      item.kind !== 'physical' ||
      s.charges < 1 ||
      !s.bag.some((x) => x.uid === 'scanner-001')
    )
      throw Error('需要未鉴定实体、鉴定器和电荷');
    const roll = hash(uid + ':907:v03') % 10000;
    const rarity =
      roll < 6000 ? 0 : roll < 8600 ? 1 : roll < 9700 ? 2 : roll < 9980 ? 3 : 4;
    const card = { ...item, uid: 'card-' + uid, kind: 'card' as const, rarity };
    s.bag[i] = card;
    s.receipts[uid] = card;
    s.charges--;
    s.notice = `鉴定为${TALENTS[rarity].name}，体积不变，日期不变。`;
    return s;
  } else throw Error('未知操作');
  s.notice = '所有权和体积已更新。';
  return s;
}
export function newBots() {
  return {
    day: 1,
    bots: Array.from({ length: 99 }, (_, i) => ({
      id: i + 2,
      floor: 1,
      quota: 12,
      power: 10,
      alive: true,
    })),
    initial: Array(100).fill(12) as number[],
    stock: Array(100).fill(12) as number[],
    rescued: 0,
    log: [] as string[],
  };
}
export function botDay(old: ReturnType<typeof newBots>) {
  const s = structuredClone(old);
  s.day++;
  s.rescued = 0;
  s.log = [];
  const random = rng(907 + s.day);
  const offset = s.day % 99;
  const order = [...s.bots.slice(offset), ...s.bots.slice(0, offset)];
  for (const b of order) {
    if (!b.alive) continue;
    b.quota--;
    if (b.quota <= 0) {
      b.alive = false;
      s.log.push(`${b.id} 维持配额耗尽，永久淘汰`);
      continue;
    }
    b.floor = Math.min(100, b.floor + 1 + Math.floor(random() * 3));
    if (random() < 0.23) {
      b.quota = Math.max(0, b.quota - 3);
      s.rescued++;
      b.alive = b.quota > 0;
      s.log.push(
        `${b.id} 挑战失败，${b.alive ? '强制回收' : '救援配额耗尽，永久淘汰'}`,
      );
      continue;
    }
    if (s.stock[b.floor - 1] > 0) {
      s.stock[b.floor - 1]--;
      b.power++;
      s.log.push(`${b.id} 从 ${b.floor} 层回收 1 物资`);
    }
  }
  return s;
}
