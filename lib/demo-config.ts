export const FOUR = [0, 3, 4, 6];
export const RARITY = [
  { name: '普通', base: 1, growth: 1 },
  { name: '罕见', base: 1.08, growth: 1.12 },
  { name: '稀有', base: 1.18, growth: 1.25 },
  { name: '异常', base: 1.3, growth: 1.4 },
  { name: '奇迹', base: 2.4, growth: 2.8 },
];
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
    desc: '8 材料＋2 电力 → 1 鉴定仪',
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
