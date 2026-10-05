import type { ArenaCard } from './arena-catalog.ts';

// Versioned, opt-in experimental values. Existing adventure/arena pools stay unchanged.
export const TRAINING_RULESETS = {
  'original-v1': {
    title: '原始数值',
    energy: 5,
    damage: 8,
    burn: 2,
    repair: 5,
  },
  'tuned-v1': { title: '调校数值', energy: 5, damage: 30, burn: 4, repair: 5 },
} as const;
export type TrainingRuleset = keyof typeof TRAINING_RULESETS;
export function trainingValues(version: TrainingRuleset = 'tuned-v1') {
  const values = TRAINING_RULESETS[version];
  if (!values) throw Error('未知训练场规则版本');
  return values;
}
export const TRAINING_STORIES: Record<string, string> = {
  'training-a': '它把每一次磕碰攒成暖意，等身边的伙伴需要时再打开炉盖。',
  'training-b': '壶沿修补过很多次。它总记得，把收到的热茶再回敬一杯。',
  'training-c': '镜面照见的并非敌意，而是那道护幕尚未松动的针脚。',
  'training-d': '雨敲在檐上，它便轻轻响一声，提醒远处的伙伴再坚持一下。',
  'training-e': '盒里只剩几根火柴；只要身边有人动起来，它也愿意添一把火。',
  'training-f': '细细的线，一针一针，把漏雨的地方缝回原来的样子。',
};
const specifications: [
  string,
  number,
  string,
  number,
  number,
  number,
  ArenaCard['kind'],
][] = [
  ['training-a', 101, '攒光手炉', 2, 1, 10, 'tempo'],
  ['training-b', 102, '回甘茶壶', 2, 2, 6, 'damage'],
  ['training-c', 103, '照影梳妆镜', 3, 3, 0, 'passive'],
  ['training-d', 104, '听雨风铃', 2, 1, 0, 'passive'],
  ['training-e', 105, '余烬火柴盒', 1, 1, 0, 'burn'],
  ['training-f', 106, '补雨针线团', 0, 1, 1, 'shield'],
];
export function trainingText(
  id: string,
  version: TrainingRuleset = 'tuned-v1',
) {
  const v = trainingValues(version);
  const rules: Record<string, string> = {
    'training-a': `本路护幕每次实际承受直接攻击，积累${v.energy}点能量。每10秒消耗全部能量，平均分给紧邻卡牌，提升等量伤害，持续4秒。`,
    'training-b': `每6秒发射一次${v.damage}直伤攻击。命中后，按实际护幕损失与生命损失之和等量修复己方本路护幕。`,
    'training-c':
      '被动：左右相邻路线的卡牌释放输出时，按目标护幕剩余比例提升等量百分比输出；护幕满时+100%，破幕后+0%。',
    'training-d':
      '本路护幕每次实际受到伤害（包括灼烧、侵蚀），为己方左路所有有冷却的物品充能0.25秒。',
    'training-e': `紧邻物品发动或被动触发时，额外发射一次施加${v.burn}层灼烧的攻击。触发间隔3秒，冷却结束不会自行攻击。`,
    'training-f': `每1秒修复本路护幕${v.repair}点。无法超过上限，破幕后不能重建。`,
  };
  return rules[id] ?? '';
}
export const TRAINING_CARDS: ArenaCard[] = specifications.map(
  ([id, number, name, rarity, size, cd, kind]) => ({
    id,
    number,
    name,
    rarity,
    size,
    cd,
    kind,
    text: trainingText(id),
  }),
);
export const isTrainingCard = (id: string) =>
  TRAINING_CARDS.some((c) => c.id === id);
