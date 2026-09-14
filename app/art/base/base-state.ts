export type FacilityKind =
  | 'generator'
  | 'clinic'
  | 'grow'
  | 'workshop'
  | 'storage';
export type Stock = {
  scrap: number;
  fuel: number;
  power: number;
  supply: number;
  medicine: number;
  charge: number;
  stamina: number;
  quota: number;
};
export type Module = {
  id: number;
  kind: FacilityKind;
  slot: number;
  level: number;
  used: boolean;
};
export type BaseState = {
  modules: Module[];
  stock: Stock;
  day: number;
  expanded: boolean;
  serial: number;
  message: string;
  pulse: number;
  active: number | null;
  usedKinds: FacilityKind[];
};
export const FACILITIES: Record<
  FacilityKind,
  {
    name: string;
    code: string;
    cost: number;
    slots: number;
    desc: string;
    action: string;
  }
> = {
  generator: {
    name: '燃料发电机',
    code: 'PWR',
    cost: 5,
    slots: 1,
    desc: '燃料驱动转子，为电梯补充电力。',
    action: '1 燃料 → 8 电力',
  },
  clinic: {
    name: '医疗休整舱',
    code: 'MED',
    cost: 6,
    slots: 2,
    desc: '折叠床、药品与检查灯，恢复身体状态。',
    action: '1 药品 → 35 精力',
  },
  grow: {
    name: '补给培育舱',
    code: 'BIO',
    cost: 6,
    slots: 2,
    desc: '封闭培养架，为下一次出勤准备食物。',
    action: '1 零件 + 3 电力 → 2 补给',
  },
  workshop: {
    name: '便携设备台',
    code: 'LAB',
    cost: 6,
    slots: 2,
    desc: '夹具、检修灯与校准仪，制造鉴定电荷。',
    action: '1 零件 + 2 电力 → 1 电荷',
  },
  storage: {
    name: '燃料储藏架',
    code: 'STO',
    cost: 4,
    slots: 1,
    desc: '固定在导轨上的容器架，将废料回收为燃料。',
    action: '2 零件 → 1 燃料',
  },
};
export const BAYS = [
  { id: 0, x: -3.5, z: -2.55, wall: 0, label: 'A1' },
  { id: 1, x: -3.5, z: -0.05, wall: 0, label: 'A2' },
  { id: 2, x: -3.5, z: 2.45, wall: 0, label: 'A3' },
  { id: 3, x: 3.5, z: -2.55, wall: 1, label: 'B1' },
  { id: 4, x: 3.5, z: -0.05, wall: 1, label: 'B2' },
  { id: 5, x: 3.5, z: 2.45, wall: 1, label: 'B3' },
  { id: 6, x: -3.5, z: 4.95, wall: 0, label: 'A4' },
  { id: 7, x: 3.5, z: 4.95, wall: 1, label: 'B4' },
];
export function initialBase(): BaseState {
  return {
    modules: [
      { id: 1, kind: 'generator', slot: 0, level: 1, used: false },
      { id: 2, kind: 'clinic', slot: 1, level: 1, used: false },
      { id: 3, kind: 'grow', slot: 3, level: 1, used: false },
    ],
    stock: {
      scrap: 24,
      fuel: 3,
      power: 12,
      supply: 5,
      medicine: 2,
      charge: 0,
      stamina: 55,
      quota: 12,
    },
    day: 1,
    expanded: false,
    serial: 4,
    message: '门已关闭。这里暂时安全。',
    pulse: 0,
    active: null,
    usedKinds: [],
  };
}
export function footprint(
  kind: FacilityKind,
  slot: number,
  expanded: boolean,
): number[] {
  const start = BAYS.find((b) => b.id === slot);
  if (!start) return [];
  const row = BAYS.filter(
    (b) => b.wall === start.wall && (expanded || b.id < 6),
  ).sort((a, b) => a.z - b.z);
  const index = row.findIndex((b) => b.id === slot),
    count = FACILITIES[kind].slots;
  return index < 0 || index + count > row.length
    ? []
    : row.slice(index, index + count).map((b) => b.id);
}
export function canPlace(
  state: BaseState,
  kind: FacilityKind,
  slot: number,
): string | null {
  if (state.modules.some((m) => m.kind === kind)) return '同类设施已建造。';
  const area = footprint(kind, slot, state.expanded);
  if (!area.length) return '需要同侧连续的空导轨位。';
  const occupied = state.modules.flatMap((m) =>
    footprint(m.kind, m.slot, state.expanded),
  );
  if (area.some((id) => occupied.includes(id))) return '这个位置已有设施。';
  if (state.stock.scrap < FACILITIES[kind].cost) return '零件不足。';
  return null;
}
export type BaseAction =
  | { type: 'build'; kind: FacilityKind; slot: number }
  | { type: 'upgrade' | 'demolish' | 'use'; id: number }
  | { type: 'sleep' }
  | { type: 'expand' }
  | { type: 'reset' };
