import type { CardDef } from './card-types.ts';
import type { HeroId, HeroMechanic } from './hero-cards.ts';
import { ARENA_CARDS } from './arena-catalog.ts';
export type School = 'rush' | 'erosion' | 'bastion';
export type SystemCard = CardDef & {
  family?: string;
  bufferBonus?: number;
  school?: School;
  rarity?: number;
  role?: string;
  rule?: string;
  hero?: HeroId;
  mechanic?: HeroMechanic;
};
const make = (
  id: string,
  name: string,
  size: number,
  cd: number,
  power: number,
  kind: string,
  school: School,
  rarity: number,
  role: string,
  rule: string,
): SystemCard => ({
  id,
  hitType: id === 'gapblade' ? 'instant' : 'projectile',
  name,
  size,
  cd,
  power,
  kind,
  school,
  rarity,
  role,
  rule,
  energyCost: 0,
  energyGain: 0,
  effect: rule,
  master: rule,
});
export const SYSTEM_CARDS: SystemCard[] = [
  make(
    'nailer',
    '破门钉枪',
    2,
    6,
    33,
    'damage',
    'rush',
    1,
    '启动 / 输出',
    '前两次发动额外造成 16 伤害；升阶每次额外伤害 +4。',
  ),
  make(
    'fuse',
    '引信线',
    1,
    8,
    1,
    'charge',
    'rush',
    0,
    '启动 / 辅助',
    '给同路另一张牌充能；首次发动额外充能 2 秒，升阶每阶 +0.5 秒。',
  ),
  make(
    'gapblade',
    '猎隙刃',
    1,
    3,
    10,
    'damage',
    'rush',
    0,
    '突破后输出',
    '命中时目标屏障已损毁，则伤害 +6；升阶每阶再 +2。',
  ),
  make(
    'springbow',
    '卷簧弩',
    2,
    8,
    45,
    'damage',
    'rush',
    2,
    '爆发输出',
    '前三次发动伤害 +16；升阶每阶再 +4。后续恢复基础伤害。',
  ),
  make(
    'recoil',
    '反冲板',
    2,
    6,
    49,
    'damage',
    'bastion',
    1,
    '反击输出',
    '本路屏障实际承伤的 50% 储为反冲，最多 40；下次攻击消耗并附加。升阶上限每阶 +10。',
  ),
  make(
    'sealant',
    '补漏胶',
    1,
    5,
    24,
    'shield',
    'bastion',
    0,
    '修复',
    '修复本路屏障；本路损毁后支援其他仍存活且剩余比例最低的屏障。',
  ),
  make(
    'rubber',
    '缓冲垫',
    1,
    8,
    4,
    'shield',
    'bastion',
    1,
    '缓冲 / 防御',
    '本路完整屏障每次受到弹道伤害时减少 8，升阶每阶 +1。同路仅取最高值；不能减免侵蚀。',
  ),
  make(
    'counterweight',
    '配重锤',
    2,
    7,
    36,
    'damage',
    'bastion',
    2,
    '防守转输出',
    '发动时本路屏障高于 50%，伤害 +20；升阶每阶再 +5。',
  ),
  make(
    'acid',
    '蚀液喷壶',
    2,
    6,
    8,
    'corrode',
    'erosion',
    1,
    '侵蚀引擎',
    '同路叠加侵蚀，每层每秒造成 1 伤害并削减 1 屏障上限；本路最多 12 层。升阶每阶多叠 1 层。',
  ),
  make(
    'culture',
    '培养皿',
    2,
    6,
    6,
    'damage',
    'erosion',
    2,
    '成长输出',
    '优先攻击侵蚀最深的一路（同层数优先左路）；每次发动永久增加本场伤害 8（第一次无增幅）；升阶每阶增加 2。',
  ),
  make(
    'catalyst',
    '催化管',
    1,
    5,
    0.8,
    'charge',
    'erosion',
    0,
    '侵蚀 / 辅助',
    '给同路另一张牌充能；同路敌方有侵蚀时额外充能 0.8 秒，升阶每阶 +0.2 秒。',
  ),
  make(
    'distiller',
    '蒸馏器',
    1,
    8,
    1,
    'corrode',
    'erosion',
    1,
    '续航 / 侵蚀',
    '同路叠加侵蚀，同时治疗宿主 5；升阶每阶治疗 +3，侵蚀多叠 1 层。',
  ),
];
export const CARDS: SystemCard[] = [...SYSTEM_CARDS];
// One authoritative live catalog. Old IDs exist only in save migration.
export const STARTER_SLING = make(
  'slingshot',
  '简易弹弓',
  1,
  3,
  10,
  'damage',
  'rush',
  0,
  '初始 / 弹道输出',
  '每3秒发射弹丸，命中后造成10伤害。',
);
// A physical family yields named variants. Every definition has one immutable rarity.
const variantSpecs = [
  { suffix: 'worn', prefix: '旧制', rarity: 0, power: 0.9, cd: 1 },
  { suffix: 'reinforced', prefix: '加固', rarity: 1, power: 1, cd: 0 },
  { suffix: 'precision', prefix: '精工', rarity: 2, power: 1.1, cd: 0 },
  { suffix: 'swift', prefix: '轻型', rarity: 2, power: 0.95, cd: -1 },
  { suffix: 'void', prefix: '深空', rarity: 3, power: 1.2, cd: 0 },
  { suffix: 'relic', prefix: '遗世', rarity: 4, power: 1.25, cd: -1 },
];
export const CARD_VARIANTS: SystemCard[] = CARDS.flatMap((base) =>
  variantSpecs.map((v) => ({
    ...base,
    id: `${base.id}~${v.suffix}`,
    family: base.id,
    name:
      base.id === 'rubber'
        ? (
            {
              worn: '破烂缓冲垫',
              reinforced: '加固缓冲垫',
              precision: '皮质缓冲垫',
              swift: '蜂窝缓冲垫',
              void: '深空缓冲垫',
              relic: '时隙缓冲垫',
            } as Record<string, string>
          )[v.suffix]
        : v.prefix + base.name,
    rarity: v.rarity,
    power:
      Math.round(base.power * v.power * (base.kind === 'charge' ? 10 : 1)) /
      (base.kind === 'charge' ? 10 : 1),
    cd: Math.max(2, base.cd + v.cd),
    bufferBonus:
      base.id === 'rubber'
        ? (
            {
              worn: -2,
              reinforced: 0,
              precision: 2,
              swift: 1,
              void: 4,
              relic: 5,
            } as Record<string, number>
          )[v.suffix]
        : 0,
  })),
);
export const ALL_CARDS: SystemCard[] = [
  ...CARDS,
  STARTER_SLING,
  ...CARD_VARIANTS,
  ...ARENA_CARDS.map((card) => ({
    id: card.id,
    name: card.name,
    size: card.size,
    cd: card.cd,
    power: 0,
    kind: card.kind,
    rarity: card.rarity,
    role: '对战博弈实验牌',
    rule: card.text,
    effect: card.text,
    master: card.text,
    energyCost: 0,
    energyGain: 0,
    hitType: [4, 10, 25].includes(card.number) ? 'instant' as const : 'projectile' as const,
  })),
];
export const cardFamily = (id: string) => id.split('~')[0];
export function identifyVariant(
  family: string,
  rarity: number,
  selector: number,
) {
  const pool = CARD_VARIANTS.filter(
    (c) => c.family === cardFamily(family) && c.rarity === rarity,
  );
  if (!pool.length) throw Error('此实体没有可鉴定变种');
  return pool[selector % pool.length];
}
export const cardDef = (id: string) => {
  const c = ALL_CARDS.find((c) => c.id === id);
  if (!c) throw Error('未知卡牌');
  return c;
};
export const SCHOOLS = {
  rush: '速攻突破',
  erosion: '侵蚀成长',
  bastion: '固守反击',
};
