import {
  CARDS as OLD_CARDS,
  terrainFor,
  newDay as oldDay,
  dayAction as oldAction,
  newBots as oldBots,
} from './prototype-v03.ts';
import { rng } from './design-model.ts';
export type CardDef = {
  id: string;
  name: string;
  size: number;
  cd: number;
  power: number;
  kind: string;
  effect: string;
  master: string;
  energyCost: number;
  energyGain: number;
};
export const CARDS: CardDef[] = OLD_CARDS.map<CardDef>((c) => ({
  ...c,
  size: ['shelter', 'brick', 'box'].includes(c.id) ? 2 : 1,
  energyCost: 0,
  energyGain: c.id === 'cell' ? 3 : 0,
  effect:
    c.id === 'cell' ? '发动时生成 3 能量，所有普通卡仍可独立运行。' : c.effect,
  master: c.id === 'cell' ? '每次生成 4 能量。' : c.master,
})).concat([
  {
    id: 'coil',
    name: '脉冲线圈',
    size: 2,
    cd: 4,
    power: 42,
    kind: 'damage',
    energyCost: 3,
    energyGain: 0,
    effect: '消耗 3 能量才能发动；每第三次发动额外造成 12 伤害。',
    master: '每第三次额外伤害提高至 24。',
  },
  {
    id: 'battery',
    name: '蓄能阵列',
    size: 3,
    cd: 8,
    power: 28,
    kind: 'shield',
    energyCost: 0,
    energyGain: 4,
    effect: '能量上限 +6；发动时生成 4 能量。',
    master: '发动时额外获得 10 护盾。',
  },
]);
export type Piece = { id: string; at: number };
export const FOUR = [0, 3, 4, 6];
export const START: Piece[] = [
  { id: 'wire', at: 0 },
  { id: 'shelter', at: 3 },
  { id: 'knife', at: 6 },
];
export const EARLY_ENEMY: Piece[] = [
  { id: 'knife', at: 0 },
  { id: 'brick', at: 3 },
  { id: 'bottle', at: 6 },
];
export const ENEMY: Piece[] = [
  { id: 'brick', at: 0 },
  { id: 'knife', at: 2 },
  { id: 'shelter', at: 3 },
  { id: 'bottle', at: 5 },
  { id: 'wire', at: 6 },
  { id: 'bell', at: 7 },
  { id: 'cell', at: 8 },
];
export const POWER: Piece[] = [
  { id: 'cell', at: 0 },
  { id: 'coil', at: 1 },
  { id: 'shelter', at: 3 },
  { id: 'bell', at: 5 },
  { id: 'battery', at: 6 },
];
export const cardDef = (id: string) => {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw Error('未知卡牌');
  return c;
};
export const covered = (p: Piece) =>
  Array.from({ length: cardDef(p.id).size }, (_, i) => p.at + i);
export function validateBoard(board: Piece[], open: number[]) {
  const occupied = new Set<number>(),
    ids = new Set<string>();
  for (const p of board) {
    const cells = covered(p);
    if (
      !Number.isInteger(p.at) ||
      p.at < 0 ||
      p.at > 8 ||
      cells.some((i) => Math.floor(i / 3) !== Math.floor(p.at / 3))
    )
      throw Error('多格卡不能跨路');
    if (ids.has(p.id)) throw Error('同一张样卡不能重复放置');
    ids.add(p.id);
    for (const slot of cells) {
      if (!open.includes(slot)) throw Error('需要连续的已解锁格位');
      if (occupied.has(slot))
        throw Error('目标位置被其他卡占用，请先移除或移动');
      occupied.add(slot);
    }
  }
}
export function placeCard(
  board: Piece[],
  id: string,
  at: number,
  open: number[],
) {
  const next = board.filter((p) => p.id !== id).map((p) => ({ ...p }));
  next.push({ id, at });
  validateBoard(next, open);
  return next.sort((a, b) => a.at - b.at);
}
export const RARITY = [
  { name: '普通', base: 1, growth: 1 },
  { name: '罕见', base: 1.08, growth: 1.12 },
  { name: '稀有', base: 1.18, growth: 1.25 },
  { name: '异常', base: 1.3, growth: 1.4 },
  { name: '奇迹', base: 2.4, growth: 2.8 },
];
export function stat(id: string, rarity: number, level: number) {
  const c = cardDef(id);
  return c.kind === 'charge'
    ? Math.round(
        (c.power * RARITY[rarity].base + level * 0.1 * RARITY[rarity].growth) *
          10,
      ) / 10
    : Math.round(
        c.power * RARITY[rarity].base + level * 3 * RARITY[rarity].growth,
      );
}
export const MIRACLE =
  '回响：每第三次发动，额外结算本牌主效果的 50%；不消耗能量，不产生能量，不再次触发回响。';