export function reduceBase(s: BaseState, a: BaseAction): BaseState {
  if (a.type === 'reset') return initialBase();
  const next = {
    ...s,
    stock: { ...s.stock },
    modules: s.modules.map((m) => ({ ...m })),
  };
  const fail = (message: string) => ({ ...s, message });
  if (a.type === 'build') {
    const error = canPlace(s, a.kind, a.slot);
    if (error) return fail(error);
    next.stock.scrap -= FACILITIES[a.kind].cost;
    next.modules.push({
      id: s.serial,
      kind: a.kind,
      slot: a.slot,
      level: 1,
      used: s.usedKinds.includes(a.kind),
    });
    next.serial++;
    next.active = s.serial;
    next.pulse++;
    next.message = `${FACILITIES[a.kind].name}已接入 ${BAYS[a.slot].label} 导轨。`;
  } else if (a.type === 'expand') {
    if (s.expanded) return fail('服务导轨已全部展开。');
    if (s.stock.scrap < 8) return fail('扩建需要 8 零件。');
    next.stock.scrap -= 8;
    next.expanded = true;
    next.message = '两侧服务导轨展开。新增 A4、B4 两个槽位。';
  } else if (a.type === 'sleep') {
    if (s.stock.quota <= 1)
      return fail('本次沙盘的生命维持配额不足，重置后可继续体验。');
    next.day++;
    next.stock.quota--;
    const fed = s.stock.supply > 0;
    if (fed) next.stock.supply--;
    next.stock.stamina = Math.min(100, s.stock.stamina + (fed ? 50 : 15));
    next.modules.forEach((m) => (m.used = false));
    next.usedKinds = [];
    next.message = `第 ${next.day} 日。${fed ? '消耗 1 补给，恢复 50 精力。' : '没有补给，仅恢复 15 精力。'}`;
  } else {
    const m = next.modules.find((m) => m.id === a.id);
    if (!m) return fail('设施已不存在。');
    const name = FACILITIES[m.kind].name;
    if (a.type === 'demolish') {
      next.stock.scrap += Math.floor(FACILITIES[m.kind].cost / 2);
      next.modules = next.modules.filter((item) => item.id !== a.id);
      next.message = `${name}已拆除，返还 ${Math.floor(FACILITIES[m.kind].cost / 2)} 零件。`;
      next.active = null;
    } else if (a.type === 'upgrade') {
      if (m.level >= 3) return fail('已达到本次原型的最高外观等级。');
      const cost = m.level * 4;
      if (s.stock.scrap < cost) return fail(`升级需要 ${cost} 零件。`);
      next.stock.scrap -= cost;
      m.level++;
      next.active = m.id;
      next.pulse++;
      next.message = `${name}升至 Mk.${m.level}，增加结构件与校准表。`;
    } else {
      if (m.used) return fail('这台设施今日已使用。');
      const n = next.stock;
      if (m.kind === 'generator') {
        if (n.fuel < 1) return fail('需要 1 燃料。');
        n.fuel--;
        n.power += 8;
      }
      if (m.kind === 'clinic') {
        if (n.medicine < 1) return fail('需要 1 药品。');
        n.medicine--;
        n.stamina = Math.min(100, n.stamina + 35);
      }
      if (m.kind === 'grow') {
        if (n.scrap < 1 || n.power < 3) return fail('需要 1 零件与 3 电力。');
        n.scrap--;
        n.power -= 3;
        n.supply += 2;
      }
      if (m.kind === 'workshop') {
        if (n.scrap < 1 || n.power < 2) return fail('需要 1 零件与 2 电力。');
        n.scrap--;
        n.power -= 2;
        n.charge++;
      }
      if (m.kind === 'storage') {
        if (n.scrap < 2) return fail('需要 2 零件。');
        n.scrap -= 2;
        n.fuel++;
      }
      m.used = true;
      next.usedKinds = [...s.usedKinds, m.kind];
      next.active = m.id;
      next.pulse++;
      next.message = `${name}运行完成：${FACILITIES[m.kind].action}。`;
    }
  }
  return next;
}
