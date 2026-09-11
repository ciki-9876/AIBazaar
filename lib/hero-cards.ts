import type { CardDef } from './prototype-v04.ts';
export type HeroId = 'breaker' | 'mender' | 'archivist';
export type HeroMechanic = {
  opening?: [number, number];
  exposed?: number;
  barrierBonus?: number;
  growth?: number;
  intactBonus?: number;
  corrosionBonus?: number;
  smallAllyBonus?: number;
  seekCorrosion?: boolean;
  heal?: number;
  repair?: number;
  firstCharge?: number;
  allCharge?: boolean;
  buffer?: number;
  recoil?: boolean;
  allRepair?: boolean;
};
export type HeroCard = CardDef & {
  hero: HeroId;
  rarity: number;
  role: string;
  mechanic: HeroMechanic;
};
const make = (
  hero: HeroId,
  id: string,
  name: string,
  size: number,
  cd: number,
  power: number,
  kind: string,
  rarity: number,
  role: string,
  mechanic: HeroMechanic = {},
): HeroCard => ({
  hero,
  id,
  name,
  size,
  cd,
  power,
  kind,
  rarity,
  role,
  mechanic,
  energyCost: 0,
  energyGain: 0,
  effect: '记忆遗物',
  master: '记忆遗物',
});
export const HERO_CARDS: HeroCard[] = [
  make(
    'breaker',
    'c-ram',
    '岑火的液压破门机',
    3,
    5.75,
    58,
    'damage',
    2,
    '重型突破',
    { opening: [2, 14] },
  ),
  make(
    'breaker',
    'c-punch',
    '气动冲钉器',
    2,
    3.5,
    23,
    'damage',
    1,
    '快速突破',
    { opening: [2, 12] },
  ),
  make('breaker', 'c-cut', '断门切割片', 1, 2.75, 9, 'damage', 0, '破路追击', {
    exposed: 12,
  }),
  make('breaker', 'c-spark', '点火拉绳', 1, 4, 0.9, 'charge', 0, '开场启动', {
    firstCharge: 1.2,
  }),
  make('breaker', 'c-burst', '定向破障雷', 2, 5, 24, 'damage', 1, '专攻屏障', {
    barrierBonus: 14,
  }),
  make('breaker', 'c-pacer', '棘轮扳手', 1, 2.5, 5, 'damage', 0, '持续输出', {
    growth: 1,
  }),
  make('breaker', 'c-rope', '工地救生绳', 1, 4, 12, 'heal', 0, '续航'),
  make(
    'mender',
    'b-cart',
    '白榆的移动维修站',
    3,
    6,
    24,
    'shield',
    2,
    '三路大修 / 续航',
    { heal: 9, allRepair: true },
  ),
  make('mender', 'b-staple', '急救铆钉盒', 1, 3, 18, 'shield', 0, '快速修复', {
    opening: [3, 12],
  }),
  make(
    'mender',
    'b-hammer',
    '校正锤',
    2,
    4,
    26,
    'damage',
    1,
    '维持防线后输出',
    { intactBonus: 14 },
  ),
  make('mender', 'b-return', '回弹支架', 2, 4, 26, 'damage', 1, '承伤反击', {
    recoil: true,
  }),
  make('mender', 'b-gasket', '多层减震垫', 1, 5, 5, 'shield', 0, '缓冲', {
    buffer: 6,
  }),
  make('mender', 'b-pump', '循环输液泵', 2, 5, 20, 'heal', 1, '治疗 / 修复', {
    repair: 8,
  }),
  make('mender', 'b-wrench', '带电检修笔', 1, 5, 1.5, 'charge', 0, '修复启动', {
    repair: 10,
  }),
  make('mender', 'b-rivet', '射钉修补枪', 1, 3.5, 12, 'damage', 0, '边打边修', {
    repair: 5,
  }),
  make(
    'archivist',
    'w-cabinet',
    '闻砂的失物陈列柜',
    3,
    5,
    28,
    'damage',
    2,
    '集中成长',
    { growth: 8, seekCorrosion: true },
  ),
  make('archivist', 'w-ink', '褪色墨水瓶', 2, 5, 3, 'corrode', 1, '侵蚀引擎'),
  make('archivist', 'w-label', '腐蚀索引签', 1, 3, 7, 'damage', 0, '侵蚀收益', {
    corrosionBonus: 1,
  }),
  make('archivist', 'w-pen', '自动抄写笔', 1, 2, 5, 'damage', 0, '高频记录'),
  make(
    'archivist',
    'w-press',
    '复写压印机',
    2,
    5,
    18,
    'damage',
    1,
    '成长输出',
    { growth: 5 },
  ),
  make('archivist', 'w-index', '倒序目录', 1, 4, 1.1, 'charge', 0, '同路提速'),
  make(
    'archivist',
    'w-vial',
    '失忆标本瓶',
    1,
    6,
    1,
    'corrode',
    0,
    '侵蚀 / 续航',
    { heal: 6 },
  ),
  make(
    'archivist',
    'w-clock',
    '阅览室摆钟',
    2,
    7,
    0.9,
    'charge',
    2,
    '三路提速',
    { allCharge: true },
  ),
  make('archivist', 'w-tome', '夹页旧档案', 2, 5, 20, 'damage', 1, '大小配合', {
    smallAllyBonus: 10,
  }),
];