export type Frame = {
  time: number;
  hp: number[];
  shield: number[];
  energy: number[];
  cap: number[];
  timers: number[][];
  cd: number[][];
  fired: string[];
  waiting: string[];
  log: string[];
};
export function battle(
  player: Piece[],
  enemy: Piece[],
  weather: number,
  layout: number,
  quality: number,
  miracle: string | null = null,
  rarity = 0,
  level = 0,
) {
  validateBoard(player, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  validateBoard(enemy, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const boards = [player, enemy].map((a) => [...a].sort((x, y) => x.at - y.at));
  const hp = [260, 260],
    shield = [0, 0],
    energy = [0, 0],
    cap = boards.map((a) => 10 + (a.some((p) => p.id === 'battery') ? 6 : 0));
  const timers = [Array(9).fill(0), Array(9).fill(0)],
    counts = [Array(9).fill(0), Array(9).fill(0)];
  const terrain = terrainFor(weather, layout),
    frames: Frame[] = [],
    log: string[] = [];
  for (let step = 0; step <= 240; step++) {
    const time = step * 0.25,
      fired: string[] = [],
      waiting: string[] = [],
      cd = [Array(9).fill(0), Array(9).fill(0)];
    const damage = [0, 0];
    for (let side = 0; side < 2; side++)
      for (const p of boards[side]) {
        const c = cardDef(p.id),
          q = side === 0 ? quality : 1,
          lane = Math.floor(p.at / 3),
          env = terrain[lane];
        const shielded =
          q > 0 &&
          p.id !== 'shelter' &&
          boards[side].some(
            (x) => x.id === 'shelter' && Math.floor(x.at / 3) === lane,
          );
        cd[side][p.at] =
          c.cd +
          ((env === '寒冷' || env === '强风') && !shielded ? 0.75 : 0) +
          (p.id === 'bell' && q > 0 && env === '强风' ? 1 : 0);
        if (!step) continue;
        timers[side][p.at] += 0.25;
        if (timers[side][p.at] < cd[side][p.at]) continue;
        if (energy[side] < c.energyCost) {
          timers[side][p.at] = cd[side][p.at];
          waiting.push(`${side}-${p.at}`);
          continue;
        }
        timers[side][p.at] -= cd[side][p.at];
        energy[side] -= c.energyCost;
        counts[side][p.at]++;
        const n = counts[side][p.at];
        fired.push(`${side}-${p.at}`);
        const r = side === 0 ? (miracle === p.id ? 4 : rarity) : 0;
        const value = stat(c.id, r, side === 0 ? level : 0);
        const owner = side ? '对手' : '你';
        let amount = value;
        if (c.kind === 'damage') {
          if (q > 0 && n % 3 === 0) {
            if (c.id === 'knife') amount += q === 2 ? 12 : 6;
            if (c.id === 'brick' && env === '炎热') amount += q === 2 ? 30 : 18;
            if (c.id === 'coil') amount += q === 2 ? 24 : 12;
          }
          damage[1 - side] += amount;
          log.push(
            `${time.toFixed(1)}s ${owner}·${c.name} → 对方主人 ${amount} 伤害`,
          );
        }
        if (c.kind === 'heal') {
          if (c.id === 'bottle' && q > 0 && env === '潮湿' && n % 3 === 0)
            amount += q === 2 ? 25 : 15;
          const overflow = Math.max(0, hp[side] + amount - 260);
          hp[side] = Math.min(260, hp[side] + amount);
          if (c.id === 'box' && q > 0 && env === '寒冷')
            shield[side] += Math.min(q === 2 ? 20 : 12, overflow);
          log.push(`${time.toFixed(1)}s ${owner}·${c.name} → 治疗 ${amount}`);
        }
        if (c.kind === 'shield') {
          amount +=
            q === 2
              ? c.id === 'shelter'
                ? 5
                : c.id === 'battery'
                  ? 10
                  : 0
              : 0;
          shield[side] += amount;
          log.push(`${time.toFixed(1)}s ${owner}·${c.name} → 护盾 ${amount}`);
        }
        if (c.energyGain) {
          const gain = c.energyGain + (c.id === 'cell' && q === 2 ? 1 : 0);
          energy[side] = Math.min(cap[side], energy[side] + gain);
          log.push(`${time.toFixed(1)}s ${owner}·${c.name} → 发电 ${gain}`);
        }
        const others = boards[side].filter(
          (x) => x.at !== p.at && Math.floor(x.at / 3) === lane,
        );
        const advance =
          c.kind === 'charge'
            ? q === 2
              ? value + 0.5
              : value
            : c.id === 'wire' && q > 0 && env === '潮湿' && n % 3 === 0
              ? q === 2
                ? 2
                : 1
              : 0;
        const targets =
          c.id === 'bell' && q > 0 && env === '强风'
            ? others
            : others.slice(0, 1);
        if (advance) {
          for (const x of targets) timers[side][x.at] += advance;
          log.push(
            `${time.toFixed(1)}s ${owner}·${c.name} → 推进 ${targets.length} 张同路牌 ${advance}s`,
          );
        }
        if (r === 4 && n % 3 === 0) {
          const echo = Math.round(amount * 0.5 * 10) / 10;
          if (c.kind === 'damage') damage[1 - side] += echo;
          if (c.kind === 'heal') hp[side] = Math.min(260, hp[side] + echo);
          if (c.kind === 'shield') shield[side] += echo;
          if (c.kind === 'charge')
            for (const x of targets) timers[side][x.at] += advance * 0.5;
          log.push(
            `${time.toFixed(1)}s ${owner}·${c.name}【奇迹回响】${c.kind === 'charge' ? '追加半量充能' : echo + ' 主效果'}`,
          );
        }
      }
    for (let side = 0; side < 2; side++) {
      const absorbed = Math.min(shield[side], damage[side]);
      shield[side] -= absorbed;
      hp[side] -= damage[side] - absorbed;
      if (time >= 40) hp[side] -= 0.25 * (time - 39) * 2;
      hp[side] = Math.max(0, hp[side]);
    }
    frames.push({
      time,
      hp: [...hp],
      shield: [...shield],
      energy: [...energy],
      cap: [...cap],
      timers: timers.map((a) => [...a]),
      cd,
      fired,
      waiting,
      log: log.slice(-10),
    });
    if (hp.some((h) => h <= 0)) break;
  }
  return {
    frames,
    winner: hp[0] === hp[1] ? '平局' : hp[0] > hp[1] ? '玩家胜利' : '对手胜利',
  };
}
export const rescueCost = (streak: number) => Math.min(9, 3 + streak * 2);
export const safeCapacity = (slots: number) =>
  slots >= 8 ? 6 : slots >= 6 ? 4 : 2;
export function newDay() {
  return {
    ...oldDay(),
    quota: 18,
    streak: 0,
    notice: '样例初始 18 配额；连续救援额外扣 3 / 5 / 7 / 9，成功撤回重置。',
  };
}
export function dayAction(
  old: ReturnType<typeof newDay>,
  action: string,
  target = old.floor,
  weather = 0,
) {
  if (old.phase === 'over') throw Error('配额耗尽，本局结束');
  if (action === 'secure') {
    if (
      old.phase !== 'floor' ||
      old.loot < 1 ||
      (old.safe + 1) * 2 > safeCapacity(old.slots)
    )
      throw Error('安全容器空间不足，或没有可转移的物资');
    return {
      ...old,
      loot: old.loot - 1,
      safe: old.safe + 1,
      notice: '一件 2 容积物资移入安全容器。',
    };
  }
  const result = { ...old, ...oldAction(old, action, target, weather) };
  if (action === 'fail') {
    const cost = rescueCost(old.streak);
    result.quota = Math.max(0, old.quota - cost);
    result.streak = old.streak + 1;
    result.phase = result.quota ? 'base' : 'over';
    result.notice = `强制回收扣 ${cost} 配额，普通包丢失、安全容器保留。${result.quota ? '下次救援费用 ' + rescueCost(result.streak) : '配额归零，永久淘汰。'}`;
  }
  if (action === 'extract') {
    result.streak = 0;
    result.notice += ' 连续救援计数已重置。';
  }
  if (action === 'upgrade')
    result.notice += ` 安全容器上限 ${safeCapacity(result.slots)}。`;
  return result;
}
export const FACILITIES = [
  {
    id: 'grow',
    name: '补给培育舱',
    slots: 2,
    cost: 6,
    desc: '1 材料＋3 电力 → 2 补给',
    effect: 'grow',
  },
  {
    id: 'generator',
    name: '燃料发电机',
    slots: 1,
    cost: 5,
    desc: '1 燃料 → 8 电力',
    effect: 'generator',
  },
  {
    id: 'clinic',
    name: '医疗休整舱',
    slots: 2,
    cost: 6,
    desc: '1 药品 → 35 精力；不推进日期',
    effect: 'clinic',
  },
  {
    id: 'weather',
    name: '气象观测台',
    slots: 1,
    cost: 4,
    desc: '2 电力 → 获得明天天气与路线建议',
    effect: 'weather',
  },
  {
    id: 'recycle',
    name: '回收工坊',
    slots: 2,
    cost: 5,
    desc: '2 废料 → 3 材料',
    effect: 'recycle',
  },
  {
    id: 'workshop',
    name: '便携设备台',
    slots: 2,
    cost: 6,
    desc: '1 材料＋2 电力 → 1 鉴定电荷',
    effect: 'workshop',
  },
  {
    id: 'storage',
    name: '燃料储藏架',
    slots: 1,
    cost: 4,
    desc: '燃料上限 +4；2 废料 → 1 燃料',
    effect: 'storage',
  },
  {
    id: 'adapt',
    name: '地形适应台',
    slots: 2,
    cost: 6,
    desc: '2 材料＋2 电力 → 下次出勤降低搜索消耗',
    effect: 'adapt',
  },
] as const;
export function newBase() {
  return {
    ...newDay(),
    material: 24,
    power: 18,
    supply: 6,
    stamina: 55,
    fuel: 3,
    medicine: 2,
    scrap: 8,
    charges: 0,
    adapted: false,
    forecast: false,
    moduleCap: 6,
    installed: [] as string[],
    facilityUsed: [] as string[],
    gathered: false,
  };
}
export const baseSlots = (s: ReturnType<typeof newBase>) =>
  2 +
  s.installed.reduce(
    (n, id) => n + FACILITIES.find((f) => f.id === id)!.slots,
    0,
  );
export function baseAction(
  old: ReturnType<typeof newBase>,
  action: string,
  id = '',
) {
  let s = structuredClone(old);
  const need = (ok: boolean, msg: string) => {
    if (!ok) throw Error(msg);
  };
  need(s.phase !== 'over', '配额耗尽，实验结束');
  const f = FACILITIES.find((x) => x.id === id);
  if (action === 'sleep') {
    s = { ...s, ...dayAction(s, 'sleep') };
    if (s.phase !== 'over') {
      s.facilityUsed = [];
      s.forecast = false;
      s.gathered = false;
    }
    return s;
  }
  if (action === 'build') {
    need(!!f, '未知设施');
    need(
      !s.installed.includes(id) && baseSlots(s) + f!.slots <= s.moduleCap,
      '空间不足或设施已建造',
    );
    need(s.material >= f!.cost, '材料不足');
    s.material -= f!.cost;
    s.installed.push(id);
    s.notice = `已建造${f!.name}，占 ${f!.slots} 槽。`;
    return s;
  }
  if (action === 'remove') {
    need(!!f && s.installed.includes(id), '设施未建造');
    need(
      id !== 'storage' || s.fuel <= 6,
      '移除储藏架后燃料容量为 6，请先消耗多余燃料',
    );
    s.installed = s.installed.filter((x) => x !== id);
    const refund = Math.floor(f!.cost * 0.5);
    s.material += refund;
    s.notice = `拆除返 ${refund} 材料；当日使用记录保留，重建不能重复生产。`;
    return s;
  }
  if (action === 'expand') {
    need(s.moduleCap < 10 && s.material >= 6, '扩建需 6 材料，上限 10 槽');
    s.moduleCap += 2;
    s.material -= 6;
    s.notice = '基地扩建 +2 槽，不增加战斗格。';
    return s;
  }
  if (action === 'upgrade') {
    s = { ...s, ...dayAction(s, 'upgrade') };
    return s;
  }
  if (action === 'supply-run') {
    need(!s.gathered && !s.used, '每天只能出勤一次');
    need(
      s.stamina >= (s.adapted ? 10 : 20) && s.supply >= 1,
      '出勤需要精力和 1 补给',
    );
    need(
      s.fuel < (s.installed.includes('storage') ? 10 : 6),
      '燃料库已满，先使用燃料或建设储藏架',
    );
    const reduced = s.adapted;
    s.stamina -= reduced ? 10 : 20;
    s.supply--;
    s.material += 4;
    s.scrap += 3;
    s.fuel++;
    s.medicine++;
    s.used = true;
    s.gathered = true;
    s.adapted = false;
    s.streak = 0;
    s.notice = `样例成功出勤：材料 +4，废料 +3，燃料 +1，药品 +1。${reduced ? '适应装备节省 10 精力，已消耗。' : ''}`;
    return s;
  }
  need(action === 'use' && !!f && s.installed.includes(id), '设施未安装');
  need(!s.facilityUsed.includes(id), '该设施今天已使用');
  if (id === 'grow') {
    need(s.material >= 1 && s.power >= 3, '需要 1 材料和 3 电力');
    s.material--;
    s.power -= 3;
    s.supply += 2;
  }
  if (id === 'generator') {
    need(s.fuel >= 1, '需要 1 燃料');
    s.fuel--;
    s.power += 8;
  }
  if (id === 'clinic') {
    need(s.medicine >= 1 && s.stamina < 100, '需要药品且精力未满');
    s.medicine--;
    s.stamina = Math.min(100, s.stamina + 35);
  }
  if (id === 'weather') {
    need(s.power >= 2, '需要 2 电力');
    s.power -= 2;
    s.forecast = true;
  }
  if (id === 'recycle') {
    need(s.scrap >= 2, '需要 2 废料');
    s.scrap -= 2;
    s.material += 3;
  }
  if (id === 'workshop') {
    need(
      s.material >= 1 && s.power >= 2 && s.charges < 4,
      '需材料、电力且电荷未满（4）',
    );
    s.material--;
    s.power -= 2;
    s.charges++;
  }
  if (id === 'storage') {
    need(s.scrap >= 2 && s.fuel < 10, '需要 2 废料且燃料库未满');
    s.scrap -= 2;
    s.fuel++;
  }
  if (id === 'adapt') {
    need(
      s.material >= 2 && s.power >= 2 && !s.adapted,
      '需要材料、电力且没有待用适应装备',
    );
    s.material -= 2;
    s.power -= 2;
    s.adapted = true;
  }
  s.facilityUsed.push(id);
  s.notice = `${f!.name}已完成处理，日期不变。`;
  return s;
}
export function newBots() {
  return {
    ...oldBots(),
    bots: oldBots().bots.map((b) => ({ ...b, quota: 18, streak: 0 })),
  };
}
export function botDay(old: ReturnType<typeof newBots>) {
  const s = structuredClone(old);
  s.day++;
  s.rescued = 0;
  s.log = [];
  const random = rng(907 + s.day);
  const k = s.day % 99;
  for (const b of [...s.bots.slice(k), ...s.bots.slice(0, k)]) {
    if (!b.alive) continue;
    b.quota--;
    if (b.quota <= 0) {
      b.alive = false;
      s.log.push(`${b.id} 维持配额耗尽，永久淘汰`);
      continue;
    }
    b.floor = Math.min(100, b.floor + 1 + Math.floor(random() * 3));
    if (random() < 0.23) {
      const cost = rescueCost(b.streak);
      b.quota = Math.max(0, b.quota - cost);
      b.streak++;
      b.alive = b.quota > 0;
      s.rescued++;
      s.log.push(
        `${b.id} 救援扣 ${cost} 配额，${b.alive ? '已回收' : '永久淘汰'}`,
      );
    } else {
      b.streak = 0;
      if (s.stock[b.floor - 1] > 0) {
        s.stock[b.floor - 1]--;
        b.power++;
        s.log.push(`${b.id} 在 ${b.floor} 层回收 1 物资，救援计数重置`);
      }
    }
  }
  return s;
}
