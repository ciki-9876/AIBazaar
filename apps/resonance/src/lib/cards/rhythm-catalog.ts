export type RhythmKind =
  | 'furnace'
  | 'tea'
  | 'match'
  | 'needle'
  | 'mirror'
  | 'bell'
  | 'projector'
  | 'lamp'
  | 'herb'
  | 'music'
  | 'umbrella';
export type RhythmStat =
  | 'damage'
  | 'burn'
  | 'poison'
  | 'heal'
  | 'boost'
  | 'guard';
export type RhythmDefinition = {
  id: string;
  name: string;
  size: 1 | 2 | 3;
  rarity: 0 | 1 | 2 | 3;
  kind: RhythmKind;
  role: string;
  story: string;
  text: string;
  art: { training?: string; tile?: number };
  stats: Partial<Record<RhythmStat, number>>;
};

// A separate catalog: these are new rhythm definitions, not silently migrated arena cards.
export const RHYTHM_CARDS: readonly RhythmDefinition[] = [
  {
    id: 'rhythm-furnace',
    name: '攒光手炉',
    size: 1,
    rarity: 2,
    kind: 'furnace',
    role: '储能 · 铺垫',
    art: { training: 'a' },
    stats: { boost: 4 },
    story: '把一路磕碰，攒成下一口热茶的温度。',
    text: '每次实际承伤结算积攒4暖意，上限40。扫中时消耗暖意，使接下来两次攻击增加4＋暖意的一半伤害；同类强化取较高值。',
  },
  {
    id: 'rhythm-tea',
    name: '回甘茶壶',
    size: 2,
    rarity: 1,
    kind: 'tea',
    role: '连击 · 回甘',
    art: { training: 'b' },
    stats: { damage: 12 },
    story: '一杯留给你，一杯留给晚归的人。',
    text: '每次扫中造成12直伤，恢复本次实际直伤的一半生命。占两格，允许在停留期间再次发动。',
  },
  {
    id: 'rhythm-match',
    name: '余烬火柴盒',
    size: 1,
    rarity: 1,
    kind: 'match',
    role: '灼烧 · 邻接',
    art: { training: 'e' },
    stats: { damage: 3, burn: 3 },
    story: '一小簇火，也能照亮伙伴的心事。',
    text: '扫中造成3直伤并附加3灼烧。紧贴的伙伴攻击时，额外附加1灼烧；每次结算最多支援一次，不产生递归连锁。',
  },
  {
    id: 'rhythm-needle',
    name: '补雨针线团',
    size: 1,
    rarity: 0,
    kind: 'needle',
    role: '治疗 · 净化',
    art: { training: 'f' },
    stats: { heal: 12 },
    story: '不必完好无缺，也值得被细心缝补。',
    text: '扫中恢复12生命，并清除己方2层毒。满血溢出不储存。',
  },
  {
    id: 'rhythm-mirror',
    name: '照影梳妆镜',
    size: 3,
    rarity: 3,
    kind: 'mirror',
    role: '映照 · 接力',
    art: { training: 'c' },
    stats: { damage: 8, boost: 8 },
    story: '镜里映出的，是伙伴尚未说出口的勇气。',
    text: '扫中造成8直伤；随后使接下来两次攻击增加4～8伤害，对方生命越完整加成越高。同类强化取较高值。',
  },
  {
    id: 'rhythm-bell',
    name: '听雨风铃',
    size: 1,
    rarity: 2,
    kind: 'bell',
    role: '防御 · 安心',
    art: { training: 'd' },
    stats: { heal: 4, guard: 40 },
    story: '檐下的轻响，提醒你可以慢慢呼吸。',
    text: '扫中恢复4生命，抵挡下一次承伤结算的40%伤害。重复获得只刷新，不叠加；没有第二条护盾血量。',
  },
  {
    id: 'rhythm-projector',
    name: '星轨放映机',
    size: 3,
    rarity: 3,
    kind: 'projector',
    role: '三段 · 爆发',
    art: { tile: 1 },
    stats: { damage: 52 },
    story: '等这一束光，重新落在有人等待的地方。',
    text: '连续三次发动依次装片、聚光、投射；投射造成52直伤。进度跨圈保留，只有投射消耗攻击强化。',
  },
  {
    id: 'rhythm-lamp',
    name: '书桌小灯',
    size: 1,
    rarity: 0,
    kind: 'lamp',
    role: '直击 · 起手',
    art: { tile: 0 },
    stats: { damage: 11 },
    story: '那张没画完的画，它还替人留着。',
    text: '扫中造成11直伤。朴素可靠，适合放在需要立即出手的位置。',
  },
  {
    id: 'rhythm-herb',
    name: '草叶药匣',
    size: 2,
    rarity: 1,
    kind: 'herb',
    role: '毒伤 · 续航',
    art: { tile: 3 },
    stats: { damage: 5, poison: 2, heal: 3 },
    story: '木匣里，仍留着晒过太阳的草叶香。',
    text: '扫中造成5直伤，附加2层毒，恢复3生命。毒每秒按层数造成伤害，每三秒自然减少1层。',
  },
  {
    id: 'rhythm-music',
    name: '蓝木音乐盒',
    size: 2,
    rarity: 2,
    kind: 'music',
    role: '治疗 · 熄火',
    art: { tile: 6 },
    stats: { heal: 14 },
    story: '这一次，有人愿意听完这一首。',
    text: '扫中恢复14生命，并清除己方3灼烧。适合接在对手的点火段之后。',
  },
  {
    id: 'rhythm-umbrella',
    name: '补丁旧伞',
    size: 2,
    rarity: 2,
    kind: 'umbrella',
    role: '反击 · 防护',
    art: { tile: 4 },
    stats: { damage: 9, guard: 25 },
    story: '伞面有三种颜色，来自三个下雨天。',
    text: '扫中造成9直伤，并抵挡下一次承伤结算的25%。防御与风铃取较高值，不叠加。',
  },
];
export const rhythmDefinition = (id: string) =>
  RHYTHM_CARDS.find((card) => card.id === id);
export const RHYTHM_RARITIES = ['普通', '稀有', '史诗', '传说'] as const;
export const RHYTHM_PRESETS = [
  {
    name: '借雨添灯',
    note: '手炉铺垫 → 茶壶连击 → 放映机收尾',
    ids: [
      'rhythm-furnace',
      'rhythm-tea',
      'rhythm-match',
      'rhythm-needle',
      'rhythm-projector',
      'rhythm-bell',
    ],
  },
  {
    name: '草叶与炉火',
    note: '火柴支援 → 草叶叠毒 → 旧伞挡雨',
    ids: [
      'rhythm-lamp',
      'rhythm-match',
      'rhythm-herb',
      'rhythm-umbrella',
      'rhythm-needle',
      'rhythm-tea',
    ],
  },
  {
    name: '镜中有光',
    note: '连续映照 → 茶壶接力 → 回甘续航',
    ids: [
      'rhythm-furnace',
      'rhythm-mirror',
      'rhythm-tea',
      'rhythm-match',
      'rhythm-bell',
      'rhythm-lamp',
    ],
  },
  {
    name: '长街晚安',
    note: '音乐盒熄火 → 药匣消耗 → 伞下回敬',
    ids: [
      'rhythm-lamp',
      'rhythm-herb',
      'rhythm-music',
      'rhythm-umbrella',
      'rhythm-tea',
    ],
  },
] as const;
